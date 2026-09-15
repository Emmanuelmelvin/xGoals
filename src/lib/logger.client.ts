/**
 * Browser logger — same API as `src/lib/logger.ts` but safe for client bundles.
 * Uses console with level filtering. Server code must import from "./logger"
 * (winston). Client components can import from "./logger.client".
 */

type Level = "error" | "warn" | "info" | "debug";

const levelOrder: Record<Level, number> = { error: 0, warn: 1, info: 2, debug: 3 };

import { env } from "./env";

function getLevel(): Level {
  const raw = (env.VITE_LOG_LEVEL as string | undefined)?.toLowerCase() ?? "info";
  if (raw === "error" || raw === "warn" || raw === "info" || raw === "debug") return raw;
  return "info";
}

const current = getLevel();

function should(level: Level) {
  return levelOrder[level] <= levelOrder[current];
}

function fmtArgs(args: unknown[]) {
  // Redact obvious secrets even in browser
  return args.map((a) => {
    if (a && typeof a === "object" && !Array.isArray(a)) {
      const o = a as Record<string, unknown>;
      const redacted: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(o)) {
        const lower = k.toLowerCase();
        if (lower.includes("token") || lower.includes("secret") || lower.includes("password") || lower.includes("cookie")) {
          redacted[k] = "[REDACTED]";
        } else {
          redacted[k] = v;
        }
      }
      return redacted;
    }
    return a;
  });
}

export const logger = {
  error: (msg: string, ...args: unknown[]) => {
    if (should("error")) console.error(`[error] ${msg}`, ...fmtArgs(args));
  },
  warn: (msg: string, ...args: unknown[]) => {
    if (should("warn")) console.warn(`[warn] ${msg}`, ...fmtArgs(args));
  },
  info: (msg: string, ...args: unknown[]) => {
    if (should("info")) console.info(`[info] ${msg}`, ...fmtArgs(args));
  },
  debug: (msg: string, ...args: unknown[]) => {
    if (should("debug")) console.debug(`[debug] ${msg}`, ...fmtArgs(args));
  },
  child: (_meta: Record<string, unknown>) => logger,
};

export default logger;
