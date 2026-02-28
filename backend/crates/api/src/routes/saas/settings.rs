use axum::{extract::State, Json};
use chrono::Utc;

use chronicle_auth::types::AuthUser;
use chronicle_domain::AgentEndpointConfig;

use super::error::ApiResult;
use crate::saas_state::SaasAppState;

pub async fn get_agent_endpoint(
    user: AuthUser,
    State(state): State<SaasAppState>,
) -> ApiResult<Json<serde_json::Value>> {
    let config = state.agent_configs.find_by_tenant(&user.tenant_id).await?;
    Ok(Json(serde_json::json!({ "config": config })))
}

#[derive(serde::Deserialize)]
pub struct UpdateAgentEndpointInput {
    pub endpoint_url: Option<String>,
    pub auth_type: Option<String>,
    pub auth_header_name: Option<String>,
    pub basic_username: Option<String>,
}

pub async fn update_agent_endpoint(
    user: AuthUser,
    State(state): State<SaasAppState>,
    Json(input): Json<UpdateAgentEndpointInput>,
) -> ApiResult<Json<serde_json::Value>> {
    let now = Utc::now();
    let config = AgentEndpointConfig {
        id: cuid2::create_id(),
        tenant_id: user.tenant_id.clone(),
        endpoint_url: input.endpoint_url,
        auth_type: input.auth_type.unwrap_or_else(|| "none".to_string()),
        auth_header_name: input.auth_header_name,
        auth_secret_encrypted: None,
        basic_username: input.basic_username,
        custom_headers_json: None,
        created_at: now,
        updated_at: now,
    };

    let saved = state.agent_configs.upsert(&user.tenant_id, config).await?;
    Ok(Json(serde_json::json!({ "config": saved })))
}
