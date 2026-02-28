/**
 * Timeline Widget Types
 *
 * TypeScript type definitions for the Events Manager Timeline Widget.
 */

/**
 * An event to display on the timeline
 */
export interface TimelineEvent {
  /** Unique identifier for the event */
  id: string;
  /** Source system (e.g., "intercom", "stripe") */
  source: string;
  /** Event type (e.g., "intercom.conversation.message") */
  type: string;
  /** When the event occurred (ISO 8601 string) */
  occurredAt: string;
  /** Actor/user who triggered the event */
  actor?: string;
  /** Brief message or description */
  message?: string;
  /** Full payload as JSON object */
  payload?: Record<string, unknown>;
  /** Optional stream/category */
  stream?: string;
  /** Optional color override (hex, e.g., "#ff0000") */
  color?: string;
}

/**
 * Configuration options for the timeline widget
 */
export interface TimelineOptions {
  /** Whether to show the controls bar (default: true) */
  showControls?: boolean;
  /** Whether to show the topic tree (default: true) */
  showTree?: boolean;
  /** Whether to follow live events (default: false) */
  followLive?: boolean;
  /** Initial time range start (ISO 8601) */
  timeStart?: string;
  /** Initial time range end (ISO 8601) */
  timeEnd?: string;
  /** Theme: "dark" or "light" (default: "dark") */
  theme?: "dark" | "light";
  /** Height of each row in pixels (default: 28) */
  rowHeight?: number;
  /** Width of the label column in pixels (default: 180) */
  labelWidth?: number;
}

/**
 * Playback state
 */
export type PlaybackState = "live" | "playing" | "paused";

/**
 * Event emitted when selection changes
 */
export interface SelectionEvent {
  /** Selected event ID (null if deselected) */
  eventId: string | null;
  /** The full event data if selected */
  event: TimelineEvent | null;
}

/**
 * Event emitted when time range changes
 */
export interface TimeRangeEvent {
  /** Start of visible range (ISO 8601) */
  start: string;
  /** End of visible range (ISO 8601) */
  end: string;
}

/**
 * Event emitted when playhead moves
 */
export interface PlayheadEvent {
  /** Current playhead time (ISO 8601) */
  time: string;
}

/**
 * Event types that can be subscribed to
 */
export interface TimelineEventMap {
  select: SelectionEvent;
  playhead: PlayheadEvent;
  rangechange: TimeRangeEvent;
}

/**
 * Event handler function type
 */
export type TimelineEventHandler<T extends keyof TimelineEventMap> = (
  event: TimelineEventMap[T]
) => void;
