/**
 * Server logger — Winston, used by all server code (server functions, API routes).
 *
 * - Level via LOG_LEVEL / AI_LOG_LEVEL (default "info", "debug" in dev)
 * - JSON in production, colorized human-readable in dev
 * - Never logs secrets: `sanitizeMeta` redacts known secret keys
 * - Client code must NOT import this file (winston is Node-only). Use
 *   `src/lib/logger.client.ts` or `console` in components.
 *
 * Usage:
 *   import { logger } from "../lib/logger";
 *   logger.info("exchange ok", { owner_id: user.id });
 *   logger.warn("vault not ready", { error: err.message });
 *   const child = logger.child({ service: "bachs-webhook" });
 */

import winston from "winston";

const rawLevel = (process.env.LOG_LEVEL ?? process.env.AI_LOG_LEVEL ?? "").trim().toLowerCase();
const isProd = process.env.NODE_ENV === "production";

// Default: info in prod, debug in dev (more verbose locally)
const defaultLevel = isProd ? "info" : "debug";
const level = rawLevel || defaultLevel;
const validLevels = new Set(["error", "warn", "info", "http", "verbose", "debug", "silly"]);
const resolvedLevel = validLevels.has(level) ? level : defaultLevel;

// Redact secrets from meta — never log raw tokens, keys, cookies
const SECRET_KEYS = new Set([
  "access_token",
  "refresh_token",
  "provider_token",
  "provider_refresh_token",
  "secret",
  "password",
  "apiKey",
  "api_key",
  "cookie",
  "authorization",
  "supabase_secret",
  "supabase_service_key",
]);

function sanitizeMeta(meta: unknown): unknown {
  if (meta == null || typeof meta !== "object") return meta;
  if (Array.isArray(meta)) return meta.map(sanitizeMeta);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta as Record<string, unknown>)) {
    const lower = k.toLowerCase();
    if (SECRET_KEYS.has(k) || SECRET_KEYS.has(lower) || lower.includes("token") || lower.includes("secret") || lower.includes("password")) {
      out[k] = "[REDACTED]";
    } else if (v && typeof v === "object") {
      out[k] = sanitizeMeta(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

const redactFormat = winston.format((info) => {
  // winston puts splat meta in Symbol.for('splat')
  const splat = (info as unknown as Record<symbol, unknown>)[Symbol.for("splat")];
  if (Array.isArray(splat)) {
    (info as unknown as Record<symbol, unknown>)[Symbol.for("splat")] = splat.map((m) => sanitizeMeta(m));
  }
  // Also sanitize top-level extra fields (if any)
  for (const key of Object.keys(info)) {
    if (["level", "message", "timestamp", "stack"].includes(key)) continue;
    const val = (info as Record<string, unknown>)[key];
    if (val && typeof val === "object") {
      (info as Record<string, unknown>)[key] = sanitizeMeta(val) as unknown;
    } else if (SECRET_KEYS.has(key) || key.toLowerCase().includes("token") || key.toLowerCase().includes("secret")) {
      (info as Record<string, unknown>)[key] = "[REDACTED]";
    }
  }
  return info;
});

const baseFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  redactFormat(),
  isProd
    ? winston.format.json()
    : winston.format.combine(
        winston.format.colorize({ all: true }),
        winston.format.printf(({ timestamp, level: lvl, message, stack, ...rest }) => {
          const meta = Object.keys(rest).length ? ` ${JSON.stringify(sanitizeMeta(rest))}` : "";
          const stackStr = stack ? `\n${stack}` : "";
          return `${timestamp as string} ${lvl as string}: ${message as string}${meta}${stackStr}`;
        }),
      ),
);

export const logger = winston.createLogger({
  level: resolvedLevel,
  format: baseFormat,
  transports: [new winston.transports.Console()],
  // Don't exit on uncaught — let TanStack handle
  exitOnError: false,
});

// Also handle uncaught exceptions/rejections via winston (in addition to Node)
logger.exceptions.handle(new winston.transports.Console({ format: baseFormat }));
logger.rejections.handle(new winston.transports.Console({ format: baseFormat }));

export default logger;
