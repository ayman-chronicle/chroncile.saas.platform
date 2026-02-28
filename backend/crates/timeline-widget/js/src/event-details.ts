/**
 * Event Details Viewer
 *
 * JavaScript wrapper for the WebAssembly event details widget.
 */

import type {
  TimelineEvent,
  EventDetailsOptions,
  EventDetailsCopyEvent,
  EventDetailsEventMap,
  EventDetailsEventHandler,
} from "./types";

// Type for the WASM module
interface WasmModule {
  default: () => Promise<unknown>;
  EventDetailsViewer: new (options?: unknown) => WasmEventDetailsViewer;
}

// Type for the WASM EventDetailsViewer class
interface WasmEventDetailsViewer {
  start(canvasId: string): Promise<void>;
  stop(): void;
  setEvent(event: unknown): void;
  clear(): void;
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
 * Event Details Viewer class
 *
 * Provides a high-level API for embedding the event details widget.
 */
export class EventDetailsViewer {
  private wasmViewer: WasmEventDetailsViewer | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private options: EventDetailsOptions;
  private listeners: Map<string, Set<Function>> = new Map();
  private initialized = false;

  constructor(options: EventDetailsOptions = {}) {
    this.options = options;
  }

  /**
   * Start the viewer, rendering to the given canvas element
   */
  async start(canvas: HTMLCanvasElement | string): Promise<void> {
    if (this.initialized) {
      throw new Error("EventDetailsViewer is already started");
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
      this.canvas.id = `eventdetails-${Date.now()}`;
    }

    // Load WASM and create viewer
    const wasm = await loadWasm();

    // Convert options to camelCase for Rust
    const rustOptions = {
      showPayload: this.options.showPayload ?? true,
      payloadRows: this.options.payloadRows ?? 10,
      enableCopy: this.options.enableCopy ?? true,
      theme: this.options.theme ?? "dark",
    };

    this.wasmViewer = new wasm.EventDetailsViewer(rustOptions);
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
   * Set the event to display
   */
  setEvent(event: TimelineEvent | null): void {
    this.ensureStarted();
    this.wasmViewer!.setEvent(event);
  }

  /**
   * Clear the displayed event
   */
  clear(): void {
    this.ensureStarted();
    this.wasmViewer!.clear();
  }

  /**
   * Subscribe to an event
   */
  on<T extends keyof EventDetailsEventMap>(
    event: T,
    handler: EventDetailsEventHandler<T>
  ): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
  }

  /**
   * Unsubscribe from an event
   */
  off<T extends keyof EventDetailsEventMap>(
    event: T,
    handler: EventDetailsEventHandler<T>
  ): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  private ensureStarted(): void {
    if (!this.wasmViewer) {
      throw new Error("EventDetailsViewer not started. Call start() first.");
    }
  }

  private setupEventListeners(): void {
    if (!this.canvas) return;
    this.canvas.addEventListener("eventdetailscopy", this.handleCopy);
  }

  private removeEventListeners(): void {
    if (!this.canvas) return;
    this.canvas.removeEventListener("eventdetailscopy", this.handleCopy);
  }

  private handleCopy = (e: Event): void => {
    const detail = (e as CustomEvent).detail as EventDetailsCopyEvent;
    this.emit("copy", detail);
  };

  private emit<T extends keyof EventDetailsEventMap>(
    event: T,
    data: EventDetailsEventMap[T]
  ): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach((handler) => handler(data));
    }
  }
}
