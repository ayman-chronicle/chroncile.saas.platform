.PHONY: build check test test-full clippy fmt backend-dev migrate

BACKEND_DIR := backend

build:
	cd $(BACKEND_DIR) && cargo build

check:
	cd $(BACKEND_DIR) && cargo check

test:
	cd $(BACKEND_DIR) && cargo test --workspace

test-full:
	cd $(BACKEND_DIR) && cargo test --workspace --features postgres-tests

clippy:
	cd $(BACKEND_DIR) && cargo clippy --workspace -- -D warnings

fmt:
	cd $(BACKEND_DIR) && cargo fmt --all

fmt-check:
	cd $(BACKEND_DIR) && cargo fmt --all -- --check

backend-dev:
	cd $(BACKEND_DIR) && cargo run --bin chronicle-backend

migrate:
	cd $(BACKEND_DIR) && sqlx migrate run
