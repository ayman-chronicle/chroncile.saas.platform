#!/bin/bash
# Build and optionally serve the Events Manager UI for WebAssembly
set -e

# Script location
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WORKSPACE_ROOT="$SCRIPT_DIR/../.."
WEB_DIR="$SCRIPT_DIR/web"
PORT="${PORT:-8080}"

# Parse arguments
SERVE=false
BUILD=true
OPEN_BROWSER=false

show_help() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Build and serve the Events Manager UI for WebAssembly"
    echo ""
    echo "Options:"
    echo "  -s, --serve      Serve the web UI after building"
    echo "  -o, --open       Open browser after starting server (implies --serve)"
    echo "  -n, --no-build   Skip build, just serve (implies --serve)"
    echo "  -p, --port PORT  Port to serve on (default: 8080)"
    echo "  -h, --help       Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0              # Build only"
    echo "  $0 --serve      # Build and serve"
    echo "  $0 -s -o        # Build, serve, and open browser"
    echo "  $0 -n           # Serve without rebuilding"
    echo "  $0 -p 3000 -s   # Build and serve on port 3000"
}

while [[ $# -gt 0 ]]; do
    case $1 in
        -s|--serve)
            SERVE=true
            shift
            ;;
        -o|--open)
            SERVE=true
            OPEN_BROWSER=true
            shift
            ;;
        -n|--no-build)
            BUILD=false
            SERVE=true
            shift
            ;;
        -p|--port)
            PORT="$2"
            shift 2
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Build if requested
if [ "$BUILD" = true ]; then
    echo "🔧 Building Events Manager UI for WebAssembly..."
    cd "$WORKSPACE_ROOT"

    # Use rustup's toolchain to avoid Homebrew Rust conflicts
    RUSTUP_CARGO="$HOME/.rustup/toolchains/stable-aarch64-apple-darwin/bin/cargo"
    if [ ! -f "$RUSTUP_CARGO" ]; then
        # Try to find any stable toolchain
        RUSTUP_CARGO=$(find "$HOME/.rustup/toolchains" -name "cargo" -path "*stable*" 2>/dev/null | head -1)
    fi

    if [ -z "$RUSTUP_CARGO" ] || [ ! -f "$RUSTUP_CARGO" ]; then
        echo "⚠️  Could not find rustup cargo. Using system cargo."
        echo "   If wasm32 target is missing, run: rustup target add wasm32-unknown-unknown"
        RUSTUP_CARGO="cargo"
    fi

    echo "   Using cargo: $RUSTUP_CARGO"

    # Check for wasm32 target
    echo "📦 Checking wasm32-unknown-unknown target..."
    if ! rustup target list --installed 2>/dev/null | grep -q "wasm32-unknown-unknown"; then
        echo "   Installing wasm32-unknown-unknown target..."
        rustup target add wasm32-unknown-unknown
    else
        echo "   ✓ Target already installed"
    fi

    # Check for wasm-bindgen-cli
    echo "📦 Checking wasm-bindgen-cli..."
    WASM_BINDGEN="$HOME/.cargo/bin/wasm-bindgen"
    if [ ! -f "$WASM_BINDGEN" ]; then
        echo "   Installing wasm-bindgen-cli..."
        cargo install wasm-bindgen-cli
    fi
    echo "   ✓ wasm-bindgen-cli ready"

    # Build the wasm module
    echo "🏗️  Compiling to WebAssembly..."
    PATH="$HOME/.rustup/toolchains/stable-aarch64-apple-darwin/bin:$PATH" \
        $RUSTUP_CARGO build --package events-manager-ui --lib \
        --target wasm32-unknown-unknown \
        --features web \
        --no-default-features \
        --release

    # Generate JS bindings
    echo "🔗 Generating JavaScript bindings..."
    mkdir -p "$WEB_DIR/pkg"
    $WASM_BINDGEN \
        --out-dir "$WEB_DIR/pkg" \
        --target web \
        --no-typescript \
        target/wasm32-unknown-unknown/release/events_manager_ui.wasm

    # Optimize wasm (optional, requires wasm-opt)
    if command -v wasm-opt &> /dev/null; then
        echo "⚡ Optimizing WebAssembly..."
        wasm-opt -Oz -o "$WEB_DIR/pkg/events_manager_ui_bg.wasm" \
            "$WEB_DIR/pkg/events_manager_ui_bg.wasm"
    else
        echo "ℹ️  Skipping optimization (wasm-opt not installed)"
    fi

    # Show output size
    WASM_SIZE=$(du -h "$WEB_DIR/pkg/events_manager_ui_bg.wasm" | cut -f1)
    echo ""
    echo "✅ Build complete! (wasm size: $WASM_SIZE)"
fi

# Serve if requested
if [ "$SERVE" = true ]; then
    echo ""
    echo "🌐 Starting web server on http://localhost:$PORT"
    echo "   Press Ctrl+C to stop"
    echo ""

    # Open browser if requested
    if [ "$OPEN_BROWSER" = true ]; then
        # Wait a moment for server to start, then open browser
        (sleep 1 && open "http://localhost:$PORT" 2>/dev/null || xdg-open "http://localhost:$PORT" 2>/dev/null) &
    fi

    # Start the server
    cd "$WEB_DIR"
    python3 -m http.server "$PORT"
else
    echo ""
    echo "To serve the web UI, run:"
    echo "  $0 --serve"
    echo ""
    echo "Or manually:"
    echo "  cd $WEB_DIR && python3 -m http.server $PORT"
fi
