use axum::{extract::State, Json};

use chronicle_auth::types::AuthUser;
use chronicle_domain::{DashboardActivityResponse, DashboardStatsResponse};

use super::error::ApiResult;
use crate::saas_state::SaasAppState;

pub async fn stats(
    user: AuthUser,
    State(state): State<SaasAppState>,
) -> ApiResult<Json<DashboardStatsResponse>> {
    let total_runs = state.runs.count_by_tenant(&user.tenant_id).await?;
    let pending_runs = state.runs.count_by_status(&user.tenant_id, "pending").await.unwrap_or(0);
    let completed_runs = state.runs.count_by_status(&user.tenant_id, "completed").await.unwrap_or(0);
    let failed_runs = state.runs.count_by_status(&user.tenant_id, "failed").await.unwrap_or(0);
    let connections = state.connections.list_by_tenant(&user.tenant_id).await?;

    Ok(Json(DashboardStatsResponse {
        total_runs,
        pending_runs,
        completed_runs,
        failed_runs,
        total_connections: connections.len(),
        active_connections: connections.iter().filter(|c| c.status == "active").count(),
    }))
}

pub async fn activity(
    user: AuthUser,
    State(state): State<SaasAppState>,
) -> ApiResult<Json<DashboardActivityResponse>> {
    let logs = state.audit_logs.list_by_tenant(&user.tenant_id, 20, 0).await?;
    Ok(Json(DashboardActivityResponse { activity: logs }))
}
