import { LENGTH, BASE_LENGTH } from "./constants";
import type { CnpjErrorCode } from "./types";

// ─── Error class ─────────────────────────────────────────────────────────────

export class CnpjError extends Error {
  code: CnpjErrorCode;

  constructor(code: CnpjErrorCode, message?: string) {
    super(message ?? code);
    this.name = "CnpjError";
    this.code = code;
  }
}

export type SafeResult = { success: true; error: null } | { success: false; error: CnpjError };

// ─── Private helpers ─────────────────────────────────────────────────────────

/**
 * Converts a single character to its DV calculation value.
 * Uses the unified mapping: charCode - 48
 * '0'→0, '9'→9, 'A'→17, 'Z'→42
 */
function charToValue(c: string): number {
  return c.charCodeAt(0) - 48;
}

/**
 * Calculates a single check digit for a given input string.
 * Weights are assigned right-to-left, cycling 2–9 then resetting.
 */
function calcDV(input: string): number {
  const n = input.length;
  let sum = 0;

  for (let i = 0; i < n; i++) {
    const value = charToValue(input[i]);
    const weight = ((n - 1 - i) % 8) + 2;
    sum += value * weight;
  }

  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}

/**
 * Calculates both check digits for a 12-character base.
 * Returns a 2-character string (e.g. "35").
 */
export function calcCheckDigits(base12: string): string {
  const d1 = calcDV(base12);
  const d2 = calcDV(base12 + d1.toString());
  return d1.toString() + d2.toString();
}

/**
 * Strips allowed CNPJ punctuation (. / -) and uppercases.
 * Throws CnpjError("INVALID_FORMAT") if the raw input contains any
 * character that is not alphanumeric or standard CNPJ punctuation.
 */
export function cleanStrict(value: string): string {
  if (/[^A-Za-z0-9./-]/.test(value)) {
    throw new CnpjError(
      "INVALID_FORMAT",
      "Strict mode only accepts alphanumeric characters and standard CNPJ punctuation (. / -).",
    );
  }
  return value.replace(/[./-]/g, "").toUpperCase();
}

/**
 * Strips all non-alphanumeric characters and uppercases.
 * Never throws.
 */
export function clean(value: string): string {
  return value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

/**
 * Core validator — always throws CnpjError on failure, never returns false.
 * Used internally by both validate() and safeValidate().
 */
export function assertValid(cleaned: string): void {
  if (cleaned.length !== LENGTH) {
    throw new CnpjError(
      "INVALID_LENGTH",
      `CNPJ must be exactly ${LENGTH} characters after removing punctuation.`,
    );
  }

  // Reject all-same-character CNPJs (e.g. "00000000000000")
  if (/^(.)\1{13}$/.test(cleaned)) {
    throw new CnpjError("INVALID_CHECK_DIGITS", "CNPJ cannot consist of all identical characters.");
  }

  const base12 = cleaned.slice(0, BASE_LENGTH);
  const expectedDV = calcCheckDigits(base12);
  const actualDV = cleaned.slice(BASE_LENGTH);

  if (expectedDV !== actualDV) {
    throw new CnpjError("INVALID_CHECK_DIGITS", "Invalid CNPJ check digits.");
  }
}
