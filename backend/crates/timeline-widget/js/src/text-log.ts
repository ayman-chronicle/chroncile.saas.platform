/**
 * Text Log Viewer
 *
 * JavaScript wrapper for the WebAssembly text log widget.
 */

import type {
  TimelineEvent,
  SelectionEvent,
  TextLogOptions,
  TextLogEventMap,
  TextLogEventHandler,
} from "./types";

// Type for the WASM module
interface WasmModule {
  default: () => Promise<unknown>;
  TextLogViewer: new (options?: unknown) => WasmTextLogViewer;
}

// Type for the WASM TextLogViewer class
interface WasmTextLogViewer {
  start(canvasId: string): Promise<void>;
  stop(): void;
  setEvents(events: unknown): void;
  addEvent(event: unknown): void;
  clear(): void;
  selectEvent(eventId: string | null): void;
  setPlayhead(time: string): void;
  getSelectedEvent(): string | null;
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
 * Text Log Viewer class
 *
 * Provides a high-level API for embedding the text log widget.
 */
export class TextLogViewer {
  private wasmViewer: WasmTextLogViewer | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private options: TextLogOptions;
  private listeners: Map<string, Set<Function>> = new Map();
  private initialized = false;

  constructor(options: TextLogOptions = {}) {
    this.options = options;
  }

  /**
   * Start the viewer, rendering to the given canvas element
   */
  async start(canvas: HTMLCanvasElement | string): Promise<void> {
    if (this.initialized) {
      throw new Error("TextLogViewer is already started");
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
      this.canvas.id = `textlog-${Date.now()}`;
    }

    // Load WASM and create viewer
    const wasm = await loadWasm();

    // Convert options to camelCase for Rust
    const rustOptions = {
      rowHeight: this.options.rowHeight ?? 24,
      showTime: this.options.showTime ?? true,
      showSource: this.options.showSource ?? true,
      showType: this.options.showType ?? true,
      showActor: this.options.showActor ?? true,
      showMessage: this.options.showMessage ?? true,
      theme: this.options.theme ?? "dark",
    };

    this.wasmViewer = new wasm.TextLogViewer(rustOptions);
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
   * Select an event by ID (or null to deselect)
   */
  selectEvent(eventId: string | null): void {
    this.ensureStarted();
    this.wasmViewer!.selectEvent(eventId);
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
   * Get the selected event ID (or null if none)
   */
  getSelectedEvent(): string | null {
    this.ensureStarted();
    return this.wasmViewer!.getSelectedEvent();
  }

  /**
   * Subscribe to an event
   */
  on<T extends keyof TextLogEventMap>(
    event: T,
    handler: TextLogEventHandler<T>
  ): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
  }

  /**
   * Unsubscribe from an event
   */
  off<T extends keyof TextLogEventMap>(
    event: T,
    handler: TextLogEventHandler<T>
  ): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  private ensureStarted(): void {
    if (!this.wasmViewer) {
      throw new Error("TextLogViewer not started. Call start() first.");
    }
  }

  private setupEventListeners(): void {
    if (!this.canvas) return;
    this.canvas.addEventListener("textlogselect", this.handleSelect);
  }

  private removeEventListeners(): void {
    if (!this.canvas) return;
    this.canvas.removeEventListener("textlogselect", this.handleSelect);
  }

  private handleSelect = (e: Event): void => {
    const detail = (e as CustomEvent).detail as SelectionEvent;
    this.emit("select", detail);
  };

  private emit<T extends keyof TextLogEventMap>(
    event: T,
    data: TextLogEventMap[T]
  ): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach((handler) => handler(data));
    }
  }
}
