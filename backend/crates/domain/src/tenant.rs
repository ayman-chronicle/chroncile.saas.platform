//! Tenant and Subject Types
//!
//! Newtype wrappers for tenant and subject identifiers to provide type safety.

use serde::{Deserialize, Serialize};
use std::fmt;

/// Tenant identifier - represents an isolated organization/company
#[derive(Clone, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(transparent)]
pub struct TenantId(pub String);

impl TenantId {
    pub fn new(id: impl Into<String>) -> Self {
        Self(id.into())
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl fmt::Display for TenantId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl From<String> for TenantId {
    fn from(s: String) -> Self {
        Self(s)
    }
}

impl From<&str> for TenantId {
    fn from(s: &str) -> Self {
        Self(s.to_string())
    }
}

/// Subject identifier - the primary entity an event belongs to (conversation, ticket, etc.)
#[derive(Clone, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(transparent)]
pub struct SubjectId(pub String);

impl SubjectId {
    pub fn new(id: impl Into<String>) -> Self {
        Self(id.into())
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl fmt::Display for SubjectId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl From<String> for SubjectId {
    fn from(s: String) -> Self {
        Self(s)
    }
}

impl From<&str> for SubjectId {
    fn from(s: &str) -> Self {
        Self(s.to_string())
    }
}

/// Subject contains all relevant entity IDs for an event
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct Subject {
    /// Primary subject - the main entity this event belongs to (usually conversation_id)
    pub conversation_id: SubjectId,
    /// Optional ticket ID (may differ from conversation in some systems)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ticket_id: Option<String>,
    /// Customer this event relates to
    #[serde(skip_serializing_if = "Option::is_none")]
    pub customer_id: Option<String>,
    /// Account/organization the customer belongs to
    #[serde(skip_serializing_if = "Option::is_none")]
    pub account_id: Option<String>,
}

impl Subject {
    pub fn new(conversation_id: impl Into<SubjectId>) -> Self {
        Self {
            conversation_id: conversation_id.into(),
            ticket_id: None,
            customer_id: None,
            account_id: None,
        }
    }

    pub fn with_ticket(mut self, ticket_id: impl Into<String>) -> Self {
        self.ticket_id = Some(ticket_id.into());
        self
    }

    pub fn with_customer(mut self, customer_id: impl Into<String>) -> Self {
        self.customer_id = Some(customer_id.into());
        self
    }

    pub fn with_account(mut self, account_id: impl Into<String>) -> Self {
        self.account_id = Some(account_id.into());
        self
    }
}

/// Actor who performed the action that generated the event
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct Actor {
    pub actor_type: ActorType,
    pub actor_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub display_name: Option<String>,
}

impl Actor {
    pub fn customer(id: impl Into<String>) -> Self {
        Self {
            actor_type: ActorType::Customer,
            actor_id: id.into(),
            display_name: None,
        }
    }

    pub fn agent(id: impl Into<String>) -> Self {
        Self {
            actor_type: ActorType::Agent,
            actor_id: id.into(),
            display_name: None,
        }
    }

    pub fn system() -> Self {
        Self {
            actor_type: ActorType::System,
            actor_id: "system".to_string(),
            display_name: Some("System".to_string()),
        }
    }

    pub fn with_name(mut self, name: impl Into<String>) -> Self {
        self.display_name = Some(name.into());
        self
    }
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ActorType {
    Customer,
    Agent,
    System,
    Bot,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tenant_id_creation() {
        let tenant = TenantId::new("t_123");
        assert_eq!(tenant.as_str(), "t_123");
        assert_eq!(tenant.to_string(), "t_123");
    }

    #[test]
    fn test_subject_builder() {
        let subject = Subject::new("conv_123")
            .with_ticket("ticket_456")
            .with_customer("cust_789");

        assert_eq!(subject.conversation_id.as_str(), "conv_123");
        assert_eq!(subject.ticket_id, Some("ticket_456".to_string()));
        assert_eq!(subject.customer_id, Some("cust_789".to_string()));
    }

    #[test]
    fn test_actor_types() {
        let customer = Actor::customer("cust_1").with_name("Jane Doe");
        assert_eq!(customer.actor_type, ActorType::Customer);
        assert_eq!(customer.display_name, Some("Jane Doe".to_string()));

        let system = Actor::system();
        assert_eq!(system.actor_type, ActorType::System);
    }
}
