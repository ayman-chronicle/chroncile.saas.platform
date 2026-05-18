//! Environment authoring API for world-backed backtests.
//!
//! These endpoints expose the immutable environment/version catalog
//! that the backtest job compiler resolves before the orchestrator
//! starts trials.

use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use chronicle_auth::types::AuthUser;
use chronicle_domain::{
    CreateEnvironmentInput, CreateEnvironmentVersionInput, EnvironmentRecord, EnvironmentSpec,
    EnvironmentVersionRecord, EnvironmentVersionStatus,
};
use chronicle_interfaces::{EnvironmentRepository, EnvironmentVersionRepository};
use serde::{Deserialize, Serialize};

use super::backtests::routes::require_service;
use super::error::{ApiError, ApiResult};
use crate::saas_state::SaasAppState;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EnvironmentWithVersions {
    pub environment: EnvironmentRecord,
    pub versions: Vec<EnvironmentVersionRecord>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ListEnvironmentsResponse {
    pub environments: Vec<EnvironmentWithVersions>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateEnvironmentRequest {
    pub slug: String,
    pub label: String,
    #[serde(default)]
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EnvironmentResponse {
    pub environment: EnvironmentRecord,
    #[serde(default)]
    pub versions: Vec<EnvironmentVersionRecord>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateEnvironmentVersionRequest {
    pub version: String,
    #[serde(default)]
    pub spec: EnvironmentSpec,
    #[serde(default = "default_version_status")]
    pub status: EnvironmentVersionStatus,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EnvironmentVersionResponse {
    pub environment: EnvironmentRecord,
    pub version: EnvironmentVersionRecord,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CompileEnvironmentVersionRequest {
    pub dataset_snapshot_id: String,
    pub scenario_id: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CompileEnvironmentVersionResponse {
    pub environment_id: String,
    pub environment_slug: String,
    pub version_id: String,
    pub version: String,
    pub tenant_id: String,
    pub dataset_snapshot_id: String,
    pub scenario_id: String,
    pub bundle_id: String,
    pub sha256: String,
    pub uri: String,
    pub package_uri: String,
    pub root_dir: String,
    pub size_bytes: u64,
    pub warnings: Vec<String>,
    pub manifest: serde_json::Value,
}

fn default_version_status() -> EnvironmentVersionStatus {
    EnvironmentVersionStatus::Draft
}

pub async fn list_environments(
    user: AuthUser,
    State(state): State<SaasAppState>,
) -> ApiResult<Json<ListEnvironmentsResponse>> {
    let (envs, versions) = require_environment_repositories(&state)?;
    let environments = envs.list_by_tenant(&user.tenant_id).await?;
    let mut rows = Vec::with_capacity(environments.len());
    for environment in environments {
        let version_rows = versions
            .list_by_environment(&user.tenant_id, &environment.id)
            .await?;
        rows.push(EnvironmentWithVersions {
            environment,
            versions: version_rows,
        });
    }
    Ok(Json(ListEnvironmentsResponse { environments: rows }))
}

pub async fn create_environment(
    user: AuthUser,
    State(state): State<SaasAppState>,
    Json(req): Json<CreateEnvironmentRequest>,
) -> ApiResult<(StatusCode, Json<EnvironmentResponse>)> {
    let (envs, _) = require_environment_repositories(&state)?;
    let slug = req.slug.trim();
    let label = req.label.trim();
    if slug.is_empty() {
        return Err(ApiError::bad_request("environment slug must be non-empty"));
    }
    if label.is_empty() {
        return Err(ApiError::bad_request("environment label must be non-empty"));
    }
    if envs.find_by_slug(&user.tenant_id, slug).await?.is_some() {
        return Err(ApiError::conflict(format!(
            "environment slug '{slug}' already exists"
        )));
    }
    let environment = envs
        .create(CreateEnvironmentInput {
            tenant_id: user.tenant_id,
            slug: slug.to_string(),
            label: label.to_string(),
            description: req
                .description
                .and_then(|d| (!d.trim().is_empty()).then(|| d.trim().to_string())),
        })
        .await?;
    Ok((
        StatusCode::CREATED,
        Json(EnvironmentResponse {
            environment,
            versions: Vec::new(),
        }),
    ))
}

pub async fn get_environment(
    user: AuthUser,
    State(state): State<SaasAppState>,
    Path(environment_id): Path<String>,
) -> ApiResult<Json<EnvironmentResponse>> {
    let (envs, versions) = require_environment_repositories(&state)?;
    let environment =
        find_environment_by_id_or_slug(envs, &user.tenant_id, &environment_id).await?;
    let version_rows = versions
        .list_by_environment(&user.tenant_id, &environment.id)
        .await?;
    Ok(Json(EnvironmentResponse {
        environment,
        versions: version_rows,
    }))
}

pub async fn list_versions(
    user: AuthUser,
    State(state): State<SaasAppState>,
    Path(environment_id): Path<String>,
) -> ApiResult<Json<Vec<EnvironmentVersionRecord>>> {
    let (envs, versions) = require_environment_repositories(&state)?;
    let environment =
        find_environment_by_id_or_slug(envs, &user.tenant_id, &environment_id).await?;
    Ok(Json(
        versions
            .list_by_environment(&user.tenant_id, &environment.id)
            .await?,
    ))
}

pub async fn create_version(
    user: AuthUser,
    State(state): State<SaasAppState>,
    Path(environment_id): Path<String>,
    Json(req): Json<CreateEnvironmentVersionRequest>,
) -> ApiResult<(StatusCode, Json<EnvironmentVersionResponse>)> {
    let (envs, versions) = require_environment_repositories(&state)?;
    let environment =
        find_environment_by_id_or_slug(envs, &user.tenant_id, &environment_id).await?;
    let version = req.version.trim();
    if version.is_empty() {
        return Err(ApiError::bad_request(
            "environment version must be non-empty",
        ));
    }
    if versions
        .find_by_environment_version(&user.tenant_id, &environment.id, version)
        .await?
        .is_some()
    {
        return Err(ApiError::conflict(format!(
            "environment version '{version}' already exists"
        )));
    }
    let version = versions
        .create(CreateEnvironmentVersionInput {
            environment_id: environment.id.clone(),
            tenant_id: user.tenant_id,
            version: version.to_string(),
            spec: req.spec,
            status: req.status,
        })
        .await?;
    Ok((
        StatusCode::CREATED,
        Json(EnvironmentVersionResponse {
            environment,
            version,
        }),
    ))
}

pub async fn get_version(
    user: AuthUser,
    State(state): State<SaasAppState>,
    Path((environment_id, version_selector)): Path<(String, String)>,
) -> ApiResult<Json<EnvironmentVersionResponse>> {
    let (envs, versions) = require_environment_repositories(&state)?;
    let environment =
        find_environment_by_id_or_slug(envs, &user.tenant_id, &environment_id).await?;

    let by_id = versions
        .find_by_id(&user.tenant_id, &version_selector)
        .await?
        .filter(|version| version.environment_id == environment.id);
    let version = match by_id {
        Some(version) => version,
        None => versions
            .find_by_environment_version(&user.tenant_id, &environment.id, &version_selector)
            .await?
            .ok_or_else(|| ApiError::not_found("Environment version"))?,
    };

    Ok(Json(EnvironmentVersionResponse {
        environment,
        version,
    }))
}

pub async fn compile_version(
    user: AuthUser,
    State(state): State<SaasAppState>,
    Path((environment_id, version_selector)): Path<(String, String)>,
    Json(req): Json<CompileEnvironmentVersionRequest>,
) -> ApiResult<Json<CompileEnvironmentVersionResponse>> {
    let (envs, versions) = require_environment_repositories(&state)?;
    let environment =
        find_environment_by_id_or_slug(envs, &user.tenant_id, &environment_id).await?;
    let version = find_version_by_id_or_name(
        versions,
        &user.tenant_id,
        &environment.id,
        &version_selector,
    )
    .await?;
    if version.status != EnvironmentVersionStatus::Published {
        return Err(ApiError::bad_request(format!(
            "environment version '{}' is not published",
            version.id
        )));
    }
    let dataset_snapshot_id = req.dataset_snapshot_id.trim();
    let scenario_id = req.scenario_id.trim();
    if dataset_snapshot_id.is_empty() {
        return Err(ApiError::bad_request("datasetSnapshotId must be non-empty"));
    }
    if scenario_id.is_empty() {
        return Err(ApiError::bad_request("scenarioId must be non-empty"));
    }

    let service = require_service(&state)?;
    let dataset_snapshot = service
        .availability
        .dataset_snapshots
        .get(dataset_snapshot_id)
        .ok_or_else(|| {
            ApiError::bad_request(format!(
                "no snapshot found for dataset '{dataset_snapshot_id}'"
            ))
        })?;
    let compiler = service
        .job_compiler
        .as_deref()
        .ok_or_else(|| ApiError::bad_request("World compiler is not enabled"))?;
    let compiled = compiler
        .compile_environment_version(
            &user.tenant_id,
            &version,
            dataset_snapshot_id,
            scenario_id,
            Some(dataset_snapshot),
        )
        .await?;

    Ok(Json(CompileEnvironmentVersionResponse {
        environment_id: environment.id,
        environment_slug: environment.slug,
        version_id: version.id,
        version: version.version,
        tenant_id: user.tenant_id,
        dataset_snapshot_id: dataset_snapshot_id.to_string(),
        scenario_id: scenario_id.to_string(),
        bundle_id: compiled.bundle.id,
        sha256: compiled.bundle.sha256,
        uri: compiled.bundle.uri.clone(),
        package_uri: compiled.bundle.uri,
        root_dir: compiled.root_dir.display().to_string(),
        size_bytes: compiled.size_bytes,
        warnings: compiled.warnings,
        manifest: compiled.manifest,
    }))
}

async fn find_environment_by_id_or_slug(
    envs: &dyn EnvironmentRepository,
    tenant_id: &str,
    selector: &str,
) -> ApiResult<EnvironmentRecord> {
    if let Some(environment) = envs.find_by_id(tenant_id, selector).await? {
        return Ok(environment);
    }
    envs.find_by_slug(tenant_id, selector)
        .await?
        .ok_or_else(|| ApiError::not_found("Environment"))
}

async fn find_version_by_id_or_name(
    versions: &dyn EnvironmentVersionRepository,
    tenant_id: &str,
    environment_id: &str,
    selector: &str,
) -> ApiResult<EnvironmentVersionRecord> {
    let by_id = versions
        .find_by_id(tenant_id, selector)
        .await?
        .filter(|version| version.environment_id == environment_id);
    match by_id {
        Some(version) => Ok(version),
        None => versions
            .find_by_environment_version(tenant_id, environment_id, selector)
            .await?
            .ok_or_else(|| ApiError::not_found("Environment version")),
    }
}

fn require_environment_repositories(
    state: &SaasAppState,
) -> ApiResult<(
    &dyn EnvironmentRepository,
    &dyn EnvironmentVersionRepository,
)> {
    let service = require_service(state)?;
    let envs = service
        .environments_repo
        .as_deref()
        .ok_or_else(|| ApiError::bad_request("Environment repository is not enabled"))?;
    let versions = service
        .environment_versions_repo
        .as_deref()
        .ok_or_else(|| ApiError::bad_request("Environment version repository is not enabled"))?;
    Ok((envs, versions))
}
