use axum::{
    extract::{Query, State},
    Json,
};

use chronicle_auth::types::AuthUser;

use super::error::ApiResult;
use crate::saas_state::SaasAppState;

#[derive(serde::Deserialize)]
pub struct AuditLogQuery {
    pub limit: Option<usize>,
    pub offset: Option<usize>,
}

pub async fn list_audit_logs(
    user: AuthUser,
    State(state): State<SaasAppState>,
    Query(params): Query<AuditLogQuery>,
) -> ApiResult<Json<serde_json::Value>> {
    let limit = params.limit.unwrap_or(50);
    let offset = params.offset.unwrap_or(0);

    let logs = state.audit_logs.list_by_tenant(&user.tenant_id, limit, offset).await?;

    Ok(Json(serde_json::json!({
        "auditLogs": logs,
        "limit": limit,
        "offset": offset,
    })))
}
