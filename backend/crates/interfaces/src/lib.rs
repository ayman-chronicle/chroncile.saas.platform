//! Events Manager Interfaces
//!
//! Trait definitions and enum dispatch wrappers for backend abstraction.

pub mod clock;
pub mod repositories;
pub mod storage;
pub mod streaming;

pub use clock::*;
pub use repositories::*;
pub use storage::*;
pub use streaming::*;
