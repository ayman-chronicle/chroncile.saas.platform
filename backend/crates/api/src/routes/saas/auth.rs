use axum::{extract::State, http::StatusCode, Json};

use chronicle_auth::{
    password::{hash_password, verify_password},
    types::{AuthResponse, AuthUser, AuthUserResponse, LoginRequest, SignupRequest},
};
use chronicle_domain::{CreateTenantInput, CreateUserInput};

use super::error::{ApiError, ApiResult};
use crate::saas_state::SaasAppState;

const MIN_PASSWORD_LENGTH: usize = 8;

pub async fn signup(
    State(state): State<SaasAppState>,
    Json(input): Json<SignupRequest>,
) -> ApiResult<(StatusCode, Json<AuthResponse>)> {
    if input.name.trim().is_empty() {
        return Err(ApiError::bad_request("Name is required"));
    }
    if input.email.trim().is_empty() || !input.email.contains('@') {
        return Err(ApiError::bad_request("A valid email address is required"));
    }
    if input.password.len() < MIN_PASSWORD_LENGTH {
        return Err(ApiError::bad_request(format!(
            "Password must be at least {MIN_PASSWORD_LENGTH} characters"
        )));
    }
    if input.org_name.trim().is_empty() {
        return Err(ApiError::bad_request("Organization name is required"));
    }

    let existing = state.users.find_by_email(&input.email).await?;
    if existing.is_some() {
        return Err(ApiError::conflict("An account with this email already exists"));
    }

    let slug = input.org_name.to_lowercase().replace(' ', "-");
    let tenant = state.tenants.create(CreateTenantInput {
        name: input.org_name,
        slug,
    }).await?;

    let password_hash = hash_password(&input.password)?;

    let user = state.users.create(CreateUserInput {
        email: input.email,
        name: Some(input.name),
        password_hash,
        tenant_id: tenant.id.clone(),
    }).await?;

    let auth_user = AuthUser {
        id: user.id.clone(),
        email: user.email.clone(),
        name: user.name.clone(),
        tenant_id: tenant.id.clone(),
        tenant_name: tenant.name.clone(),
        tenant_slug: tenant.slug.clone(),
    };

    let token = state.jwt.issue(&auth_user)?;

    Ok((StatusCode::CREATED, Json(AuthResponse {
        token,
        user: AuthUserResponse {
            id: user.id,
            email: user.email,
            name: user.name,
            tenant_id: tenant.id,
            tenant_name: tenant.name,
            tenant_slug: tenant.slug,
        },
    })))
}

pub async fn login(
    State(state): State<SaasAppState>,
    Json(input): Json<LoginRequest>,
) -> ApiResult<Json<AuthResponse>> {
    let user = state.users.find_by_email(&input.email).await?
        .ok_or_else(ApiError::unauthorized)?;

    let valid = verify_password(&input.password, &user.password)?;
    if !valid {
        return Err(ApiError::unauthorized());
    }

    let tenant = state.tenants.find_by_id(&user.tenant_id).await?
        .ok_or_else(ApiError::internal)?;

    let auth_user = AuthUser {
        id: user.id.clone(),
        email: user.email.clone(),
        name: user.name.clone(),
        tenant_id: tenant.id.clone(),
        tenant_name: tenant.name.clone(),
        tenant_slug: tenant.slug.clone(),
    };

    let token = state.jwt.issue(&auth_user)?;

    Ok(Json(AuthResponse {
        token,
        user: AuthUserResponse {
            id: user.id,
            email: user.email,
            name: user.name,
            tenant_id: tenant.id,
            tenant_name: tenant.name,
            tenant_slug: tenant.slug,
        },
    }))
}

#[derive(serde::Deserialize)]
pub struct TokenExchangeRequest {
    pub service_secret: String,
    pub user_id: String,
    pub email: String,
    pub name: Option<String>,
    pub tenant_id: String,
    pub tenant_name: String,
    pub tenant_slug: String,
}

pub async fn exchange_token(
    State(state): State<SaasAppState>,
    Json(input): Json<TokenExchangeRequest>,
) -> ApiResult<Json<serde_json::Value>> {
    let expected_secret = std::env::var("SERVICE_SECRET").unwrap_or_default();
    if expected_secret.is_empty() || input.service_secret != expected_secret {
        return Err(ApiError::unauthorized());
    }

    let auth_user = AuthUser {
        id: input.user_id,
        email: input.email,
        name: input.name,
        tenant_id: input.tenant_id,
        tenant_name: input.tenant_name,
        tenant_slug: input.tenant_slug,
    };

    let token = state.jwt.issue(&auth_user)?;
    Ok(Json(serde_json::json!({ "token": token })))
}
