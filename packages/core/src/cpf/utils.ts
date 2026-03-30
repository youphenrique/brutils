import type { CpfErrorCode } from "./types";

export class CpfError extends Error {
  constructor(
    public readonly cpf: string,
    public readonly code: CpfErrorCode,
    message?: string,
  ) {
    super(message ?? `Invalid CPF: "${cpf}" (${code})`);
    this.name = "CpfError";
  }
}

export function invalid(cpf: string, code: CpfErrorCode, message?: string): never {
  throw new CpfError(cpf, code, message);
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

export function normalizeForValidation(cpf: string, strict: boolean): string {
  if (strict) {
    const rawPattern = /^\d{11}$/;
    const maskedPattern = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;

    if (rawPattern.test(cpf)) {
      return cpf;
    }

    if (maskedPattern.test(cpf)) {
      return cpf.replace(/\D/g, "");
    }

    invalid(cpf, "INVALID_FORMAT", "Strict mode only accepts 11 digits or ###.###.###-## format.");
  }

  return cpf.replace(/\D/g, "");
}
