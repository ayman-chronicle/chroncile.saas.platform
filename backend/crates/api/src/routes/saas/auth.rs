use axum::{extract::State, http::StatusCode, Json};
use chrono::{Duration, Utc};

use chronicle_auth::{
    password::{hash_password, verify_password},
    reset_token::{generate_password_reset_token, hash_password_reset_token},
    types::{AuthResponse, AuthUser, AuthUserResponse},
};
use chronicle_domain::{
    CreatePasswordResetTokenInput, CreateTenantInput, CreateUserInput, ForgotPasswordRequest,
    ForgotPasswordResponse, ResetPasswordRequest, ResetPasswordResponse, UserRole,
};
use chronicle_interfaces::email::{EmailTag, TemplateEmailParams};
use std::collections::HashMap;

use super::error::{ApiError, ApiResult};
use crate::saas_state::SaasAppState;

const MIN_PASSWORD_LENGTH: usize = 8;
const PASSWORD_RESET_EXPIRY_MINUTES: i64 = 60;
const FORGOT_PASSWORD_SUCCESS_MESSAGE: &str =
    "If an account exists for that email, we've sent a password reset link.";
const RESET_PASSWORD_SUCCESS_MESSAGE: &str = "Your password has been reset. You can now sign in.";
const INVALID_PASSWORD_RESET_TOKEN_MESSAGE: &str =
    "This password reset link is invalid or has expired.";
const PASSWORD_RESET_TEMPLATE_KEY: &str = "password-reset";
const PASSWORD_RESET_EMAIL_SUBJECT: &str = "Reset your Chronicle Labs password";

fn service_secret_matches(state: &SaasAppState, provided: &str) -> bool {
    matches!(
        state.config.service_secret.as_deref(),
        Some(expected) if !expected.is_empty() && expected == provided
    )
}

fn is_valid_email_address(email: &str) -> bool {
    !email.trim().is_empty() && email.contains('@')
}

#[derive(serde::Deserialize)]
pub struct SignupInput {
    pub email: String,
    pub password: String,
    pub name: String,
    #[serde(rename = "orgName")]
    pub org_name: String,
}

pub async fn signup(
    State(state): State<SaasAppState>,
    Json(input): Json<SignupInput>,
) -> ApiResult<(StatusCode, Json<AuthResponse>)> {
    if input.name.trim().is_empty() {
        return Err(ApiError::bad_request("Name is required"));
    }
    if !is_valid_email_address(&input.email) {
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
        return Err(ApiError::conflict(
            "An account with this email already exists",
        ));
    }

    let slug = input.org_name.to_lowercase().replace(' ', "-");
    let tenant = state
        .tenants
        .create(CreateTenantInput {
            name: input.org_name,
            slug,
        })
        .await?;

    let password_hash = hash_password(&input.password)?;

    let user = state
        .users
        .create(CreateUserInput {
            email: input.email,
            name: Some(input.name),
            password_hash: Some(password_hash),
            auth_provider: "credentials".to_string(),
            role: UserRole::Owner,
            tenant_id: tenant.id.clone(),
        })
        .await?;

    let auth_user = AuthUser {
        id: user.id.clone(),
        email: user.email.clone(),
        name: user.name.clone(),
        role: user.role.as_str().to_string(),
        tenant_id: tenant.id.clone(),
        tenant_name: tenant.name.clone(),
        tenant_slug: tenant.slug.clone(),
    };

    let token = state.jwt.issue(&auth_user)?;

    Ok((
        StatusCode::CREATED,
        Json(AuthResponse {
            token,
            user: AuthUserResponse {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role.as_str().to_string(),
                tenant_id: tenant.id,
                tenant_name: tenant.name,
                tenant_slug: tenant.slug,
            },
        }),
    ))
}

#[derive(serde::Deserialize)]
pub struct LoginInput {
    pub email: String,
    pub password: String,
}

pub async fn login(
    State(state): State<SaasAppState>,
    Json(input): Json<LoginInput>,
) -> ApiResult<Json<AuthResponse>> {
    let user = state
        .users
        .find_by_email(&input.email)
        .await?
        .ok_or_else(ApiError::unauthorized)?;

    if user.auth_provider != "credentials" {
        return Err(ApiError::bad_request(format!(
            "This account uses {} sign-in. Please use that provider instead.",
            user.auth_provider
        )));
    }

    let password_hash = user
        .password
        .as_deref()
        .ok_or_else(ApiError::unauthorized)?;

    let valid = verify_password(&input.password, password_hash)?;
    if !valid {
        return Err(ApiError::unauthorized());
    }

    let tenant = state
        .tenants
        .find_by_id(&user.tenant_id)
        .await?
        .ok_or_else(ApiError::internal)?;

    let auth_user = AuthUser {
        id: user.id.clone(),
        email: user.email.clone(),
        name: user.name.clone(),
        role: user.role.as_str().to_string(),
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
            role: user.role.as_str().to_string(),
            tenant_id: tenant.id,
            tenant_name: tenant.name,
            tenant_slug: tenant.slug,
        },
    }))
}

pub async fn forgot_password(
    State(state): State<SaasAppState>,
    Json(input): Json<ForgotPasswordRequest>,
) -> ApiResult<Json<ForgotPasswordResponse>> {
    if !is_valid_email_address(&input.email) {
        return Err(ApiError::bad_request("A valid email address is required"));
    }

    let response = ForgotPasswordResponse {
        message: FORGOT_PASSWORD_SUCCESS_MESSAGE.to_string(),
    };

    let Some(user) = state.users.find_by_email(&input.email).await? else {
        return Ok(Json(response));
    };

    if user.auth_provider != "credentials" || user.password.is_none() {
        return Ok(Json(response));
    }

    let raw_token = generate_password_reset_token();
    let token_hash = hash_password_reset_token(&raw_token);
    let expires_at = Utc::now() + Duration::minutes(PASSWORD_RESET_EXPIRY_MINUTES);
    let reset_token = state
        .password_resets
        .create(CreatePasswordResetTokenInput {
            user_id: user.id.clone(),
            token_hash,
            expires_at,
        })
        .await?;

    let mut variables = HashMap::new();
    variables.insert(
        "RESET_URL".to_string(),
        format!("{}/reset-password?token={raw_token}", state.config.app_url),
    );
    variables.insert("USER_EMAIL".to_string(), user.email.clone());
    variables.insert(
        "EXPIRY_MINUTES".to_string(),
        PASSWORD_RESET_EXPIRY_MINUTES.to_string(),
    );

    if let Err(error) = state
        .email
        .send_template_email(TemplateEmailParams {
            to: user.email.clone(),
            subject: PASSWORD_RESET_EMAIL_SUBJECT.to_string(),
            template_key: PASSWORD_RESET_TEMPLATE_KEY.to_string(),
            variables,
            idempotency_key: Some(format!("password-reset/{}", reset_token.id)),
            tags: vec![
                EmailTag {
                    name: "email_type".to_string(),
                    value: "password-reset".to_string(),
                },
                EmailTag {
                    name: "tenant_id".to_string(),
                    value: user.tenant_id.clone(),
                },
                EmailTag {
                    name: "user_id".to_string(),
                    value: user.id.clone(),
                },
            ],
        })
        .await
    {
        tracing::warn!(
            user_id = %user.id,
            email = %user.email,
            error = %error,
            "Failed to send password reset email"
        );
    }

    Ok(Json(response))
}

pub async fn reset_password(
    State(state): State<SaasAppState>,
    Json(input): Json<ResetPasswordRequest>,
) -> ApiResult<Json<ResetPasswordResponse>> {
    if input.token.trim().is_empty() {
        return Err(ApiError::bad_request(INVALID_PASSWORD_RESET_TOKEN_MESSAGE));
    }
    if input.new_password.len() < MIN_PASSWORD_LENGTH {
        return Err(ApiError::bad_request(format!(
            "Password must be at least {MIN_PASSWORD_LENGTH} characters"
        )));
    }

    let token_hash = hash_password_reset_token(&input.token);
    let reset_token = state
        .password_resets
        .consume(&token_hash)
        .await?
        .ok_or_else(|| ApiError::bad_request(INVALID_PASSWORD_RESET_TOKEN_MESSAGE))?;

    let user = state
        .users
        .find_by_id(&reset_token.user_id)
        .await?
        .ok_or_else(|| ApiError::bad_request(INVALID_PASSWORD_RESET_TOKEN_MESSAGE))?;

    if user.auth_provider != "credentials" {
        return Err(ApiError::bad_request(INVALID_PASSWORD_RESET_TOKEN_MESSAGE));
    }

    let password_hash = hash_password(&input.new_password)?;
    state
        .users
        .update_password(&user.id, &password_hash)
        .await?;

    Ok(Json(ResetPasswordResponse {
        message: RESET_PASSWORD_SUCCESS_MESSAGE.to_string(),
    }))
}

#[derive(serde::Deserialize)]
pub struct TokenExchangeRequest {
    pub service_secret: String,
    pub user_id: String,
    pub email: String,
    pub name: Option<String>,
    pub role: Option<String>,
    pub tenant_id: String,
    pub tenant_name: String,
    pub tenant_slug: String,
}

pub async fn exchange_token(
    State(state): State<SaasAppState>,
    Json(input): Json<TokenExchangeRequest>,
) -> ApiResult<Json<serde_json::Value>> {
    if !service_secret_matches(&state, &input.service_secret) {
        return Err(ApiError::unauthorized());
    }

    let auth_user = AuthUser {
        id: input.user_id,
        email: input.email,
        name: input.name,
        role: input.role.unwrap_or_else(|| "member".to_string()),
        tenant_id: input.tenant_id,
        tenant_name: input.tenant_name,
        tenant_slug: input.tenant_slug,
    };

    let token = state.jwt.issue(&auth_user)?;
    Ok(Json(serde_json::json!({ "token": token })))
}

#[derive(serde::Deserialize)]
pub struct OAuthSignupInput {
    pub email: String,
    pub name: Option<String>,
    #[serde(rename = "orgName")]
    pub org_name: Option<String>,
    pub provider: String,
    pub service_secret: String,
}

pub async fn oauth_signup(
    State(state): State<SaasAppState>,
    Json(input): Json<OAuthSignupInput>,
) -> ApiResult<Json<AuthResponse>> {
    if !service_secret_matches(&state, &input.service_secret) {
        return Err(ApiError::unauthorized());
    }

    if !is_valid_email_address(&input.email) {
        return Err(ApiError::bad_request("A valid email address is required"));
    }

    if let Some(existing_user) = state.users.find_by_email(&input.email).await? {
        let tenant = state
            .tenants
            .find_by_id(&existing_user.tenant_id)
            .await?
            .ok_or_else(ApiError::internal)?;

        let auth_user = AuthUser {
            id: existing_user.id.clone(),
            email: existing_user.email.clone(),
            name: existing_user.name.clone(),
            role: existing_user.role.as_str().to_string(),
            tenant_id: tenant.id.clone(),
            tenant_name: tenant.name.clone(),
            tenant_slug: tenant.slug.clone(),
        };

        let token = state.jwt.issue(&auth_user)?;

        return Ok(Json(AuthResponse {
            token,
            user: AuthUserResponse {
                id: existing_user.id,
                email: existing_user.email,
                name: existing_user.name,
                role: existing_user.role.as_str().to_string(),
                tenant_id: tenant.id,
                tenant_name: tenant.name,
                tenant_slug: tenant.slug,
            },
        }));
    }

    let display_name = input.name.clone().unwrap_or_else(|| input.email.clone());
    let org_name = input
        .org_name
        .unwrap_or_else(|| format!("{}'s Organization", display_name));
    let slug = org_name.to_lowercase().replace(' ', "-");

    let tenant = state
        .tenants
        .create(CreateTenantInput {
            name: org_name,
            slug,
        })
        .await?;

    let user = state
        .users
        .create(CreateUserInput {
            email: input.email,
            name: input.name,
            password_hash: None,
            auth_provider: input.provider,
            role: UserRole::Owner,
            tenant_id: tenant.id.clone(),
        })
        .await?;

    let auth_user = AuthUser {
        id: user.id.clone(),
        email: user.email.clone(),
        name: user.name.clone(),
        role: user.role.as_str().to_string(),
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
            role: user.role.as_str().to_string(),
            tenant_id: tenant.id,
            tenant_name: tenant.name,
            tenant_slug: tenant.slug,
        },
    }))
}
