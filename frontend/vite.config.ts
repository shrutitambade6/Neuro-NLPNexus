import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // ws: true — the Community/Chat milestone's one WebSocket endpoint
      // (/api/ws) needs the dev proxy to forward the Upgrade handshake
      // too, not just plain HTTP. Without this, the socket would 404 in
      // dev even though it works fine hitting the backend directly.
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
