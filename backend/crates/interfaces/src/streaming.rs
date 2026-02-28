//! Streaming Abstraction
//!
//! Defines traits and enum dispatch for event streaming backends.
//! Supports both in-memory (broadcast channels) and Kafka implementations.

use async_trait::async_trait;
use chronicle_domain::{EventEnvelope, StreamResult};

/// Trait for event stream producers
#[async_trait]
pub trait EventStreamProducer: Send + Sync {
    /// Publish a single event
    async fn publish(&self, event: EventEnvelope) -> StreamResult<()>;

    /// Publish multiple events (batched for efficiency)
    async fn publish_batch(&self, events: Vec<EventEnvelope>) -> StreamResult<()> {
        for event in events {
            self.publish(event).await?;
        }
        Ok(())
    }
}

/// Trait for event stream consumers
#[async_trait]
pub trait EventStreamConsumer: Send + Sync {
    /// Poll for new events (blocking)
    async fn poll(&self) -> StreamResult<Vec<EventEnvelope>>;

    /// Commit consumed offsets (for Kafka-style semantics)
    async fn commit(&self) -> StreamResult<()> {
        Ok(()) // Default no-op for in-memory
    }
}

// Forward declarations for the enum - actual types are in infra crate
// We use a cfg-based approach to avoid circular dependencies

/// Stream backend enum for dispatch without vtable overhead
///
/// This enum wraps concrete implementations and provides inline dispatch.
/// New backends are added as new variants (feature-gated).
#[derive(Clone)]
pub enum StreamBackend {
    /// In-memory broadcast channel (always available)
    Memory(MemoryStreamHandle),

    /// Kafka backend (behind feature flag)
    #[cfg(feature = "kafka")]
    Kafka(KafkaStreamHandle),
}

/// Handle to in-memory stream (lightweight clone)
#[derive(Clone)]
pub struct MemoryStreamHandle {
    inner: std::sync::Arc<dyn EventStreamProducer>,
    receiver_factory: std::sync::Arc<dyn Fn() -> Box<dyn StreamReceiver> + Send + Sync>,
}

impl MemoryStreamHandle {
    pub fn new<P, F>(producer: P, receiver_factory: F) -> Self
    where
        P: EventStreamProducer + 'static,
        F: Fn() -> Box<dyn StreamReceiver> + Send + Sync + 'static,
    {
        Self {
            inner: std::sync::Arc::new(producer),
            receiver_factory: std::sync::Arc::new(receiver_factory),
        }
    }

    pub async fn publish(&self, event: EventEnvelope) -> StreamResult<()> {
        self.inner.publish(event).await
    }

    pub fn subscribe(&self) -> Box<dyn StreamReceiver> {
        (self.receiver_factory)()
    }
}

/// Kafka stream handle (placeholder for feature-gated impl)
#[cfg(feature = "kafka")]
#[derive(Clone)]
pub struct KafkaStreamHandle {
    // Will be implemented in infra/kafka
    _placeholder: (),
}

/// Trait for receiving events from a stream
#[async_trait]
pub trait StreamReceiver: Send {
    /// Receive the next event (blocking)
    async fn recv(&mut self) -> StreamResult<EventEnvelope>;

    /// Try to receive without blocking
    fn try_recv(&mut self) -> StreamResult<Option<EventEnvelope>>;
}

impl StreamBackend {
    /// Publish an event to the stream
    #[inline]
    pub async fn publish(&self, event: EventEnvelope) -> StreamResult<()> {
        match self {
            Self::Memory(handle) => handle.publish(event).await,
            #[cfg(feature = "kafka")]
            Self::Kafka(_handle) => {
                // TODO: Implement Kafka publish
                unimplemented!("Kafka backend not yet implemented")
            }
        }
    }

    /// Publish a batch of events
    #[inline]
    pub async fn publish_batch(&self, events: Vec<EventEnvelope>) -> StreamResult<()> {
        for event in events {
            self.publish(event).await?;
        }
        Ok(())
    }

    /// Subscribe to the stream
    #[inline]
    pub fn subscribe(&self) -> Box<dyn StreamReceiver> {
        match self {
            Self::Memory(handle) => handle.subscribe(),
            #[cfg(feature = "kafka")]
            Self::Kafka(_handle) => {
                unimplemented!("Kafka backend not yet implemented")
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use chronicle_domain::StreamError;

    // Tests will be added once we have concrete implementations
    #[test]
    fn test_stream_error_display() {
        let err = StreamError::PublishFailed("test".to_string());
        assert!(err.to_string().contains("test"));
    }
}
