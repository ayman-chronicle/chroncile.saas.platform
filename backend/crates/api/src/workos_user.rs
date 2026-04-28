//! `WorkosAuthUser` — Axum extractor that validates a WorkOS access token
//! (RS256, via JWKS) and resolves it to a local Chronicle [`User`] + [`Tenant`].
//!
//! This is the new auth path introduced in CP 7. It runs in parallel with the
//! existing [`chronicle_auth::types::AuthUser`] extractor (HS256 JWTs minted by
//! the legacy `JwtService`) — endpoints opt in by accepting `WorkosAuthUser`
//! as an argument instead of `AuthUser`. CP 9 will migrate endpoints one by
//! one; CP 10 deletes the old extractor.
//!
//! Failure modes (all return 401 with no detail leaked to the client):
//!   - Missing or malformed `Authorization: Bearer ...` header
//!   - Token signature, issuer, or expiry invalid
//!   - `claims.sub` doesn't map to a local User (`workos_user_id` lookup)
//!   - `claims.org_id` missing — endpoint requires an org context
//!   - `claims.org_id` doesn't map to a local Tenant
//!   - Mismatch between the user's stored `tenant_id` and the org-derived tenant

use async_trait::async_trait;
use axum::{extract::FromRequestParts, http::request::Parts};

use chronicle_auth::middleware::extract_bearer_token;
use chronicle_auth::workos_jwt::WorkosClaims;
use chronicle_domain::{Tenant, User};

use crate::routes::saas::error::ApiError;
use crate::saas_state::SaasAppState;

#[derive(Debug, Clone)]
pub struct WorkosAuthUser {
    pub user: User,
    pub tenant: Tenant,
    pub claims: WorkosClaims,
}

impl WorkosAuthUser {
    /// Convenience: the local Chronicle tenant id (same as `self.tenant.id`).
    pub fn tenant_id(&self) -> &str {
        &self.tenant.id
    }

    /// Convenience: the local Chronicle user id.
    pub fn user_id(&self) -> &str {
        &self.user.id
    }
}

#[async_trait]
impl FromRequestParts<SaasAppState> for WorkosAuthUser {
    type Rejection = ApiError;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &SaasAppState,
    ) -> Result<Self, Self::Rejection> {
        // 1. Pull the bearer token off the Authorization header.
        let token = extract_bearer_token(parts).map_err(|_| ApiError::unauthorized())?;

        // 2. Verify signature + issuer + expiry against WorkOS JWKS.
        let claims = state.workos_jwt.verify(token).await.map_err(|err| {
            tracing::warn!(error = %err, "WorkOS access token verification failed");
            ApiError::unauthorized()
        })?;

        // 3. Resolve `sub` -> local User.
        let user = state
            .users
            .find_by_workos_user_id(&claims.sub)
            .await
            .map_err(|err| {
                tracing::error!(error = ?err, workos_user_id = %claims.sub, "user lookup failed");
                ApiError::internal()
            })?
            .ok_or_else(|| {
                tracing::warn!(workos_user_id = %claims.sub, "no local user for workos sub");
                ApiError::unauthorized()
            })?;

        // 4. Org context is mandatory for tenant-scoped endpoints. Pages that
        //    serve users without an org (e.g. /onboarding/workspace) should
        //    use a different, lighter extractor instead of WorkosAuthUser.
        let org_id = claims.org_id.as_deref().ok_or_else(|| {
            tracing::warn!(workos_user_id = %claims.sub, "WorkOS access token has no org_id claim");
            ApiError::unauthorized()
        })?;

        // 5. Resolve `org_id` -> local Tenant.
        let tenant = state
            .tenants
            .find_by_workos_organization_id(org_id)
            .await
            .map_err(|err| {
                tracing::error!(error = ?err, workos_organization_id = %org_id, "tenant lookup failed");
                ApiError::internal()
            })?
            .ok_or_else(|| {
                tracing::warn!(
                    workos_organization_id = %org_id,
                    "no local tenant for workos org_id — onboarding incomplete?",
                );
                ApiError::unauthorized()
            })?;

        // 6. Defense-in-depth: the user row's tenant_id must match the tenant
        //    we resolved from the org_id claim. Any mismatch means the user
        //    is somehow signed into an org they shouldn't have access to.
        if user.tenant_id != tenant.id {
            tracing::warn!(
                user_id = %user.id,
                user_tenant_id = %user.tenant_id,
                resolved_tenant_id = %tenant.id,
                workos_organization_id = %org_id,
                "WorkosAuthUser: user/tenant mismatch — rejecting",
            );
            return Err(ApiError::unauthorized());
        }

        Ok(WorkosAuthUser {
            user,
            tenant,
            claims,
        })
    }
}
