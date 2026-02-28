//! Time Utilities
//!
//! Extensions for time-related utilities from timeline-core.

use crate::types::TimeRangeMapper;
use chronicle_timeline_core::TimeView;

/// Extension trait for TimeView to create TimeRangeMapper
pub trait TimeViewExt {
    fn to_mapper(&self, width: f32) -> TimeRangeMapper;
}

impl TimeViewExt for TimeView {
    fn to_mapper(&self, width: f32) -> TimeRangeMapper {
        TimeRangeMapper::new(self.start(), self.end(), width)
    }
}
