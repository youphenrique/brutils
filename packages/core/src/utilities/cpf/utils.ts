import type { CpfErrorCode } from "./types";
import { CPF_FORMATTED_PATTERN, CPF_RAW_PATTERN } from "./constants";

export class CpfError extends Error {
  constructor(
    readonly code: CpfErrorCode,
    message?: string,
  ) {
    super(message ?? code);
    this.name = "CpfError";
  }
}

export function randomDigit(): number {
  return Math.floor(Math.random() * 10);
}

export function computeCheckDigit(digits: number[], weightStart: number): number {
  const sum = digits.reduce((acc, digit, index) => acc + digit * (weightStart - index), 0);
  const remainder = sum % 11;

  return remainder < 2 ? 0 : 11 - remainder;
}

export function calculateCheckDigit(digits: string, weights: number[]): number {
  const sum = weights.reduce((acc, weight, index) => {
    return acc + Number(digits[index]) * weight;
  }, 0);

  const remainder = sum % 11;

  return remainder < 2 ? 0 : 11 - remainder;
}

/**
 * Core validator — always throws CpfError on failure, never returns false.
 * Used internally by cpf.validate().
 */
export function assertValid(value: string): void {
  if (!CPF_RAW_PATTERN.test(value) && !CPF_FORMATTED_PATTERN.test(value)) {
    throw new CpfError("INVALID_FORMAT", "Only 11 digits or ###.###.###-## format are accepted.");
  }

  const normalized = value.replace(/[^0-9]/g, "");

  if (/^(\d)\1{10}$/.test(normalized)) {
    throw new CpfError("REPEATED_DIGITS", "CPF cannot contain all identical digits.");
  }

  const firstCheckDigit = calculateCheckDigit(normalized, [10, 9, 8, 7, 6, 5, 4, 3, 2]);
  if (firstCheckDigit !== Number(normalized[9])) {
    throw new CpfError("INVALID_CHECKSUM", "Invalid CPF check digits.");
  }

  const secondCheckDigit = calculateCheckDigit(normalized, [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);
  if (secondCheckDigit !== Number(normalized[10])) {
    throw new CpfError("INVALID_CHECKSUM", "Invalid CPF check digits.");
  }
}
