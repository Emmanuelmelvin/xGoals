import { defineConfig, loadEnv } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(async ({ mode }) => {
  // Populate process.env from .env* before validating. Vite's `loadEnv` reads
  // .env, .env.local, etc. and returns only VITE_* by default; we load all
  // keys (third arg "") so server vars like SUPABASE_SECRET_KEY are also
  // available during `vite build` / `vite dev`.
  const viteEnv = loadEnv(mode, process.cwd(), "");
  for (const [k, v] of Object.entries(viteEnv)) {
    if (process.env[k] === undefined) process.env[k] = v;
  }
  // Fail-fast env validation (skip with SKIP_ENV_VALIDATION=true in CI)
  await import("./src/env.ts");

  return {
    plugins: [tailwindcss(), tanstackStart(), react()],
    server: {
      port: 3000,
      strictPort: true,
      // Allow the local Cloudflare quick tunnel used for Bachs sandbox testing.
      // (Leading dot matches any subdomain; tunnel hosts change per run.)
      allowedHosts: ["localhost", "127.0.0.1", ".trycloudflare.com"],
    },
  };
});
