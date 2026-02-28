//! Text Log Panel
//!
//! A reusable text log table widget for displaying events in a scrollable list.
//! Supports row selection, playhead tracking, and configurable columns.

use chrono::{DateTime, Utc};
use egui::{RichText, Sense, Stroke, Ui, Vec2};
use egui_extras::{Column, TableBuilder};

use crate::event::TimelineEventData;
use crate::theme::TimelineTheme;
use crate::topic_tree::source_color;

/// Configuration for the TextLogPanel
#[derive(Clone, Debug)]
pub struct TextLogConfig {
    /// Height of each row in pixels
    pub row_height: f32,
    /// Whether to show the time column
    pub show_time: bool,
    /// Whether to show the source column
    pub show_source: bool,
    /// Whether to show the type column
    pub show_type: bool,
    /// Whether to show the actor column
    pub show_actor: bool,
    /// Whether to show the message column
    pub show_message: bool,
    /// Minimum width for time column
    pub time_width: f32,
    /// Minimum width for source column
    pub source_width: f32,
    /// Minimum width for type column
    pub type_width: f32,
    /// Minimum width for actor column
    pub actor_width: f32,
    /// Minimum width for message column
    pub message_width: f32,
}

impl Default for TextLogConfig {
    fn default() -> Self {
        Self {
            row_height: 24.0,
            show_time: true,
            show_source: true,
            show_type: true,
            show_actor: true,
            show_message: true,
            time_width: 84.0,
            source_width: 90.0,
            type_width: 90.0,
            actor_width: 120.0,
            message_width: 180.0,
        }
    }
}

/// Response from the TextLogPanel
#[derive(Default)]
pub struct TextLogResponse {
    /// ID of the event that was clicked (if any)
    pub selected_event: Option<String>,
    /// Whether selection changed
    pub selection_changed: bool,
}

/// Text Log Panel widget
///
/// Displays events in a scrollable table with columns for time, source, type, actor, and message.
pub struct TextLogPanel {
    /// Configuration
    pub config: TextLogConfig,
    /// Theme
    pub theme: TimelineTheme,
    /// Currently selected event ID
    pub selected_event: Option<String>,
    /// Current playhead time
    pub playhead: DateTime<Utc>,
}

impl TextLogPanel {
    /// Create a new TextLogPanel
    pub fn new() -> Self {
        Self {
            config: TextLogConfig::default(),
            theme: TimelineTheme::dark(),
            selected_event: None,
            playhead: Utc::now(),
        }
    }

    /// Create with custom config
    pub fn with_config(config: TextLogConfig) -> Self {
        Self {
            config,
            ..Self::new()
        }
    }

    /// Set the theme
    pub fn set_theme(&mut self, theme: TimelineTheme) {
        self.theme = theme;
    }

    /// Set the selected event
    pub fn set_selected(&mut self, event_id: Option<String>) {
        self.selected_event = event_id;
    }

    /// Set the playhead time
    pub fn set_playhead(&mut self, time: DateTime<Utc>) {
        self.playhead = time;
    }

    /// Render the text log panel
    pub fn ui<T: TimelineEventData>(&mut self, ui: &mut Ui, events: &[T]) -> TextLogResponse {
        let mut response = TextLogResponse::default();
        let ctx = ui.ctx().clone();

        // Header
        ui.horizontal(|ui| {
            ui.label(
                RichText::new("TEXT LOG")
                    .color(self.theme.text_secondary)
                    .font(self.theme.font_caption.clone())
                    .strong(),
            );
            ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                ui.label(
                    RichText::new(format!("{} events", events.len()))
                        .color(self.theme.text_muted)
                        .font(self.theme.font_caption.clone()),
                );
            });
        });

        ui.add_space(self.theme.spacing_xs);

        // Build table
        let mut table = TableBuilder::new(ui)
            .resizable(true)
            .vscroll(true)
            .auto_shrink([false; 2])
            .min_scrolled_height(0.0)
            .max_scroll_height(f32::INFINITY)
            .cell_layout(egui::Layout::left_to_right(egui::Align::Center))
            .sense(Sense::click());

        // Add columns based on config
        if self.config.show_time {
            table = table.column(Column::auto().clip(true).at_least(self.config.time_width));
        }
        if self.config.show_source {
            table = table.column(Column::auto().clip(true).at_least(self.config.source_width));
        }
        if self.config.show_type {
            table = table.column(Column::auto().clip(true).at_least(self.config.type_width));
        }
        if self.config.show_actor {
            table = table.column(Column::auto().clip(true).at_least(self.config.actor_width));
        }
        if self.config.show_message {
            table = table.column(Column::remainder().clip(true).at_least(self.config.message_width));
        }

        let mut body_clip_rect = None;
        let mut playhead_y = None;
        let playhead = self.playhead;
        let selected_id = self.selected_event.clone();
        let theme = self.theme.clone();

        table
            .header(self.config.row_height, |mut header| {
                if self.config.show_time {
                    header.col(|ui| {
                        ui.label(
                            RichText::new("TIME")
                                .color(theme.text_muted)
                                .font(theme.font_caption.clone()),
                        );
                    });
                }
                if self.config.show_source {
                    header.col(|ui| {
                        ui.label(
                            RichText::new("SOURCE")
                                .color(theme.text_muted)
                                .font(theme.font_caption.clone()),
                        );
                    });
                }
                if self.config.show_type {
                    header.col(|ui| {
                        ui.label(
                            RichText::new("TYPE")
                                .color(theme.text_muted)
                                .font(theme.font_caption.clone()),
                        );
                    });
                }
                if self.config.show_actor {
                    header.col(|ui| {
                        ui.label(
                            RichText::new("ACTOR")
                                .color(theme.text_muted)
                                .font(theme.font_caption.clone()),
                        );
                    });
                }
                if self.config.show_message {
                    header.col(|ui| {
                        ui.label(
                            RichText::new("MESSAGE")
                                .color(theme.text_muted)
                                .font(theme.font_caption.clone()),
                        );
                    });
                }
            })
            .body(|body| {
                body_clip_rect = Some(body.max_rect());

                let row_heights = events.iter().map(|e| calc_row_height(e, self.config.row_height));

                body.heterogeneous_rows(row_heights, |mut row| {
                    let event = &events[row.index()];
                    let is_selected = selected_id.as_ref() == Some(&event.id().to_string());

                    row.set_selected(is_selected);

                    if self.config.show_time {
                        row.col(|ui| {
                            ui.label(
                                RichText::new(event.occurred_at().format("%H:%M:%S%.3f").to_string())
                                    .color(theme.text_secondary)
                                    .font(theme.font_mono_small.clone()),
                            );
                        });
                    }

                    if self.config.show_source {
                        row.col(|ui| {
                            // Color indicator
                            let color = event.color().unwrap_or_else(|| source_color(event.source()));
                            let (rect, _) = ui.allocate_exact_size(Vec2::new(6.0, 6.0), Sense::hover());
                            ui.painter().rect_filled(rect, theme.rounding_none, color);
                            ui.add_space(theme.spacing_xs);
                            
                            ui.label(
                                RichText::new(event.source())
                                    .color(theme.text_primary)
                                    .font(theme.font_small.clone()),
                            );
                        });
                    }

                    if self.config.show_type {
                        row.col(|ui| {
                            // Extract just the last part of the type
                            let type_str = event.event_type();
                            let type_label = type_str.rsplit('.').next().unwrap_or(type_str);
                            ui.label(
                                RichText::new(type_label)
                                    .color(theme.text_secondary)
                                    .font(theme.font_small.clone()),
                            );
                        });
                    }

                    if self.config.show_actor {
                        row.col(|ui| {
                            let actor = event.actor().unwrap_or("-");
                            ui.label(
                                RichText::new(actor)
                                    .color(theme.text_secondary)
                                    .font(theme.font_small.clone()),
                            );
                        });
                    }

                    if self.config.show_message {
                        row.col(|ui| {
                            let message = event.message().unwrap_or("-");
                            ui.label(
                                RichText::new(message)
                                    .color(theme.text_muted)
                                    .font(theme.font_small.clone()),
                            );
                        });
                    }

                    let row_response = row.response();

                    // Track playhead position
                    if playhead <= event.occurred_at() && playhead_y.is_none() {
                        playhead_y = Some(row_response.rect.top());
                    }

                    // Cursor hint on hover
                    if row_response.hovered() {
                        ctx.set_cursor_icon(egui::CursorIcon::PointingHand);
                    }

                    // Handle row click
                    if row_response.clicked() {
                        response.selected_event = Some(event.id().to_string());
                        response.selection_changed = true;
                    }
                });
            });

        // Draw playhead line
        if let (Some(clip_rect), Some(y)) = (body_clip_rect, playhead_y) {
            ui.painter().with_clip_rect(clip_rect).hline(
                clip_rect.x_range(),
                y,
                Stroke::new(1.0, self.theme.playhead),
            );
        }

        // Update internal selection if changed
        if response.selection_changed {
            self.selected_event = response.selected_event.clone();
        }

        response
    }
}

impl Default for TextLogPanel {
    fn default() -> Self {
        Self::new()
    }
}

/// Calculate row height based on message content
fn calc_row_height<T: TimelineEventData>(event: &T, base_height: f32) -> f32 {
    let message = event.message().unwrap_or("");
    let num_newlines = message.bytes().filter(|&c| c == b'\n').count();
    let num_rows = 1 + num_newlines;
    num_rows as f32 * base_height * 0.75
}
