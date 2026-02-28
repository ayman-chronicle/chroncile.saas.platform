/**
 * React Timeline Component
 *
 * React wrapper for the timeline viewer widget.
 */

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import { TimelineViewer } from "./viewer";
import type {
  TimelineEvent,
  TimelineOptions,
  PlaybackState,
  SelectionEvent,
  TimeRangeEvent,
  PlayheadEvent,
} from "./types";

/**
 * Props for the Timeline component
 */
export interface TimelineProps extends TimelineOptions {
  /** Events to display */
  events?: TimelineEvent[];
  /** Canvas width */
  width?: number | string;
  /** Canvas height */
  height?: number | string;
  /** CSS class name for the canvas */
  className?: string;
  /** Inline styles for the canvas */
  style?: React.CSSProperties;
  /** Called when an event is selected */
  onSelect?: (event: SelectionEvent) => void;
  /** Called when the playhead moves */
  onPlayhead?: (event: PlayheadEvent) => void;
  /** Called when the time range changes */
  onRangeChange?: (event: TimeRangeEvent) => void;
  /** Called when the viewer is ready */
  onReady?: (viewer: TimelineViewer) => void;
  /** Called on error */
  onError?: (error: Error) => void;
}

/**
 * Ref handle for the Timeline component
 */
export interface TimelineRef {
  /** Get the underlying TimelineViewer instance */
  getViewer(): TimelineViewer | null;
  /** Set the visible time range */
  setTimeRange(start: string | Date, end: string | Date): void;
  /** Set the playhead position */
  setPlayhead(time: string | Date): void;
  /** Get the playhead position */
  getPlayhead(): string | null;
  /** Set playback state */
  setPlaybackState(state: PlaybackState): void;
  /** Get playback state */
  getPlaybackState(): PlaybackState | null;
  /** Select an event by ID */
  selectEvent(eventId: string | null): void;
  /** Get the selected event */
  getSelectedEvent(): SelectionEvent | null;
  /** Fit view to show all events */
  fitToEvents(): void;
  /** Add a single event */
  addEvent(event: TimelineEvent): void;
  /** Clear all events */
  clear(): void;
}

/**
 * Timeline component
 *
 * React component for embedding the timeline viewer.
 *
 * @example
 * ```tsx
 * import { Timeline } from '@events-manager/timeline/react';
 *
 * function App() {
 *   const [events, setEvents] = useState([]);
 *
 *   return (
 *     <Timeline
 *       events={events}
 *       width="100%"
 *       height={400}
 *       onSelect={(e) => console.log('Selected:', e)}
 *     />
 *   );
 * }
 * ```
 */
export const Timeline = forwardRef<TimelineRef, TimelineProps>(
  function Timeline(props, ref) {
    const {
      events,
      width = "100%",
      height = 400,
      className,
      style,
      onSelect,
      onPlayhead,
      onRangeChange,
      onReady,
      onError,
      // Options
      showControls,
      showTree,
      followLive,
      timeStart,
      timeEnd,
      theme,
      rowHeight,
      labelWidth,
    } = props;

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const viewerRef = useRef<TimelineViewer | null>(null);
    const [isReady, setIsReady] = useState(false);

    // Build options object
    const options: TimelineOptions = {
      showControls,
      showTree,
      followLive,
      timeStart,
      timeEnd,
      theme,
      rowHeight,
      labelWidth,
    };

    // Initialize viewer
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const viewer = new TimelineViewer(options);
      viewerRef.current = viewer;

      viewer
        .start(canvas)
        .then(() => {
          setIsReady(true);
          onReady?.(viewer);
        })
        .catch((error) => {
          console.error("Failed to start timeline viewer:", error);
          onError?.(error instanceof Error ? error : new Error(String(error)));
        });

      return () => {
        viewer.stop();
        viewerRef.current = null;
        setIsReady(false);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Only run once on mount

    // Set up event handlers
    useEffect(() => {
      const viewer = viewerRef.current;
      if (!viewer || !isReady) return;

      if (onSelect) viewer.on("select", onSelect);
      if (onPlayhead) viewer.on("playhead", onPlayhead);
      if (onRangeChange) viewer.on("rangechange", onRangeChange);

      return () => {
        if (onSelect) viewer.off("select", onSelect);
        if (onPlayhead) viewer.off("playhead", onPlayhead);
        if (onRangeChange) viewer.off("rangechange", onRangeChange);
      };
    }, [isReady, onSelect, onPlayhead, onRangeChange]);

    // Update events when they change
    useEffect(() => {
      const viewer = viewerRef.current;
      if (!viewer || !isReady || !events) return;

      viewer.setEvents(events);
    }, [isReady, events]);

    // Expose imperative handle
    useImperativeHandle(
      ref,
      () => ({
        getViewer: () => viewerRef.current,
        setTimeRange: (start, end) => viewerRef.current?.setTimeRange(start, end),
        setPlayhead: (time) => viewerRef.current?.setPlayhead(time),
        getPlayhead: () => viewerRef.current?.getPlayhead() ?? null,
        setPlaybackState: (state) => viewerRef.current?.setPlaybackState(state),
        getPlaybackState: () => viewerRef.current?.getPlaybackState() ?? null,
        selectEvent: (eventId) => viewerRef.current?.selectEvent(eventId),
        getSelectedEvent: () => viewerRef.current?.getSelectedEvent() ?? null,
        fitToEvents: () => viewerRef.current?.fitToEvents(),
        addEvent: (event) => viewerRef.current?.addEvent(event),
        clear: () => viewerRef.current?.clear(),
      }),
      []
    );

    // Compute canvas styles
    const canvasStyle: React.CSSProperties = {
      display: "block",
      width: typeof width === "number" ? `${width}px` : width,
      height: typeof height === "number" ? `${height}px` : height,
      ...style,
    };

    return (
      <canvas ref={canvasRef} className={className} style={canvasStyle} />
    );
  }
);

// Re-export types and viewer for convenience
export { TimelineViewer } from "./viewer";
export type {
  TimelineEvent,
  TimelineOptions,
  PlaybackState,
  SelectionEvent,
  TimeRangeEvent,
  PlayheadEvent,
} from "./types";
