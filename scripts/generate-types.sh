#!/usr/bin/env bash
set -euo pipefail

# Generates TypeScript types from Rust structs using ts-rs.
# The types are exported to packages/shared/src/generated/ via cargo test.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
GENERATED_DIR="$ROOT_DIR/packages/shared/src/generated"
SERDE_DIR="$ROOT_DIR/packages/shared/src/serde_json"

mkdir -p "$GENERATED_DIR"
mkdir -p "$SERDE_DIR"

echo "Generating TypeScript types from Rust structs..."

cd "$ROOT_DIR/backend"

# ts-rs exports types via #[test] methods that run during cargo test.
# Running tests with the export feature triggers the file generation.
cargo test --workspace 2>&1 | tail -5

# ts-rs exports to crate-local bindings/generated/ directories.
# Collect all generated .ts files into the shared package.
find crates -path "*/bindings/generated/*.ts" -exec cp {} "$GENERATED_DIR/" \;
echo "Copied generated types to $GENERATED_DIR/"

# Copy serde_json helper types (used by generated types that reference serde_json::Value)
find crates -path "*/bindings/serde_json/*.ts" -exec cp {} "$SERDE_DIR/" \;
echo "Copied serde_json helpers to $SERDE_DIR/"

# Create an index.ts that re-exports all generated types
if ls "$GENERATED_DIR"/*.ts 1>/dev/null 2>&1; then
    echo "// Auto-generated from Rust types via ts-rs. Do not edit manually." > "$GENERATED_DIR/index.ts"
    for file in "$GENERATED_DIR"/*.ts; do
        basename=$(basename "$file" .ts)
        if [ "$basename" != "index" ]; then
            echo "export type { $basename } from './$basename';" >> "$GENERATED_DIR/index.ts"
        fi
    done
    echo ""
    echo "Generated types:"
    ls -1 "$GENERATED_DIR"/*.ts
else
    echo "No generated type files found."
fi
