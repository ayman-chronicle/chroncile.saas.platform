//! Mock Connector for Events Manager
//!
//! Simulates OAuth connections and generates realistic support events
//! for testing and demo purposes.

pub mod generator;
pub mod oauth;
pub mod scenarios;

pub use generator::{generate_random_events, MockEventGenerator};
pub use oauth::{
    ConnectionResponse, ConnectionStatus, CreateConnectionRequest, MockOAuthConnection, MockService,
};
pub use scenarios::{
    all_scenarios, escalation_scenario, refund_request_scenario, simple_question_scenario,
    ConversationScenario,
};
