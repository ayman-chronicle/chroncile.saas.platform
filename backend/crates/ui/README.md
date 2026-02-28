# Events Manager UI

Cross-platform egui desktop/web application for the Events Manager.

## Features

- **Live Stream View** - Real-time event streaming with SSE
- **Timeline View** - Browse conversation history
- **Connections View** - Manage OAuth connections and scenarios
- **Dark Observatory Theme** - Polished dark UI with cyan/purple accents
- **Toast Notifications** - Feedback for user actions

## Running Native (Desktop)

```bash
# From the workspace root
cargo run --package events-manager-ui

# Or with explicit features
cargo run --package events-manager-ui --features native
```

## Building for Web (WebAssembly)

### Prerequisites

1. Install the wasm32 target:
   ```bash
   rustup target add wasm32-unknown-unknown
   ```

2. Install wasm-bindgen-cli:
   ```bash
   cargo install wasm-bindgen-cli
   ```

3. (Optional) Install wasm-opt for optimization:
   ```bash
   # macOS
   brew install binaryen
   
   # Or from source
   cargo install wasm-opt
   ```

### Build

```bash
# Use the build script
chmod +x crates/ui/build-web.sh
./crates/ui/build-web.sh

# Or manually:
cargo build --package events-manager-ui --lib \
    --target wasm32-unknown-unknown \
    --features web \
    --no-default-features \
    --release

wasm-bindgen \
    --out-dir crates/ui/web/pkg \
    --target web \
    --no-typescript \
    target/wasm32-unknown-unknown/release/events_manager_ui.wasm
```

### Serve

1. Start the Events Manager API server:
   ```bash
   cargo run --bin events-manager
   ```

2. Serve the web UI:
   ```bash
   cd crates/ui/web
   python3 -m http.server 8080
   ```

3. Open http://localhost:8080 in your browser

## Architecture

```
src/
├── lib.rs          # Library entry point + wasm exports
├── main.rs         # Native entry point
├── app.rs          # Main application + theme
├── client.rs       # Cross-platform HTTP/SSE client
├── types.rs        # DTOs (no internal deps)
└── views/
    ├── mod.rs
    ├── stream.rs   # Live Stream view
    ├── timeline.rs # Timeline view
    └── connections.rs # Connections view

web/
├── index.html      # Web entry point
└── pkg/            # Generated wasm-bindgen output
```

## Platform Differences

| Feature | Native | Web |
|---------|--------|-----|
| HTTP Client | reqwest | gloo-net |
| SSE | eventsource-client | gloo-net EventSource |
| Async Runtime | tokio | wasm-bindgen-futures |
| Time | std::time::Instant | Performance.now() |

## Configuration

### Native

Set the `API_URL` environment variable:
```bash
API_URL=http://127.0.0.1:3000 cargo run --package events-manager-ui
```

### Web

The web version automatically uses `window.location.origin` as the API URL,
or you can modify `web/index.html` to specify a different URL.

## Screenshots

The UI features a dark "observatory" theme with:
- Deep space dark backgrounds (#080a12)
- Cyan accent color (#00d4ff)
- Purple highlights (#8a2be2)
- Color-coded event types
