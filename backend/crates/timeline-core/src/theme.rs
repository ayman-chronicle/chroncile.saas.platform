//! Timeline Theme
//!
//! Configurable color theme for the timeline panel.

use egui::{Color32, FontFamily, FontId, Rounding, Stroke};

/// Theme configuration for the timeline panel
#[derive(Clone, Debug)]
pub struct TimelineTheme {
    // Backgrounds
    pub bg_primary: Color32,
    pub bg_surface: Color32,
    pub bg_elevated: Color32,
    pub bg_row_alt: Color32,
    pub bg_row_hover: Color32,
    pub bg_row_selected: Color32,

    // Text
    pub text_primary: Color32,
    pub text_secondary: Color32,
    pub text_muted: Color32,

    // Accents
    pub accent: Color32,
    pub accent_hover: Color32,
    pub playhead: Color32,

    // Separators
    pub separator: Color32,
    pub indent_guide: Color32,

    // Chevron
    pub chevron: Color32,

    // Buttons
    pub button_bg: Color32,
    pub button_hover: Color32,
    pub button_active: Color32,

    // Typography
    pub font_heading: FontId,
    pub font_body: FontId,
    pub font_small: FontId,
    pub font_caption: FontId,
    pub font_mono: FontId,
    pub font_mono_small: FontId,

    // Spacing
    pub spacing_xs: f32,
    pub spacing_sm: f32,
    pub spacing_md: f32,
    pub spacing_lg: f32,

    // Rounding
    pub rounding_none: Rounding,
    pub rounding_sm: Rounding,
    pub rounding_md: Rounding,
}

impl TimelineTheme {
    /// Create a dark theme (default)
    pub fn dark() -> Self {
        Self {
            // Backgrounds
            bg_primary: Color32::from_rgb(8, 10, 18),
            bg_surface: Color32::from_rgb(12, 15, 25),
            bg_elevated: Color32::from_rgb(18, 22, 35),
            bg_row_alt: Color32::from_rgb(14, 17, 28),
            bg_row_hover: Color32::from_rgb(20, 25, 40),
            bg_row_selected: Color32::from_rgb(0, 60, 80),

            // Text
            text_primary: Color32::from_rgb(248, 250, 252),
            text_secondary: Color32::from_rgb(148, 163, 184),
            text_muted: Color32::from_rgb(100, 116, 139),

            // Accents
            accent: Color32::from_rgb(0, 212, 255),
            accent_hover: Color32::from_rgb(56, 189, 248),
            playhead: Color32::from_rgb(255, 100, 100),

            // Separators
            separator: Color32::from_rgb(30, 35, 50),
            indent_guide: Color32::from_rgb(40, 45, 60),

            // Chevron
            chevron: Color32::from_rgb(100, 116, 139),

            // Buttons
            button_bg: Color32::from_rgb(30, 35, 50),
            button_hover: Color32::from_rgb(40, 48, 70),
            button_active: Color32::from_rgb(0, 80, 100),

            // Typography
            font_heading: FontId::new(16.0, FontFamily::Proportional),
            font_body: FontId::new(14.0, FontFamily::Proportional),
            font_small: FontId::new(12.0, FontFamily::Proportional),
            font_caption: FontId::new(11.0, FontFamily::Proportional),
            font_mono: FontId::new(12.0, FontFamily::Monospace),
            font_mono_small: FontId::new(10.0, FontFamily::Monospace),

            // Spacing
            spacing_xs: 4.0,
            spacing_sm: 8.0,
            spacing_md: 12.0,
            spacing_lg: 16.0,

            // Rounding
            rounding_none: Rounding::ZERO,
            rounding_sm: Rounding::same(4.0),
            rounding_md: Rounding::same(6.0),
        }
    }

    /// Create a light theme
    pub fn light() -> Self {
        Self {
            // Backgrounds
            bg_primary: Color32::from_rgb(255, 255, 255),
            bg_surface: Color32::from_rgb(248, 250, 252),
            bg_elevated: Color32::from_rgb(241, 245, 249),
            bg_row_alt: Color32::from_rgb(248, 250, 252),
            bg_row_hover: Color32::from_rgb(226, 232, 240),
            bg_row_selected: Color32::from_rgb(186, 230, 253),

            // Text
            text_primary: Color32::from_rgb(15, 23, 42),
            text_secondary: Color32::from_rgb(71, 85, 105),
            text_muted: Color32::from_rgb(148, 163, 184),

            // Accents
            accent: Color32::from_rgb(14, 165, 233),
            accent_hover: Color32::from_rgb(56, 189, 248),
            playhead: Color32::from_rgb(239, 68, 68),

            // Separators
            separator: Color32::from_rgb(226, 232, 240),
            indent_guide: Color32::from_rgb(203, 213, 225),

            // Chevron
            chevron: Color32::from_rgb(100, 116, 139),

            // Buttons
            button_bg: Color32::from_rgb(241, 245, 249),
            button_hover: Color32::from_rgb(226, 232, 240),
            button_active: Color32::from_rgb(186, 230, 253),

            // Typography (same as dark)
            font_heading: FontId::new(16.0, FontFamily::Proportional),
            font_body: FontId::new(14.0, FontFamily::Proportional),
            font_small: FontId::new(12.0, FontFamily::Proportional),
            font_caption: FontId::new(11.0, FontFamily::Proportional),
            font_mono: FontId::new(12.0, FontFamily::Monospace),
            font_mono_small: FontId::new(10.0, FontFamily::Monospace),

            // Spacing (same as dark)
            spacing_xs: 4.0,
            spacing_sm: 8.0,
            spacing_md: 12.0,
            spacing_lg: 16.0,

            // Rounding (same as dark)
            rounding_none: Rounding::ZERO,
            rounding_sm: Rounding::same(4.0),
            rounding_md: Rounding::same(6.0),
        }
    }

    /// Get a border stroke
    pub fn border_stroke(&self) -> Stroke {
        Stroke::new(1.0, self.separator)
    }

    /// Get a separator stroke
    pub fn separator_stroke(&self) -> Stroke {
        Stroke::new(1.0, self.separator)
    }
}

impl Default for TimelineTheme {
    fn default() -> Self {
        Self::dark()
    }
}
