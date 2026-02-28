//! Clock Abstraction
//!
//! Provides time abstraction for replay engine and testing.
//! Allows using real time in production and simulated time in tests.

use async_trait::async_trait;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};

/// Clock trait for time abstraction
#[async_trait]
pub trait Clock: Send + Sync {
    /// Get current instant
    fn now(&self) -> Instant;

    /// Sleep for a duration
    async fn sleep(&self, duration: Duration);

    /// Sleep until a specific instant
    async fn sleep_until(&self, deadline: Instant) {
        let now = self.now();
        if deadline > now {
            self.sleep(deadline - now).await;
        }
    }
}

/// System clock - uses real time
#[derive(Clone, Default)]
pub struct SystemClock;

impl SystemClock {
    pub fn new() -> Self {
        Self
    }
}

#[async_trait]
impl Clock for SystemClock {
    fn now(&self) -> Instant {
        Instant::now()
    }

    async fn sleep(&self, duration: Duration) {
        tokio::time::sleep(duration).await;
    }
}

/// Simulated clock for testing and accelerated replay
///
/// Time advances manually or automatically at a configurable rate.
pub struct SimulatedClock {
    /// Base instant (when the clock was created)
    base: Instant,
    /// Simulated elapsed time in nanoseconds
    elapsed_nanos: Arc<AtomicU64>,
    /// Time scale (1.0 = real time, 10.0 = 10x faster)
    scale: f64,
}

impl SimulatedClock {
    pub fn new() -> Self {
        Self {
            base: Instant::now(),
            elapsed_nanos: Arc::new(AtomicU64::new(0)),
            scale: 1.0,
        }
    }

    /// Create a clock with a time scale (e.g., 10.0 for 10x speed)
    pub fn with_scale(scale: f64) -> Self {
        Self {
            base: Instant::now(),
            elapsed_nanos: Arc::new(AtomicU64::new(0)),
            scale,
        }
    }

    /// Advance time by a duration
    pub fn advance(&self, duration: Duration) {
        let nanos = duration.as_nanos() as u64;
        self.elapsed_nanos.fetch_add(nanos, Ordering::SeqCst);
    }

    /// Get elapsed time
    pub fn elapsed(&self) -> Duration {
        Duration::from_nanos(self.elapsed_nanos.load(Ordering::SeqCst))
    }

    /// Reset the clock
    pub fn reset(&self) {
        self.elapsed_nanos.store(0, Ordering::SeqCst);
    }
}

impl Default for SimulatedClock {
    fn default() -> Self {
        Self::new()
    }
}

impl Clone for SimulatedClock {
    fn clone(&self) -> Self {
        Self {
            base: self.base,
            elapsed_nanos: Arc::clone(&self.elapsed_nanos),
            scale: self.scale,
        }
    }
}

#[async_trait]
impl Clock for SimulatedClock {
    fn now(&self) -> Instant {
        self.base + self.elapsed()
    }

    async fn sleep(&self, duration: Duration) {
        if self.scale == 0.0 {
            // Instant mode - don't actually sleep, just advance
            self.advance(duration);
            return;
        }

        // Scale the sleep duration
        let scaled = Duration::from_secs_f64(duration.as_secs_f64() / self.scale);

        // Actually sleep (but scaled)
        if scaled > Duration::ZERO {
            tokio::time::sleep(scaled).await;
        }

        // Advance simulated time
        self.advance(duration);
    }
}

/// Enum dispatch for clock - avoids trait objects
#[derive(Clone)]
pub enum ClockBackend {
    System(SystemClock),
    Simulated(SimulatedClock),
}

impl ClockBackend {
    pub fn system() -> Self {
        Self::System(SystemClock::new())
    }

    pub fn simulated() -> Self {
        Self::Simulated(SimulatedClock::new())
    }

    pub fn simulated_with_scale(scale: f64) -> Self {
        Self::Simulated(SimulatedClock::with_scale(scale))
    }

    #[inline]
    pub fn now(&self) -> Instant {
        match self {
            Self::System(c) => c.now(),
            Self::Simulated(c) => c.now(),
        }
    }

    #[inline]
    pub async fn sleep(&self, duration: Duration) {
        match self {
            Self::System(c) => c.sleep(duration).await,
            Self::Simulated(c) => c.sleep(duration).await,
        }
    }

    #[inline]
    pub async fn sleep_until(&self, deadline: Instant) {
        match self {
            Self::System(c) => c.sleep_until(deadline).await,
            Self::Simulated(c) => c.sleep_until(deadline).await,
        }
    }

    /// Advance simulated time (no-op for system clock)
    pub fn advance(&self, duration: Duration) {
        if let Self::Simulated(c) = self {
            c.advance(duration);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_system_clock() {
        let clock = SystemClock::new();
        let start = clock.now();
        clock.sleep(Duration::from_millis(10)).await;
        let elapsed = clock.now() - start;
        assert!(elapsed >= Duration::from_millis(10));
    }

    #[tokio::test]
    async fn test_simulated_clock_instant() {
        let clock = SimulatedClock::with_scale(0.0); // Instant mode

        let start = clock.now();
        clock.sleep(Duration::from_secs(100)).await; // Would take forever with real clock
        let elapsed = clock.now() - start;

        // Should complete instantly but advance 100 seconds
        assert_eq!(elapsed, Duration::from_secs(100));
    }

    #[tokio::test]
    async fn test_simulated_clock_advance() {
        let clock = SimulatedClock::new();

        assert_eq!(clock.elapsed(), Duration::ZERO);

        clock.advance(Duration::from_secs(5));
        assert_eq!(clock.elapsed(), Duration::from_secs(5));

        clock.advance(Duration::from_secs(3));
        assert_eq!(clock.elapsed(), Duration::from_secs(8));
    }

    #[test]
    fn test_clock_backend_enum() {
        let system = ClockBackend::system();
        let _now = system.now(); // Should work

        let sim = ClockBackend::simulated();
        sim.advance(Duration::from_secs(10));
        // Advance should work on simulated
    }
}
