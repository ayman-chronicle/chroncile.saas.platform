-- Create events table
CREATE TABLE IF NOT EXISTS events (
    -- Primary key
    event_id VARCHAR(26) NOT NULL,
    
    -- Tenant isolation
    tenant_id VARCHAR(255) NOT NULL,
    
    -- Source system
    source VARCHAR(255) NOT NULL,
    source_event_id VARCHAR(255) NOT NULL,
    
    -- Event metadata
    event_type VARCHAR(255) NOT NULL,
    
    -- Subject (what this event is about)
    conversation_id VARCHAR(255) NOT NULL,
    ticket_id VARCHAR(255),
    customer_id VARCHAR(255),
    account_id VARCHAR(255),
    
    -- Actor (who caused this event)
    actor_type VARCHAR(50) NOT NULL,
    actor_id VARCHAR(255) NOT NULL,
    actor_name VARCHAR(255),
    
    -- Timestamps
    occurred_at TIMESTAMPTZ NOT NULL,
    ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Schema version
    schema_version INTEGER NOT NULL DEFAULT 1,
    
    -- Payload (stored as JSONB for queryability)
    payload JSONB NOT NULL,
    
    -- Compliance
    pii_flags JSONB NOT NULL DEFAULT '{"contains_pii": false, "fields": []}',
    permissions JSONB NOT NULL DEFAULT '{"visibility": "support", "roles": []}',
    
    -- Constraints
    PRIMARY KEY (event_id),
    UNIQUE (tenant_id, source, source_event_id)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_events_tenant_conversation 
    ON events (tenant_id, conversation_id, occurred_at, event_id);

CREATE INDEX IF NOT EXISTS idx_events_tenant_occurred 
    ON events (tenant_id, occurred_at);

CREATE INDEX IF NOT EXISTS idx_events_tenant_customer 
    ON events (tenant_id, customer_id) 
    WHERE customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_events_tenant_ticket 
    ON events (tenant_id, ticket_id) 
    WHERE ticket_id IS NOT NULL;

-- Partial index for deduplication checks
CREATE INDEX IF NOT EXISTS idx_events_dedup 
    ON events (tenant_id, source, source_event_id);
