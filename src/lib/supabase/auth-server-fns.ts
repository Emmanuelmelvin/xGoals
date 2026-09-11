import { createServerFn } from "@tanstack/react-start";
import { createClient } from "./server";

export const exchangeCodeForSession = createServerFn({ method: "GET" })
  .validator((data: { code: string }) => data)
  .handler(async ({ data }) => {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(data.code);

    return { error: error?.message ?? null };
  });
