import path from "path";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // Production build is served from https://trubbleshooter05.github.io/Closeout-Gate/ (GitHub Pages project site).
  base: mode === "production" ? "/Closeout-Gate/" : "/",
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  // Expose both VITE_* (Vite default) and EXPO_PUBLIC_* (a common
  // cross-platform public-env prefix).
  envPrefix: ["VITE_", "EXPO_PUBLIC_"],
}));
