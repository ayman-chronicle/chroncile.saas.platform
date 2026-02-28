import { defineConfig } from "tsup";

export default defineConfig([
  // Main entry (vanilla JS)
  {
    entry: ["src/index.ts"],
    format: ["cjs", "esm"],
    dts: true,
    sourcemap: true,
    clean: true,
    external: ["react", "react-dom"],
  },
  // React entry
  {
    entry: { react: "src/react.tsx" },
    format: ["cjs", "esm"],
    dts: true,
    sourcemap: true,
    external: ["react", "react-dom"],
    esbuildOptions(options) {
      options.jsx = "automatic";
    },
  },
]);
