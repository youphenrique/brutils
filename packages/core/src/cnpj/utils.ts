import { BASE_LENGTH } from "./constants";
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
 * Strips all non-alphanumeric characters and uppercases if the input is masked,
 * or returns the raw input if it's already in the raw format.
 *
 * Only two input formats are accepted:
 * - Raw: exactly 12 alphanumeric characters followed by 2 digits (e.g., `"73450392000164"`).
 * - Masked: standard CNPJ punctuation (`XX.XXX.XXX/XXXX-XX`) where the last
 *   two characters must be digits (e.g., `"73.450.392/0001-64"`).
 *
 * Any other format throws `CnpjError("INVALID_FORMAT")`.
 */
export function preNormalize(value: string): string {
  const rawPattern = /^[A-Za-z0-9]{12}[0-9]{2}$/;
  const maskedPattern = /^[A-Za-z0-9]{2}\.[A-Za-z0-9]{3}\.[A-Za-z0-9]{3}\/[A-Za-z0-9]{4}-[0-9]{2}$/;

  if (rawPattern.test(value)) {
    return value.toUpperCase();
  }

  if (maskedPattern.test(value)) {
    return value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  }

  throw new CnpjError(
    "INVALID_FORMAT",
    "Only 12 alphanumeric chars plus 2 digits or ##.###.###/####-## format are accepted.",
  );
}

/**
 * Core validator — always throws CnpjError on failure, never returns false.
 * Used internally by cnpj.validate().
 */
export function assertValid(normalized: string): void {
  // Reject all-same-character CNPJs (e.g. "00000000000000")
  if (/^(.)\1{13}$/.test(normalized)) {
    throw new CnpjError("REPEATED_DIGITS", "CNPJ cannot consist of all identical characters.");
  }

  const base12 = normalized.slice(0, BASE_LENGTH);
  const expectedDV = calcCheckDigits(base12);
  const actualDV = normalized.slice(BASE_LENGTH);

  if (expectedDV !== actualDV) {
    throw new CnpjError("INVALID_CHECKSUM", "Invalid CNPJ check digits.");
  }
}
