import { createServerFn } from "@tanstack/react-start";
import { createClient } from "./server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { logger } from "../logger";

export const exchangeCodeForSession = createServerFn({ method: "GET" })
  .validator((data: { code: string }) => data)
  .handler(async ({ data }) => {
    const supabase = createClient();
    const { data: exchangeData, error } = await supabase.auth.exchangeCodeForSession(data.code);

    if (error) return { error: error.message ?? null };

    // Best-effort: persist X OAuth tokens into Supabase Vault (per-user, encrypted).
    // Vault table x_tokens is service_role-only; browser never sees tokens.
    // If the vault migration hasn't been applied or the provider gave no token,
    // we still succeed the login — the workspace works without X, just no posting.
    try {
      const session = (exchangeData as { session?: { provider_token?: string | null; provider_refresh_token?: string | null; expires_in?: number } | null })?.session ?? null;
      // Fallback: some Supabase versions return session via getSession() after exchange
      const providerToken = session?.provider_token ?? null;
      const providerRefresh = session?.provider_refresh_token ?? null;

      let accessToken: string | null = providerToken;
      let refreshToken: string | null = providerRefresh;
      let expiresIn: number | null = session?.expires_in ?? null;

      if (!accessToken) {
        const { data: sess } = await supabase.auth.getSession();
        accessToken = (sess.session as unknown as { provider_token?: string | null })?.provider_token ?? null;
        refreshToken = (sess.session as unknown as { provider_refresh_token?: string | null })?.provider_refresh_token ?? null;
        expiresIn = (sess.session as unknown as { expires_in?: number })?.expires_in ?? expiresIn;
      }

      // Also try getUser provider tokens (Supabase exposes via user identities)
      if (!accessToken) {
        const { data: userRes } = await supabase.auth.getUser();
        const identities = (userRes.user as unknown as { identities?: Array<{ provider_token?: string }> })?.identities;
        accessToken = identities?.[0]?.provider_token ?? accessToken;
      }

      if (accessToken) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const url = process.env.VITE_SUPABASE_URL;
          const serviceKey = process.env.SUPABASE_SECRET_KEY;
          if (url && serviceKey) {
            const service = createServiceClient(url, serviceKey);
            const scopesRaw = process.env.X_OAUTH_SCOPES ?? "users.read tweet.read offline.access";
            const scopes = scopesRaw
              .split(/[\s,]+/)
              .map((s) => s.trim())
              .filter(Boolean);
            const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
            const xHandle =
              (typeof meta.user_name === "string" && meta.user_name) ||
              (typeof meta.preferred_username === "string" && meta.preferred_username) ||
              (typeof meta.screen_name === "string" && meta.screen_name) ||
              null;
            const xUserId =
              (typeof meta.sub === "string" && meta.sub) ||
              (typeof meta.provider_id === "string" && meta.provider_id) ||
              (typeof meta.id === "string" && meta.id) ||
              null;

            // X access tokens are 2h (7200s). Use session expires_in if present.
            const exp = typeof expiresIn === "number" && Number.isFinite(expiresIn) ? expiresIn : 7200;

            const { error: vaultError } = await service.rpc("set_x_tokens", {
              p_owner_id: user.id,
              p_access_token: accessToken,
              p_refresh_token: refreshToken,
              p_expires_in: exp,
              p_scopes: scopes,
              p_x_user_id: xUserId,
              p_x_handle: xHandle ? String(xHandle).replace(/^@/, "") : null,
            });

            if (vaultError) {
              logger.warn("auth set_x_tokens failed (vault not ready?)", { error: vaultError.message });
            } else {
              logger.info("auth x_tokens persisted", { owner_id: user.id, has_refresh: Boolean(refreshToken) });
            }
          }
        }
      }
    } catch (e) {
      logger.warn("auth vault persist skipped", { error: e instanceof Error ? e.message : String(e) });
    }

    return { error: null as string | null };
  });
