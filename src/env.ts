/**
 * Central env validation — single source of truth for all env vars.
 *
 * - Validates at import time (fail-fast before the app starts)
 * - Server vars (no VITE_) never leak to the browser
 * - Client vars (VITE_*) are the only ones exposed to the browser
 * - Import from here instead of `process.env` / `import.meta.env`:
 *   `import { env } from "./env"` or `import { env } from "../env"`
 *
 * Validation uses Zod. Empty strings are treated as undefined (so `.env.example`
 * placeholders don't pass as real values unless you fill them).
 * To skip validation in CI (e.g., `pnpm build` without real secrets), set
 * `SKIP_ENV_VALIDATION=true`.
 */

import { z } from "zod";
import { EnvValidationError } from "./lib/errors.ts";

// Treat "" as undefined so optional empty vars don't fail url() checks
const emptyToUndefined = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => (v === "" ? undefined : v), schema.optional());

function stripQuotes(v: string): string {
  const t = v.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) return t.slice(1, -1).trim();
  return t;
}

function getRaw(name: string): string | undefined {
  let raw: string | undefined;
  // Vite client: import.meta.env.VITE_*
  try {
    const metaEnv = (import.meta as unknown as { env?: Record<string, string | undefined> })?.env;
    if (metaEnv && metaEnv[name] !== undefined) raw = metaEnv[name];
  } catch {
    // not in Vite context
  }
  // Node/server: process.env (Vite also exposes VITE_ there)
  if (raw === undefined && typeof process !== "undefined" && process.env) raw = process.env[name];
  if (raw === undefined) return undefined;
  return stripQuotes(raw);
}

function rawEnvRecord(): Record<string, string | undefined> {
  const keys = [
    "VITE_SUPABASE_URL",
    "VITE_SUPABASE_PUBLISHABLE_KEY",
    "VITE_SUPABASE_AUTH_REDIRECT_URL",
    "SUPABASE_SECRET_KEY",
    "APP_URL",
    "SUPABASE_AUTH_CALLBACK_URL",
    "X_CLIENT_ID",
    "X_CLIENT_SECRET",
    "X_OAUTH_SCOPES",
    "SUPABASE_DB_URL",
    "AGENT_API_URL",
    "AGENT_DATABASE_URL",
    "AI_PROVIDER",
    "AI_TEMPERATURE",
    "AI_LOG_LEVEL",
    "LOG_LEVEL",
    "VITE_LOG_LEVEL",
    "OLLAMA_HOST",
    "OLLAMA_MODEL",
    "AWS_REGION",
    "AWS_ACCESS_KEY_ID",
    "AWS_SECRET_ACCESS_KEY",
    "BEDROCK_MODEL_ID",
    "OPENAI_API_KEY",
    "OPENAI_MODEL",
    "OPENAI_BASE_URL",
    "GROQ_API_KEY",
    "GROQ_MODEL",
    "GROQ_BASE_URL",
    "SENTRY_DSN",
    "VITE_SENTRY_DSN",
    "SENTRY_AUTH_TOKEN",
    "VITE_POSTHOG_KEY",
    "POSTHOG_API_KEY",
    "BACHS_API_KEY",
    "BACHS_API_BASE_URL",
    "BACHS_WEBHOOK_SECRET",
    "VITE_CREDITS_PER_USD",
    "VITE_CREDITS_MIN_USD",
    "VITE_CREDITS_MAX_USD",
    "VITE_BACHS_TEST_MODE",
    "NODE_ENV",
    "VITE_SENTRY_DSN",
  ];
  const out: Record<string, string | undefined> = {};
  for (const k of keys) out[k] = getRaw(k);
  return out;
}

// Helpers
const urlSchema = emptyToUndefined(z.string().url());
const nonEmptySchema = emptyToUndefined(z.string().min(1));

const aiProviderSchema = emptyToUndefined(z.enum(["ollama", "bedrock", "openai", "groq"]));
const logLevelSchema = emptyToUndefined(z.enum(["error", "warn", "info", "http", "verbose", "debug", "silly", "DEBUG", "INFO", "WARN", "ERROR"]));

const schema = z
  .object({
    // --- Required for auth ---
    VITE_SUPABASE_URL: z.string().url({ message: "VITE_SUPABASE_URL must be a valid URL (https://YOUR_REF.supabase.co)" }),
    VITE_SUPABASE_PUBLISHABLE_KEY: z.string().min(1, { message: "VITE_SUPABASE_PUBLISHABLE_KEY is required (sb_publishable_...)" }),

    // --- Optional client ---
    VITE_SUPABASE_AUTH_REDIRECT_URL: urlSchema,
    VITE_SENTRY_DSN: emptyToUndefined(z.string().min(1)),
    VITE_POSTHOG_KEY: nonEmptySchema,
    VITE_CREDITS_PER_USD: emptyToUndefined(z.string().regex(/^\d+$/, { message: "VITE_CREDITS_PER_USD must be integer string" })),
    VITE_CREDITS_MIN_USD: emptyToUndefined(z.string().regex(/^\d+(\.\d{1,2})?$/, { message: "VITE_CREDITS_MIN_USD must be decimal like 5.00" })),
    VITE_CREDITS_MAX_USD: emptyToUndefined(z.string().regex(/^\d+(\.\d{1,2})?$/, { message: "VITE_CREDITS_MAX_USD must be decimal like 500.00" })),
    VITE_BACHS_TEST_MODE: emptyToUndefined(z.enum(["true", "false"])),
    VITE_LOG_LEVEL: logLevelSchema,

    // --- Server ---
    SUPABASE_SECRET_KEY: nonEmptySchema,
    APP_URL: urlSchema,
    SUPABASE_AUTH_CALLBACK_URL: urlSchema,
    X_CLIENT_ID: nonEmptySchema,
    X_CLIENT_SECRET: nonEmptySchema,
    X_OAUTH_SCOPES: emptyToUndefined(z.string().min(1)),
    SUPABASE_DB_URL: emptyToUndefined(z.string().min(1)), // postgres url, not strictly url() due to postgres://
    AGENT_API_URL: urlSchema,
    AGENT_DATABASE_URL: emptyToUndefined(z.string().min(1)),
    AI_PROVIDER: aiProviderSchema,
    AI_TEMPERATURE: emptyToUndefined(z.string().regex(/^\d+(\.\d+)?$/, { message: "AI_TEMPERATURE must be numeric string" })),
    AI_LOG_LEVEL: logLevelSchema,
    LOG_LEVEL: logLevelSchema,
    OLLAMA_HOST: urlSchema,
    OLLAMA_MODEL: nonEmptySchema,
    AWS_REGION: nonEmptySchema,
    AWS_ACCESS_KEY_ID: nonEmptySchema,
    AWS_SECRET_ACCESS_KEY: nonEmptySchema,
    BEDROCK_MODEL_ID: nonEmptySchema,
    OPENAI_API_KEY: nonEmptySchema,
    OPENAI_MODEL: nonEmptySchema,
    OPENAI_BASE_URL: urlSchema,
    GROQ_API_KEY: nonEmptySchema,
    GROQ_MODEL: nonEmptySchema,
    GROQ_BASE_URL: urlSchema,
    SENTRY_DSN: nonEmptySchema,
    SENTRY_AUTH_TOKEN: nonEmptySchema,
    POSTHOG_API_KEY: nonEmptySchema,
    BACHS_API_KEY: nonEmptySchema,
    BACHS_API_BASE_URL: urlSchema,
    BACHS_WEBHOOK_SECRET: nonEmptySchema,
    NODE_ENV: emptyToUndefined(z.enum(["development", "production", "test"])),
  })
  .superRefine((val, ctx) => {
    // If AI_PROVIDER is set, require its key
    if (val.AI_PROVIDER === "openai" && !val.OPENAI_API_KEY) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["OPENAI_API_KEY"], message: "OPENAI_API_KEY is required when AI_PROVIDER=openai" });
    }
    if (val.AI_PROVIDER === "groq" && !val.GROQ_API_KEY) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["GROQ_API_KEY"], message: "GROQ_API_KEY is required when AI_PROVIDER=groq" });
    }
    // Supabase URL should be https in prod
    if (val.VITE_SUPABASE_URL && val.NODE_ENV === "production" && !val.VITE_SUPABASE_URL.startsWith("https://")) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["VITE_SUPABASE_URL"], message: "VITE_SUPABASE_URL should be https:// in production" });
    }
  });

export type Env = z.infer<typeof schema>;

let parsed: Env | null = null;

function validate(): Env {
  if (parsed) return parsed;
  const skip = getRaw("SKIP_ENV_VALIDATION") === "true" || process.env.SKIP_ENV_VALIDATION === "true";
  if (skip) {
    // Return raw without throwing — useful for `pnpm build` in CI without secrets
    parsed = schema.partial().parse(rawEnvRecord()) as Env;
    return parsed;
  }
  const raw = rawEnvRecord();
  const result = schema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    const message = `❌ Invalid environment variables:\n${issues}\n\nFix .env (see .env.example) or set SKIP_ENV_VALIDATION=true to bypass.`;
    // Use console.error before logger is ready
    console.error(message);
    throw new EnvValidationError(message, { cause: result.error });
  }
  parsed = result.data;
  return parsed;
}

// Validate immediately on import (fail-fast)
export const env: Env = validate();

// Convenience — typed accessors with defaults (so callers don't need ??)
export const serverEnv = {
  get supabaseUrl() {
    return env.VITE_SUPABASE_URL;
  },
  get supabasePublishableKey() {
    return env.VITE_SUPABASE_PUBLISHABLE_KEY;
  },
  get supabaseSecretKey() {
    return env.SUPABASE_SECRET_KEY;
  },
  get appUrl() {
    return env.APP_URL ?? "http://127.0.0.1:3000";
  },
  get agentDatabaseUrl() {
    return env.AGENT_DATABASE_URL;
  },
  get bachsWebhookSecret() {
    return env.BACHS_WEBHOOK_SECRET;
  },
};

export const clientEnv = {
  get supabaseUrl() {
    return env.VITE_SUPABASE_URL;
  },
  get supabasePublishableKey() {
    return env.VITE_SUPABASE_PUBLISHABLE_KEY;
  },
};
