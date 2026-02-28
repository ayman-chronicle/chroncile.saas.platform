//! Intercom-specific types
//!
//! Data structures for parsing Intercom webhook payloads.

use serde::Deserialize;

/// Intercom webhook notification envelope
#[derive(Debug, Deserialize)]
pub struct IntercomWebhook {
    /// Type of notification (always "notification_event")
    #[serde(rename = "type")]
    pub notification_type: String,
    /// App ID that sent the webhook
    pub app_id: Option<String>,
    /// Webhook topic (e.g., "conversation.user.created")
    pub topic: String,
    /// Unique ID for this webhook delivery (can be null for ping tests)
    pub id: Option<String>,
    /// Timestamp of the event
    pub created_at: Option<i64>,
    /// First sent timestamp
    pub first_sent_at: Option<i64>,
    /// Delivery attempts count
    pub delivery_attempts: Option<i32>,
    /// Delivery status
    pub delivery_status: Option<String>,
    /// Delivered at timestamp
    pub delivered_at: Option<i64>,
    /// Event data containing the actual payload
    pub data: IntercomWebhookData,
}

#[derive(Debug, Deserialize)]
pub struct IntercomWebhookData {
    /// Type of the data item
    #[serde(rename = "type")]
    pub data_type: Option<String>,
    /// The actual data item (conversation, user, ticket, etc.)
    pub item: serde_json::Value,
}

/// Intercom conversation structure (subset of fields we care about)
#[derive(Debug, Deserialize)]
pub struct IntercomConversation {
    pub id: String,
    #[serde(rename = "type")]
    pub item_type: Option<String>,
    pub created_at: Option<i64>,
    pub updated_at: Option<i64>,
    pub state: Option<String>,
    pub source: Option<IntercomSource>,
    pub contacts: Option<IntercomContacts>,
    pub assignee: Option<IntercomAdmin>,
    pub conversation_parts: Option<IntercomConversationParts>,
}

#[derive(Debug, Deserialize)]
pub struct IntercomSource {
    #[serde(rename = "type")]
    pub source_type: Option<String>,
    pub id: Option<String>,
    pub author: Option<IntercomAuthor>,
    pub body: Option<String>,
    pub delivered_as: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct IntercomAuthor {
    #[serde(rename = "type")]
    pub author_type: Option<String>,
    pub id: Option<String>,
    pub name: Option<String>,
    pub email: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct IntercomContacts {
    #[serde(rename = "type")]
    pub list_type: Option<String>,
    pub contacts: Option<Vec<IntercomContact>>,
}

#[derive(Debug, Deserialize)]
pub struct IntercomContact {
    #[serde(rename = "type")]
    pub contact_type: Option<String>,
    pub id: String,
    pub external_id: Option<String>,
    pub name: Option<String>,
    pub email: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct IntercomAdmin {
    #[serde(rename = "type")]
    pub admin_type: Option<String>,
    pub id: Option<String>,
    pub name: Option<String>,
    pub email: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct IntercomConversationParts {
    #[serde(rename = "type")]
    pub list_type: Option<String>,
    pub conversation_parts: Option<Vec<IntercomConversationPart>>,
}

#[derive(Debug, Deserialize)]
pub struct IntercomConversationPart {
    #[serde(rename = "type")]
    pub part_type: Option<String>,
    pub id: Option<String>,
    pub part_type_name: Option<String>,
    pub body: Option<String>,
    pub created_at: Option<i64>,
    pub author: Option<IntercomAuthor>,
    pub assigned_to: Option<IntercomAdmin>,
}

/// Intercom user/lead structure
#[derive(Debug, Deserialize)]
pub struct IntercomUser {
    pub id: String,
    #[serde(rename = "type")]
    pub user_type: Option<String>,
    pub external_id: Option<String>,
    pub name: Option<String>,
    pub email: Option<String>,
    pub created_at: Option<i64>,
    pub updated_at: Option<i64>,
    pub custom_attributes: Option<serde_json::Value>,
}

/// Intercom ticket state structure
#[derive(Debug, Deserialize)]
pub struct IntercomTicketState {
    pub id: Option<String>,
    pub category: Option<String>,
    pub external_label: Option<String>,
    pub internal_label: Option<String>,
}

/// Intercom ticket type structure
#[derive(Debug, Deserialize)]
pub struct IntercomTicketType {
    pub id: Option<String>,
    pub name: Option<String>,
    pub description: Option<String>,
    pub category: Option<String>,
    pub archived: Option<bool>,
}

/// Intercom ticket part structure
#[derive(Debug, Deserialize)]
pub struct IntercomTicketPart {
    #[serde(rename = "type")]
    pub part_type: Option<String>,
    pub id: Option<String>,
    pub part_type_name: Option<String>,
    pub body: Option<String>,
    pub created_at: Option<i64>,
    pub updated_at: Option<i64>,
    pub author: Option<IntercomAuthor>,
    pub assigned_to: Option<IntercomAdmin>,
    pub ticket_state: Option<String>,
    pub previous_ticket_state: Option<String>,
}

/// Intercom ticket parts list
#[derive(Debug, Deserialize)]
pub struct IntercomTicketParts {
    #[serde(rename = "type")]
    pub list_type: Option<String>,
    pub ticket_parts: Option<Vec<IntercomTicketPart>>,
    pub total_count: Option<i32>,
}

/// Intercom ticket structure
#[derive(Debug, Deserialize)]
pub struct IntercomTicket {
    pub id: String,
    #[serde(rename = "type")]
    pub item_type: Option<String>,
    pub ticket_id: Option<String>,
    pub ticket_state: Option<IntercomTicketState>,
    pub ticket_type: Option<IntercomTicketType>,
    pub ticket_attributes: Option<serde_json::Value>,
    pub category: Option<String>,
    pub channel: Option<String>,
    pub open: Option<bool>,
    pub created_at: Option<i64>,
    pub updated_at: Option<i64>,
    pub contacts: Option<IntercomContacts>,
    pub admin_assignee_id: Option<String>,
    pub team_assignee_id: Option<String>,
    pub company_id: Option<String>,
    pub snoozed_until: Option<i64>,
    pub is_shared: Option<bool>,
    pub ticket_parts: Option<IntercomTicketParts>,
}

