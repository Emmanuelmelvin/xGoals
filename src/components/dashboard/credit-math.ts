// Credit math shared by the browser preview and the server fulfilment path.
// Money is always handled as integer cents or exact decimal strings — never floats.

export const DEFAULT_CREDITS_PER_USD = 20;
export const DEFAULT_MIN_USD_CENTS = 500;
export const DEFAULT_MAX_USD_CENTS = 50000;

/** Smallest charge step in cents. 5¢ = exactly 1 credit at 20 credits/$. */
export const NICKEL_CENTS = 5;

function readEnv(name: string): string | undefined {
  try {
    const metaEnv = (import.meta as unknown as { env?: Record<string, string | undefined> } | undefined)?.env;
    if (metaEnv?.[name] !== undefined) return metaEnv[name];
  } catch {
    // Non-Vite runtime — fall through to process.env.
  }
  if (typeof process !== "undefined") return process.env?.[name];
  return undefined;
}

function readEnvInt(name: string, fallback: number): number {
  const raw = readEnv(name);
  const parsed = raw !== undefined ? Number(raw) : NaN;
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function readEnvUsdCents(name: string, fallback: number): number {
  const raw = readEnv(name);
  const parsed = raw !== undefined ? parseUsdToCents(raw) : null;
  return parsed ?? fallback;
}

export function isBachsTestMode(): boolean {
  return readEnv("VITE_BACHS_TEST_MODE") === "true";
}

export function getCreditConfig() {
  return {
    creditsPerUsd: readEnvInt("VITE_CREDITS_PER_USD", DEFAULT_CREDITS_PER_USD),
    minCents: readEnvUsdCents("VITE_CREDITS_MIN_USD", DEFAULT_MIN_USD_CENTS),
    maxCents: readEnvUsdCents("VITE_CREDITS_MAX_USD", DEFAULT_MAX_USD_CENTS),
  };
}

/** Strict decimal dollars ("29", "29.00", "29.5") → integer cents. Null when invalid. */
export function parseUsdToCents(value: string): number | null {
  const trimmed = value.trim().replace(/^\$/, "");
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  const [dollars, cents = ""] = trimmed.split(".");
  const total = Number(dollars) * 100 + Number(cents.padEnd(2, "0"));
  if (!Number.isSafeInteger(total) || total <= 0) return null;
  return total;
}

/** Snap cents to the nearest nickel so every charge maps to whole credits. */
export function quantizeCentsToNickel(cents: number): number {
  return Math.round(cents / NICKEL_CENTS) * NICKEL_CENTS;
}

export function formatCentsToUsd(cents: number): string {
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;
}

/** Display form: whole dollars render without decimals ("5", not "5.00"). */
export function formatCentsToDisplayUsd(cents: number): string {
  if (cents % 100 === 0) return String(cents / 100);
  return formatCentsToUsd(cents);
}

/** Exact whole credits for nickel-clean cents. Null when it would fractionalize. */
export function creditsForCents(cents: number, creditsPerUsd: number): number | null {
  if (!Number.isSafeInteger(cents) || cents <= 0) return null;
  const total = cents * creditsPerUsd;
  if (total % 100 !== 0) return null;
  return total / 100;
}

export function validatePurchaseCents(
  cents: number,
  config: { creditsPerUsd: number; minCents: number; maxCents: number },
): string | null {
  if (!Number.isSafeInteger(cents) || cents <= 0) return "Enter an amount in dollars.";
  if (cents < config.minCents) return `The minimum purchase is $${formatCentsToUsd(config.minCents)}.`;
  if (cents > config.maxCents) return `The maximum purchase is $${formatCentsToUsd(config.maxCents)}.`;
  if (creditsForCents(quantizeCentsToNickel(cents), config.creditsPerUsd) === null) {
    return "That amount can't map to whole credits.";
  }
  return null;
}
