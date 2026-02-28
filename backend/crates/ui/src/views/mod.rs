//! UI Views
//!
//! Contains all UI components for the Events Manager desktop app.

mod connections;
mod timeline;
pub mod widgets;

pub use connections::{ConnectionAction, ConnectionsView};
pub use timeline::TimelineView;
