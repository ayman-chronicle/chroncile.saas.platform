//! WorkOS webhook handler.
//!
//! Phase 0b/c of the WorkOS migration: the legacy `signup` / `login` /
//! `forgot_password` / `reset_password` / `oauth_signup` / `exchange_token` /
//! `workos_exchange` / `provision_workspace` / `discover` /
//! `send_invitation` / `resend_invitation` handlers (which dealt with bcrypt,
//! NextAuth bridges, custom-issued Chronicle JWTs, and pre-WorkOS UI flows)
//! are gone. The frontend talks to WorkOS directly via `@workos-inc/node` for
//! authentication; the only thing this file is responsible for now is
//! receiving WorkOS webhook events to keep our local mirror of the user
//! directory in sync with SCIM connections.
//!
//! - `POST /api/webhooks/workos` — SCIM `directory.user.*` webhook.
//!
//! All non-webhook backend routes for tenant/user provisioning live in
//! `routes/saas/tenant.rs::register_workos_tenant`.

use axum::{body::Bytes, extract::State, http::HeaderMap, http::StatusCode};
use chronicle_auth::workos::{verify_webhook_signature, WebhookSignatureError};
use chronicle_domain::{CreateUserInput, UserRole};
use serde::Deserialize;

use super::error::{ApiError, ApiResult};
use crate::saas_state::SaasAppState;

/// Minimal WorkOS event envelope. We only act on `directory.user.*` events;
/// other events are accepted (signature still validated) but otherwise ignored.
#[derive(Debug, Deserialize)]
struct WorkosEvent {
    #[serde(default)]
    event: Option<String>,
    #[serde(default)]
    data: Option<DirectoryUserEventData>,
}

#[derive(Debug, Deserialize)]
struct DirectoryUserEventData {
    #[serde(default)]
    id: Option<String>,
    #[serde(default)]
    email: Option<String>,
    #[serde(default, rename = "first_name")]
    first_name: Option<String>,
    #[serde(default, rename = "last_name")]
    last_name: Option<String>,
    #[serde(default, rename = "organization_id")]
    organization_id: Option<String>,
    /// WorkOS sometimes nests org id under `organizationId`; capture both
    /// shapes defensively.
    #[serde(default, rename = "organizationId")]
    organization_id_camel: Option<String>,
}

impl DirectoryUserEventData {
    fn organization_id(&self) -> Option<&str> {
        self.organization_id
            .as_deref()
            .or(self.organization_id_camel.as_deref())
    }
}

pub async fn workos_webhook(
    State(state): State<SaasAppState>,
    headers: HeaderMap,
    body: Bytes,
) -> ApiResult<StatusCode> {
    let signature = headers
        .get("workos-signature")
        .and_then(|v| v.to_str().ok())
        .ok_or_else(|| ApiError::bad_request("Missing WorkOS-Signature header"))?;
    let secret = std::env::var("WORKOS_WEBHOOK_SECRET").map_err(|_| {
        tracing::error!("WORKOS_WEBHOOK_SECRET not set");
        ApiError::internal()
    })?;
    let now = chrono::Utc::now().timestamp();
    if let Err(err) = verify_webhook_signature(&body, signature, &secret, 300, now) {
        match err {
            WebhookSignatureError::TimestampOutsideTolerance
            | WebhookSignatureError::SignatureMismatch => {
                tracing::warn!(error = ?err, "webhook signature rejected");
                return Err(ApiError::unauthorized());
            }
            _ => {
                tracing::warn!(error = ?err, "webhook signature parse failed");
                return Err(ApiError::bad_request("Invalid signature"));
            }
        }
    }

    let event: WorkosEvent = serde_json::from_slice(&body)
        .map_err(|e| ApiError::bad_request(format!("Invalid JSON body: {e}")))?;
    let kind = event.event.as_deref().unwrap_or("");
    match kind {
        "dsync.user.created" | "directory.user.created" => {
            handle_directory_user_upsert(&state, &event, "scim").await?;
        }
        "dsync.user.updated" | "directory.user.updated" => {
            handle_directory_user_upsert(&state, &event, "scim").await?;
        }
        "dsync.user.deleted" | "directory.user.deleted" => {
            handle_directory_user_deleted(&state, &event).await?;
        }
        other => {
            tracing::debug!(event = other, "Ignoring WorkOS event");
        }
    }

    Ok(StatusCode::ACCEPTED)
}

async fn handle_directory_user_upsert(
    state: &SaasAppState,
    event: &WorkosEvent,
    created_via: &str,
) -> ApiResult<()> {
    let Some(data) = event.data.as_ref() else {
        return Ok(());
    };
    let (Some(workos_user_id), Some(email)) = (data.id.as_deref(), data.email.as_deref()) else {
        tracing::warn!("directory.user event missing id/email");
        return Ok(());
    };
    let Some(workos_org_id) = data.organization_id() else {
        tracing::warn!(workos_user_id, "directory.user event missing organization_id");
        return Ok(());
    };

    let Some(tenant) = state
        .tenants
        .find_by_workos_organization_id(workos_org_id)
        .await?
    else {
        tracing::warn!(
            workos_org_id,
            "directory.user event for unknown WorkOS organization; ignoring"
        );
        return Ok(());
    };

    if let Some(existing) = state.users.find_by_workos_user_id(workos_user_id).await? {
        tracing::debug!(user_id = %existing.id, "directory.user event already provisioned");
        return Ok(());
    }

    if let Some(existing_by_email) = state.users.find_by_email(email).await? {
        let _ = state
            .users
            .set_workos_user_id(&existing_by_email.id, workos_user_id)
            .await?;
        return Ok(());
    }

    let display_name = match (data.first_name.as_deref(), data.last_name.as_deref()) {
        (Some(f), Some(l)) if !l.is_empty() => Some(format!("{f} {l}")),
        (Some(f), _) => Some(f.to_string()),
        (None, Some(l)) => Some(l.to_string()),
        _ => None,
    };

    state
        .users
        .create(CreateUserInput {
            email: email.to_string(),
            name: display_name,
            password_hash: None,
            auth_provider: "workos".to_string(),
            role: UserRole::Member,
            tenant_id: tenant.id.clone(),
            workos_user_id: Some(workos_user_id.to_string()),
            created_via: Some(created_via.to_string()),
        })
        .await?;
    Ok(())
}

async fn handle_directory_user_deleted(
    state: &SaasAppState,
    event: &WorkosEvent,
) -> ApiResult<()> {
    let Some(data) = event.data.as_ref() else {
        return Ok(());
    };
    let Some(workos_user_id) = data.id.as_deref() else {
        return Ok(());
    };
    if let Some(existing) = state.users.find_by_workos_user_id(workos_user_id).await? {
        state.users.delete(&existing.id).await?;
        tracing::info!(user_id = %existing.id, workos_user_id, "SCIM-deleted user");
    }
    Ok(())
}
