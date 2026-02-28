use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};

use chronicle_auth::types::AuthUser;
use chronicle_domain::CreateRunInput;

use super::error::{ApiError, ApiResult};
use crate::saas_state::SaasAppState;

#[derive(serde::Deserialize)]
pub struct ListRunsQuery {
    pub status: Option<String>,
    pub limit: Option<usize>,
    pub offset: Option<usize>,
}

pub async fn list_runs(
    user: AuthUser,
    State(state): State<SaasAppState>,
    Query(params): Query<ListRunsQuery>,
) -> ApiResult<Json<serde_json::Value>> {
    let limit = params.limit.unwrap_or(50);
    let offset = params.offset.unwrap_or(0);

    let runs = state.runs.list_by_tenant(
        &user.tenant_id,
        params.status.as_deref(),
        limit,
        offset,
    ).await?;

    let total = state.runs.count_by_tenant(&user.tenant_id).await.unwrap_or(0);

    Ok(Json(serde_json::json!({
        "runs": runs,
        "total": total,
        "limit": limit,
        "offset": offset,
    })))
}

#[derive(serde::Deserialize)]
pub struct CreateRunRequest {
    pub event_id: String,
    pub invocation_id: String,
    pub mode: Option<String>,
    pub workflow_id: Option<String>,
    pub event_snapshot: Option<serde_json::Value>,
    pub context_pointers: Option<serde_json::Value>,
}

pub async fn create_run(
    user: AuthUser,
    State(state): State<SaasAppState>,
    Json(input): Json<CreateRunRequest>,
) -> ApiResult<(StatusCode, Json<serde_json::Value>)> {
    let run = state.runs.create(CreateRunInput {
        tenant_id: user.tenant_id.clone(),
        workflow_id: input.workflow_id,
        event_id: input.event_id,
        invocation_id: input.invocation_id,
        mode: input.mode.unwrap_or_else(|| "auto".to_string()),
        event_snapshot: input.event_snapshot,
        context_pointers: input.context_pointers,
    }).await?;

    state.audit_logs.create(
        &user.tenant_id, "run.created", Some(&user.id),
        Some(&run.id), None, Some(&run.invocation_id), None,
    ).await.ok();

    Ok((StatusCode::CREATED, Json(serde_json::json!({ "run": run }))))
}

pub async fn get_run(
    user: AuthUser,
    State(state): State<SaasAppState>,
    Path(id): Path<String>,
) -> ApiResult<Json<serde_json::Value>> {
    let run = state.runs.find_by_id(&id).await?
        .ok_or_else(|| ApiError::not_found("Run"))?;

    if run.tenant_id != user.tenant_id {
        return Err(ApiError::not_found("Run"));
    }

    let audit_logs = state.audit_logs.list_by_run(&id).await.unwrap_or_default();

    Ok(Json(serde_json::json!({
        "run": run,
        "auditLogs": audit_logs,
    })))
}

#[derive(serde::Deserialize)]
pub struct UpdateRunStatusRequest {
    pub status: String,
}

pub async fn update_run_status(
    user: AuthUser,
    State(state): State<SaasAppState>,
    Path(id): Path<String>,
    Json(input): Json<UpdateRunStatusRequest>,
) -> ApiResult<Json<serde_json::Value>> {
    let run = state.runs.find_by_id(&id).await?
        .ok_or_else(|| ApiError::not_found("Run"))?;

    if run.tenant_id != user.tenant_id {
        return Err(ApiError::not_found("Run"));
    }

    let updated = state.runs.update_status(&id, &input.status).await?;

    state.audit_logs.create(
        &user.tenant_id,
        &format!("run.status_changed.{}", input.status),
        Some(&user.id),
        Some(&id), None, Some(&run.invocation_id), None,
    ).await.ok();

    Ok(Json(serde_json::json!({ "run": updated })))
}
