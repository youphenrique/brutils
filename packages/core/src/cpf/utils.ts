import type { CpfErrorCode } from "./types";

export class CpfError extends Error {
  readonly code: CpfErrorCode;

  constructor(code: CpfErrorCode, message?: string) {
    super(message ?? code);
    this.name = "CpfError";
    this.code = code;
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

export function preNormalize(cpf: string): string {
  const rawPattern = /^\d{11}$/;
  const maskedPattern = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;

  if (rawPattern.test(cpf)) {
    return cpf;
  }

  if (maskedPattern.test(cpf)) {
    return cpf.replace(/\D/g, "");
  }

  throw new CpfError("INVALID_FORMAT", "Only 11 digits or ###.###.###-## format are accepted.");
}

/**
 * Core validator — always throws CpfError on failure, never returns false.
 * Used internally by cpf.validate().
 */
export function assertValid(normalized: string): void {
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
