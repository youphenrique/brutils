export const LENGTH = 11;

export class InvalidCpfError extends Error {
  constructor(
    public readonly cpf: string,
    message?: string,
  ) {
    super(message ?? `Invalid CPF: "${cpf}"`);
    this.name = "InvalidCpfError";
  }
}

export interface ValidateOptions {
  strict?: boolean;
}

export interface FormatOptions {
  pad?: boolean;
}

/**
 * Formats a CPF string into the standard Brazilian mask (`XXX.XXX.XXX-XX`).
 * Non-numeric characters are removed before formatting, and values longer than
 * 11 digits are truncated.
 *
 * @param value - CPF value in any form (formatted, unformatted, or mixed).
 * @param options - Optional formatting options. Set `pad` to `true` to left-pad with zeros up to 11 digits.
 * @returns The CPF string with progressive or full mask applied.
 *
 * @example
 * ```TypeScript
 * format("52263944621"); // "522.639.446-21"
 * ```
 */
export function format(value: string, options: FormatOptions = {}): string {
  const digits = value.replace(/\D/g, "").slice(0, LENGTH);
  const normalized = options.pad ? digits.padStart(LENGTH, "0") : digits;

  if (normalized.length === 0) {
    return "";
  }

  const part1 = normalized.slice(0, 3);
  const part2 = normalized.slice(3, 6);
  const part3 = normalized.slice(6, 9);
  const part4 = normalized.slice(9, 11);

  const masked = [part1, part2, part3].filter(Boolean).join(".");

  return part4.length > 0 ? `${masked}-${part4}` : masked;
}

function calculateCheckDigit(digits: string, weights: readonly number[]): number {
  const sum = weights.reduce((acc, weight, index) => {
    return acc + Number(digits[index]) * weight;
  }, 0);

  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}

function normalizeForValidation(cpf: string, strict: boolean): string {
  if (strict) {
    const rawPattern = /^\d{11}$/;
    const maskedPattern = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;

    if (rawPattern.test(cpf)) {
      return cpf;
    }

    if (maskedPattern.test(cpf)) {
      return cpf.replace(/\D/g, "");
    }

    throw new InvalidCpfError(cpf, "Strict mode only accepts 11 digits or ###.###.###-## format.");
  }

  return cpf.replace(/\D/g, "").padStart(LENGTH, "0");
}

export function validate(cpf: string, options: ValidateOptions = {}): boolean {
  const strict = options.strict ?? false;
  const normalized = normalizeForValidation(cpf, strict);

  if (normalized.length !== LENGTH) {
    throw new InvalidCpfError(cpf, "CPF must contain exactly 11 digits.");
  }

  if (/^(\d)\1{10}$/.test(normalized)) {
    throw new InvalidCpfError(cpf, "CPF cannot contain all identical digits.");
  }

  const firstCheckDigit = calculateCheckDigit(normalized, [10, 9, 8, 7, 6, 5, 4, 3, 2]);
  if (firstCheckDigit !== Number(normalized[9])) {
    throw new InvalidCpfError(cpf, "Invalid CPF first check digit.");
  }

  const secondCheckDigit = calculateCheckDigit(normalized, [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);
  if (secondCheckDigit !== Number(normalized[10])) {
    throw new InvalidCpfError(cpf, "Invalid CPF second check digit.");
  }

  return true;
}

export function safeValidate(
  cpf: string,
  options: ValidateOptions = {},
): { success: true } | { success: false; error: InvalidCpfError } {
  try {
    validate(cpf, options);
    return { success: true };
  } catch (error) {
    if (error instanceof InvalidCpfError) {
      return { success: false, error };
    }

    return {
      success: false,
      error: new InvalidCpfError(cpf, "Unexpected CPF validation error."),
    };
  }
}
