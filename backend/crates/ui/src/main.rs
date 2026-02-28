//! Events Manager UI - Native Entry Point
//!
//! This is the native desktop application entry point.
//! For web/wasm, use the library's wasm-bindgen entry point.

#[cfg(not(target_arch = "wasm32"))]
fn main() -> eframe::Result<()> {
    use eframe::NativeOptions;
    use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

    // Initialize tracing
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            std::env::var("RUST_LOG").unwrap_or_else(|_| "info".into()),
        ))
        .with(tracing_subscriber::fmt::layer())
        .init();

    let options = NativeOptions {
        viewport: egui::ViewportBuilder::default()
            .with_inner_size([1280.0, 800.0])
            .with_min_inner_size([800.0, 600.0])
            .with_title("Events Manager"),
        ..Default::default()
    };

    eframe::run_native(
        "Events Manager",
        options,
        Box::new(|cc| Ok(Box::new(chronicle_ui::EventsManagerApp::new(cc)))),
    )
}

#[cfg(target_arch = "wasm32")]
fn main() {
    // Web entry point is handled by lib.rs wasm-bindgen exports
    // This main function is not used on wasm32
}
