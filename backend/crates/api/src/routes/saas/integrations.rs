use axum::{extract::State, Json};
use serde::{Deserialize, Serialize};

use chronicle_auth::types::AuthUser;
use chronicle_domain::{Connection, ConnectionListResponse, CreateConnectionInput};

use super::error::{ApiError, ApiResult};
use crate::{runtime_config::SaasRuntimeConfig, saas_state::SaasAppState};

#[derive(Debug, Clone)]
pub(crate) struct NangoProviderDescriptor {
    pub provider: &'static str,
    pub display_name: &'static str,
    pub description: &'static str,
    pub integration_id: String,
    pub sync_name: &'static str,
    pub model: &'static str,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NangoProviderSummary {
    pub provider: String,
    pub display_name: String,
    pub description: String,
    pub integration_id: String,
    pub sync_name: String,
    pub model: String,
    pub connection: Option<Connection>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NangoProvidersResponse {
    pub providers: Vec<NangoProviderSummary>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateConnectSessionBody {
    pub provider: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateConnectSessionResponse {
    pub provider: String,
    pub integration_id: String,
    pub session_token: String,
    pub expires_at: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncConnectionBody {
    pub provider: String,
    pub connection_id: String,
    pub provider_config_key: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TriggerSyncBody {
    pub provider: String,
    pub sync_mode: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DisconnectBody {
    pub provider: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NangoConnectionActionResponse {
    pub success: bool,
    pub message: String,
    pub connection: Option<Connection>,
}

pub(crate) fn nango_provider_catalog(config: &SaasRuntimeConfig) -> Vec<NangoProviderDescriptor> {
    vec![
        NangoProviderDescriptor {
            provider: "intercom",
            display_name: "Intercom",
            description: "Sync conversations, replies, contacts, and assignees.",
            integration_id: config.nango.intercom_integration_id.clone(),
            sync_name: "intercom-conversations",
            model: "IntercomConversation",
        },
        NangoProviderDescriptor {
            provider: "front",
            display_name: "Front",
            description: "Sync conversations, messages, comments, inboxes, and assignees.",
            integration_id: config.nango.front_integration_id.clone(),
            sync_name: "front-conversations",
            model: "FrontConversation",
        },
    ]
}

pub(crate) fn nango_provider_by_name<'a>(
    config: &'a SaasRuntimeConfig,
    provider: &str,
) -> Option<NangoProviderDescriptor> {
    nango_provider_catalog(config)
        .into_iter()
        .find(|item| item.provider == provider)
}

pub(crate) fn nango_provider_by_integration_id(
    config: &SaasRuntimeConfig,
    integration_id: &str,
) -> Option<NangoProviderDescriptor> {
    nango_provider_catalog(config)
        .into_iter()
        .find(|item| item.integration_id == integration_id)
}

fn require_nango(state: &SaasAppState) -> ApiResult<&std::sync::Arc<chronicle_nango::NangoClient>> {
    state
        .nango
        .as_ref()
        .ok_or_else(|| ApiError::bad_request("Nango is not configured"))
}

fn merge_metadata(existing: Option<serde_json::Value>, patch: serde_json::Value) -> serde_json::Value {
    let mut map = match existing {
        Some(serde_json::Value::Object(map)) => map,
        _ => serde_json::Map::new(),
    };

    if let serde_json::Value::Object(patch_map) = patch {
        for (key, value) in patch_map {
            map.insert(key, value);
        }
    }

    serde_json::Value::Object(map)
}

pub(crate) async fn materialize_nango_connection(
    state: &SaasAppState,
    tenant_id: &str,
    provider: &str,
    connection_id: &str,
    provider_config_key: &str,
    user: Option<&AuthUser>,
) -> ApiResult<Connection> {
    let existing = state
        .connections
        .find_by_tenant_provider(tenant_id, provider)
        .await?;

    let metadata = merge_metadata(
        existing.as_ref().and_then(|connection| connection.metadata.clone()),
        serde_json::json!({
            "connected_via": "nango",
            "provider_config_key": provider_config_key,
            "connection_id": connection_id,
            "connected_at": chrono::Utc::now().to_rfc3339(),
            "end_user": user.map(|auth_user| serde_json::json!({
                "id": auth_user.id,
                "email": auth_user.email,
                "name": auth_user.name,
            })),
        }),
    );

    state
        .connections
        .upsert_by_tenant_provider(
            CreateConnectionInput {
                tenant_id: tenant_id.to_string(),
                provider: provider.to_string(),
                access_token: existing.as_ref().and_then(|connection| connection.access_token.clone()),
                refresh_token: existing
                    .as_ref()
                    .and_then(|connection| connection.refresh_token.clone()),
                expires_at: existing
                    .as_ref()
                    .and_then(|connection| connection.expires_at.clone()),
                pipedream_auth_id: Some(connection_id.to_string()),
                metadata: Some(metadata),
            },
            "active",
        )
        .await
        .map_err(Into::into)
}

pub(crate) async fn trigger_provider_sync(
    state: &SaasAppState,
    provider: &NangoProviderDescriptor,
    connection: &Connection,
    sync_mode: Option<&str>,
) -> ApiResult<()> {
    let nango = require_nango(state)?;
    let connection_id = connection
        .pipedream_auth_id
        .as_deref()
        .ok_or_else(|| ApiError::bad_request("Connection is missing a Nango connection ID"))?;

    nango
        .trigger_sync(&chronicle_nango::TriggerSyncRequest {
            provider_config_key: provider.integration_id.clone(),
            connection_id: connection_id.to_string(),
            syncs: vec![provider.sync_name.to_string()],
            sync_mode: sync_mode.map(str::to_string),
        })
        .await
        .map_err(|error| {
            tracing::error!(provider = provider.provider, %error, "Failed to trigger Nango sync");
            ApiError::bad_request(format!("Failed to trigger sync: {error}"))
        })?;

    Ok(())
}

pub async fn list_providers(
    user: AuthUser,
    State(state): State<SaasAppState>,
) -> ApiResult<Json<NangoProvidersResponse>> {
    let connections = state.connections.list_by_tenant(&user.tenant_id).await?;

    let providers = nango_provider_catalog(&state.config)
        .into_iter()
        .map(|provider| NangoProviderSummary {
            provider: provider.provider.to_string(),
            display_name: provider.display_name.to_string(),
            description: provider.description.to_string(),
            integration_id: provider.integration_id.clone(),
            sync_name: provider.sync_name.to_string(),
            model: provider.model.to_string(),
            connection: connections
                .iter()
                .find(|connection| connection.provider == provider.provider)
                .cloned(),
        })
        .collect();

    Ok(Json(NangoProvidersResponse { providers }))
}

pub async fn list_nango_connections(
    user: AuthUser,
    State(state): State<SaasAppState>,
) -> ApiResult<Json<ConnectionListResponse>> {
    let providers = nango_provider_catalog(&state.config);
    let allowed: std::collections::HashSet<_> = providers.into_iter().map(|item| item.provider).collect();
    let connections = state
        .connections
        .list_by_tenant(&user.tenant_id)
        .await?
        .into_iter()
        .filter(|connection| allowed.contains(connection.provider.as_str()))
        .collect();

    Ok(Json(ConnectionListResponse { connections }))
}

pub async fn create_connect_session(
    user: AuthUser,
    State(state): State<SaasAppState>,
    Json(body): Json<CreateConnectSessionBody>,
) -> ApiResult<Json<CreateConnectSessionResponse>> {
    let provider = nango_provider_by_name(&state.config, &body.provider)
        .ok_or_else(|| ApiError::bad_request("Unsupported Nango provider"))?;
    let nango = require_nango(&state)?;

    let existing = state
        .connections
        .find_by_tenant_provider(&user.tenant_id, provider.provider)
        .await?;

    let end_user = chronicle_nango::ConnectEndUser {
        id: user.id.clone(),
        email: Some(user.email.clone()),
        display_name: user.name.clone(),
        tags: Some(serde_json::json!({
            "organizationId": user.tenant_id,
            "tenantId": user.tenant_id,
            "tenantSlug": user.tenant_slug,
        })),
    };
    let organization = Some(chronicle_nango::ConnectOrganization {
        id: user.tenant_id.clone(),
        display_name: Some(user.tenant_name.clone()),
    });

    let session = if let Some(connection) = existing.as_ref() {
        if let Some(connection_id) = connection.pipedream_auth_id.as_ref() {
            nango
                .create_reconnect_session(&chronicle_nango::CreateReconnectSessionRequest {
                    connection_id: connection_id.clone(),
                    integration_id: provider.integration_id.clone(),
                    end_user,
                    organization,
                    integrations_config_defaults: None,
                    overrides: None,
                })
                .await
        } else {
            nango
                .create_connect_session(&chronicle_nango::CreateConnectSessionRequest {
                    end_user,
                    organization,
                    allowed_integrations: vec![provider.integration_id.clone()],
                    integrations_config_defaults: None,
                })
                .await
        }
    } else {
        nango
            .create_connect_session(&chronicle_nango::CreateConnectSessionRequest {
                end_user,
                organization,
                allowed_integrations: vec![provider.integration_id.clone()],
                integrations_config_defaults: None,
            })
            .await
    }
    .map_err(|error| {
        tracing::error!(provider = provider.provider, %error, "Failed to create Nango connect session");
        ApiError::bad_request(format!("Failed to create Nango session: {error}"))
    })?;

    Ok(Json(CreateConnectSessionResponse {
        provider: provider.provider.to_string(),
        integration_id: provider.integration_id,
        session_token: session.data.token,
        expires_at: session.data.expires_at,
    }))
}

pub async fn sync_connection(
    user: AuthUser,
    State(state): State<SaasAppState>,
    Json(body): Json<SyncConnectionBody>,
) -> ApiResult<Json<NangoConnectionActionResponse>> {
    let provider = nango_provider_by_name(&state.config, &body.provider)
        .ok_or_else(|| ApiError::bad_request("Unsupported Nango provider"))?;
    let provider_config_key = body
        .provider_config_key
        .as_deref()
        .unwrap_or(provider.integration_id.as_str());

    let connection = materialize_nango_connection(
        &state,
        &user.tenant_id,
        provider.provider,
        &body.connection_id,
        provider_config_key,
        Some(&user),
    )
    .await?;

    trigger_provider_sync(&state, &provider, &connection, Some("incremental")).await?;

    Ok(Json(NangoConnectionActionResponse {
        success: true,
        message: "Connection synced".to_string(),
        connection: Some(connection),
    }))
}

pub async fn trigger_sync(
    user: AuthUser,
    State(state): State<SaasAppState>,
    Json(body): Json<TriggerSyncBody>,
) -> ApiResult<Json<NangoConnectionActionResponse>> {
    let provider = nango_provider_by_name(&state.config, &body.provider)
        .ok_or_else(|| ApiError::bad_request("Unsupported Nango provider"))?;
    let connection = state
        .connections
        .find_by_tenant_provider(&user.tenant_id, provider.provider)
        .await?
        .ok_or_else(|| ApiError::not_found("Connection"))?;

    trigger_provider_sync(&state, &provider, &connection, body.sync_mode.as_deref()).await?;

    Ok(Json(NangoConnectionActionResponse {
        success: true,
        message: "Sync triggered".to_string(),
        connection: Some(connection),
    }))
}

pub async fn disconnect(
    user: AuthUser,
    State(state): State<SaasAppState>,
    Json(body): Json<DisconnectBody>,
) -> ApiResult<Json<NangoConnectionActionResponse>> {
    let provider = nango_provider_by_name(&state.config, &body.provider)
        .ok_or_else(|| ApiError::bad_request("Unsupported Nango provider"))?;
    let connection = state
        .connections
        .find_by_tenant_provider(&user.tenant_id, provider.provider)
        .await?
        .ok_or_else(|| ApiError::not_found("Connection"))?;

    let connection_id = connection
        .pipedream_auth_id
        .as_deref()
        .ok_or_else(|| ApiError::bad_request("Connection is missing a Nango connection ID"))?;

    let provider_config_key = connection
        .metadata
        .as_ref()
        .and_then(|metadata| metadata.get("provider_config_key"))
        .and_then(serde_json::Value::as_str)
        .unwrap_or(provider.integration_id.as_str());

    require_nango(&state)?
        .delete_connection(connection_id, provider_config_key)
        .await
        .map_err(|error| {
            tracing::error!(provider = provider.provider, %error, "Failed to delete Nango connection");
            ApiError::bad_request(format!("Failed to disconnect provider: {error}"))
        })?;

    state.connections.delete(&connection.id).await?;

    Ok(Json(NangoConnectionActionResponse {
        success: true,
        message: "Connection disconnected".to_string(),
        connection: None,
    }))
}
