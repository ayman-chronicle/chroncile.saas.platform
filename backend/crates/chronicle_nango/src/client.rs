use reqwest::Client;

use crate::{
    error::{NangoError, Result},
    types::*,
};

const DEFAULT_BASE_URL: &str = "https://api.nango.dev";

#[derive(Clone)]
pub struct NangoClient {
    http: Client,
    secret_key: String,
    base_url: String,
}

impl NangoClient {
    pub fn new(secret_key: impl Into<String>) -> Self {
        Self {
            http: Client::new(),
            secret_key: secret_key.into(),
            base_url: DEFAULT_BASE_URL.to_string(),
        }
    }

    pub fn with_base_url(mut self, url: impl Into<String>) -> Self {
        self.base_url = url.into();
        self
    }

    async fn parse_response<T: serde::de::DeserializeOwned>(resp: reqwest::Response) -> Result<T> {
        let status = resp.status();
        let text = resp.text().await?;

        if status.is_success() {
            return serde_json::from_str(&text)
                .map_err(|error| NangoError::Deserialize(format!("{error}: {text}")));
        }

        match status.as_u16() {
            401 => Err(NangoError::Unauthorized),
            404 => Err(NangoError::NotFound),
            code => Err(NangoError::ApiError {
                status: code,
                message: text,
            }),
        }
    }

    fn request(&self, method: reqwest::Method, path: &str) -> reqwest::RequestBuilder {
        self.http
            .request(method, format!("{}{}", self.base_url, path))
            .header("Authorization", format!("Bearer {}", self.secret_key))
            .header("Content-Type", "application/json")
    }

    pub async fn create_connect_session(
        &self,
        payload: &CreateConnectSessionRequest,
    ) -> Result<ConnectSessionResponse> {
        let resp = self
            .request(reqwest::Method::POST, "/connect/sessions")
            .json(payload)
            .send()
            .await?;
        Self::parse_response(resp).await
    }

    pub async fn create_reconnect_session(
        &self,
        payload: &CreateReconnectSessionRequest,
    ) -> Result<ConnectSessionResponse> {
        let resp = self
            .request(reqwest::Method::POST, "/connect/sessions/reconnect")
            .json(payload)
            .send()
            .await?;
        Self::parse_response(resp).await
    }

    pub async fn list_connections(
        &self,
        end_user_id: Option<&str>,
        end_user_organization_id: Option<&str>,
    ) -> Result<ConnectionsResponse> {
        let mut request = self.request(reqwest::Method::GET, "/connections");
        let mut params = Vec::new();
        if let Some(value) = end_user_id {
            params.push(("endUserId", value));
        }
        if let Some(value) = end_user_organization_id {
            params.push(("endUserOrganizationId", value));
        }
        if !params.is_empty() {
            request = request.query(&params);
        }
        let resp = request.send().await?;
        Self::parse_response(resp).await
    }

    pub async fn get_connection(
        &self,
        connection_id: &str,
        provider_config_key: &str,
    ) -> Result<NangoConnection> {
        let resp = self
            .request(
                reqwest::Method::GET,
                &format!("/connection/{connection_id}"),
            )
            .query(&[("provider_config_key", provider_config_key)])
            .send()
            .await?;
        Self::parse_response(resp).await
    }

    pub async fn delete_connection(
        &self,
        connection_id: &str,
        provider_config_key: &str,
    ) -> Result<SuccessResponse> {
        let resp = self
            .request(
                reqwest::Method::DELETE,
                &format!("/connection/{connection_id}"),
            )
            .query(&[("provider_config_key", provider_config_key)])
            .send()
            .await?;
        Self::parse_response(resp).await
    }

    pub async fn trigger_sync(&self, payload: &TriggerSyncRequest) -> Result<SuccessResponse> {
        let resp = self
            .request(reqwest::Method::POST, "/sync/trigger")
            .json(payload)
            .send()
            .await?;
        Self::parse_response(resp).await
    }

    pub async fn get_records(
        &self,
        connection_id: &str,
        provider_config_key: &str,
        model: &str,
        cursor: Option<&str>,
        modified_after: Option<&str>,
    ) -> Result<RecordsResponse<serde_json::Value>> {
        let mut request = self
            .request(reqwest::Method::GET, "/records")
            .header("Connection-Id", connection_id)
            .header("Provider-Config-Key", provider_config_key)
            .query(&[("model", model)]);

        if let Some(cursor) = cursor {
            request = request.query(&[("cursor", cursor)]);
        } else if let Some(modified_after) = modified_after {
            request = request.query(&[("modified_after", modified_after)]);
        }

        let resp = request.send().await?;
        Self::parse_response(resp).await
    }
}
