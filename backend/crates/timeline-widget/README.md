# @events-manager/timeline

Embeddable timeline viewer widget for React/web applications. Built with egui and compiled to WebAssembly.

## Features

- 📊 **Rerun-style timeline** - Hierarchical topic tree with density graphs
- ⚡ **High performance** - Native-speed rendering via WebAssembly
- 🎨 **Beautiful UI** - Dark theme with smooth animations
- 🔄 **Live mode** - Auto-follow streaming events
- 📱 **Responsive** - Pan, zoom, and interact with touch or mouse
- ⚛️ **React support** - First-class React component with hooks

## Installation

```bash
npm install @events-manager/timeline
# or
yarn add @events-manager/timeline
```

## Quick Start

### Vanilla JavaScript

```javascript
import { TimelineViewer } from '@events-manager/timeline';

// Create viewer
const viewer = new TimelineViewer({
  showControls: true,
  followLive: false,
  theme: 'dark',
});

// Start rendering to a canvas
await viewer.start('my-canvas');

// Add events
viewer.setEvents([
  {
    id: 'evt_1',
    source: 'intercom',
    type: 'intercom.conversation.opened',
    occurredAt: new Date().toISOString(),
    actor: 'John Doe',
    message: 'New conversation started',
  },
]);

// Listen for selection changes
viewer.on('select', (event) => {
  console.log('Selected:', event.eventId);
});
```

### React

```tsx
import { Timeline } from '@events-manager/timeline/react';

function App() {
  const [events, setEvents] = useState([]);

  return (
    <Timeline
      events={events}
      width="100%"
      height={400}
      showControls={true}
      followLive={false}
      onSelect={(e) => console.log('Selected:', e)}
      onPlayhead={(e) => console.log('Playhead:', e.time)}
    />
  );
}
```

## API

### TimelineViewer

#### Constructor Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `showControls` | boolean | true | Show the playback controls bar |
| `showTree` | boolean | true | Show the topic tree panel |
| `followLive` | boolean | false | Auto-follow new events |
| `timeStart` | string | - | Initial time range start (ISO 8601) |
| `timeEnd` | string | - | Initial time range end (ISO 8601) |
| `theme` | 'dark' \| 'light' | 'dark' | Color theme |
| `rowHeight` | number | 28 | Height of each row in pixels |
| `labelWidth` | number | 180 | Width of the label column |

#### Methods

| Method | Description |
|--------|-------------|
| `start(canvas)` | Start rendering to a canvas element or ID |
| `stop()` | Stop the viewer and clean up |
| `setEvents(events)` | Set all events (replaces existing) |
| `addEvent(event)` | Add a single event |
| `clear()` | Remove all events |
| `setTimeRange(start, end)` | Set visible time range |
| `getTimeRange()` | Get current time range |
| `setPlayhead(time)` | Set playhead position |
| `getPlayhead()` | Get playhead position |
| `setPlaybackState(state)` | Set 'live', 'playing', or 'paused' |
| `getPlaybackState()` | Get current playback state |
| `selectEvent(id)` | Select an event by ID |
| `getSelectedEvent()` | Get selected event details |
| `fitToEvents()` | Fit view to show all events |
| `getEventCount()` | Get number of events |

#### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `select` | `{ eventId, event }` | Event selected/deselected |
| `playhead` | `{ time }` | Playhead position changed |
| `rangechange` | `{ start, end }` | Visible time range changed |

### TimelineEvent

```typescript
interface TimelineEvent {
  id: string;           // Unique identifier
  source: string;       // Source system (e.g., "intercom")
  type: string;         // Event type (e.g., "intercom.conversation.opened")
  occurredAt: string;   // ISO 8601 timestamp
  actor?: string;       // Who triggered the event
  message?: string;     // Brief description
  payload?: object;     // Full event data
  stream?: string;      // Optional category/stream
  color?: string;       // Optional color override (hex)
}
```

## Building from Source

### Prerequisites

- Rust (with wasm32-unknown-unknown target)
- Node.js 18+
- wasm-bindgen-cli

### Build Steps

```bash
# Install wasm target
rustup target add wasm32-unknown-unknown

# Install wasm-bindgen
cargo install wasm-bindgen-cli

# Build WASM module
cd crates/timeline-widget
./build-wasm.sh

# Build JS package
cd js
npm install
npm run build
```

### Running the Demo

```bash
# Build WASM
./build-wasm.sh

# Serve the example
cd example
python3 -m http.server 8080

# Open http://localhost:8080
```

## License

MIT
