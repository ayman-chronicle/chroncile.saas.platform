use axum::{extract::State, Json};

use chronicle_auth::types::AuthUser;
use chronicle_domain::{TenantResponse, UpdateStripeRequest};

use super::error::ApiResult;
use crate::saas_state::SaasAppState;

pub async fn get_tenant(
    user: AuthUser,
    State(state): State<SaasAppState>,
) -> ApiResult<Json<TenantResponse>> {
    let tenant = state.tenants.find_by_id(&user.tenant_id).await?;
    Ok(Json(TenantResponse { tenant }))
}

pub async fn update_tenant_stripe(
    user: AuthUser,
    State(state): State<SaasAppState>,
    Json(input): Json<UpdateStripeRequest>,
) -> ApiResult<Json<TenantResponse>> {
    let tenant = state.tenants.update_stripe_fields(
        &user.tenant_id,
        input.stripe_customer_id.as_deref(),
        input.stripe_subscription_status.as_deref(),
        input.stripe_price_id.as_deref(),
    ).await?;

    Ok(Json(TenantResponse { tenant: Some(tenant) }))
}
