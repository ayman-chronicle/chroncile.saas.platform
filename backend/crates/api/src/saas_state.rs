use std::sync::Arc;

use chronicle_auth::jwt::JwtService;
use chronicle_interfaces::{
    AuditLogRepository, AgentEndpointConfigRepository, ConnectionRepository,
    PipedreamTriggerRepository, RunRepository, TenantRepository, UserRepository,
};
use pipedream_connect::PipedreamClient;

#[derive(Clone)]
pub struct SaasAppState {
    pub jwt: Arc<JwtService>,
    pub tenants: Arc<dyn TenantRepository>,
    pub users: Arc<dyn UserRepository>,
    pub runs: Arc<dyn RunRepository>,
    pub connections: Arc<dyn ConnectionRepository>,
    pub audit_logs: Arc<dyn AuditLogRepository>,
    pub agent_configs: Arc<dyn AgentEndpointConfigRepository>,
    pub pipedream_triggers: Arc<dyn PipedreamTriggerRepository>,
    pub pipedream: Option<Arc<PipedreamClient>>,
}

impl SaasAppState {
    pub fn new(
        jwt_secret: &str,
        tenants: Arc<dyn TenantRepository>,
        users: Arc<dyn UserRepository>,
        runs: Arc<dyn RunRepository>,
        connections: Arc<dyn ConnectionRepository>,
        audit_logs: Arc<dyn AuditLogRepository>,
        agent_configs: Arc<dyn AgentEndpointConfigRepository>,
        pipedream_triggers: Arc<dyn PipedreamTriggerRepository>,
        pipedream: Option<Arc<PipedreamClient>>,
    ) -> Self {
        Self {
            jwt: Arc::new(JwtService::new(jwt_secret)),
            tenants,
            users,
            runs,
            connections,
            audit_logs,
            agent_configs,
            pipedream_triggers,
            pipedream,
        }
    }
}
