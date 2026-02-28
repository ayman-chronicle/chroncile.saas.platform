CREATE TABLE IF NOT EXISTS events (
    event_id VARCHAR(26) NOT NULL,
    tenant_id VARCHAR(255) NOT NULL,
    source VARCHAR(255) NOT NULL,
    source_event_id VARCHAR(255) NOT NULL,
    event_type VARCHAR(255) NOT NULL,
    conversation_id VARCHAR(255) NOT NULL,
    ticket_id VARCHAR(255),
    customer_id VARCHAR(255),
    account_id VARCHAR(255),
    actor_type VARCHAR(50) NOT NULL,
    actor_id VARCHAR(255) NOT NULL,
    actor_name VARCHAR(255),
    occurred_at TIMESTAMPTZ NOT NULL,
    ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    schema_version INTEGER NOT NULL DEFAULT 1,
    payload JSONB NOT NULL,
    pii_flags JSONB NOT NULL DEFAULT '{"contains_pii": false, "fields": []}',
    permissions JSONB NOT NULL DEFAULT '{"visibility": "support", "roles": []}',
    PRIMARY KEY (event_id),
    UNIQUE (tenant_id, source, source_event_id)
);

CREATE INDEX IF NOT EXISTS idx_events_tenant_conversation
    ON events (tenant_id, conversation_id, occurred_at, event_id);
CREATE INDEX IF NOT EXISTS idx_events_tenant_occurred
    ON events (tenant_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_events_tenant_customer
    ON events (tenant_id, customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_tenant_ticket
    ON events (tenant_id, ticket_id) WHERE ticket_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_dedup
    ON events (tenant_id, source, source_event_id);
