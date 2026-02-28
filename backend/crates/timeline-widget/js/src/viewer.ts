/**
 * Timeline Viewer
 *
 * JavaScript wrapper for the WebAssembly timeline widget.
 */

import type {
  TimelineEvent,
  TimelineOptions,
  PlaybackState,
  SelectionEvent,
  TimeRangeEvent,
  PlayheadEvent,
  TimelineEventMap,
  TimelineEventHandler,
} from "./types";

// Type for the WASM module
interface WasmModule {
  default: () => Promise<unknown>;
  TimelineViewer: new (options?: unknown) => WasmTimelineViewer;
}

// Type for the WASM TimelineViewer class
interface WasmTimelineViewer {
  start(canvasId: string): Promise<void>;
  stop(): void;
  setEvents(events: unknown): void;
  addEvent(event: unknown): void;
  clear(): void;
  setTimeRange(start: string, end: string): void;
  getTimeRange(): TimeRangeEvent;
  setPlayhead(time: string): void;
  getPlayhead(): string;
  setPlaybackState(state: string): void;
  getPlaybackState(): string;
  getSelectedEvent(): SelectionEvent;
  selectEvent(eventId: string | null): void;
  fitToEvents(): void;
  getEventCount(): number;
}

/**
 * Load the WASM module
 */
async function loadWasm(): Promise<WasmModule> {
  const wasm = await import("../pkg/events_manager_timeline_widget.js");
  await wasm.default();
  return wasm as unknown as WasmModule;
}

/**
 * Timeline Viewer class
 *
 * Provides a high-level API for embedding the timeline widget.
 */
export class TimelineViewer {
  private wasmViewer: WasmTimelineViewer | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private options: TimelineOptions;
  private listeners: Map<string, Set<Function>> = new Map();
  private initialized = false;

  constructor(options: TimelineOptions = {}) {
    this.options = options;
  }

  /**
   * Start the viewer, rendering to the given canvas element
   */
  async start(canvas: HTMLCanvasElement | string): Promise<void> {
    if (this.initialized) {
      throw new Error("TimelineViewer is already started");
    }

    // Get or create canvas
    if (typeof canvas === "string") {
      const el = document.getElementById(canvas);
      if (!el) {
        throw new Error(`Canvas element "${canvas}" not found`);
      }
      if (!(el instanceof HTMLCanvasElement)) {
        throw new Error(`Element "${canvas}" is not a canvas`);
      }
      this.canvas = el;
    } else {
      this.canvas = canvas;
    }

    // Ensure canvas has an ID
    if (!this.canvas.id) {
      this.canvas.id = `timeline-${Date.now()}`;
    }

    // Load WASM and create viewer
    const wasm = await loadWasm();

    // Convert options to camelCase for Rust
    const rustOptions = {
      showControls: this.options.showControls ?? true,
      showTree: this.options.showTree ?? true,
      followLive: this.options.followLive ?? false,
      timeStart: this.options.timeStart,
      timeEnd: this.options.timeEnd,
      theme: this.options.theme ?? "dark",
      rowHeight: this.options.rowHeight ?? 28,
      labelWidth: this.options.labelWidth ?? 180,
    };

    this.wasmViewer = new wasm.TimelineViewer(rustOptions);
    await this.wasmViewer.start(this.canvas.id);

    // Set up event listeners
    this.setupEventListeners();
    this.initialized = true;
  }

  /**
   * Stop the viewer and clean up
   */
  stop(): void {
    if (this.wasmViewer) {
      this.wasmViewer.stop();
      this.wasmViewer = null;
    }
    this.removeEventListeners();
    this.initialized = false;
  }

  /**
   * Set events data (replaces all current events)
   */
  setEvents(events: TimelineEvent[]): void {
    this.ensureStarted();
    this.wasmViewer!.setEvents(events);
  }

  /**
   * Add a single event
   */
  addEvent(event: TimelineEvent): void {
    this.ensureStarted();
    this.wasmViewer!.addEvent(event);
  }

  /**
   * Clear all events
   */
  clear(): void {
    this.ensureStarted();
    this.wasmViewer!.clear();
  }

  /**
   * Set the visible time range
   */
  setTimeRange(start: string | Date, end: string | Date): void {
    this.ensureStarted();
    const startStr = start instanceof Date ? start.toISOString() : start;
    const endStr = end instanceof Date ? end.toISOString() : end;
    this.wasmViewer!.setTimeRange(startStr, endStr);
  }

  /**
   * Get the current time range
   */
  getTimeRange(): TimeRangeEvent {
    this.ensureStarted();
    return this.wasmViewer!.getTimeRange();
  }

  /**
   * Set the playhead position
   */
  setPlayhead(time: string | Date): void {
    this.ensureStarted();
    const timeStr = time instanceof Date ? time.toISOString() : time;
    this.wasmViewer!.setPlayhead(timeStr);
  }

  /**
   * Get the playhead position (ISO 8601 string)
   */
  getPlayhead(): string {
    this.ensureStarted();
    return this.wasmViewer!.getPlayhead();
  }

  /**
   * Set playback state
   */
  setPlaybackState(state: PlaybackState): void {
    this.ensureStarted();
    this.wasmViewer!.setPlaybackState(state);
  }

  /**
   * Get current playback state
   */
  getPlaybackState(): PlaybackState {
    this.ensureStarted();
    return this.wasmViewer!.getPlaybackState() as PlaybackState;
  }

  /**
   * Get the currently selected event
   */
  getSelectedEvent(): SelectionEvent {
    this.ensureStarted();
    return this.wasmViewer!.getSelectedEvent();
  }

  /**
   * Select an event by ID (or null to deselect)
   */
  selectEvent(eventId: string | null): void {
    this.ensureStarted();
    this.wasmViewer!.selectEvent(eventId);
  }

  /**
   * Fit the view to show all events
   */
  fitToEvents(): void {
    this.ensureStarted();
    this.wasmViewer!.fitToEvents();
  }

  /**
   * Get the number of events
   */
  getEventCount(): number {
    this.ensureStarted();
    return this.wasmViewer!.getEventCount();
  }

  /**
   * Subscribe to an event
   */
  on<T extends keyof TimelineEventMap>(
    event: T,
    handler: TimelineEventHandler<T>
  ): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
  }

  /**
   * Unsubscribe from an event
   */
  off<T extends keyof TimelineEventMap>(
    event: T,
    handler: TimelineEventHandler<T>
  ): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  private ensureStarted(): void {
    if (!this.wasmViewer) {
      throw new Error("TimelineViewer not started. Call start() first.");
    }
  }

  private setupEventListeners(): void {
    if (!this.canvas) return;

    // Listen for custom events from the WASM module
    this.canvas.addEventListener("timelineselect", this.handleSelect);
    this.canvas.addEventListener("timelineplayhead", this.handlePlayhead);
    this.canvas.addEventListener("timelinerangechange", this.handleRangeChange);
  }

  private removeEventListeners(): void {
    if (!this.canvas) return;

    this.canvas.removeEventListener("timelineselect", this.handleSelect);
    this.canvas.removeEventListener("timelineplayhead", this.handlePlayhead);
    this.canvas.removeEventListener(
      "timelinerangechange",
      this.handleRangeChange
    );
  }

  private handleSelect = (e: Event): void => {
    const detail = (e as CustomEvent).detail as SelectionEvent;
    this.emit("select", detail);
  };

  private handlePlayhead = (e: Event): void => {
    const detail = (e as CustomEvent).detail as PlayheadEvent;
    this.emit("playhead", detail);
  };

  private handleRangeChange = (e: Event): void => {
    const detail = (e as CustomEvent).detail as TimeRangeEvent;
    this.emit("rangechange", detail);
  };

  private emit<T extends keyof TimelineEventMap>(
    event: T,
    data: TimelineEventMap[T]
  ): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach((handler) => handler(data));
    }
  }
}
