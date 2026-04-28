//! `GET /api/saas/me` — returns the current user's identity by way of the
//! [`WorkosAuthUser`] extractor.
//!
//! This is the validation endpoint for the WorkOS JWKS path: if hitting it
//! with a WorkOS access token returns a populated body, the whole new auth
//! stack (verifier → repo lookups → tenant scoping) is wired correctly.

use axum::Json;
use serde::Serialize;

use chronicle_domain::UserRole;

use crate::workos_user::WorkosAuthUser;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MeResponse {
    pub user_id: String,
    pub email: String,
    pub name: Option<String>,
    pub role: UserRole,
    pub tenant_id: String,
    pub tenant_name: String,
    pub tenant_slug: String,
    pub workos_user_id: Option<String>,
    pub workos_organization_id: Option<String>,
    pub workos_session_id: String,
}

pub async fn get_me(user: WorkosAuthUser) -> Json<MeResponse> {
    Json(MeResponse {
        user_id: user.user.id.clone(),
        email: user.user.email.clone(),
        name: user.user.name.clone(),
        role: user.user.role,
        tenant_id: user.tenant.id.clone(),
        tenant_name: user.tenant.name.clone(),
        tenant_slug: user.tenant.slug.clone(),
        workos_user_id: user.user.workos_user_id.clone(),
        workos_organization_id: user.tenant.workos_organization_id.clone(),
        workos_session_id: user.claims.sid.clone(),
    })
}
