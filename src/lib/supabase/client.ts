import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { env } from "../env";
import { ConfigError } from "../errors";

let browserClient: SupabaseClient | undefined;

export function createClient() {
  if (browserClient) {
    return browserClient;
  }

  const url = env.VITE_SUPABASE_URL;
  const publishableKey = env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new ConfigError("Missing Supabase browser environment variables.");
  }

  browserClient = createBrowserClient(url, publishableKey);
  return browserClient;
}
