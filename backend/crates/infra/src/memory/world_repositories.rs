//! In-memory world simulator repositories.

use async_trait::async_trait;
use chrono::Utc;
use dashmap::DashMap;
use std::sync::Arc;

use chronicle_domain::{
    BacktestTrialInteractionRecord, BacktestTrialWorldRunRecord,
    CreateBacktestTrialInteractionInput, CreateBacktestTrialWorldRunInput, CreateEnvironmentInput,
    CreateEnvironmentVersionInput, CreateWorldBundleInput, EnvironmentRecord,
    EnvironmentVersionRecord, EnvironmentVersionStatus, WorldBundleRecord, WorldRunStatus,
};
use chronicle_interfaces::{
    BacktestTrialInteractionRepository, BacktestTrialWorldRunRepository, EnvironmentRepository,
    EnvironmentVersionRepository, RepoError, RepoResult, WorldBundleRepository,
};

fn new_id() -> String {
    cuid2::create_id()
}

#[derive(Clone, Default)]
pub struct InMemoryEnvironmentRepo {
    rows: Arc<DashMap<String, EnvironmentRecord>>,
}

impl InMemoryEnvironmentRepo {
    pub fn with_records(records: impl IntoIterator<Item = EnvironmentRecord>) -> Self {
        let repo = Self::default();
        for record in records {
            repo.rows.insert(record.id.clone(), record);
        }
        repo
    }
}

#[async_trait]
impl EnvironmentRepository for InMemoryEnvironmentRepo {
    async fn create(&self, input: CreateEnvironmentInput) -> RepoResult<EnvironmentRecord> {
        let rec = EnvironmentRecord {
            id: new_id(),
            tenant_id: input.tenant_id,
            slug: input.slug,
            label: input.label,
            description: input.description,
            created_at: Utc::now(),
            archived_at: None,
        };
        self.rows.insert(rec.id.clone(), rec.clone());
        Ok(rec)
    }

    async fn find_by_id(&self, tenant_id: &str, id: &str) -> RepoResult<Option<EnvironmentRecord>> {
        Ok(self
            .rows
            .get(id)
            .filter(|row| row.tenant_id == tenant_id)
            .map(|row| row.clone()))
    }

    async fn find_by_slug(
        &self,
        tenant_id: &str,
        slug: &str,
    ) -> RepoResult<Option<EnvironmentRecord>> {
        Ok(self
            .rows
            .iter()
            .map(|row| row.value().clone())
            .find(|row| row.tenant_id == tenant_id && row.slug == slug))
    }

    async fn list_by_tenant(&self, tenant_id: &str) -> RepoResult<Vec<EnvironmentRecord>> {
        let mut rows: Vec<_> = self
            .rows
            .iter()
            .map(|row| row.value().clone())
            .filter(|row| row.tenant_id == tenant_id)
            .collect();
        rows.sort_by(|a, b| a.slug.cmp(&b.slug));
        Ok(rows)
    }
}

#[derive(Clone, Default)]
pub struct InMemoryEnvironmentVersionRepo {
    rows: Arc<DashMap<String, EnvironmentVersionRecord>>,
}

impl InMemoryEnvironmentVersionRepo {
    pub fn with_records(records: impl IntoIterator<Item = EnvironmentVersionRecord>) -> Self {
        let repo = Self::default();
        for record in records {
            repo.rows.insert(record.id.clone(), record);
        }
        repo
    }
}

#[async_trait]
impl EnvironmentVersionRepository for InMemoryEnvironmentVersionRepo {
    async fn create(
        &self,
        input: CreateEnvironmentVersionInput,
    ) -> RepoResult<EnvironmentVersionRecord> {
        let rec = EnvironmentVersionRecord {
            id: new_id(),
            environment_id: input.environment_id,
            tenant_id: input.tenant_id,
            version: input.version,
            spec: input.spec,
            status: input.status,
            created_at: Utc::now(),
        };
        self.rows.insert(rec.id.clone(), rec.clone());
        Ok(rec)
    }

    async fn find_by_id(
        &self,
        tenant_id: &str,
        id: &str,
    ) -> RepoResult<Option<EnvironmentVersionRecord>> {
        Ok(self
            .rows
            .get(id)
            .filter(|row| row.tenant_id == tenant_id)
            .map(|row| row.clone()))
    }

    async fn find_by_environment_version(
        &self,
        tenant_id: &str,
        environment_id: &str,
        version: &str,
    ) -> RepoResult<Option<EnvironmentVersionRecord>> {
        Ok(self.rows.iter().map(|row| row.value().clone()).find(|row| {
            row.tenant_id == tenant_id
                && row.environment_id == environment_id
                && row.version == version
        }))
    }

    async fn list_by_environment(
        &self,
        tenant_id: &str,
        environment_id: &str,
    ) -> RepoResult<Vec<EnvironmentVersionRecord>> {
        let mut rows: Vec<_> = self
            .rows
            .iter()
            .map(|row| row.value().clone())
            .filter(|row| row.tenant_id == tenant_id && row.environment_id == environment_id)
            .collect();
        rows.sort_by(|a, b| b.created_at.cmp(&a.created_at));
        Ok(rows)
    }

    async fn update_status(
        &self,
        tenant_id: &str,
        id: &str,
        status: EnvironmentVersionStatus,
    ) -> RepoResult<EnvironmentVersionRecord> {
        let mut row = self
            .rows
            .get_mut(id)
            .ok_or_else(|| RepoError::NotFound(id.to_string()))?;
        if row.tenant_id != tenant_id {
            return Err(RepoError::NotFound(id.to_string()));
        }
        row.status = status;
        Ok(row.clone())
    }
}

#[derive(Clone, Default)]
pub struct InMemoryWorldBundleRepo {
    rows: Arc<DashMap<String, WorldBundleRecord>>,
}

#[async_trait]
impl WorldBundleRepository for InMemoryWorldBundleRepo {
    async fn create_or_get_by_hash(
        &self,
        input: CreateWorldBundleInput,
    ) -> RepoResult<WorldBundleRecord> {
        if let Some(row) = self
            .rows
            .iter()
            .map(|row| row.value().clone())
            .find(|row| row.tenant_id == input.tenant_id && row.sha256 == input.sha256)
        {
            return Ok(row);
        }
        let rec = WorldBundleRecord {
            id: new_id(),
            tenant_id: input.tenant_id,
            environment_version_id: input.environment_version_id,
            dataset_snapshot_id: input.dataset_snapshot_id,
            scenario_id: input.scenario_id,
            sha256: input.sha256,
            uri: input.uri,
            size_bytes: input.size_bytes,
            manifest: input.manifest,
            created_at: Utc::now(),
            expires_at: input.expires_at,
        };
        self.rows.insert(rec.id.clone(), rec.clone());
        Ok(rec)
    }

    async fn find_by_id(&self, tenant_id: &str, id: &str) -> RepoResult<Option<WorldBundleRecord>> {
        Ok(self
            .rows
            .get(id)
            .filter(|row| row.tenant_id == tenant_id)
            .map(|row| row.clone()))
    }

    async fn find_by_sha256(
        &self,
        tenant_id: &str,
        sha256: &str,
    ) -> RepoResult<Option<WorldBundleRecord>> {
        Ok(self
            .rows
            .iter()
            .map(|row| row.value().clone())
            .find(|row| row.tenant_id == tenant_id && row.sha256 == sha256))
    }
}

#[derive(Clone, Default)]
pub struct InMemoryBacktestTrialWorldRunRepo {
    rows: Arc<DashMap<String, BacktestTrialWorldRunRecord>>,
}

#[async_trait]
impl BacktestTrialWorldRunRepository for InMemoryBacktestTrialWorldRunRepo {
    async fn create(
        &self,
        input: CreateBacktestTrialWorldRunInput,
    ) -> RepoResult<BacktestTrialWorldRunRecord> {
        let rec = BacktestTrialWorldRunRecord {
            id: new_id(),
            trial_id: input.trial_id,
            attempt: input.attempt,
            world_bundle_id: input.world_bundle_id,
            fault_scenario_id: input.fault_scenario_id,
            status: WorldRunStatus::Starting,
            started_at: Utc::now(),
            finished_at: None,
            exit_code: None,
            logs_uri: None,
            export_uri: None,
            coverage: None,
        };
        self.rows.insert(rec.id.clone(), rec.clone());
        Ok(rec)
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
        let mut row = self
            .rows
            .get_mut(id)
            .ok_or_else(|| RepoError::NotFound(id.to_string()))?;
        row.status = status;
        row.exit_code = exit_code;
        row.logs_uri = logs_uri.map(str::to_string);
        row.export_uri = export_uri.map(str::to_string);
        row.coverage = coverage;
        if matches!(status, WorldRunStatus::Exported | WorldRunStatus::Failed) {
            row.finished_at = Some(Utc::now());
        }
        Ok(row.clone())
    }

    async fn list_by_trial(&self, trial_id: &str) -> RepoResult<Vec<BacktestTrialWorldRunRecord>> {
        let mut rows: Vec<_> = self
            .rows
            .iter()
            .map(|row| row.value().clone())
            .filter(|row| row.trial_id == trial_id)
            .collect();
        rows.sort_by(|a, b| {
            a.attempt
                .cmp(&b.attempt)
                .then(a.started_at.cmp(&b.started_at))
        });
        Ok(rows)
    }
}

#[derive(Clone, Default)]
pub struct InMemoryBacktestTrialInteractionRepo {
    rows: Arc<DashMap<String, BacktestTrialInteractionRecord>>,
}

#[async_trait]
impl BacktestTrialInteractionRepository for InMemoryBacktestTrialInteractionRepo {
    async fn create(
        &self,
        input: CreateBacktestTrialInteractionInput,
    ) -> RepoResult<BacktestTrialInteractionRecord> {
        let rec = BacktestTrialInteractionRecord {
            id: new_id(),
            world_run_id: input.world_run_id,
            trial_id: input.trial_id,
            ordinal: input.ordinal,
            kind: input.kind,
            service: input.service,
            method_path: input.method_path,
            request_fingerprint: input.request_fingerprint,
            match_kind: input.match_kind,
            status_code: input.status_code,
            duration_ms: input.duration_ms,
            payload_uri: input.payload_uri,
            created_at: Utc::now(),
        };
        self.rows.insert(rec.id.clone(), rec.clone());
        Ok(rec)
    }

    async fn list_by_world_run(
        &self,
        world_run_id: &str,
    ) -> RepoResult<Vec<BacktestTrialInteractionRecord>> {
        let mut rows: Vec<_> = self
            .rows
            .iter()
            .map(|row| row.value().clone())
            .filter(|row| row.world_run_id == world_run_id)
            .collect();
        rows.sort_by_key(|row| row.ordinal);
        Ok(rows)
    }
}
