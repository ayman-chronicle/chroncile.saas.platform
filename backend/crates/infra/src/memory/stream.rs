//! In-Memory Stream Implementation
//!
//! Uses tokio::sync::broadcast for push-based event streaming.
//! No polling required - subscribers are notified immediately on new events.

use async_trait::async_trait;
use parking_lot::RwLock;
use std::sync::Arc;
use tokio::sync::broadcast;

use chronicle_domain::{EventEnvelope, StreamError, StreamResult};
use chronicle_interfaces::{EventStreamProducer, StreamReceiver};

/// In-memory event stream using broadcast channels
///
/// Features:
/// - Push-based: subscribers wake immediately on new events
/// - Buffered: stores events for replay (up to buffer_capacity)
/// - Clone-friendly: can be cloned cheaply for sharing
pub struct MemoryStream {
    /// Broadcast sender for push notifications
    sender: broadcast::Sender<EventEnvelope>,
    /// Append-only buffer for replay
    buffer: Arc<RwLock<Vec<EventEnvelope>>>,
    /// Maximum buffer size
    buffer_capacity: usize,
}

impl MemoryStream {
    /// Create a new memory stream
    ///
    /// # Arguments
    /// - `channel_capacity`: Number of events that can be buffered in the broadcast channel
    /// - `buffer_capacity`: Maximum events to retain for replay
    pub fn new(channel_capacity: usize, buffer_capacity: usize) -> Self {
        let (sender, _) = broadcast::channel(channel_capacity);
        Self {
            sender,
            buffer: Arc::new(RwLock::new(Vec::with_capacity(buffer_capacity.min(10000)))),
            buffer_capacity,
        }
    }

    /// Subscribe to the stream, returning a receiver
    pub fn subscribe(&self) -> MemoryStreamReceiver {
        MemoryStreamReceiver {
            receiver: self.sender.subscribe(),
        }
    }

    /// Get all buffered events (for replay)
    pub fn get_buffer(&self) -> Vec<EventEnvelope> {
        self.buffer.read().clone()
    }

    /// Get buffer length
    pub fn buffer_len(&self) -> usize {
        self.buffer.read().len()
    }

    /// Clear the buffer (for testing)
    pub fn clear_buffer(&self) {
        self.buffer.write().clear();
    }

    /// Get number of active subscribers
    pub fn subscriber_count(&self) -> usize {
        self.sender.receiver_count()
    }
}

impl Clone for MemoryStream {
    fn clone(&self) -> Self {
        Self {
            sender: self.sender.clone(),
            buffer: Arc::clone(&self.buffer),
            buffer_capacity: self.buffer_capacity,
        }
    }
}

#[async_trait]
impl EventStreamProducer for MemoryStream {
    async fn publish(&self, event: EventEnvelope) -> StreamResult<()> {
        // Store in buffer for replay
        {
            let mut buf = self.buffer.write();
            if buf.len() < self.buffer_capacity {
                buf.push(event.clone());
            } else {
                // Buffer full - drop oldest (ring buffer behavior)
                // In production, you'd want to handle this differently
                tracing::warn!(
                    "Event buffer full ({} events), dropping oldest",
                    self.buffer_capacity
                );
                buf.remove(0);
                buf.push(event.clone());
            }
        }

        // Broadcast to subscribers
        // Ignore error if no receivers (that's fine)
        let _ = self.sender.send(event);

        Ok(())
    }

    async fn publish_batch(&self, events: Vec<EventEnvelope>) -> StreamResult<()> {
        for event in events {
            self.publish(event).await?;
        }
        Ok(())
    }
}

/// Receiver for memory stream
pub struct MemoryStreamReceiver {
    receiver: broadcast::Receiver<EventEnvelope>,
}

#[async_trait]
impl StreamReceiver for MemoryStreamReceiver {
    async fn recv(&mut self) -> StreamResult<EventEnvelope> {
        loop {
            match self.receiver.recv().await {
                Ok(event) => return Ok(event),
                Err(broadcast::error::RecvError::Lagged(n)) => {
                    // We missed some events - log and continue
                    tracing::warn!("Stream receiver lagged, missed {} events", n);
                    continue;
                }
                Err(broadcast::error::RecvError::Closed) => {
                    return Err(StreamError::ChannelClosed);
                }
            }
        }
    }

    fn try_recv(&mut self) -> StreamResult<Option<EventEnvelope>> {
        match self.receiver.try_recv() {
            Ok(event) => Ok(Some(event)),
            Err(broadcast::error::TryRecvError::Empty) => Ok(None),
            Err(broadcast::error::TryRecvError::Lagged(n)) => {
                tracing::warn!("Stream receiver lagged, missed {} events", n);
                Ok(None)
            }
            Err(broadcast::error::TryRecvError::Closed) => Err(StreamError::ChannelClosed),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chronicle_domain::{Actor, Subject, TenantId};
    use serde_json::value::RawValue;

    fn make_test_event(id: &str) -> EventEnvelope {
        let payload = RawValue::from_string("{}".to_string()).unwrap();
        EventEnvelope {
            event_id: chronicle_domain::new_event_id(),
            tenant_id: TenantId::new("test"),
            source: "test".to_string(),
            source_event_id: id.to_string(),
            event_type: "test.event".to_string(),
            subject: Subject::new("conv_1"),
            actor: Actor::system(),
            occurred_at: chrono::Utc::now(),
            ingested_at: chrono::Utc::now(),
            schema_version: 1,
            payload,
            pii: Default::default(),
            permissions: Default::default(),
            stream_id: None,
        }
    }

    #[tokio::test]
    async fn test_publish_and_receive() {
        let stream = MemoryStream::new(100, 1000);
        let mut receiver = stream.subscribe();

        let event = make_test_event("e1");
        stream.publish(event.clone()).await.unwrap();

        let received = receiver.recv().await.unwrap();
        assert_eq!(received.source_event_id, "e1");
    }

    #[tokio::test]
    async fn test_multiple_subscribers() {
        let stream = MemoryStream::new(100, 1000);
        let mut rx1 = stream.subscribe();
        let mut rx2 = stream.subscribe();

        let event = make_test_event("e1");
        stream.publish(event).await.unwrap();

        // Both receivers should get the event
        let e1 = rx1.recv().await.unwrap();
        let e2 = rx2.recv().await.unwrap();

        assert_eq!(e1.source_event_id, e2.source_event_id);
    }

    #[tokio::test]
    async fn test_buffer_storage() {
        let stream = MemoryStream::new(100, 1000);

        stream.publish(make_test_event("e1")).await.unwrap();
        stream.publish(make_test_event("e2")).await.unwrap();
        stream.publish(make_test_event("e3")).await.unwrap();

        let buffer = stream.get_buffer();
        assert_eq!(buffer.len(), 3);
        assert_eq!(buffer[0].source_event_id, "e1");
        assert_eq!(buffer[2].source_event_id, "e3");
    }

    #[tokio::test]
    async fn test_buffer_overflow() {
        let stream = MemoryStream::new(100, 3); // Small buffer

        stream.publish(make_test_event("e1")).await.unwrap();
        stream.publish(make_test_event("e2")).await.unwrap();
        stream.publish(make_test_event("e3")).await.unwrap();
        stream.publish(make_test_event("e4")).await.unwrap(); // Should drop e1

        let buffer = stream.get_buffer();
        assert_eq!(buffer.len(), 3);
        assert_eq!(buffer[0].source_event_id, "e2"); // e1 was dropped
    }

    #[tokio::test]
    async fn test_try_recv() {
        let stream = MemoryStream::new(100, 1000);
        let mut receiver = stream.subscribe();

        // Nothing yet
        assert!(receiver.try_recv().unwrap().is_none());

        stream.publish(make_test_event("e1")).await.unwrap();

        // Now we have one
        let event = receiver.try_recv().unwrap().unwrap();
        assert_eq!(event.source_event_id, "e1");

        // Nothing again
        assert!(receiver.try_recv().unwrap().is_none());
    }
}
