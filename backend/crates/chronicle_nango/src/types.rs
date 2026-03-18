use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize)]
pub struct CreateConnectSessionRequest {
    pub end_user: ConnectEndUser,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub organization: Option<ConnectOrganization>,
    pub allowed_integrations: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub integrations_config_defaults: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize)]
pub struct CreateReconnectSessionRequest {
    pub connection_id: String,
    pub integration_id: String,
    pub end_user: ConnectEndUser,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub organization: Option<ConnectOrganization>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub integrations_config_defaults: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub overrides: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectEndUser {
    pub id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub email: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub display_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tags: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectOrganization {
    pub id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub display_name: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ConnectSessionResponse {
    pub data: ConnectSession,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ConnectSession {
    pub token: String,
    pub expires_at: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct TriggerSyncRequest {
    pub provider_config_key: String,
    pub connection_id: String,
    pub syncs: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sync_mode: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct SuccessResponse {
    pub success: bool,
}

#[derive(Debug, Clone, Deserialize)]
pub struct RecordsResponse<T> {
    pub records: Vec<T>,
    pub next_cursor: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct NangoConnection {
    pub connection_id: String,
    pub provider: String,
    pub provider_config_key: String,
    pub metadata: Option<serde_json::Value>,
    pub end_user: Option<NangoConnectionEndUser>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    #[serde(default)]
    pub errors: Vec<serde_json::Value>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct NangoConnectionEndUser {
    pub id: Option<String>,
    pub email: Option<String>,
    pub display_name: Option<String>,
    pub tags: Option<serde_json::Value>,
    pub organization: Option<ConnectOrganization>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ConnectionsResponse {
    pub connections: Vec<NangoConnection>,
}
