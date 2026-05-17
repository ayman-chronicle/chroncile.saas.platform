//! Postgres world simulator repositories.

use async_trait::async_trait;
use chronicle_domain::{
    BacktestTrialInteractionRecord, BacktestTrialWorldRunRecord,
    CreateBacktestTrialInteractionInput, CreateBacktestTrialWorldRunInput, CreateEnvironmentInput,
    CreateEnvironmentVersionInput, CreateWorldBundleInput, EnvironmentRecord, EnvironmentSpec,
    EnvironmentVersionRecord, EnvironmentVersionStatus, InteractionKind, MatchKind,
    WorldBundleRecord, WorldRunStatus,
};
use chronicle_interfaces::{
    BacktestTrialInteractionRepository, BacktestTrialWorldRunRepository, EnvironmentRepository,
    EnvironmentVersionRepository, RepoError, RepoResult, WorldBundleRepository,
};
use chronicle_store::postgres::TracedPgPool;
use chrono::{DateTime, NaiveDateTime, TimeZone, Utc};
use sqlx::Row;

fn new_id() -> String {
    cuid2::create_id()
}

fn naive_to_utc(naive: NaiveDateTime) -> DateTime<Utc> {
    Utc.from_utc_datetime(&naive)
}

fn to_repo_err(e: sqlx::Error) -> RepoError {
    match &e {
        sqlx::Error::Database(db_err) if db_err.constraint().is_some() => {
            RepoError::AlreadyExists(db_err.to_string())
        }
        sqlx::Error::RowNotFound => RepoError::NotFound("row not found".to_string()),
        _ => RepoError::Internal(e.to_string()),
    }
}

fn env_status_str(s: EnvironmentVersionStatus) -> &'static str {
    match s {
        EnvironmentVersionStatus::Draft => "draft",
        EnvironmentVersionStatus::Published => "published",
        EnvironmentVersionStatus::Archived => "archived",
    }
}

fn parse_env_status(s: &str) -> Result<EnvironmentVersionStatus, sqlx::Error> {
    Ok(match s {
        "draft" => EnvironmentVersionStatus::Draft,
        "published" => EnvironmentVersionStatus::Published,
        "archived" => EnvironmentVersionStatus::Archived,
        other => {
            return Err(sqlx::Error::Decode(
                format!("unknown env status {other}").into(),
            ))
        }
    })
}

fn world_status_str(s: WorldRunStatus) -> &'static str {
    match s {
        WorldRunStatus::Starting => "starting",
        WorldRunStatus::Ready => "ready",
        WorldRunStatus::Exported => "exported",
        WorldRunStatus::Failed => "failed",
    }
}

fn parse_world_status(s: &str) -> Result<WorldRunStatus, sqlx::Error> {
    Ok(match s {
        "starting" => WorldRunStatus::Starting,
        "ready" => WorldRunStatus::Ready,
        "exported" => WorldRunStatus::Exported,
        "failed" => WorldRunStatus::Failed,
        other => {
            return Err(sqlx::Error::Decode(
                format!("unknown world run status {other}").into(),
            ))
        }
    })
}

fn interaction_kind_str(s: InteractionKind) -> &'static str {
    match s {
        InteractionKind::Http => "http",
        InteractionKind::Mcp => "mcp",
        InteractionKind::Sql => "sql",
        InteractionKind::Tool => "tool",
    }
}

fn parse_interaction_kind(s: &str) -> Result<InteractionKind, sqlx::Error> {
    Ok(match s {
        "http" => InteractionKind::Http,
        "mcp" => InteractionKind::Mcp,
        "sql" => InteractionKind::Sql,
        "tool" => InteractionKind::Tool,
        other => return Err(sqlx::Error::Decode(format!("unknown kind {other}").into())),
    })
}

fn match_kind_str(s: MatchKind) -> &'static str {
    match s {
        MatchKind::Replay => "replay",
        MatchKind::Spec => "spec",
        MatchKind::Fallback => "fallback",
        MatchKind::Unmatched => "unmatched",
        MatchKind::Llm => "llm",
        MatchKind::Blocked => "blocked",
        MatchKind::PassthroughRecorded => "passthrough_recorded",
    }
}

fn parse_match_kind(s: &str) -> Result<MatchKind, sqlx::Error> {
    Ok(match s {
        "replay" => MatchKind::Replay,
        "spec" => MatchKind::Spec,
        "fallback" => MatchKind::Fallback,
        "unmatched" => MatchKind::Unmatched,
        "llm" => MatchKind::Llm,
        "blocked" => MatchKind::Blocked,
        "passthrough_recorded" => MatchKind::PassthroughRecorded,
        other => {
            return Err(sqlx::Error::Decode(
                format!("unknown match kind {other}").into(),
            ))
        }
    })
}

fn environment_from_row(row: sqlx::postgres::PgRow) -> Result<EnvironmentRecord, sqlx::Error> {
    Ok(EnvironmentRecord {
        id: row.try_get("id")?,
        tenant_id: row.try_get("tenantId")?,
        slug: row.try_get("slug")?,
        label: row.try_get("label")?,
        description: row.try_get("description")?,
        created_at: naive_to_utc(row.try_get("createdAt")?),
        archived_at: row
            .try_get::<Option<NaiveDateTime>, _>("archivedAt")?
            .map(naive_to_utc),
    })
}

fn version_from_row(row: sqlx::postgres::PgRow) -> Result<EnvironmentVersionRecord, sqlx::Error> {
    let status: String = row.try_get("status")?;
    let spec: serde_json::Value = row.try_get("spec")?;
    let spec: EnvironmentSpec =
        serde_json::from_value(spec).map_err(|e| sqlx::Error::Decode(e.to_string().into()))?;
    Ok(EnvironmentVersionRecord {
        id: row.try_get("id")?,
        environment_id: row.try_get("environmentId")?,
        tenant_id: row.try_get("tenantId")?,
        version: row.try_get("version")?,
        spec,
        status: parse_env_status(&status)?,
        created_at: naive_to_utc(row.try_get("createdAt")?),
    })
}

fn bundle_from_row(row: sqlx::postgres::PgRow) -> Result<WorldBundleRecord, sqlx::Error> {
    let size: i64 = row.try_get("sizeBytes")?;
    Ok(WorldBundleRecord {
        id: row.try_get("id")?,
        tenant_id: row.try_get("tenantId")?,
        environment_version_id: row.try_get("environmentVersionId")?,
        dataset_snapshot_id: row.try_get("datasetSnapshotId")?,
        scenario_id: row.try_get("scenarioId")?,
        sha256: row.try_get("sha256")?,
        uri: row.try_get("uri")?,
        size_bytes: size.max(0) as u64,
        manifest: row.try_get("manifest")?,
        created_at: naive_to_utc(row.try_get("createdAt")?),
        expires_at: row
            .try_get::<Option<NaiveDateTime>, _>("expiresAt")?
            .map(naive_to_utc),
    })
}

fn world_run_from_row(
    row: sqlx::postgres::PgRow,
) -> Result<BacktestTrialWorldRunRecord, sqlx::Error> {
    let status: String = row.try_get("status")?;
    let attempt: i32 = row.try_get("attempt")?;
    Ok(BacktestTrialWorldRunRecord {
        id: row.try_get("id")?,
        trial_id: row.try_get("trialId")?,
        attempt: attempt.max(0) as u32,
        world_bundle_id: row.try_get("worldBundleId")?,
        fault_scenario_id: row.try_get("faultScenarioId")?,
        status: parse_world_status(&status)?,
        started_at: naive_to_utc(row.try_get("startedAt")?),
        finished_at: row
            .try_get::<Option<NaiveDateTime>, _>("finishedAt")?
            .map(naive_to_utc),
        exit_code: row.try_get("exitCode")?,
        logs_uri: row.try_get("logsUri")?,
        export_uri: row.try_get("exportUri")?,
        coverage: row.try_get("coverage")?,
    })
}

fn interaction_from_row(
    row: sqlx::postgres::PgRow,
) -> Result<BacktestTrialInteractionRecord, sqlx::Error> {
    let kind: String = row.try_get("kind")?;
    let match_kind: String = row.try_get("matchKind")?;
    let ordinal: i32 = row.try_get("ordinal")?;
    let status_code: Option<i32> = row.try_get("statusCode")?;
    let duration_ms: Option<i32> = row.try_get("durationMs")?;
    Ok(BacktestTrialInteractionRecord {
        id: row.try_get("id")?,
        world_run_id: row.try_get("worldRunId")?,
        trial_id: row.try_get("trialId")?,
        ordinal: ordinal.max(0) as u32,
        kind: parse_interaction_kind(&kind)?,
        service: row.try_get("service")?,
        method_path: row.try_get("methodPath")?,
        request_fingerprint: row.try_get("requestFingerprint")?,
        match_kind: parse_match_kind(&match_kind)?,
        status_code: status_code.and_then(|n| u16::try_from(n).ok()),
        duration_ms: duration_ms.and_then(|n| u32::try_from(n).ok()),
        payload_uri: row.try_get("payloadUri")?,
        created_at: naive_to_utc(row.try_get("createdAt")?),
    })
}

#[derive(Clone)]
pub struct PgEnvironmentRepo {
    pool: TracedPgPool,
}

impl PgEnvironmentRepo {
    pub fn new(pool: TracedPgPool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl EnvironmentRepository for PgEnvironmentRepo {
    async fn create(&self, input: CreateEnvironmentInput) -> RepoResult<EnvironmentRecord> {
        let id = new_id();
        sqlx::query(
            r#"
            INSERT INTO "Environment" (id, "tenantId", slug, label, description)
            VALUES ($1, $2, $3, $4, $5)
            "#,
        )
        .bind(&id)
        .bind(&input.tenant_id)
        .bind(&input.slug)
        .bind(&input.label)
        .bind(input.description)
        .execute(&self.pool)
        .await
        .map_err(to_repo_err)?;
        self.find_by_id(&input.tenant_id, &id)
            .await?
            .ok_or_else(|| RepoError::Internal("environment missing after insert".to_string()))
    }

    async fn find_by_id(&self, tenant_id: &str, id: &str) -> RepoResult<Option<EnvironmentRecord>> {
        sqlx::query(r#"SELECT * FROM "Environment" WHERE "tenantId" = $1 AND id = $2"#)
            .bind(tenant_id)
            .bind(id)
            .try_map(environment_from_row)
            .fetch_optional(&self.pool)
            .await
            .map_err(to_repo_err)
    }

    async fn find_by_slug(
        &self,
        tenant_id: &str,
        slug: &str,
    ) -> RepoResult<Option<EnvironmentRecord>> {
        sqlx::query(r#"SELECT * FROM "Environment" WHERE "tenantId" = $1 AND slug = $2"#)
            .bind(tenant_id)
            .bind(slug)
            .try_map(environment_from_row)
            .fetch_optional(&self.pool)
            .await
            .map_err(to_repo_err)
    }

    async fn list_by_tenant(&self, tenant_id: &str) -> RepoResult<Vec<EnvironmentRecord>> {
        sqlx::query(r#"SELECT * FROM "Environment" WHERE "tenantId" = $1 ORDER BY slug ASC"#)
            .bind(tenant_id)
            .try_map(environment_from_row)
            .fetch_all(&self.pool)
            .await
            .map_err(to_repo_err)
    }
}

#[derive(Clone)]
pub struct PgEnvironmentVersionRepo {
    pool: TracedPgPool,
}

impl PgEnvironmentVersionRepo {
    pub fn new(pool: TracedPgPool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl EnvironmentVersionRepository for PgEnvironmentVersionRepo {
    async fn create(
        &self,
        input: CreateEnvironmentVersionInput,
    ) -> RepoResult<EnvironmentVersionRecord> {
        let id = new_id();
        let spec =
            serde_json::to_value(&input.spec).map_err(|e| RepoError::Internal(e.to_string()))?;
        sqlx::query(
            r#"
            INSERT INTO "EnvironmentVersion"
                (id, "environmentId", "tenantId", version, spec, status)
            VALUES ($1, $2, $3, $4, $5, $6)
            "#,
        )
        .bind(&id)
        .bind(&input.environment_id)
        .bind(&input.tenant_id)
        .bind(&input.version)
        .bind(spec)
        .bind(env_status_str(input.status))
        .execute(&self.pool)
        .await
        .map_err(to_repo_err)?;
        self.find_by_id(&input.tenant_id, &id)
            .await?
            .ok_or_else(|| {
                RepoError::Internal("environment version missing after insert".to_string())
            })
    }

    async fn find_by_id(
        &self,
        tenant_id: &str,
        id: &str,
    ) -> RepoResult<Option<EnvironmentVersionRecord>> {
        sqlx::query(r#"SELECT * FROM "EnvironmentVersion" WHERE "tenantId" = $1 AND id = $2"#)
            .bind(tenant_id)
            .bind(id)
            .try_map(version_from_row)
            .fetch_optional(&self.pool)
            .await
            .map_err(to_repo_err)
    }

    async fn find_by_environment_version(
        &self,
        tenant_id: &str,
        environment_id: &str,
        version: &str,
    ) -> RepoResult<Option<EnvironmentVersionRecord>> {
        sqlx::query(
            r#"
            SELECT * FROM "EnvironmentVersion"
            WHERE "tenantId" = $1 AND "environmentId" = $2 AND version = $3
            "#,
        )
        .bind(tenant_id)
        .bind(environment_id)
        .bind(version)
        .try_map(version_from_row)
        .fetch_optional(&self.pool)
        .await
        .map_err(to_repo_err)
    }

    async fn list_by_environment(
        &self,
        tenant_id: &str,
        environment_id: &str,
    ) -> RepoResult<Vec<EnvironmentVersionRecord>> {
        sqlx::query(
            r#"
            SELECT * FROM "EnvironmentVersion"
            WHERE "tenantId" = $1 AND "environmentId" = $2
            ORDER BY "createdAt" DESC
            "#,
        )
        .bind(tenant_id)
        .bind(environment_id)
        .try_map(version_from_row)
        .fetch_all(&self.pool)
        .await
        .map_err(to_repo_err)
    }

    async fn update_status(
        &self,
        tenant_id: &str,
        id: &str,
        status: EnvironmentVersionStatus,
    ) -> RepoResult<EnvironmentVersionRecord> {
        sqlx::query(
            r#"
            UPDATE "EnvironmentVersion"
            SET status = $3
            WHERE "tenantId" = $1 AND id = $2
            RETURNING *
            "#,
        )
        .bind(tenant_id)
        .bind(id)
        .bind(env_status_str(status))
        .try_map(version_from_row)
        .fetch_one(&self.pool)
        .await
        .map_err(to_repo_err)
    }
}

#[derive(Clone)]
pub struct PgWorldBundleRepo {
    pool: TracedPgPool,
}

impl PgWorldBundleRepo {
    pub fn new(pool: TracedPgPool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl WorldBundleRepository for PgWorldBundleRepo {
    async fn create_or_get_by_hash(
        &self,
        input: CreateWorldBundleInput,
    ) -> RepoResult<WorldBundleRecord> {
        if let Some(existing) = self.find_by_sha256(&input.tenant_id, &input.sha256).await? {
            return Ok(existing);
        }
        let id = new_id();
        sqlx::query(
            r#"
            INSERT INTO "WorldBundle" (
                id, "tenantId", "environmentVersionId", "datasetSnapshotId",
                "scenarioId", sha256, uri, "sizeBytes", manifest, "expiresAt"
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT ("tenantId", sha256) DO NOTHING
            "#,
        )
        .bind(&id)
        .bind(&input.tenant_id)
        .bind(&input.environment_version_id)
        .bind(&input.dataset_snapshot_id)
        .bind(&input.scenario_id)
        .bind(&input.sha256)
        .bind(&input.uri)
        .bind(i64::try_from(input.size_bytes).unwrap_or(i64::MAX))
        .bind(&input.manifest)
        .bind(input.expires_at.map(|t| t.naive_utc()))
        .execute(&self.pool)
        .await
        .map_err(to_repo_err)?;
        self.find_by_sha256(&input.tenant_id, &input.sha256)
            .await?
            .ok_or_else(|| RepoError::Internal("world bundle missing after insert".to_string()))
    }

    async fn find_by_id(&self, tenant_id: &str, id: &str) -> RepoResult<Option<WorldBundleRecord>> {
        sqlx::query(r#"SELECT * FROM "WorldBundle" WHERE "tenantId" = $1 AND id = $2"#)
            .bind(tenant_id)
            .bind(id)
            .try_map(bundle_from_row)
            .fetch_optional(&self.pool)
            .await
            .map_err(to_repo_err)
    }

    async fn find_by_sha256(
        &self,
        tenant_id: &str,
        sha256: &str,
    ) -> RepoResult<Option<WorldBundleRecord>> {
        sqlx::query(r#"SELECT * FROM "WorldBundle" WHERE "tenantId" = $1 AND sha256 = $2"#)
            .bind(tenant_id)
            .bind(sha256)
            .try_map(bundle_from_row)
            .fetch_optional(&self.pool)
            .await
            .map_err(to_repo_err)
    }
}

#[derive(Clone)]
pub struct PgBacktestTrialWorldRunRepo {
    pool: TracedPgPool,
}

impl PgBacktestTrialWorldRunRepo {
    pub fn new(pool: TracedPgPool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl BacktestTrialWorldRunRepository for PgBacktestTrialWorldRunRepo {
    async fn create(
        &self,
        input: CreateBacktestTrialWorldRunInput,
    ) -> RepoResult<BacktestTrialWorldRunRecord> {
        let id = new_id();
        sqlx::query(
            r#"
            INSERT INTO "BacktestTrialWorldRun"
                (id, "trialId", attempt, "worldBundleId", "faultScenarioId", status)
            VALUES ($1, $2, $3, $4, $5, 'starting')
            "#,
        )
        .bind(&id)
        .bind(&input.trial_id)
        .bind(input.attempt as i32)
        .bind(&input.world_bundle_id)
        .bind(input.fault_scenario_id)
        .execute(&self.pool)
        .await
        .map_err(to_repo_err)?;
        sqlx::query(r#"SELECT * FROM "BacktestTrialWorldRun" WHERE id = $1"#)
            .bind(&id)
            .try_map(world_run_from_row)
            .fetch_one(&self.pool)
            .await
            .map_err(to_repo_err)
    }

    async fn update_status(
        &self,
        id: &str,
        status: WorldRunStatus,
        exit_code: Option<i32>,
        logs_uri: Option<&str>,
        export_uri: Option<&str>,
        coverage: Option<serde_json::Value>,
    ) -> RepoResult<BacktestTrialWorldRunRecord> {
        let finished_at = matches!(status, WorldRunStatus::Exported | WorldRunStatus::Failed)
            .then(|| Utc::now().naive_utc());
        sqlx::query(
            r#"
            UPDATE "BacktestTrialWorldRun"
            SET status = $2,
                "finishedAt" = COALESCE($3, "finishedAt"),
                "exitCode" = COALESCE($4, "exitCode"),
                "logsUri" = COALESCE($5, "logsUri"),
                "exportUri" = COALESCE($6, "exportUri"),
                coverage = COALESCE($7, coverage)
            WHERE id = $1
            RETURNING *
            "#,
        )
        .bind(id)
        .bind(world_status_str(status))
        .bind(finished_at)
        .bind(exit_code)
        .bind(logs_uri)
        .bind(export_uri)
        .bind(coverage)
        .try_map(world_run_from_row)
        .fetch_one(&self.pool)
        .await
        .map_err(to_repo_err)
    }

    async fn list_by_trial(&self, trial_id: &str) -> RepoResult<Vec<BacktestTrialWorldRunRecord>> {
        sqlx::query(
            r#"
            SELECT * FROM "BacktestTrialWorldRun"
            WHERE "trialId" = $1
            ORDER BY attempt ASC, "startedAt" ASC
            "#,
        )
        .bind(trial_id)
        .try_map(world_run_from_row)
        .fetch_all(&self.pool)
        .await
        .map_err(to_repo_err)
    }
}

#[derive(Clone)]
pub struct PgBacktestTrialInteractionRepo {
    pool: TracedPgPool,
}

impl PgBacktestTrialInteractionRepo {
    pub fn new(pool: TracedPgPool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl BacktestTrialInteractionRepository for PgBacktestTrialInteractionRepo {
    async fn create(
        &self,
        input: CreateBacktestTrialInteractionInput,
    ) -> RepoResult<BacktestTrialInteractionRecord> {
        let id = new_id();
        sqlx::query(
            r#"
            INSERT INTO "BacktestTrialInteraction" (
                id, "worldRunId", "trialId", ordinal, kind, service, "methodPath",
                "requestFingerprint", "matchKind", "statusCode", "durationMs", "payloadUri"
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            "#,
        )
        .bind(&id)
        .bind(&input.world_run_id)
        .bind(&input.trial_id)
        .bind(input.ordinal as i32)
        .bind(interaction_kind_str(input.kind))
        .bind(&input.service)
        .bind(&input.method_path)
        .bind(&input.request_fingerprint)
        .bind(match_kind_str(input.match_kind))
        .bind(input.status_code.map(i32::from))
        .bind(input.duration_ms.map(|n| n as i32))
        .bind(input.payload_uri)
        .execute(&self.pool)
        .await
        .map_err(to_repo_err)?;
        sqlx::query(r#"SELECT * FROM "BacktestTrialInteraction" WHERE id = $1"#)
            .bind(&id)
            .try_map(interaction_from_row)
            .fetch_one(&self.pool)
            .await
            .map_err(to_repo_err)
    }

    async fn list_by_world_run(
        &self,
        world_run_id: &str,
    ) -> RepoResult<Vec<BacktestTrialInteractionRecord>> {
        sqlx::query(
            r#"
            SELECT * FROM "BacktestTrialInteraction"
            WHERE "worldRunId" = $1
            ORDER BY ordinal ASC
            "#,
        )
        .bind(world_run_id)
        .try_map(interaction_from_row)
        .fetch_all(&self.pool)
        .await
        .map_err(to_repo_err)
    }
}
