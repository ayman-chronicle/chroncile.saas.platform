//! Event Envelope
//!
//! The core data structure for all events in the system.
//! Uses Box<RawValue> for zero-copy JSON payload storage.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::value::RawValue;
use ulid::Ulid;

use crate::{new_event_id, Actor, StreamId, Subject, TenantId};

/// PII (Personally Identifiable Information) flags for compliance
#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct PiiFlags {
    /// Whether this event contains PII
    pub contains_pii: bool,
    /// Fields that contain PII (for targeted redaction)
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub fields: Vec<String>,
}

impl PiiFlags {
    pub fn none() -> Self {
        Self::default()
    }

    pub fn with_fields(fields: Vec<String>) -> Self {
        Self {
            contains_pii: !fields.is_empty(),
            fields,
        }
    }
}

/// Permission settings for event visibility
#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct Permissions {
    /// Visibility level (e.g., "support", "internal", "public")
    #[serde(default)]
    pub visibility: String,
    /// Roles that can access this event
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub roles: Vec<String>,
}

impl Permissions {
    pub fn public() -> Self {
        Self {
            visibility: "public".to_string(),
            roles: vec![],
        }
    }

    pub fn support() -> Self {
        Self {
            visibility: "support".to_string(),
            roles: vec!["support_agent".to_string(), "support_manager".to_string()],
        }
    }

    pub fn internal() -> Self {
        Self {
            visibility: "internal".to_string(),
            roles: vec!["internal".to_string()],
        }
    }
}

/// The core event envelope - wraps all events from all sources
///
/// Key design decisions:
/// - `payload` uses `Box<RawValue>` for zero-copy JSON storage
/// - Both `occurred_at` and `ingested_at` are tracked for ordering
/// - `source_event_id` combined with `tenant_id` and `source` provides idempotency
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct EventEnvelope {
    /// Unique event ID (ULID for sortability)
    pub event_id: Ulid,
    /// Tenant this event belongs to
    pub tenant_id: TenantId,
    /// Source system (e.g., "zendesk", "slack", "internal")
    pub source: String,
    /// ID from the source system (for deduplication)
    pub source_event_id: String,
    /// Event type (e.g., "support.message.customer", "ticket.status_changed")
    pub event_type: String,
    /// Subject entities this event relates to
    pub subject: Subject,
    /// Who/what caused this event
    pub actor: Actor,
    /// When the event occurred in the source system
    pub occurred_at: DateTime<Utc>,
    /// When we ingested this event
    pub ingested_at: DateTime<Utc>,
    /// Schema version for payload compatibility
    pub schema_version: u32,
    /// Raw JSON payload - zero-copy storage, parsed lazily on demand
    pub payload: Box<RawValue>,
    /// PII flags for compliance
    #[serde(default)]
    pub pii: PiiFlags,
    /// Access control
    #[serde(default)]
    pub permissions: Permissions,
    /// Stream this event was received from (for multi-stream support)
    /// This is set by the StreamManager when events are ingested
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub stream_id: Option<StreamId>,
}

impl EventEnvelope {
    /// Create a new event envelope with generated IDs and timestamps
    pub fn new(
        tenant_id: impl Into<TenantId>,
        source: impl Into<String>,
        source_event_id: impl Into<String>,
        event_type: impl Into<String>,
        subject: Subject,
        actor: Actor,
        payload: Box<RawValue>,
    ) -> Self {
        let now = Utc::now();
        Self {
            event_id: new_event_id(),
            tenant_id: tenant_id.into(),
            source: source.into(),
            source_event_id: source_event_id.into(),
            event_type: event_type.into(),
            subject,
            actor,
            occurred_at: now,
            ingested_at: now,
            schema_version: 1,
            payload,
            pii: PiiFlags::none(),
            permissions: Permissions::support(),
            stream_id: None,
        }
    }

    /// Set the occurred_at timestamp (when event happened in source)
    pub fn with_occurred_at(mut self, occurred_at: DateTime<Utc>) -> Self {
        self.occurred_at = occurred_at;
        self
    }

    /// Set PII flags
    pub fn with_pii(mut self, pii: PiiFlags) -> Self {
        self.pii = pii;
        self
    }

    /// Set permissions
    pub fn with_permissions(mut self, permissions: Permissions) -> Self {
        self.permissions = permissions;
        self
    }

    /// Set the stream ID (which stream this event came from)
    pub fn with_stream_id(mut self, stream_id: impl Into<StreamId>) -> Self {
        self.stream_id = Some(stream_id.into());
        self
    }

    /// Parse the payload into a typed structure
    ///
    /// This is the lazy parsing approach - only parse when needed.
    pub fn payload_as<T: serde::de::DeserializeOwned>(&self) -> Result<T, serde_json::Error> {
        serde_json::from_str(self.payload.get())
    }

    /// Get the raw payload as a string slice
    pub fn payload_raw(&self) -> &str {
        self.payload.get()
    }

    /// Create a payload from a serializable value
    pub fn make_payload<T: Serialize>(value: &T) -> Result<Box<RawValue>, serde_json::Error> {
        let json = serde_json::to_string(value)?;
        RawValue::from_string(json)
    }

    /// Unique key for deduplication
    pub fn dedup_key(&self) -> String {
        format!(
            "{}:{}:{}",
            self.tenant_id, self.source, self.source_event_id
        )
    }
}

/// Builder for creating EventEnvelope with a more ergonomic API
pub struct EventEnvelopeBuilder {
    tenant_id: TenantId,
    source: String,
    source_event_id: String,
    event_type: String,
    subject: Subject,
    actor: Actor,
    occurred_at: Option<DateTime<Utc>>,
    payload: Option<Box<RawValue>>,
    pii: PiiFlags,
    permissions: Permissions,
    stream_id: Option<StreamId>,
}

impl EventEnvelopeBuilder {
    pub fn new(
        tenant_id: impl Into<TenantId>,
        source: impl Into<String>,
        event_type: impl Into<String>,
    ) -> Self {
        Self {
            tenant_id: tenant_id.into(),
            source: source.into(),
            source_event_id: new_event_id().to_string(),
            event_type: event_type.into(),
            subject: Subject::new("default"),
            actor: Actor::system(),
            occurred_at: None,
            payload: None,
            pii: PiiFlags::none(),
            permissions: Permissions::support(),
            stream_id: None,
        }
    }

    pub fn source_event_id(mut self, id: impl Into<String>) -> Self {
        self.source_event_id = id.into();
        self
    }

    pub fn subject(mut self, subject: Subject) -> Self {
        self.subject = subject;
        self
    }

    pub fn actor(mut self, actor: Actor) -> Self {
        self.actor = actor;
        self
    }

    pub fn occurred_at(mut self, at: DateTime<Utc>) -> Self {
        self.occurred_at = Some(at);
        self
    }

    pub fn payload<T: Serialize>(mut self, value: &T) -> Result<Self, serde_json::Error> {
        self.payload = Some(EventEnvelope::make_payload(value)?);
        Ok(self)
    }

    pub fn payload_raw(mut self, raw: Box<RawValue>) -> Self {
        self.payload = Some(raw);
        self
    }

    pub fn pii(mut self, pii: PiiFlags) -> Self {
        self.pii = pii;
        self
    }

    pub fn permissions(mut self, permissions: Permissions) -> Self {
        self.permissions = permissions;
        self
    }

    pub fn stream_id(mut self, stream_id: impl Into<StreamId>) -> Self {
        self.stream_id = Some(stream_id.into());
        self
    }

    pub fn build(self) -> EventEnvelope {
        let now = Utc::now();
        let payload = self
            .payload
            .unwrap_or_else(|| RawValue::from_string("{}".to_string()).unwrap());

        EventEnvelope {
            event_id: new_event_id(),
            tenant_id: self.tenant_id,
            source: self.source,
            source_event_id: self.source_event_id,
            event_type: self.event_type,
            subject: self.subject,
            actor: self.actor,
            occurred_at: self.occurred_at.unwrap_or(now),
            ingested_at: now,
            schema_version: 1,
            payload,
            pii: self.pii,
            permissions: self.permissions,
            stream_id: self.stream_id,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_envelope_creation() {
        let payload = EventEnvelope::make_payload(&json!({"message": "Hello"})).unwrap();
        let envelope = EventEnvelope::new(
            "tenant_1",
            "mock",
            "evt_123",
            "test.event",
            Subject::new("conv_1"),
            Actor::customer("cust_1"),
            payload,
        );

        assert_eq!(envelope.tenant_id.as_str(), "tenant_1");
        assert_eq!(envelope.source, "mock");
        assert_eq!(envelope.event_type, "test.event");
    }

    #[test]
    fn test_payload_parsing() {
        #[derive(Debug, Deserialize, PartialEq)]
        struct TestPayload {
            message: String,
        }

        let payload = EventEnvelope::make_payload(&json!({"message": "Hello"})).unwrap();
        let envelope = EventEnvelope::new(
            "t1",
            "mock",
            "e1",
            "test",
            Subject::new("c1"),
            Actor::system(),
            payload,
        );

        let parsed: TestPayload = envelope.payload_as().unwrap();
        assert_eq!(
            parsed,
            TestPayload {
                message: "Hello".to_string()
            }
        );
    }

    #[test]
    fn test_dedup_key() {
        let payload = EventEnvelope::make_payload(&json!({})).unwrap();
        let envelope = EventEnvelope::new(
            "tenant_1",
            "zendesk",
            "zd_123",
            "test",
            Subject::new("c1"),
            Actor::system(),
            payload,
        );

        assert_eq!(envelope.dedup_key(), "tenant_1:zendesk:zd_123");
    }

    #[test]
    fn test_builder() {
        let envelope = EventEnvelopeBuilder::new("t1", "source", "type")
            .subject(Subject::new("conv_1"))
            .actor(Actor::agent("agent_1"))
            .payload(&json!({"key": "value"}))
            .unwrap()
            .build();

        assert_eq!(envelope.tenant_id.as_str(), "t1");
        assert_eq!(envelope.source, "source");
        assert_eq!(envelope.event_type, "type");
    }
}
