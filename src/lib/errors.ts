/**
 * Central error class — use instead of bare `Error`.
 * Gives every throw a `code` + `statusCode` so logging and
 * API responses can distinguish operational vs programmer errors.
 *
 * Usage:
 *   import { AppError } from "./errors";
 *   throw new AppError("Missing Supabase server env", { code: "CONFIG_MISSING", statusCode: 500 });
 *   throw new AppError("Invalid env", { code: "ENV_VALIDATION", statusCode: 500, cause: zodError });
 */

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    opts: { code?: string; statusCode?: number; cause?: unknown; isOperational?: boolean } = {},
  ) {
    super(message, opts.cause !== undefined ? { cause: opts.cause } : undefined);
    this.name = "AppError";
    this.code = opts.code ?? "INTERNAL_ERROR";
    this.statusCode = opts.statusCode ?? 500;
    this.isOperational = opts.isOperational ?? true;

    // Keep proper stack trace (V8)
    if (Error.captureStackTrace) Error.captureStackTrace(this, AppError);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
    };
  }
}

/** Shorthand for env validation failures — always 500, not retryable. */
export class EnvValidationError extends AppError {
  constructor(message: string, opts: { cause?: unknown } = {}) {
    super(message, { code: "ENV_VALIDATION", statusCode: 500, cause: opts.cause, isOperational: false });
    this.name = "EnvValidationError";
  }
}

/** Missing required config (supabase, bachs, etc.) */
export class ConfigError extends AppError {
  constructor(message: string, opts: { cause?: unknown } = {}) {
    super(message, { code: "CONFIG_MISSING", statusCode: 500, cause: opts.cause, isOperational: false });
    this.name = "ConfigError";
  }
}

/** React context used outside provider — programmer error */
export class ContextError extends AppError {
  constructor(message: string) {
    super(message, { code: "CONTEXT_ERROR", statusCode: 500, isOperational: false });
    this.name = "ContextError";
  }
}
