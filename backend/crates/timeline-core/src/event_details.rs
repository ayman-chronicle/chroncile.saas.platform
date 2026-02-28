//! Event Details Panel
//!
//! A reusable event details widget for displaying detailed information about a selected event.
//! Includes metadata grid, type badge, and scrollable payload viewer.

use egui::{RichText, ScrollArea, Sense, Ui};

use crate::event::TimelineEventData;
use crate::theme::TimelineTheme;
use crate::topic_tree::source_color;

/// Configuration for the EventDetailsPanel
#[derive(Clone, Debug)]
pub struct EventDetailsConfig {
    /// Whether to show the payload section
    pub show_payload: bool,
    /// Maximum rows to show in payload viewer
    pub payload_rows: usize,
    /// Whether to enable click-to-copy
    pub enable_copy: bool,
}

impl Default for EventDetailsConfig {
    fn default() -> Self {
        Self {
            show_payload: true,
            payload_rows: 10,
            enable_copy: true,
        }
    }
}

/// Response from the EventDetailsPanel
#[derive(Default)]
pub struct EventDetailsResponse {
    /// Field that was copied (if any)
    pub copied_field: Option<String>,
}

/// Event Details Panel widget
///
/// Displays detailed information about a selected event including type, source,
/// actor, timestamp, and payload.
pub struct EventDetailsPanel {
    /// Configuration
    pub config: EventDetailsConfig,
    /// Theme
    pub theme: TimelineTheme,
    /// Copy feedback state (field name, expiry time)
    copy_feedback: Option<(String, f64)>,
}

impl EventDetailsPanel {
    /// Create a new EventDetailsPanel
    pub fn new() -> Self {
        Self {
            config: EventDetailsConfig::default(),
            theme: TimelineTheme::dark(),
            copy_feedback: None,
        }
    }

    /// Create with custom config
    pub fn with_config(config: EventDetailsConfig) -> Self {
        Self {
            config,
            ..Self::new()
        }
    }

    /// Set the theme
    pub fn set_theme(&mut self, theme: TimelineTheme) {
        self.theme = theme;
    }

    /// Render the event details panel
    pub fn ui<T: TimelineEventData>(
        &mut self,
        ui: &mut Ui,
        event: Option<&T>,
        payload_json: Option<&str>,
    ) -> EventDetailsResponse {
        let mut response = EventDetailsResponse::default();

        // Header
        ui.horizontal(|ui| {
            ui.label(
                RichText::new("EVENT DETAILS")
                    .color(self.theme.text_secondary)
                    .font(self.theme.font_caption.clone())
                    .strong(),
            );
        });

        ui.add_space(self.theme.spacing_xs);
        ui.add(egui::Separator::default().spacing(self.theme.spacing_xs));
        ui.add_space(self.theme.spacing_xs);

        match event {
            Some(event) => {
                self.render_event(ui, event, payload_json, &mut response);
            }
            None => {
                ui.vertical_centered(|ui| {
                    ui.add_space(self.theme.spacing_lg);
                    ui.label(
                        RichText::new("Select an event to view details")
                            .color(self.theme.text_muted)
                            .font(self.theme.font_small.clone()),
                    );
                    ui.add_space(self.theme.spacing_lg);
                });
            }
        }

        // Clear expired copy feedback
        let now = ui.ctx().input(|i| i.time);
        if let Some((_, expiry)) = &self.copy_feedback {
            if now > *expiry {
                self.copy_feedback = None;
            }
        }

        response
    }

    fn render_event<T: TimelineEventData>(
        &mut self,
        ui: &mut Ui,
        event: &T,
        payload_json: Option<&str>,
        response: &mut EventDetailsResponse,
    ) {
        ScrollArea::vertical().show(ui, |ui| {
            // Type badge
            let type_str = event.event_type();
            let type_label = type_str.rsplit('.').next().unwrap_or(type_str);
            let type_color = self.theme.accent;

            ui.horizontal(|ui| {
                egui::Frame::none()
                    .fill(type_color.gamma_multiply(0.15))
                    .rounding(self.theme.rounding_sm)
                    .inner_margin(egui::Margin::symmetric(self.theme.spacing_sm, self.theme.spacing_xs))
                    .stroke(egui::Stroke::new(1.0, type_color.gamma_multiply(0.4)))
                    .show(ui, |ui| {
                        ui.label(
                            RichText::new(type_label)
                                .color(type_color)
                                .font(self.theme.font_small.clone())
                                .strong(),
                        );
                    });
            });

            ui.add_space(self.theme.spacing_md);

            // Details grid
            egui::Grid::new("event_details_grid")
                .num_columns(2)
                .spacing([self.theme.spacing_md, self.theme.spacing_xs])
                .show(ui, |ui| {
                    // Event ID
                    self.detail_row(ui, "ID", event.id(), response);

                    // Full type
                    self.detail_row(ui, "TYPE", type_str, response);

                    // Source
                    ui.label(
                        RichText::new("SOURCE")
                            .color(self.theme.text_muted)
                            .font(self.theme.font_caption.clone()),
                    );
                    ui.horizontal(|ui| {
                        let color = event.color().unwrap_or_else(|| source_color(event.source()));
                        let (rect, _) = ui.allocate_exact_size(egui::vec2(8.0, 8.0), Sense::hover());
                        ui.painter().rect_filled(rect, self.theme.rounding_none, color);
                        ui.add_space(self.theme.spacing_xs);
                        
                        let label_response = ui.label(
                            RichText::new(event.source())
                                .color(self.theme.text_primary)
                                .font(self.theme.font_small.clone()),
                        );
                        
                        if self.config.enable_copy && label_response.clicked() {
                            ui.ctx().copy_text(event.source().to_string());
                            self.set_copy_feedback(ui, "SOURCE");
                            response.copied_field = Some("SOURCE".to_string());
                        }
                        
                        self.paint_copy_indicator(ui, "SOURCE", &label_response);
                    });
                    ui.end_row();

                    // Actor
                    if let Some(actor) = event.actor() {
                        self.detail_row(ui, "ACTOR", actor, response);
                    }

                    // Stream
                    if let Some(stream) = event.stream() {
                        self.detail_row(ui, "STREAM", stream, response);
                    }

                    // Timestamp
                    let timestamp = event.occurred_at().format("%Y-%m-%d %H:%M:%S%.3f").to_string();
                    self.detail_row(ui, "TIMESTAMP", &timestamp, response);
                });

            // Message (if available)
            if let Some(message) = event.message() {
                ui.add_space(self.theme.spacing_md);
                ui.label(
                    RichText::new("MESSAGE")
                        .color(self.theme.text_secondary)
                        .font(self.theme.font_caption.clone())
                        .strong(),
                );
                ui.add_space(self.theme.spacing_xs);
                
                let msg_response = egui::Frame::none()
                    .fill(self.theme.bg_surface)
                    .rounding(self.theme.rounding_sm)
                    .inner_margin(egui::Margin::same(self.theme.spacing_sm))
                    .stroke(self.theme.separator_stroke())
                    .show(ui, |ui| {
                        ui.label(
                            RichText::new(message)
                                .color(self.theme.text_primary)
                                .font(self.theme.font_small.clone()),
                        )
                    });
                
                if self.config.enable_copy && msg_response.response.clicked() {
                    ui.ctx().copy_text(message.to_string());
                    self.set_copy_feedback(ui, "MESSAGE");
                    response.copied_field = Some("MESSAGE".to_string());
                }
                
                if msg_response.response.hovered() {
                    ui.ctx().set_cursor_icon(egui::CursorIcon::PointingHand);
                }
            }

            // Payload
            if self.config.show_payload {
                if let Some(payload) = payload_json {
                    ui.add_space(self.theme.spacing_md);
                    ui.label(
                        RichText::new("PAYLOAD")
                            .color(self.theme.text_secondary)
                            .font(self.theme.font_caption.clone())
                            .strong(),
                    );
                    ui.add_space(self.theme.spacing_xs);

                    let payload_response = egui::Frame::none()
                        .fill(self.theme.bg_elevated)
                        .rounding(self.theme.rounding_sm)
                        .inner_margin(egui::Margin::same(self.theme.spacing_sm))
                        .stroke(self.theme.separator_stroke())
                        .show(ui, |ui| {
                            let mut payload_text = payload.to_string();
                            ui.add(
                                egui::TextEdit::multiline(&mut payload_text)
                                    .font(self.theme.font_mono_small.clone())
                                    .desired_width(f32::INFINITY)
                                    .desired_rows(self.config.payload_rows)
                                    .interactive(false),
                            )
                        });

                    if self.config.enable_copy && payload_response.response.clicked() {
                        ui.ctx().copy_text(payload.to_string());
                        self.set_copy_feedback(ui, "PAYLOAD");
                        response.copied_field = Some("PAYLOAD".to_string());
                    }

                    if payload_response.response.hovered() {
                        egui::show_tooltip(ui.ctx(), ui.layer_id(), egui::Id::new("payload_tooltip"), |ui| {
                            ui.label("Click to copy");
                        });
                    }
                }
            }
        });
    }

    fn detail_row(
        &mut self,
        ui: &mut Ui,
        label: &str,
        value: &str,
        response: &mut EventDetailsResponse,
    ) {
        ui.label(
            RichText::new(label)
                .color(self.theme.text_muted)
                .font(self.theme.font_caption.clone()),
        );
        
        let value_response = ui.label(
            RichText::new(value)
                .color(self.theme.text_primary)
                .font(self.theme.font_small.clone()),
        );
        
        if self.config.enable_copy && value_response.clicked() {
            ui.ctx().copy_text(value.to_string());
            self.set_copy_feedback(ui, label);
            response.copied_field = Some(label.to_string());
        }
        
        self.paint_copy_indicator(ui, label, &value_response);
        ui.end_row();
    }

    fn set_copy_feedback(&mut self, ui: &Ui, field: &str) {
        let now = ui.ctx().input(|i| i.time);
        self.copy_feedback = Some((field.to_string(), now + 1.5));
    }

    fn paint_copy_indicator(&self, ui: &Ui, field: &str, response: &egui::Response) {
        if let Some((active_field, _)) = &self.copy_feedback {
            if active_field == field {
                let rect = response.rect;
                let indicator_pos = rect.right_top() + egui::vec2(4.0, 0.0);
                ui.painter().text(
                    indicator_pos,
                    egui::Align2::LEFT_TOP,
                    "✓",
                    self.theme.font_caption.clone(),
                    self.theme.accent,
                );
            }
        }
    }
}

impl Default for EventDetailsPanel {
    fn default() -> Self {
        Self::new()
    }
}
