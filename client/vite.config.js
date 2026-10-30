import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Component tests (`npm run test:components`); plain logic tests still use node:test.
  test: {
    environment: "jsdom",
    // Outside a browser a relative URL such as /api cannot be parsed into a request.
    env: { VITE_API_URL: "http://localhost:3001" },
    include: ["src/**/*.component.test.jsx"],
    setupFiles: ["./src/test/setup.js"],
  },
  server: {
    host: true,
    proxy: {
      "/api": "http://localhost:3001",
    },
  },
});
