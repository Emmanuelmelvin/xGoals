import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    tailwindcss(),
    tanstackStart(),
    react(),
  ],
  server: {
    port: 3000,
    strictPort: true,
    // Allow the local Cloudflare quick tunnel used for Bachs sandbox testing.
    // (Leading dot matches any subdomain; tunnel hosts change per run.)
    allowedHosts: ["localhost", "127.0.0.1", ".trycloudflare.com"],
  },
});
