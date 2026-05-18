//! World simulator domain types.
//!
//! These are deliberately plain data shapes. The control plane can
//! persist and compile them, while the orchestrator only needs the
//! resolved `WorldPlan` for a trial.

use chrono::{DateTime, Utc};
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use ts_rs::TS;

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize, TS, JsonSchema)]
#[serde(transparent)]
#[ts(export, export_to = "types/worlds/")]
pub struct EnvironmentVersionId(pub String);

impl EnvironmentVersionId {
    pub fn new(id: impl Into<String>) -> Self {
        Self(id.into())
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize, TS, JsonSchema)]
#[serde(transparent)]
#[ts(export, export_to = "types/worlds/")]
pub struct WorldBundleSha256(pub String);

impl WorldBundleSha256 {
    pub fn new(sha256: impl Into<String>) -> Self {
        Self(sha256.into())
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, JsonSchema)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "types/worlds/")]
pub struct EnvironmentSpec {
    pub interception: InterceptionSpec,
    #[serde(default)]
    pub services: Vec<ServiceSpec>,
    #[serde(default)]
    pub datastores: Vec<DatastoreSpec>,
    #[serde(default)]
    pub mcp: Vec<McpServerSpec>,
}

impl Default for EnvironmentSpec {
    fn default() -> Self {
        Self {
            interception: InterceptionSpec::default(),
            services: Vec::new(),
            datastores: Vec::new(),
            mcp: Vec::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, JsonSchema)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "types/worlds/")]
pub struct InterceptionSpec {
    #[serde(default = "InterceptionSpec::default_http_proxy_port")]
    pub regular_proxy_port: u16,
    #[serde(default = "InterceptionSpec::default_transparent_proxy_port")]
    pub transparent_proxy_port: u16,
    #[serde(default)]
    pub install_ca: bool,
}

impl InterceptionSpec {
    const fn default_http_proxy_port() -> u16 {
        8888
    }

    const fn default_transparent_proxy_port() -> u16 {
        8889
    }
}

impl Default for InterceptionSpec {
    fn default() -> Self {
        Self {
            regular_proxy_port: Self::default_http_proxy_port(),
            transparent_proxy_port: Self::default_transparent_proxy_port(),
            install_ca: true,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, JsonSchema)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "types/worlds/")]
pub struct ServiceSpec {
    pub name: String,
    #[serde(default)]
    pub authorities: Vec<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub openapi_uri: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, JsonSchema)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "types/worlds/")]
pub struct DatastoreSpec {
    pub name: String,
    #[serde(default = "DatastoreSpec::default_kind")]
    pub kind: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub seed_uri: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional, type = "Record<string, unknown>")]
    pub schema_fingerprint: Option<serde_json::Value>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional, type = "Record<string, unknown>")]
    pub state_diff_spec: Option<serde_json::Value>,
}

impl DatastoreSpec {
    fn default_kind() -> String {
        "postgres".to_string()
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, JsonSchema)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "types/worlds/")]
pub struct McpServerSpec {
    pub name: String,
    #[serde(default = "McpServerSpec::default_transport")]
    pub transport: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub command: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub url: Option<String>,
}

impl McpServerSpec {
    fn default_transport() -> String {
        "streamable_http".to_string()
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS, JsonSchema)]
#[serde(rename_all = "snake_case")]
#[ts(export, export_to = "types/worlds/")]
pub enum EnvironmentVersionStatus {
    Draft,
    Published,
    Archived,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, JsonSchema)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "types/worlds/")]
pub struct EnvironmentRecord {
    pub id: String,
    pub tenant_id: String,
    pub slug: String,
    pub label: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub description: Option<String>,
    pub created_at: DateTime<Utc>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub archived_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, JsonSchema)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "types/worlds/")]
pub struct EnvironmentVersionRecord {
    pub id: String,
    pub environment_id: String,
    pub tenant_id: String,
    pub version: String,
    pub spec: EnvironmentSpec,
    pub status: EnvironmentVersionStatus,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, JsonSchema)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "types/worlds/")]
pub struct WorldBundleRecord {
    pub id: String,
    pub tenant_id: String,
    pub environment_version_id: String,
    pub dataset_snapshot_id: String,
    pub scenario_id: String,
    pub sha256: String,
    pub uri: String,
    pub size_bytes: u64,
    #[ts(type = "Record<string, unknown>")]
    pub manifest: serde_json::Value,
    pub created_at: DateTime<Utc>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub expires_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, JsonSchema)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "types/worlds/")]
pub struct WorldBundleRef {
    pub tenant_id: String,
    pub environment_version_id: EnvironmentVersionId,
    pub dataset_snapshot_id: String,
    pub scenario_id: String,
    pub sha256: WorldBundleSha256,
    pub uri: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS, JsonSchema)]
#[serde(rename_all = "snake_case")]
#[ts(export, export_to = "types/worlds/")]
pub enum EgressPolicy {
    DenyAll,
    MockedOnly,
    PassthroughRecord,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, JsonSchema)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "types/worlds/")]
pub struct WorldPlan {
    pub environment_version_id: EnvironmentVersionId,
    pub world_bundle_id: String,
    pub bundle_ref: WorldBundleRef,
    pub egress_policy: EgressPolicy,
    pub runtime_image: String,
    #[serde(default)]
    pub env: HashMap<String, String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS, JsonSchema)]
#[serde(rename_all = "snake_case")]
#[ts(export, export_to = "types/worlds/")]
pub enum WorldRunStatus {
    Starting,
    Ready,
    Exported,
    Failed,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, JsonSchema)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "types/worlds/")]
pub struct BacktestTrialWorldRunRecord {
    pub id: String,
    pub trial_id: String,
    pub attempt: u32,
    pub world_bundle_id: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub fault_scenario_id: Option<String>,
    pub status: WorldRunStatus,
    pub started_at: DateTime<Utc>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub finished_at: Option<DateTime<Utc>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub exit_code: Option<i32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub logs_uri: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub export_uri: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional, type = "Record<string, unknown>")]
    pub coverage: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS, JsonSchema)]
#[serde(rename_all = "snake_case")]
#[ts(export, export_to = "types/worlds/")]
pub enum InteractionKind {
    Http,
    Mcp,
    Sql,
    Tool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS, JsonSchema)]
#[serde(rename_all = "snake_case")]
#[ts(export, export_to = "types/worlds/")]
pub enum MatchKind {
    Replay,
    Spec,
    Fallback,
    Unmatched,
    Llm,
    Blocked,
    PassthroughRecorded,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, JsonSchema)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "types/worlds/")]
pub struct BacktestTrialInteractionRecord {
    pub id: String,
    pub world_run_id: String,
    pub trial_id: String,
    pub ordinal: u32,
    pub kind: InteractionKind,
    pub service: String,
    pub method_path: String,
    pub request_fingerprint: String,
    pub match_kind: MatchKind,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub status_code: Option<u16>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub duration_ms: Option<u32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub payload_uri: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateEnvironmentInput {
    pub tenant_id: String,
    pub slug: String,
    pub label: String,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateEnvironmentVersionInput {
    pub environment_id: String,
    pub tenant_id: String,
    pub version: String,
    pub spec: EnvironmentSpec,
    pub status: EnvironmentVersionStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateWorldBundleInput {
    pub tenant_id: String,
    pub environment_version_id: String,
    pub dataset_snapshot_id: String,
    pub scenario_id: String,
    pub sha256: String,
    pub uri: String,
    pub size_bytes: u64,
    pub manifest: serde_json::Value,
    pub expires_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateBacktestTrialWorldRunInput {
    pub trial_id: String,
    pub attempt: u32,
    pub world_bundle_id: String,
    pub fault_scenario_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateBacktestTrialInteractionInput {
    pub world_run_id: String,
    pub trial_id: String,
    pub ordinal: u32,
    pub kind: InteractionKind,
    pub service: String,
    pub method_path: String,
    pub request_fingerprint: String,
    pub match_kind: MatchKind,
    pub status_code: Option<u16>,
    pub duration_ms: Option<u32>,
    pub payload_uri: Option<String>,
}
