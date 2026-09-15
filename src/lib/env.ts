/**
 * Re-export central env validation for `src/lib/*` imports.
 * Primary definition lives in `src/env.ts`.
 */
export { env, serverEnv, clientEnv } from "../env";
export type { Env } from "../env";
