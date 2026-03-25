export const LENGTH = 11;

export type CpfErrorCode =
  | "INVALID_FORMAT"
  | "INVALID_LENGTH"
  | "REPEATED_DIGITS"
  | "INVALID_CHECKSUM";

export class InvalidCpfError extends Error {
  constructor(
    public readonly cpf: string,
    public readonly code: CpfErrorCode,
    message?: string,
  ) {
    super(message ?? `Invalid CPF: "${cpf}" (${code})`);
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
 * format("123", { pad: true }); // "000.000.001-23"
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

function invalid(cpf: string, code: CpfErrorCode, message?: string): never {
  throw new InvalidCpfError(cpf, code, message);
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

    invalid(cpf, "INVALID_FORMAT", "Strict mode only accepts 11 digits or ###.###.###-## format.");
  }

  return cpf.replace(/\D/g, "");
}

/**
 * Validates a CPF string.
 *
 * It checks for:
 * - Length (exactly 11 digits).
 * - Repeated digits (e.g., "111.111.111-11").
 * - Checksum digits (first and second).
 *
 * If `strict` is `true`, it only accepts:
 * - Exactly 11 digits (unformatted).
 * - Standard mask `###.###.###-##` (formatted).
 *
 * @param cpf - CPF value to validate.
 * @param options - Optional validation options.
 * @returns `true` if the CPF is valid.
 * @throws {InvalidCpfError} If the CPF is invalid (code: `INVALID_FORMAT`, `INVALID_LENGTH`, `REPEATED_DIGITS`, or `INVALID_CHECKSUM`).
 *
 * @example
 * ```TypeScript
 * validate("522.639.446-21"); // true
 * validate("52263944621"); // true
 * validate("688#639!!!!!!446...21"); // true
 * validate("688#639!!!!!!446...21", { strict: true }); // Throws InvalidCpfError (INVALID_FORMAT)
 * ```
 */
export function validate(cpf: string, options: ValidateOptions = {}): boolean {
  const strict = options.strict ?? false;
  const normalized = normalizeForValidation(cpf, strict);

  if (normalized.length !== LENGTH) {
    invalid(cpf, "INVALID_LENGTH", "CPF must contain exactly 11 digits.");
  }

  if (/^(\d)\1{10}$/.test(normalized)) {
    invalid(cpf, "REPEATED_DIGITS", "CPF cannot contain all identical digits.");
  }

  const firstCheckDigit = calculateCheckDigit(normalized, [10, 9, 8, 7, 6, 5, 4, 3, 2]);
  if (firstCheckDigit !== Number(normalized[9])) {
    invalid(cpf, "INVALID_CHECKSUM", "Invalid CPF check digits.");
  }

  const secondCheckDigit = calculateCheckDigit(normalized, [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);
  if (secondCheckDigit !== Number(normalized[10])) {
    invalid(cpf, "INVALID_CHECKSUM", "Invalid CPF check digits.");
  }

  return true;
}

/**
 * Validates a CPF string without throwing errors.
 *
 * Instead of throwing, it returns a result object indicating success or failure.
 * Useful for scenarios where throwing exceptions is not desired.
 *
 * @param cpf - CPF value to validate.
 * @param options - Optional validation options.
 * @returns An object with `success: true, error: null` if valid, and `success: false, error: InvalidCpfError` if invalid.
 *
 * @example
 * ```TypeScript
 * safeValidate("522.639.446-21"); // { success: true, error: null }
 *
 * const result = safeValidate("123");
 * if (!result.success) {
 *   console.error(result.error.code); // "INVALID_LENGTH"
 * }
 * ```
 */
export function safeValidate(
  cpf: string,
  options: ValidateOptions = {},
): { success: boolean; error: InvalidCpfError | null } {
  try {
    validate(cpf, options);
    return { success: true, error: null };
  } catch (error) {
    if (error instanceof InvalidCpfError) {
      return { success: false, error };
    }

    return {
      success: false,
      error: invalid(cpf, "INVALID_CHECKSUM", "Unexpected CPF validation error."),
    };
  }
}
