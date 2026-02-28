//! Playback Control
//!
//! Additional playback state management for the timeline:
//! - Playback speed control
//! - Loop selection
//!
//! Note: PlaybackState is now in chronicle-backend-timeline-core

use chrono::{DateTime, Duration, Utc};

// =============================================================================
// PLAYBACK SPEED
// =============================================================================

/// Playback speed multiplier for historical playback
#[derive(Clone, Copy, PartialEq, Debug)]
pub struct PlaybackSpeed(pub f32);

impl Default for PlaybackSpeed {
    fn default() -> Self {
        Self(1.0)
    }
}

impl PlaybackSpeed {
    /// Available speed presets
    pub const SPEEDS: &'static [f32] = &[0.1, 0.25, 0.5, 1.0, 2.0, 4.0, 10.0];

    /// Create a new playback speed
    pub fn new(speed: f32) -> Self {
        Self(speed.clamp(0.01, 100.0))
    }

    /// Get a display label for the speed
    pub fn label(&self) -> String {
        if self.0 == 1.0 {
            "1×".to_string()
        } else if self.0 < 1.0 {
            format!("{:.2}×", self.0)
        } else {
            format!("{:.0}×", self.0)
        }
    }

    /// Get the raw speed multiplier
    pub fn multiplier(&self) -> f32 {
        self.0
    }

    /// Increase speed to the next preset
    pub fn faster(&mut self) {
        for &speed in Self::SPEEDS.iter() {
            if speed > self.0 {
                self.0 = speed;
                return;
            }
        }
    }

    /// Decrease speed to the previous preset
    pub fn slower(&mut self) {
        for &speed in Self::SPEEDS.iter().rev() {
            if speed < self.0 {
                self.0 = speed;
                return;
            }
        }
    }
}

// =============================================================================
// LOOP SELECTION
// =============================================================================

/// Loop selection for time range playback
#[derive(Clone, Debug)]
pub struct LoopSelection {
    /// Start of the loop region
    pub start: DateTime<Utc>,
    /// End of the loop region
    pub end: DateTime<Utc>,
    /// Whether the loop is currently active
    pub enabled: bool,
}

impl LoopSelection {
    /// Create a new loop selection
    pub fn new(start: DateTime<Utc>, end: DateTime<Utc>) -> Self {
        Self {
            start,
            end,
            enabled: true,
        }
    }

    /// Check if a time is within the loop region
    pub fn contains(&self, time: DateTime<Utc>) -> bool {
        time >= self.start && time <= self.end
    }

    /// Get the duration of the loop
    pub fn duration(&self) -> Duration {
        self.end - self.start
    }

    /// Toggle the enabled state
    pub fn toggle(&mut self) {
        self.enabled = !self.enabled;
    }

    /// Set the start time, ensuring it's before end
    pub fn set_start(&mut self, start: DateTime<Utc>) {
        if start < self.end {
            self.start = start;
        }
    }

    /// Set the end time, ensuring it's after start
    pub fn set_end(&mut self, end: DateTime<Utc>) {
        if end > self.start {
            self.end = end;
        }
    }

    /// Shift the entire loop by a duration
    pub fn shift(&mut self, delta: Duration) {
        self.start += delta;
        self.end += delta;
    }
}
