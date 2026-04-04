import { CNPJ_BASE_LENGTH, CNPJ_FORMATTED_PATTERN, CNPJ_RAW_PATTERN } from "./constants";
import type { CnpjErrorCode } from "./types";

// ─── Error class ─────────────────────────────────────────────────────────────

export class CnpjError extends Error {
  constructor(
    readonly code: CnpjErrorCode,
    message?: string,
  ) {
    super(message ?? code);
    this.name = "CnpjError";
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
 * Core validator — always throws CnpjError on failure, never returns.
 * Used internally by cnpj.validate().
 */
export function assertValid(value: string): void {
  if (!CNPJ_RAW_PATTERN.test(value) && !CNPJ_FORMATTED_PATTERN.test(value)) {
    throw new CnpjError(
      "INVALID_FORMAT",
      "Only 12 alphanumeric chars plus 2 digits or ##.###.###/####-## format are accepted.",
    );
  }

  const normalized = value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();

  // Reject all-same-character CNPJs (e.g. "00000000000000")
  if (/^(.)\1{13}$/.test(normalized)) {
    throw new CnpjError("REPEATED_DIGITS", "CNPJ cannot consist of all identical characters.");
  }

  const base12 = normalized.slice(0, CNPJ_BASE_LENGTH);
  const expectedDV = calcCheckDigits(base12);
  const actualDV = normalized.slice(CNPJ_BASE_LENGTH);

  if (expectedDV !== actualDV) {
    throw new CnpjError("INVALID_CHECKSUM", "Invalid CNPJ check digits.");
  }
}
