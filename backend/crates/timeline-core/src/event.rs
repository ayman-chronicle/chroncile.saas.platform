//! Event Trait
//!
//! Abstraction for event data that can be displayed in the timeline.

use chrono::{DateTime, Utc};
use egui::Color32;

/// Trait for event data that can be displayed in the timeline.
///
/// This trait allows the timeline panel to work with different event types
/// from different applications (e.g., EventDto in the main app, TimelineEvent
/// in the web widget).
pub trait TimelineEventData {
    /// Get the unique identifier for this event
    fn id(&self) -> &str;

    /// Get the source system (e.g., "intercom", "stripe")
    fn source(&self) -> &str;

    /// Get the event type (e.g., "intercom.conversation.opened")
    fn event_type(&self) -> &str;

    /// Get when the event occurred
    fn occurred_at(&self) -> DateTime<Utc>;

    /// Get the actor/user who triggered the event (if available)
    fn actor(&self) -> Option<&str> {
        None
    }

    /// Get a brief message or description (if available)
    fn message(&self) -> Option<&str> {
        None
    }

    /// Get a custom color for this event (if available)
    /// If None, the source color will be used
    fn color(&self) -> Option<Color32> {
        None
    }

    /// Get an optional stream/category identifier
    fn stream(&self) -> Option<&str> {
        None
    }
}

/// A simple event struct that implements TimelineEventData.
/// Useful for testing or simple use cases.
#[derive(Clone, Debug)]
#[cfg_attr(feature = "serde", derive(serde::Serialize, serde::Deserialize))]
pub struct SimpleEvent {
    pub id: String,
    pub source: String,
    pub event_type: String,
    pub occurred_at: DateTime<Utc>,
    pub actor: Option<String>,
    pub message: Option<String>,
    pub color: Option<[u8; 3]>,
    pub stream: Option<String>,
}

impl TimelineEventData for SimpleEvent {
    fn id(&self) -> &str {
        &self.id
    }

    fn source(&self) -> &str {
        &self.source
    }

    fn event_type(&self) -> &str {
        &self.event_type
    }

    fn occurred_at(&self) -> DateTime<Utc> {
        self.occurred_at
    }

    fn actor(&self) -> Option<&str> {
        self.actor.as_deref()
    }

    fn message(&self) -> Option<&str> {
        self.message.as_deref()
    }

    fn color(&self) -> Option<Color32> {
        self.color.map(|[r, g, b]| Color32::from_rgb(r, g, b))
    }

    fn stream(&self) -> Option<&str> {
        self.stream.as_deref()
    }
}

impl SimpleEvent {
    /// Create a new simple event
    pub fn new(
        id: impl Into<String>,
        source: impl Into<String>,
        event_type: impl Into<String>,
        occurred_at: DateTime<Utc>,
    ) -> Self {
        Self {
            id: id.into(),
            source: source.into(),
            event_type: event_type.into(),
            occurred_at,
            actor: None,
            message: None,
            color: None,
            stream: None,
        }
    }

    /// Set the actor
    pub fn with_actor(mut self, actor: impl Into<String>) -> Self {
        self.actor = Some(actor.into());
        self
    }

    /// Set the message
    pub fn with_message(mut self, message: impl Into<String>) -> Self {
        self.message = Some(message.into());
        self
    }

    /// Set the color
    pub fn with_color(mut self, r: u8, g: u8, b: u8) -> Self {
        self.color = Some([r, g, b]);
        self
    }

    /// Set the stream
    pub fn with_stream(mut self, stream: impl Into<String>) -> Self {
        self.stream = Some(stream.into());
        self
    }
}
