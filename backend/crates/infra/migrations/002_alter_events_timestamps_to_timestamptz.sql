-- Fix columns created as TIMESTAMP (without TZ) so they match Rust DateTime<Utc> / sqlx (TIMESTAMPTZ).
-- Existing values were written as UTC; interpret them as UTC when converting.
ALTER TABLE events
  ALTER COLUMN occurred_at TYPE TIMESTAMPTZ USING occurred_at AT TIME ZONE 'UTC',
  ALTER COLUMN ingested_at TYPE TIMESTAMPTZ USING ingested_at AT TIME ZONE 'UTC';
