//! Intercom Source Integration
//!
//! This crate provides an Intercom integration for the events manager,
//! handling webhook events from Intercom and transforming them into
//! the unified EventEnvelope format.
//!
//! ## Supported Events
//!
//! ### Conversation Events
//! - `support.conversation.created` - New conversation started
//! - `support.message.customer` - Customer sent a message
//! - `support.message.agent` - Agent sent a message
//! - `support.conversation.closed` - Conversation closed
//! - `support.conversation.reopened` - Conversation reopened
//! - `support.conversation.assigned` - Conversation assigned
//! - `support.note.internal` - Internal note added
//!
//! ### User Events
//! - `customer.created` - New user created
//! - `customer.deleted` - User deleted
//! - `customer.tag.added` - Tag added to user
//! - `customer.tag.removed` - Tag removed from user
//!
//! ### Ticket Events
//! - `support.ticket.created` - New ticket created
//! - `support.ticket.status_changed` - Ticket status changed
//!
//! ## Usage
//!
//! This crate automatically registers itself with the source registry
//! when linked into the application. No manual registration is needed.
//!
//! ```ignore
//! use chronicle_sources_registry::get_source;
//!
//! // The Intercom source is available through the registry
//! if let Some(intercom) = get_source("intercom") {
//!     let manifest = intercom.manifest();
//!     println!("Loaded {} v{}", manifest.name, manifest.version);
//! }
//! ```

mod adapter;
mod types;
mod webhook;

pub use adapter::IntercomAdapter;
pub use types::*;
pub use webhook::IntercomWebhookHandler;

// Register with the source registry
use chronicle_sources_registry::SourceRegistration;

inventory::submit! {
    SourceRegistration::new(|| Box::new(IntercomAdapter::new()))
}

