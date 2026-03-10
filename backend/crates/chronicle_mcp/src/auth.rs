use std::sync::Arc;

use axum::http::{request::Parts, HeaderMap};
use chronicle_auth::{jwt::JwtService, types::AuthUser};
use serde::Serialize;

use crate::error::ChronicleMcpError;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct McpSessionContext {
    pub user_id: String,
    pub email: String,
    pub name: Option<String>,
    pub role: String,
    pub tenant_id: String,
    pub tenant_name: String,
    pub tenant_slug: String,
    pub org_id: String,
}

#[derive(Clone)]
pub struct ChronicleMcpAuthResolver {
    jwt: Arc<JwtService>,
    stdio_user: Option<AuthUser>,
}

impl ChronicleMcpAuthResolver {
    pub fn for_http(jwt: Arc<JwtService>) -> Self {
        Self {
            jwt,
            stdio_user: None,
        }
    }

    pub fn for_stdio(jwt: Arc<JwtService>, token: &str) -> Result<Self, ChronicleMcpError> {
        let user = jwt
            .validate(token)
            .map_err(|error| ChronicleMcpError::unauthorized(error.to_string()))?;
        Ok(Self {
            jwt,
            stdio_user: Some(user),
        })
    }

    pub fn resolve_from_parts(
        &self,
        parts: Option<&Parts>,
    ) -> Result<McpSessionContext, ChronicleMcpError> {
        if let Some(parts) = parts {
            if let Some(user) = parts.extensions.get::<AuthUser>() {
                return Ok(McpSessionContext::from(user.clone()));
            }

            if let Some(token) = bearer_token(&parts.headers) {
                let user = self
                    .jwt
                    .validate(token)
                    .map_err(|error| ChronicleMcpError::unauthorized(error.to_string()))?;
                return Ok(McpSessionContext::from(user));
            }
        }

        self.stdio_user
            .clone()
            .map(McpSessionContext::from)
            .ok_or_else(|| {
                ChronicleMcpError::unauthorized(
                    "Chronicle MCP request is missing a valid Chronicle bearer token",
                )
            })
    }
}

impl From<AuthUser> for McpSessionContext {
    fn from(user: AuthUser) -> Self {
        Self {
            org_id: user.tenant_id.clone(),
            user_id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            tenant_id: user.tenant_id,
            tenant_name: user.tenant_name,
            tenant_slug: user.tenant_slug,
        }
    }
}

fn bearer_token(headers: &HeaderMap) -> Option<&str> {
    headers
        .get("authorization")
        .and_then(|value| value.to_str().ok())
        .and_then(|header| header.strip_prefix("Bearer "))
}
