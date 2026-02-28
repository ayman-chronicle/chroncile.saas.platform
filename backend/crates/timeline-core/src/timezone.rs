//! Timezone Support
//!
//! Display timezone handling and conversion utilities.

use chrono::{DateTime, FixedOffset, Utc};

/// Display timezone for the timeline
#[derive(Clone, Copy, PartialEq, Eq, Debug, Default)]
#[cfg_attr(feature = "serde", derive(serde::Serialize, serde::Deserialize))]
pub enum DisplayTimezone {
    #[default]
    UTC,
    Local,
    EST,  // UTC-5
    EDT,  // UTC-4
    CST,  // UTC-6
    CDT,  // UTC-5
    MST,  // UTC-7
    MDT,  // UTC-6
    PST,  // UTC-8
    PDT,  // UTC-7
    GMT,  // UTC+0
    CET,  // UTC+1
    CEST, // UTC+2
    JST,  // UTC+9
    IST,  // UTC+5:30
    AEST, // UTC+10
    AEDT, // UTC+11
}

impl DisplayTimezone {
    /// Get the timezone label for display
    pub fn label(&self) -> &'static str {
        match self {
            Self::UTC => "UTC",
            Self::Local => "Local",
            Self::EST => "EST (UTC-5)",
            Self::EDT => "EDT (UTC-4)",
            Self::CST => "CST (UTC-6)",
            Self::CDT => "CDT (UTC-5)",
            Self::MST => "MST (UTC-7)",
            Self::MDT => "MDT (UTC-6)",
            Self::PST => "PST (UTC-8)",
            Self::PDT => "PDT (UTC-7)",
            Self::GMT => "GMT (UTC+0)",
            Self::CET => "CET (UTC+1)",
            Self::CEST => "CEST (UTC+2)",
            Self::JST => "JST (UTC+9)",
            Self::IST => "IST (UTC+5:30)",
            Self::AEST => "AEST (UTC+10)",
            Self::AEDT => "AEDT (UTC+11)",
        }
    }

    /// Get the short label
    pub fn short_label(&self) -> &'static str {
        match self {
            Self::UTC => "UTC",
            Self::Local => "LOC",
            Self::EST => "EST",
            Self::EDT => "EDT",
            Self::CST => "CST",
            Self::CDT => "CDT",
            Self::MST => "MST",
            Self::MDT => "MDT",
            Self::PST => "PST",
            Self::PDT => "PDT",
            Self::GMT => "GMT",
            Self::CET => "CET",
            Self::CEST => "CEST",
            Self::JST => "JST",
            Self::IST => "IST",
            Self::AEST => "AEST",
            Self::AEDT => "AEDT",
        }
    }

    /// Get all available timezones
    pub fn all() -> &'static [Self] {
        &[
            Self::UTC,
            Self::Local,
            Self::EST,
            Self::EDT,
            Self::CST,
            Self::CDT,
            Self::MST,
            Self::MDT,
            Self::PST,
            Self::PDT,
            Self::GMT,
            Self::CET,
            Self::CEST,
            Self::JST,
            Self::IST,
            Self::AEST,
            Self::AEDT,
        ]
    }

    /// Get the fixed offset for this timezone
    pub fn offset(&self) -> FixedOffset {
        match self {
            Self::UTC | Self::GMT => FixedOffset::east_opt(0).unwrap(),
            Self::Local => {
                // Get local timezone offset
                let local_now = chrono::Local::now();
                *local_now.offset()
            }
            Self::EST => FixedOffset::west_opt(5 * 3600).unwrap(),
            Self::EDT => FixedOffset::west_opt(4 * 3600).unwrap(),
            Self::CST => FixedOffset::west_opt(6 * 3600).unwrap(),
            Self::CDT => FixedOffset::west_opt(5 * 3600).unwrap(),
            Self::MST => FixedOffset::west_opt(7 * 3600).unwrap(),
            Self::MDT => FixedOffset::west_opt(6 * 3600).unwrap(),
            Self::PST => FixedOffset::west_opt(8 * 3600).unwrap(),
            Self::PDT => FixedOffset::west_opt(7 * 3600).unwrap(),
            Self::CET => FixedOffset::east_opt(3600).unwrap(),
            Self::CEST => FixedOffset::east_opt(2 * 3600).unwrap(),
            Self::JST => FixedOffset::east_opt(9 * 3600).unwrap(),
            Self::IST => FixedOffset::east_opt(5 * 3600 + 30 * 60).unwrap(),
            Self::AEST => FixedOffset::east_opt(10 * 3600).unwrap(),
            Self::AEDT => FixedOffset::east_opt(11 * 3600).unwrap(),
        }
    }

    /// Convert a UTC datetime to this timezone
    pub fn convert(&self, utc_time: DateTime<Utc>) -> DateTime<FixedOffset> {
        utc_time.with_timezone(&self.offset())
    }

    /// Format a UTC time in this timezone
    pub fn format_time(&self, utc_time: DateTime<Utc>) -> String {
        let local_time = self.convert(utc_time);
        local_time.format("%H:%M:%S%.3f").to_string()
    }

    /// Format a UTC time with date in this timezone
    pub fn format_datetime(&self, utc_time: DateTime<Utc>) -> String {
        let local_time = self.convert(utc_time);
        local_time.format("%Y-%m-%d %H:%M:%S").to_string()
    }

    /// Format a UTC time with full precision in this timezone
    pub fn format_full(&self, utc_time: DateTime<Utc>) -> String {
        let local_time = self.convert(utc_time);
        local_time.format("%Y-%m-%d %H:%M:%S%.3f %Z").to_string()
    }
}
