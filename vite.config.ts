import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import basicSsl from '@vitejs/plugin-basic-ssl';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), basicSsl()],
  server: {
    https: {}, // Enables the HTTPS server
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
