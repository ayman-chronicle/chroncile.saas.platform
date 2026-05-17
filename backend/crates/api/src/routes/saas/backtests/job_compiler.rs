//! Async compile layer for world-backed backtest jobs.
//!
//! `recipe_builder::build_plan` stays pure/synchronous. This service
//! resolves the immutable environment version, compiles/reuses world
//! bundles, persists the bundle rows, and hands resolved `WorldPlan`s
//! to the pure builder.

use std::collections::HashMap;
use std::sync::Arc;

use chronicle_domain::{
    BacktestRecipe, CreateWorldBundleInput, DatasetSnapshot, EgressPolicy,
    EnvironmentVersionRecord, EnvironmentVersionStatus, WorldBundleRecord, WorldBundleRef,
    WorldPlan,
};
use chronicle_interfaces::{
    EnvironmentVersionRepository, RepoError, RepoResult, WorldBundleRepository,
};
use chronicle_world_compiler::{WorldCompileInput, WorldCompiler};

use super::recipe_builder::RecipeCase;

#[derive(Debug, Clone)]
pub struct CompiledWorldBundleRecord {
    pub bundle: WorldBundleRecord,
    pub bundle_ref: WorldBundleRef,
    pub root_dir: std::path::PathBuf,
    pub package_path: std::path::PathBuf,
    pub manifest: serde_json::Value,
    pub size_bytes: u64,
    pub warnings: Vec<String>,
}

#[derive(Clone)]
pub struct BacktestJobCompiler {
    env_versions: Arc<dyn EnvironmentVersionRepository>,
    world_bundles: Arc<dyn WorldBundleRepository>,
    compiler: Arc<WorldCompiler>,
    runtime_image: String,
}

impl BacktestJobCompiler {
    pub fn new(
        env_versions: Arc<dyn EnvironmentVersionRepository>,
        world_bundles: Arc<dyn WorldBundleRepository>,
        compiler: Arc<WorldCompiler>,
        runtime_image: impl Into<String>,
    ) -> Self {
        Self {
            env_versions,
            world_bundles,
            compiler,
            runtime_image: runtime_image.into(),
        }
    }

    pub async fn compile_world_plans(
        &self,
        tenant_id: &str,
        recipe: &BacktestRecipe,
        cases: &[RecipeCase],
        dataset_snapshot: Option<&DatasetSnapshot>,
    ) -> RepoResult<HashMap<String, WorldPlan>> {
        let Some(env_ref) = &recipe.environment else {
            return Ok(HashMap::new());
        };
        let Some(version_id) = &env_ref.version_id else {
            return Ok(HashMap::new());
        };
        let env_version = self
            .env_versions
            .find_by_id(tenant_id, version_id)
            .await?
            .ok_or_else(|| RepoError::NotFound(format!("environment version: {version_id}")))?;
        if env_version.environment_id != env_ref.id {
            return Err(RepoError::NotFound(format!(
                "environment version {version_id} for environment {}",
                env_ref.id
            )));
        }
        if env_version.status != EnvironmentVersionStatus::Published {
            return Err(RepoError::Internal(format!(
                "environment version {version_id} is not published"
            )));
        }

        let dataset_snapshot_id = recipe.data.dataset.as_deref().unwrap_or("inline_cases");
        let mut out = HashMap::new();
        for case in cases {
            let compiled = self
                .compile_environment_version(
                    tenant_id,
                    &env_version,
                    dataset_snapshot_id,
                    &case.case_id,
                    dataset_snapshot,
                )
                .await?;
            out.insert(
                case.case_id.clone(),
                WorldPlan {
                    environment_version_id: compiled.bundle_ref.environment_version_id.clone(),
                    world_bundle_id: compiled.bundle.id,
                    bundle_ref: compiled.bundle_ref,
                    egress_policy: EgressPolicy::DenyAll,
                    runtime_image: self.runtime_image.clone(),
                    env: world_runtime_env(),
                },
            );
        }
        Ok(out)
    }

    pub async fn compile_environment_version(
        &self,
        tenant_id: &str,
        env_version: &EnvironmentVersionRecord,
        dataset_snapshot_id: &str,
        scenario_id: &str,
        dataset_snapshot: Option<&DatasetSnapshot>,
    ) -> RepoResult<CompiledWorldBundleRecord> {
        if env_version.status != EnvironmentVersionStatus::Published {
            return Err(RepoError::Internal(format!(
                "environment version {} is not published",
                env_version.id
            )));
        }

        let compiled = self
            .compiler
            .compile(WorldCompileInput {
                tenant_id,
                env_version,
                dataset_snapshot_id,
                scenario_id,
                dataset_snapshot,
                environment_base_dir: None,
            })
            .map_err(|e| RepoError::Internal(e.to_string()))?;
        let bundle = self
            .world_bundles
            .create_or_get_by_hash(CreateWorldBundleInput {
                tenant_id: tenant_id.to_string(),
                environment_version_id: env_version.id.clone(),
                dataset_snapshot_id: dataset_snapshot_id.to_string(),
                scenario_id: scenario_id.to_string(),
                sha256: compiled.bundle_ref.sha256.as_str().to_string(),
                uri: compiled.bundle_ref.uri.clone(),
                size_bytes: compiled.size_bytes,
                manifest: compiled.manifest.clone(),
                expires_at: None,
            })
            .await?;
        let mut bundle_ref = compiled.bundle_ref;
        bundle_ref.uri = bundle.uri.clone();

        Ok(CompiledWorldBundleRecord {
            bundle,
            bundle_ref,
            root_dir: compiled.root_dir,
            package_path: compiled.package_path,
            manifest: compiled.manifest,
            size_bytes: compiled.size_bytes,
            warnings: compiled.warnings,
        })
    }
}

fn world_runtime_env() -> HashMap<String, String> {
    world_runtime_env_from(std::env::var("CHRONICLE_WORLD_INTERCEPT").ok())
}

fn world_runtime_env_from(intercept: Option<String>) -> HashMap<String, String> {
    let mut env = HashMap::new();
    let intercept = intercept
        .filter(|value| !value.trim().is_empty())
        .unwrap_or_else(|| "strict".to_string());
    env.insert("CHRONICLE_WORLD_INTERCEPT".to_string(), intercept);
    env
}

#[cfg(test)]
mod tests {
    use super::*;
    use chronicle_domain::{EnvironmentSpec, EnvironmentVersionRecord};
    use chronicle_infra::memory::world_repositories::{
        InMemoryEnvironmentVersionRepo, InMemoryWorldBundleRepo,
    };
    use chrono::Utc;

    fn published_version() -> EnvironmentVersionRecord {
        EnvironmentVersionRecord {
            id: "envver_test_v1".to_string(),
            environment_id: "env_test".to_string(),
            tenant_id: "tenant_test".to_string(),
            version: "v1".to_string(),
            spec: EnvironmentSpec::default(),
            status: EnvironmentVersionStatus::Published,
            created_at: Utc::now(),
        }
    }

    #[tokio::test]
    async fn compile_environment_version_reuses_bundle_by_hash() {
        let output_root = std::env::temp_dir().join(format!(
            "chronicle-job-compiler-test-{}",
            cuid2::create_id()
        ));
        let compiler = BacktestJobCompiler::new(
            Arc::new(InMemoryEnvironmentVersionRepo::default()),
            Arc::new(InMemoryWorldBundleRepo::default()),
            Arc::new(WorldCompiler::new(&output_root)),
            "chronicle/sandbox-runtime:test",
        );
        let version = published_version();

        let first = compiler
            .compile_environment_version("tenant_test", &version, "ds_demo", "scenario_1", None)
            .await
            .unwrap();
        let second = compiler
            .compile_environment_version("tenant_test", &version, "ds_demo", "scenario_1", None)
            .await
            .unwrap();

        assert_eq!(first.bundle.id, second.bundle.id);
        assert_eq!(first.bundle.sha256, second.bundle.sha256);
        assert!(first.root_dir.join("manifest.json").is_file());
        assert!(first.package_path.is_file());
        assert!(first.bundle.uri.ends_with(".tar.gz"));
        assert!(first
            .warnings
            .iter()
            .any(|warning| warning == "world.no_http_captures"));

        let _ = std::fs::remove_dir_all(output_root);
    }

    #[test]
    fn world_runtime_env_defaults_to_strict_interception() {
        let env = world_runtime_env_from(None);
        assert_eq!(
            env.get("CHRONICLE_WORLD_INTERCEPT").map(String::as_str),
            Some("strict")
        );
    }

    #[test]
    fn world_runtime_env_allows_operator_override() {
        let env = world_runtime_env_from(Some("best_effort".to_string()));
        assert_eq!(
            env.get("CHRONICLE_WORLD_INTERCEPT").map(String::as_str),
            Some("best_effort")
        );
    }
}
