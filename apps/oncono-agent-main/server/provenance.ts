/**
 * Per-field provenance helpers.
 *
 * This is the single set. `telemetry.ts` originally defined its own copies
 * (`measured`/`derived`/`configured`/`unmeasured`) as module-local constants, and
 * `survival-engine.ts` needed the same set — which is exactly how a second
 * provenance system gets invented. They all live here now, typed to the shared
 * `Evidenced<T>` in `src/types/telemetry.ts`.
 *
 * The rule this exists to enforce: **no value in this codebase may be presented
 * to a human as a measurement unless something actually measured it.** A field
 * that cannot be measured is either `configured` (a stated assumption about the
 * environment), `unmeasured` (no value can be produced — render a gap), or
 * `synthetic` (a stored/invented constant occupying a field — also render a gap).
 */
import { Evidenced } from '../src/types/telemetry';

/** Computed from observations in this process. No reason needed. */
export const measured = <T>(value: T): Evidenced<T> => ({ value, evidence: 'measured' });

/** Computed from measured values by a documented formula. Reason is optional. */
export const derived = <T>(value: T, reason?: string): Evidenced<T> => ({
  value,
  evidence: 'derived',
  reason,
});

/** A stated assumption about the environment, not an observation. */
export const configured = <T>(value: T, reason?: string): Evidenced<T> => ({
  value,
  evidence: 'configured',
  reason,
});

/** No value can be produced here. `value` is null so a UI cannot render a number. */
export const unmeasured = <T>(reason: string): Evidenced<T> => ({
  value: null,
  evidence: 'unmeasured',
  reason,
});

/**
 * A stored or invented constant with no measurement behind it. Kept distinct from
 * `configured` because it describes nothing about the environment — it only
 * occupies a field. A reason is required: the caller must say why.
 */
export const synthetic = <T>(value: T, reason: string): Evidenced<T> => ({
  value,
  evidence: 'synthetic',
  reason,
});

// `isComputed` and `evidenceLabel` live with the type they operate on, in
// `src/types/telemetry.ts`, so the server and the UI share one implementation
// rather than each deriving its own idea of what a label means.

