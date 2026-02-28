//! Intercom Webhook Handler
//!
//! Implements the WebhookHandler trait for Intercom webhooks.

use async_trait::async_trait;
use bytes::Bytes;
use chrono::{DateTime, Utc};
use hmac::{Hmac, Mac};
use http::HeaderMap;
use sha1::Sha1;

use chronicle_domain::{Actor, EventEnvelope, PiiFlags, Subject};
use chronicle_sources_core::{
    error::WebhookError, IngestContext, WebhookHandler,
};

use crate::types::{
    IntercomConversation, IntercomTicket, IntercomUser, IntercomWebhook,
};

type HmacSha1 = Hmac<Sha1>;

/// Supported Intercom webhook topics
pub const SUPPORTED_TOPICS: &[&str] = &[
    "conversation.user.created",
    "conversation.user.replied",
    "conversation.admin.replied",
    "conversation.admin.closed",
    "conversation.admin.opened",
    "conversation.admin.assigned",
    "conversation.admin.noted",
    "conversation.admin.snoozed",
    "conversation.admin.unsnoozed",
    "conversation.rating.added",
    "conversation.rating.remarked",
    "user.created",
    "user.deleted",
    "user.email.updated",
    "user.tag.created",
    "user.tag.deleted",
    "user.unsubscribed",
    "contact.created",
    "contact.signed_up",
    "contact.tag.created",
    "contact.tag.deleted",
    "ticket.created",
    "ticket.state.updated",
    "ping",
];

/// Intercom webhook handler
pub struct IntercomWebhookHandler;

impl IntercomWebhookHandler {
    pub fn new() -> Self {
        Self
    }

    /// Map Intercom topic to our event type naming convention
    fn map_topic_to_event_type(topic: &str) -> String {
        match topic {
            // Conversation events
            "conversation.user.created" => "support.conversation.created".to_string(),
            "conversation.user.replied" => "support.message.customer".to_string(),
            "conversation.admin.replied" => "support.message.agent".to_string(),
            "conversation.admin.closed" => "support.conversation.closed".to_string(),
            "conversation.admin.opened" => "support.conversation.reopened".to_string(),
            "conversation.admin.assigned" => "support.conversation.assigned".to_string(),
            "conversation.admin.noted" => "support.note.internal".to_string(),
            "conversation.admin.snoozed" => "support.conversation.snoozed".to_string(),
            "conversation.admin.unsnoozed" => "support.conversation.unsnoozed".to_string(),
            "conversation.rating.added" => "support.rating.added".to_string(),
            "conversation.rating.remarked" => "support.rating.remarked".to_string(),

            // User events
            "user.created" => "customer.created".to_string(),
            "user.deleted" => "customer.deleted".to_string(),
            "user.email.updated" => "customer.email.updated".to_string(),
            "user.tag.created" => "customer.tag.added".to_string(),
            "user.tag.deleted" => "customer.tag.removed".to_string(),
            "user.unsubscribed" => "customer.unsubscribed".to_string(),

            // Contact/Lead events
            "contact.created" => "lead.created".to_string(),
            "contact.signed_up" => "lead.converted".to_string(),
            "contact.tag.created" => "lead.tag.added".to_string(),
            "contact.tag.deleted" => "lead.tag.removed".to_string(),

            // Ticket events
            "ticket.created" => "support.ticket.created".to_string(),
            "ticket.state.updated" => "support.ticket.status_changed".to_string(),

            // System/test events
            "ping" => "intercom.ping".to_string(),

            // Default: use the original topic prefixed
            _ => format!("intercom.{}", topic.replace('.', "_")),
        }
    }

    /// Extract conversation context (subject, actor) from webhook
    fn extract_conversation_context(
        webhook: &IntercomWebhook,
    ) -> Result<(Subject, Actor, bool), WebhookError> {
        let conversation: IntercomConversation =
            serde_json::from_value(webhook.data.item.clone()).map_err(|e| {
                tracing::error!(
                    error = %e,
                    item = %webhook.data.item,
                    "Failed to parse conversation data"
                );
                WebhookError::ParseError(format!("Invalid conversation data: {}", e))
            })?;

        let conversation_id = format!("intercom_conv_{}", conversation.id);
        let mut subject = Subject::new(conversation_id);

        // Add customer info if available
        if let Some(contacts) = &conversation.contacts {
            if let Some(contact_list) = &contacts.contacts {
                if let Some(contact) = contact_list.first() {
                    subject = subject.with_customer(format!("intercom_user_{}", contact.id));
                }
            }
        }

        // Determine actor based on topic
        let actor = match webhook.topic.as_str() {
            t if t.contains(".user.") || t.contains("customer") => {
                // User/customer action
                if let Some(source) = &conversation.source {
                    if let Some(author) = &source.author {
                        let actor_id = author.id.clone().unwrap_or_else(|| "unknown".to_string());
                        let mut actor = Actor::customer(format!("intercom_user_{}", actor_id));
                        if let Some(name) = &author.name {
                            actor = actor.with_name(name.clone());
                        }
                        actor
                    } else {
                        Actor::customer("unknown")
                    }
                } else {
                    Actor::customer("unknown")
                }
            }
            t if t.contains(".admin.") => {
                // Admin/agent action - check assignee or conversation parts
                if let Some(assignee) = &conversation.assignee {
                    let actor_id = assignee.id.clone().unwrap_or_else(|| "unknown".to_string());
                    let mut actor = Actor::agent(format!("intercom_admin_{}", actor_id));
                    if let Some(name) = &assignee.name {
                        actor = actor.with_name(name.clone());
                    }
                    actor
                } else if let Some(parts) = &conversation.conversation_parts {
                    if let Some(part_list) = &parts.conversation_parts {
                        if let Some(last_part) = part_list.last() {
                            if let Some(author) = &last_part.author {
                                let actor_id =
                                    author.id.clone().unwrap_or_else(|| "unknown".to_string());
                                let mut actor =
                                    Actor::agent(format!("intercom_admin_{}", actor_id));
                                if let Some(name) = &author.name {
                                    actor = actor.with_name(name.clone());
                                }
                                actor
                            } else {
                                Actor::agent("unknown")
                            }
                        } else {
                            Actor::agent("unknown")
                        }
                    } else {
                        Actor::agent("unknown")
                    }
                } else {
                    Actor::agent("unknown")
                }
            }
            _ => Actor::system(),
        };

        // Conversations typically contain PII (email, name, message body)
        let contains_pii = true;

        Ok((subject, actor, contains_pii))
    }

    /// Extract user context from webhook
    fn extract_user_context(
        webhook: &IntercomWebhook,
    ) -> Result<(Subject, Actor, bool), WebhookError> {
        let user: IntercomUser = serde_json::from_value(webhook.data.item.clone()).map_err(|e| {
            tracing::error!(
                error = %e,
                item = %webhook.data.item,
                "Failed to parse user data"
            );
            WebhookError::ParseError(format!("Invalid user data: {}", e))
        })?;

        let subject_id = format!("intercom_user_{}", user.id);
        let subject = Subject::new(subject_id.clone()).with_customer(subject_id.clone());

        // User events are typically caused by the system or the user themselves
        let mut actor = if webhook.topic.contains(".tag.") {
            Actor::system() // Tags are usually applied by automations or admins
        } else {
            Actor::customer(&subject_id)
        };

        if let Some(name) = &user.name {
            actor = actor.with_name(name.clone());
        }

        // User records contain PII
        let contains_pii = true;

        Ok((subject, actor, contains_pii))
    }

    /// Extract ticket context from webhook
    fn extract_ticket_context(
        webhook: &IntercomWebhook,
    ) -> Result<(Subject, Actor, bool), WebhookError> {
        let ticket: IntercomTicket =
            serde_json::from_value(webhook.data.item.clone()).map_err(|e| {
                tracing::error!(
                    error = %e,
                    item = %webhook.data.item,
                    "Failed to parse ticket data"
                );
                WebhookError::ParseError(format!("Invalid ticket data: {}", e))
            })?;

        // Use ticket_id if available, otherwise fall back to id
        let ticket_identifier = ticket.ticket_id.clone().unwrap_or_else(|| ticket.id.clone());
        let subject_id = format!("intercom_ticket_{}", ticket_identifier);

        let mut subject = Subject::new(subject_id.clone()).with_ticket(subject_id.clone());

        // Add customer info if available
        if let Some(contacts) = &ticket.contacts {
            if let Some(contact_list) = &contacts.contacts {
                if let Some(contact) = contact_list.first() {
                    subject = subject.with_customer(format!("intercom_user_{}", contact.id));
                }
            }
        }

        // Determine actor from ticket parts or assignee
        let actor = if let Some(parts) = &ticket.ticket_parts {
            if let Some(part_list) = &parts.ticket_parts {
                if let Some(last_part) = part_list.last() {
                    if let Some(author) = &last_part.author {
                        let actor_id = author.id.clone().unwrap_or_else(|| "unknown".to_string());
                        let is_admin = author.author_type.as_deref() == Some("admin");
                        let mut actor = if is_admin {
                            Actor::agent(format!("intercom_admin_{}", actor_id))
                        } else {
                            Actor::customer(format!("intercom_user_{}", actor_id))
                        };
                        if let Some(name) = &author.name {
                            actor = actor.with_name(name.clone());
                        }
                        actor
                    } else {
                        Actor::system()
                    }
                } else {
                    Actor::system()
                }
            } else {
                Actor::system()
            }
        } else if let Some(admin_id) = &ticket.admin_assignee_id {
            Actor::agent(format!("intercom_admin_{}", admin_id))
        } else {
            Actor::system()
        };

        // Tickets contain PII
        let contains_pii = true;

        Ok((subject, actor, contains_pii))
    }
}

impl Default for IntercomWebhookHandler {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl WebhookHandler for IntercomWebhookHandler {
    async fn verify_signature(
        &self,
        headers: &HeaderMap,
        body: &[u8],
        secret: &str,
    ) -> Result<(), WebhookError> {
        let signature_header = headers
            .get("X-Hub-Signature")
            .and_then(|v| v.to_str().ok());

        let Some(signature_header) = signature_header else {
            // No signature header - this might be acceptable in dev
            tracing::debug!("No X-Hub-Signature header present");
            return Err(WebhookError::MissingSignatureHeader(
                "X-Hub-Signature".to_string(),
            ));
        };

        let Some(signature) = signature_header.strip_prefix("sha1=") else {
            tracing::debug!(
                signature_header = signature_header,
                "Signature header doesn't start with 'sha1='"
            );
            return Err(WebhookError::InvalidSignature);
        };

        let Ok(mut mac) = HmacSha1::new_from_slice(secret.as_bytes()) else {
            tracing::debug!("Failed to create HMAC from secret");
            return Err(WebhookError::InvalidSignature);
        };

        mac.update(body);

        let Ok(expected) = hex::decode(signature) else {
            tracing::debug!("Failed to hex-decode signature");
            return Err(WebhookError::InvalidSignature);
        };

        mac.verify_slice(&expected)
            .map_err(|_| WebhookError::InvalidSignature)
    }

    async fn handle_webhook(
        &self,
        _headers: &HeaderMap,
        body: Bytes,
        context: &IngestContext,
    ) -> Result<Vec<EventEnvelope>, WebhookError> {
        // Parse the webhook payload
        let webhook: IntercomWebhook =
            serde_json::from_slice(&body).map_err(|e| {
                let body_str = String::from_utf8_lossy(&body);
                tracing::error!(
                    error = %e,
                    body = %body_str,
                    "Failed to parse Intercom webhook payload"
                );
                WebhookError::ParseError(format!("Invalid webhook payload: {}", e))
            })?;

        tracing::debug!(
            topic = %webhook.topic,
            webhook_id = ?webhook.id,
            "Parsed Intercom webhook"
        );

        // Generate source event ID
        let webhook_id = webhook
            .id
            .clone()
            .unwrap_or_else(|| format!("generated_{}", chrono::Utc::now().timestamp_millis()));
        let source_event_id = format!("intercom_{}", webhook_id);

        // Determine event type based on topic
        let event_type = Self::map_topic_to_event_type(&webhook.topic);

        // Extract context based on topic
        let (subject, actor, contains_pii) = match webhook.topic.as_str() {
            t if t.starts_with("conversation.") => Self::extract_conversation_context(&webhook)?,
            t if t.starts_with("user.") => Self::extract_user_context(&webhook)?,
            t if t.starts_with("ticket.") => Self::extract_ticket_context(&webhook)?,
            _ => (
                Subject::new(format!(
                    "intercom_{}",
                    webhook.id.as_deref().unwrap_or("unknown")
                )),
                Actor::system(),
                false,
            ),
        };

        // Get timestamp
        let occurred_at = webhook
            .created_at
            .and_then(|ts| DateTime::from_timestamp(ts, 0))
            .unwrap_or_else(Utc::now);

        // Create the event envelope
        let payload = EventEnvelope::make_payload(&webhook.data.item)
            .map_err(|e| WebhookError::TransformError(format!("Failed to serialize payload: {}", e)))?;

        let mut event = EventEnvelope::new(
            context.tenant_id.clone(),
            "intercom",
            source_event_id,
            event_type,
            subject,
            actor,
            payload,
        )
        .with_occurred_at(occurred_at);

        if contains_pii {
            event = event.with_pii(PiiFlags::with_fields(vec![
                "email".to_string(),
                "name".to_string(),
                "body".to_string(),
            ]));
        }

        Ok(vec![event])
    }

    fn supported_topics(&self) -> &[&str] {
        SUPPORTED_TOPICS
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_topic_mapping() {
        assert_eq!(
            IntercomWebhookHandler::map_topic_to_event_type("conversation.user.created"),
            "support.conversation.created"
        );
        assert_eq!(
            IntercomWebhookHandler::map_topic_to_event_type("ticket.created"),
            "support.ticket.created"
        );
        assert_eq!(
            IntercomWebhookHandler::map_topic_to_event_type("ping"),
            "intercom.ping"
        );
        assert_eq!(
            IntercomWebhookHandler::map_topic_to_event_type("unknown.topic"),
            "intercom.unknown_topic"
        );
    }

    #[test]
    fn test_supported_topics() {
        let handler = IntercomWebhookHandler::new();
        assert!(handler.supports_topic("conversation.user.created"));
        assert!(handler.supports_topic("ping"));
        assert!(!handler.supports_topic("nonexistent.topic"));
    }
}

