/**
 * Timeline Provider
 *
 * React context provider for shared timeline state management.
 * Enables Timeline, TextLog, and EventDetails components to share state.
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
} from "react";
import type {
  TimelineEvent,
  PlaybackState,
  TimelineContextValue,
} from "./types";

// Create context with undefined default (will be provided by Provider)
const TimelineContext = createContext<TimelineContextValue | undefined>(
  undefined
);

/**
 * Props for TimelineProvider
 */
export interface TimelineProviderProps {
  /** Initial events to display */
  initialEvents?: TimelineEvent[];
  /** Initial playhead time (ISO 8601 or Date) */
  initialPlayhead?: string | Date;
  /** Initial time range start */
  initialTimeStart?: string | Date;
  /** Initial time range end */
  initialTimeEnd?: string | Date;
  /** Initial playback state */
  initialPlaybackState?: PlaybackState;
  /** Called when selection changes */
  onSelectionChange?: (eventId: string | null, event: TimelineEvent | null) => void;
  /** Called when playhead changes */
  onPlayheadChange?: (time: string) => void;
  /** Called when time range changes */
  onTimeRangeChange?: (start: string, end: string) => void;
  /** Called when playback state changes */
  onPlaybackStateChange?: (state: PlaybackState) => void;
  /** Children components */
  children: React.ReactNode;
}

/**
 * Timeline Provider Component
 *
 * Provides shared state for Timeline, TextLog, and EventDetails components.
 *
 * @example
 * ```tsx
 * <TimelineProvider initialEvents={events}>
 *   <Timeline />
 *   <TextLog />
 *   <EventDetails />
 * </TimelineProvider>
 * ```
 */
export function TimelineProvider({
  initialEvents = [],
  initialPlayhead,
  initialTimeStart,
  initialTimeEnd,
  initialPlaybackState = "paused",
  onSelectionChange,
  onPlayheadChange,
  onTimeRangeChange,
  onPlaybackStateChange,
  children,
}: TimelineProviderProps) {
  // State
  const [events, setEventsState] = useState<TimelineEvent[]>(initialEvents);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [playhead, setPlayheadState] = useState<string>(
    formatTime(initialPlayhead) || new Date().toISOString()
  );
  const [timeRange, setTimeRangeState] = useState<{ start: string; end: string }>({
    start: formatTime(initialTimeStart) || new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    end: formatTime(initialTimeEnd) || new Date().toISOString(),
  });
  const [playbackState, setPlaybackStateState] = useState<PlaybackState>(
    initialPlaybackState
  );

  // Derived state
  const selectedEvent = useMemo(() => {
    if (!selectedEventId) return null;
    return events.find((e) => e.id === selectedEventId) || null;
  }, [events, selectedEventId]);

  // Actions
  const setEvents = useCallback((newEvents: TimelineEvent[]) => {
    setEventsState(newEvents);
  }, []);

  const addEvent = useCallback((event: TimelineEvent) => {
    setEventsState((prev) => [...prev, event]);
  }, []);

  const clearEvents = useCallback(() => {
    setEventsState([]);
    setSelectedEventId(null);
  }, []);

  const selectEvent = useCallback(
    (eventId: string | null) => {
      setSelectedEventId(eventId);
      const event = eventId ? events.find((e) => e.id === eventId) || null : null;
      onSelectionChange?.(eventId, event);
    },
    [events, onSelectionChange]
  );

  const setPlayhead = useCallback(
    (time: string | Date) => {
      const timeStr = formatTime(time) || new Date().toISOString();
      setPlayheadState(timeStr);
      onPlayheadChange?.(timeStr);
    },
    [onPlayheadChange]
  );

  const setTimeRange = useCallback(
    (start: string | Date, end: string | Date) => {
      const startStr = formatTime(start) || new Date().toISOString();
      const endStr = formatTime(end) || new Date().toISOString();
      setTimeRangeState({ start: startStr, end: endStr });
      onTimeRangeChange?.(startStr, endStr);
    },
    [onTimeRangeChange]
  );

  const setPlaybackState = useCallback(
    (state: PlaybackState) => {
      setPlaybackStateState(state);
      onPlaybackStateChange?.(state);
    },
    [onPlaybackStateChange]
  );

  // Sync events with initialEvents prop
  useEffect(() => {
    setEventsState(initialEvents);
  }, [initialEvents]);

  // Context value
  const contextValue: TimelineContextValue = useMemo(
    () => ({
      // State
      events,
      selectedEventId,
      selectedEvent,
      playhead,
      timeRange,
      playbackState,
      // Actions
      setEvents,
      addEvent,
      clearEvents,
      selectEvent,
      setPlayhead,
      setTimeRange,
      setPlaybackState,
    }),
    [
      events,
      selectedEventId,
      selectedEvent,
      playhead,
      timeRange,
      playbackState,
      setEvents,
      addEvent,
      clearEvents,
      selectEvent,
      setPlayhead,
      setTimeRange,
      setPlaybackState,
    ]
  );

  return (
    <TimelineContext.Provider value={contextValue}>
      {children}
    </TimelineContext.Provider>
  );
}

/**
 * Hook to access timeline context
 *
 * @throws Error if used outside of TimelineProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { events, selectEvent, selectedEvent } = useTimeline();
 *   return <div>Selected: {selectedEvent?.id}</div>;
 * }
 * ```
 */
export function useTimeline(): TimelineContextValue {
  const context = useContext(TimelineContext);
  if (context === undefined) {
    throw new Error("useTimeline must be used within a TimelineProvider");
  }
  return context;
}

/**
 * Hook to access timeline context if available (doesn't throw)
 *
 * Returns undefined if not within a TimelineProvider.
 * Useful for components that can work both inside and outside a provider.
 */
export function useTimelineOptional(): TimelineContextValue | undefined {
  return useContext(TimelineContext);
}

// Helper to format time to ISO string
function formatTime(time: string | Date | undefined): string | undefined {
  if (!time) return undefined;
  if (time instanceof Date) return time.toISOString();
  return time;
}

// Export context for advanced use cases
export { TimelineContext };
