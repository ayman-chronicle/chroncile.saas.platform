use axum::{extract::State, Json};

use chronicle_auth::types::AuthUser;

use super::error::ApiResult;
use crate::saas_state::SaasAppState;

pub async fn stats(
    user: AuthUser,
    State(state): State<SaasAppState>,
) -> ApiResult<Json<serde_json::Value>> {
    let total_runs = state.runs.count_by_tenant(&user.tenant_id).await?;
    let pending_runs = state.runs.count_by_status(&user.tenant_id, "pending").await.unwrap_or(0);
    let completed_runs = state.runs.count_by_status(&user.tenant_id, "completed").await.unwrap_or(0);
    let failed_runs = state.runs.count_by_status(&user.tenant_id, "failed").await.unwrap_or(0);
    let connections = state.connections.list_by_tenant(&user.tenant_id).await?;

    Ok(Json(serde_json::json!({
        "totalRuns": total_runs,
        "pendingRuns": pending_runs,
        "completedRuns": completed_runs,
        "failedRuns": failed_runs,
        "totalConnections": connections.len(),
        "activeConnections": connections.iter().filter(|c| c.status == "active").count(),
    })))
}

pub async fn activity(
    user: AuthUser,
    State(state): State<SaasAppState>,
) -> ApiResult<Json<serde_json::Value>> {
    let logs = state.audit_logs.list_by_tenant(&user.tenant_id, 20, 0).await?;
    Ok(Json(serde_json::json!({ "activity": logs })))
}
