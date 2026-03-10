export interface ChroniclePendingEntityRefDto {
  entity_type: string;
  entity_id: string;
}

export interface ChronicleEntityRefDto {
  event_id: string;
  entity_type: string;
  entity_id: string;
  created_by: string;
  created_at: string;
}

export interface EventEnvelopeDto {
  event: {
    event_id: string;
    org_id: string;
    source: string;
    topic: string;
    event_type: string;
    event_time: string;
    ingestion_time: string;
    payload?: Record<string, unknown> | null;
    entity_refs?: ChroniclePendingEntityRefDto[];
  };
  entity_refs?: ChronicleEntityRefDto[];
  search_distance?: number | null;
}

export interface SubscribeToStreamParams {
  orgId: string;
  source?: string;
  eventType?: string;
  entityType?: string;
  entityId?: string;
}

export interface SubscribeToStreamOptions {
  onOpen?: () => void;
  onError?: () => void;
}

export function subscribeToStream(
  baseUrl: string,
  params: SubscribeToStreamParams,
  onEvent: (event: EventEnvelopeDto) => void,
  options: SubscribeToStreamOptions = {}
): () => void {
  const url = new URL("/v1/events/stream", baseUrl);
  url.searchParams.set("org_id", params.orgId);
  if (params.source) url.searchParams.set("source", params.source);
  if (params.eventType) url.searchParams.set("event_type", params.eventType);
  if (params.entityType) url.searchParams.set("entity_type", params.entityType);
  if (params.entityId) url.searchParams.set("entity_id", params.entityId);

  const stream = new EventSource(url.toString());

  const handleOpen = () => {
    options.onOpen?.();
  };
  const handleError = () => {
    options.onError?.();
  };
  const handleEvent = (message: MessageEvent<string>) => {
    try {
      onEvent(JSON.parse(message.data) as EventEnvelopeDto);
    } catch (error) {
      console.error("Failed to parse live event payload", error);
    }
  };

  stream.addEventListener("open", handleOpen as EventListener);
  stream.addEventListener("error", handleError as EventListener);
  stream.addEventListener("event", handleEvent as EventListener);

  return () => {
    stream.removeEventListener("open", handleOpen as EventListener);
    stream.removeEventListener("error", handleError as EventListener);
    stream.removeEventListener("event", handleEvent as EventListener);
    stream.close();
  };
}
