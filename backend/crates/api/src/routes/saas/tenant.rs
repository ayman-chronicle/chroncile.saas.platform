use axum::{extract::State, Json};

use chronicle_auth::types::AuthUser;
use chronicle_domain::{
    CreateTenantInput, CreateUserInput, TenantResponse, UpdateStripeRequest, UserRole,
};

use super::error::{ApiError, ApiResult};
use crate::saas_state::SaasAppState;

pub async fn get_tenant(
    user: AuthUser,
    State(state): State<SaasAppState>,
) -> ApiResult<Json<TenantResponse>> {
    let tenant = state.tenants.find_by_id(&user.tenant_id).await?;
    Ok(Json(TenantResponse { tenant }))
}

pub async fn update_tenant_stripe(
    user: AuthUser,
    State(state): State<SaasAppState>,
    Json(input): Json<UpdateStripeRequest>,
) -> ApiResult<Json<TenantResponse>> {
    let tenant = state
        .tenants
        .update_stripe_fields(
            &user.tenant_id,
            input.stripe_customer_id.as_deref(),
            input.stripe_subscription_status.as_deref(),
            input.stripe_price_id.as_deref(),
        )
        .await?;

    Ok(Json(TenantResponse {
        tenant: Some(tenant),
    }))
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateTenantNameRequest {
    pub name: String,
}

pub async fn update_tenant_name(
    user: AuthUser,
    State(state): State<SaasAppState>,
    Json(input): Json<UpdateTenantNameRequest>,
) -> ApiResult<Json<TenantResponse>> {
    let role = user.role.parse().unwrap_or(UserRole::Member);
    if !role.is_owner() {
        return Err(ApiError::forbidden(
            "Only the organization owner can rename the organization",
        ));
    }

    if input.name.trim().is_empty() {
        return Err(ApiError::bad_request("Organization name cannot be empty"));
    }

    let tenant = state
        .tenants
        .update_name(&user.tenant_id, &input.name)
        .await?;
    Ok(Json(TenantResponse {
        tenant: Some(tenant),
    }))
}

pub async fn delete_tenant(
    user: AuthUser,
    State(state): State<SaasAppState>,
) -> ApiResult<Json<serde_json::Value>> {
    let role = user.role.parse().unwrap_or(UserRole::Member);
    if !role.is_owner() {
        return Err(ApiError::forbidden(
            "Only the organization owner can delete the organization",
        ));
    }

    state.tenants.delete(&user.tenant_id).await?;
    Ok(Json(serde_json::json!({ "deleted": true })))
}

// ---------------------------------------------------------------------------
// Register a Tenant for an existing WorkOS Organization (CP 7.1).
//
// Called by the frontend's /api/onboarding/workspace route after it creates
// the Organization in WorkOS. The frontend already minted the Org via the
// WorkOS SDK; this endpoint just registers the local Chronicle counterpart
// (Tenant row + JIT User) and links them via `workos_organization_id`.
//
// Auth is server-to-server via `service_secret`. There is intentionally no
// JWT issuance here — that's the whole point of the WorkOS migration. The
// frontend already has the WorkOS access token and uses it directly when
// calling protected backend endpoints (validated by WorkosAuthUser, CP 7.4).
//
// Idempotent: re-running with the same `workos_organization_id` returns the
// existing tenant + user without creating duplicates.
// ---------------------------------------------------------------------------

#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RegisterWorkosTenantInput {
    pub service_secret: String,
    pub workos_user_id: String,
    pub workos_organization_id: String,
    pub email: String,
    /// Workspace display name (e.g. "Acme Industries").
    pub name: String,
    /// URL slug (e.g. "acme-industries"). Lowercase, alphanumeric + hyphens.
    pub slug: String,
    pub first_name: Option<String>,
    pub last_name: Option<String>,
}

#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RegisterWorkosTenantResponse {
    pub tenant_id: String,
    pub user_id: String,
    /// True if this call created the tenant; false if it already existed.
    pub created: bool,
}

pub async fn register_workos_tenant(
    State(state): State<SaasAppState>,
    Json(input): Json<RegisterWorkosTenantInput>,
) -> ApiResult<Json<RegisterWorkosTenantResponse>> {
    // 1. Service-secret auth.
    let expected = state.config.service_secret.as_deref().unwrap_or("");
    if expected.is_empty() || input.service_secret != expected {
        return Err(ApiError::unauthorized());
    }

    // 2. Basic validation.
    if input.name.trim().is_empty() {
        return Err(ApiError::bad_request("Workspace name is required"));
    }
    if input.slug.trim().is_empty() {
        return Err(ApiError::bad_request("Workspace slug is required"));
    }
    if input.workos_organization_id.trim().is_empty() {
        return Err(ApiError::bad_request("workosOrganizationId is required"));
    }
    if input.workos_user_id.trim().is_empty() {
        return Err(ApiError::bad_request("workosUserId is required"));
    }
    if input.email.trim().is_empty() {
        return Err(ApiError::bad_request("email is required"));
    }

    if let Some(existing_tenant) = state
        .tenants
        .find_by_workos_organization_id(&input.workos_organization_id)
        .await?
    {
        let existing_user = state
            .users
            .find_by_workos_user_id(&input.workos_user_id)
            .await?
            .ok_or_else(|| {
                tracing::error!(
                    workos_organization_id = %input.workos_organization_id,
                    workos_user_id = %input.workos_user_id,
                    "tenant exists but workos user is missing — investigate manually",
                );
                ApiError::internal()
            })?;
        return Ok(Json(RegisterWorkosTenantResponse {
            tenant_id: existing_tenant.id,
            user_id: existing_user.id,
            created: false,
        }));
    }

    if let Some(existing_user) = state.users.find_by_email(&input.email).await? {
        match existing_user.workos_user_id.as_deref() {
            None => {
                state
                    .users
                    .set_workos_user_id(&existing_user.id, &input.workos_user_id)
                    .await?;
                tracing::warn!(
                    user_id = %existing_user.id,
                    email = %input.email,
                    "Email pre-existed without WorkOS link; backfilled workos_user_id and reusing the user's current tenant — the freshly created WorkOS Organization will not be linked to this Chronicle Tenant. Investigate / clean up manually if this is unexpected."
                );
                return Ok(Json(RegisterWorkosTenantResponse {
                    tenant_id: existing_user.tenant_id,
                    user_id: existing_user.id,
                    created: false,
                }));
            }
            Some(linked) if linked == input.workos_user_id => {
                return Ok(Json(RegisterWorkosTenantResponse {
                    tenant_id: existing_user.tenant_id,
                    user_id: existing_user.id,
                    created: false,
                }));
            }
            Some(linked) => {
                tracing::warn!(
                    user_id = %existing_user.id,
                    email = %input.email,
                    existing_workos_user_id = linked,
                    incoming_workos_user_id = %input.workos_user_id,
                    "Email already linked to a different WorkOS user — refusing to overwrite",
                );
                return Err(ApiError::bad_request(
                    "email_already_registered_to_different_workos_user",
                ));
            }
        }
    }

    let tenant = state
        .tenants
        .create(CreateTenantInput {
            name: input.name.clone(),
            slug: input.slug.clone(),
        })
        .await?;

    state
        .tenants
        .set_workos_organization_id(&tenant.id, &input.workos_organization_id)
        .await?;

    let user = if let Some(existing) = state
        .users
        .find_by_workos_user_id(&input.workos_user_id)
        .await?
    {
        existing
    } else {
        let display_name = match (input.first_name.as_deref(), input.last_name.as_deref()) {
            (Some(f), Some(l)) if !f.is_empty() && !l.is_empty() => Some(format!("{f} {l}")),
            (Some(f), _) if !f.is_empty() => Some(f.to_string()),
            (_, Some(l)) if !l.is_empty() => Some(l.to_string()),
            _ => None,
        };

        state
            .users
            .create(CreateUserInput {
                email: input.email.clone(),
                name: display_name,
                password_hash: None,
                auth_provider: "workos".to_string(),
                role: UserRole::Owner,
                tenant_id: tenant.id.clone(),
                workos_user_id: Some(input.workos_user_id.clone()),
                created_via: Some("self_serve".to_string()),
            })
            .await?
    };

    Ok(Json(RegisterWorkosTenantResponse {
        tenant_id: tenant.id,
        user_id: user.id,
        created: true,
    }))
}
