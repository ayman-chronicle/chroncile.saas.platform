//! Intercom Source Adapter
//!
//! Main adapter implementation for Intercom integration.

use async_trait::async_trait;

use chronicle_sources_core::{
    ConfigError, EventTypeDefinition, FieldMapper, SchemaVersionRegistry,
    SourceAdapter, SourceCapabilities, SourceId, SourceManifest, WebhookHandler,
};

use crate::webhook::IntercomWebhookHandler;

/// Intercom source adapter
pub struct IntercomAdapter {
    manifest: SourceManifest,
    field_mapper: FieldMapper,
    schema_registry: SchemaVersionRegistry,
    webhook_handler: IntercomWebhookHandler,
}

impl IntercomAdapter {
    /// Create a new Intercom adapter
    pub fn new() -> Self {
        let manifest = Self::build_manifest();
        let field_mapper = Self::build_field_mapper();
        let schema_registry = SchemaVersionRegistry::with_current_version(1);
        let webhook_handler = IntercomWebhookHandler::new();

        Self {
            manifest,
            field_mapper,
            schema_registry,
            webhook_handler,
        }
    }

    fn build_manifest() -> SourceManifest {
        let capabilities = SourceCapabilities {
            webhook: true,
            polling: false,
            oauth: true,
            bidirectional: false,
            generator: false,
        };

        let event_catalog = Self::build_event_catalog();

        let config_schema = serde_json::json!({
            "type": "object",
            "properties": {
                "webhook_secret": {
                    "type": "string",
                    "description": "Secret for verifying webhook signatures"
                },
                "app_id": {
                    "type": "string",
                    "description": "Intercom App ID"
                }
            },
            "required": []
        });

        SourceManifest::new(
            SourceId::new("intercom"),
            "Intercom",
            semver::Version::new(1, 0, 0),
        )
        .with_description(
            "Customer messaging platform - support conversations, tickets, and user events",
        )
        .with_capabilities(capabilities)
        .with_event_catalog(event_catalog)
        .with_config_schema(config_schema)
        .with_docs_url("https://developers.intercom.com/docs/webhooks")
    }

    fn build_event_catalog() -> Vec<EventTypeDefinition> {
        vec![
            // Conversation events
            EventTypeDefinition::new(
                "support.conversation.created",
                "conversation.user.created",
                "A new conversation was started by a customer",
            )
            .with_category("conversation")
            .with_pii_fields(vec![
                "email".to_string(),
                "name".to_string(),
                "body".to_string(),
            ]),
            EventTypeDefinition::new(
                "support.message.customer",
                "conversation.user.replied",
                "Customer sent a message in a conversation",
            )
            .with_category("conversation")
            .with_pii_fields(vec![
                "email".to_string(),
                "name".to_string(),
                "body".to_string(),
            ]),
            EventTypeDefinition::new(
                "support.message.agent",
                "conversation.admin.replied",
                "Agent/admin sent a message in a conversation",
            )
            .with_category("conversation")
            .with_pii_fields(vec!["name".to_string(), "body".to_string()]),
            EventTypeDefinition::new(
                "support.conversation.closed",
                "conversation.admin.closed",
                "Conversation was closed by an agent",
            )
            .with_category("conversation"),
            EventTypeDefinition::new(
                "support.conversation.reopened",
                "conversation.admin.opened",
                "Conversation was reopened by an agent",
            )
            .with_category("conversation"),
            EventTypeDefinition::new(
                "support.conversation.assigned",
                "conversation.admin.assigned",
                "Conversation was assigned to an agent",
            )
            .with_category("conversation"),
            EventTypeDefinition::new(
                "support.note.internal",
                "conversation.admin.noted",
                "Internal note was added to a conversation",
            )
            .with_category("conversation")
            .with_pii_fields(vec!["body".to_string()]),
            EventTypeDefinition::new(
                "support.conversation.snoozed",
                "conversation.admin.snoozed",
                "Conversation was snoozed",
            )
            .with_category("conversation"),
            EventTypeDefinition::new(
                "support.conversation.unsnoozed",
                "conversation.admin.unsnoozed",
                "Conversation was unsnoozed",
            )
            .with_category("conversation"),
            EventTypeDefinition::new(
                "support.rating.added",
                "conversation.rating.added",
                "Customer rated a conversation",
            )
            .with_category("conversation"),
            EventTypeDefinition::new(
                "support.rating.remarked",
                "conversation.rating.remarked",
                "Customer added a remark to their rating",
            )
            .with_category("conversation")
            .with_pii_fields(vec!["body".to_string()]),
            // User events
            EventTypeDefinition::new(
                "customer.created",
                "user.created",
                "A new user/lead was created",
            )
            .with_category("user")
            .with_pii_fields(vec!["email".to_string(), "name".to_string()]),
            EventTypeDefinition::new("customer.deleted", "user.deleted", "A user was deleted")
                .with_category("user"),
            EventTypeDefinition::new(
                "customer.email.updated",
                "user.email.updated",
                "User email was updated",
            )
            .with_category("user")
            .with_pii_fields(vec!["email".to_string()]),
            EventTypeDefinition::new(
                "customer.tag.added",
                "user.tag.created",
                "A tag was added to a user",
            )
            .with_category("user"),
            EventTypeDefinition::new(
                "customer.tag.removed",
                "user.tag.deleted",
                "A tag was removed from a user",
            )
            .with_category("user"),
            EventTypeDefinition::new(
                "customer.unsubscribed",
                "user.unsubscribed",
                "User unsubscribed from emails",
            )
            .with_category("user"),
            // Lead events
            EventTypeDefinition::new("lead.created", "contact.created", "A new lead was created")
                .with_category("lead")
                .with_pii_fields(vec!["email".to_string(), "name".to_string()]),
            EventTypeDefinition::new(
                "lead.converted",
                "contact.signed_up",
                "Lead converted to a user",
            )
            .with_category("lead"),
            EventTypeDefinition::new(
                "lead.tag.added",
                "contact.tag.created",
                "A tag was added to a lead",
            )
            .with_category("lead"),
            EventTypeDefinition::new(
                "lead.tag.removed",
                "contact.tag.deleted",
                "A tag was removed from a lead",
            )
            .with_category("lead"),
            // Ticket events
            EventTypeDefinition::new(
                "support.ticket.created",
                "ticket.created",
                "A support ticket was created",
            )
            .with_category("ticket")
            .with_pii_fields(vec![
                "email".to_string(),
                "name".to_string(),
                "body".to_string(),
            ]),
            EventTypeDefinition::new(
                "support.ticket.status_changed",
                "ticket.state.updated",
                "Ticket status was changed",
            )
            .with_category("ticket"),
            // System events
            EventTypeDefinition::new("intercom.ping", "ping", "Webhook ping/test notification")
                .with_category("system"),
        ]
    }

    fn build_field_mapper() -> FieldMapper {
        // For now, use the default field mapper
        // The actual transformation is done in the webhook handler
        // In the future, this could be loaded from a TOML file
        FieldMapper::new()
    }
}

impl Default for IntercomAdapter {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl SourceAdapter for IntercomAdapter {
    fn manifest(&self) -> &SourceManifest {
        &self.manifest
    }

    fn field_mapper(&self) -> &FieldMapper {
        &self.field_mapper
    }

    fn schema_registry(&self) -> &SchemaVersionRegistry {
        &self.schema_registry
    }

    fn validate_config(&self, config: &serde_json::Value) -> Result<(), ConfigError> {
        // Validate against JSON schema
        if !config.is_object() {
            return Err(ConfigError::ValidationFailed(
                "Config must be an object".to_string(),
            ));
        }

        // webhook_secret should be a string if present
        if let Some(secret) = config.get("webhook_secret") {
            if !secret.is_string() {
                return Err(ConfigError::InvalidValue {
                    field: "webhook_secret".to_string(),
                    message: "Must be a string".to_string(),
                });
            }
        }

        Ok(())
    }

    fn as_webhook_handler(&self) -> Option<&dyn WebhookHandler> {
        Some(&self.webhook_handler)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_adapter_creation() {
        let adapter = IntercomAdapter::new();
        assert_eq!(adapter.manifest().id.as_str(), "intercom");
        assert_eq!(adapter.manifest().name, "Intercom");
        assert!(adapter.manifest().capabilities.webhook);
    }

    #[test]
    fn test_event_catalog() {
        let adapter = IntercomAdapter::new();
        let catalog = &adapter.manifest().event_catalog;

        // Should have conversation events
        assert!(catalog
            .iter()
            .any(|e| e.event_type == "support.conversation.created"));

        // Should have ticket events
        assert!(catalog
            .iter()
            .any(|e| e.event_type == "support.ticket.created"));

        // Should have user events
        assert!(catalog.iter().any(|e| e.event_type == "customer.created"));
    }

    #[test]
    fn test_config_validation() {
        let adapter = IntercomAdapter::new();

        // Valid config
        let valid = serde_json::json!({
            "webhook_secret": "test_secret"
        });
        assert!(adapter.validate_config(&valid).is_ok());

        // Invalid config - not an object
        let invalid = serde_json::json!("not an object");
        assert!(adapter.validate_config(&invalid).is_err());

        // Invalid config - wrong type for webhook_secret
        let invalid = serde_json::json!({
            "webhook_secret": 123
        });
        assert!(adapter.validate_config(&invalid).is_err());
    }

    #[test]
    fn test_webhook_handler() {
        let adapter = IntercomAdapter::new();
        assert!(adapter.as_webhook_handler().is_some());
    }
}

