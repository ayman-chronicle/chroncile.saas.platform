use axum::{extract::State, Json};

use chronicle_auth::types::AuthUser;

use super::error::ApiResult;
use crate::saas_state::SaasAppState;

pub async fn get_tenant(
    user: AuthUser,
    State(state): State<SaasAppState>,
) -> ApiResult<Json<serde_json::Value>> {
    let tenant = state.tenants.find_by_id(&user.tenant_id).await?;
    Ok(Json(serde_json::json!({ "tenant": tenant })))
}

#[derive(serde::Deserialize)]
pub struct UpdateStripeInput {
    #[serde(rename = "stripeCustomerId")]
    pub stripe_customer_id: Option<String>,
    #[serde(rename = "stripeSubscriptionStatus")]
    pub stripe_subscription_status: Option<String>,
    #[serde(rename = "stripePriceId")]
    pub stripe_price_id: Option<String>,
}

pub async fn update_tenant_stripe(
    user: AuthUser,
    State(state): State<SaasAppState>,
    Json(input): Json<UpdateStripeInput>,
) -> ApiResult<Json<serde_json::Value>> {
    let tenant = state.tenants.update_stripe_fields(
        &user.tenant_id,
        input.stripe_customer_id.as_deref(),
        input.stripe_subscription_status.as_deref(),
        input.stripe_price_id.as_deref(),
    ).await?;

    Ok(Json(serde_json::json!({ "tenant": tenant })))
}
