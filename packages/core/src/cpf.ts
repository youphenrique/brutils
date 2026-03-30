export const LENGTH = 11;

export const STATES_REGION_MAP = {
  DF: 1,
  GO: 1,
  MS: 1,
  MT: 1,
  TO: 1,
  AC: 2,
  AM: 2,
  AP: 2,
  PA: 2,
  RO: 2,
  RR: 2,
  CE: 3,
  MA: 3,
  PI: 3,
  AL: 4,
  PB: 4,
  PE: 4,
  RN: 4,
  BA: 5,
  SE: 5,
  MG: 6,
  ES: 7,
  RJ: 7,
  SP: 8,
  PR: 9,
  SC: 9,
  RS: 0,
} as const;

export type BrazilianState = keyof typeof STATES_REGION_MAP;

export type CpfErrorCode =
  | "INVALID_FORMAT"
  | "INVALID_LENGTH"
  | "REPEATED_DIGITS"
  | "INVALID_CHECKSUM";

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

export interface ValidateOptions {
  strict?: boolean;
}

export interface FormatOptions {
  pad?: boolean;
}

export interface GenerateOptions {
  state?: BrazilianState;
  formatted?: boolean;
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
  throw new CpfError(cpf, code, message);
}

function randomDigit(): number {
  return Math.floor(Math.random() * 10);
}

function computeCheckDigit(digits: number[], weightStart: number): number {
  const sum = digits.reduce((acc, digit, index) => acc + digit * (weightStart - index), 0);
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}

/**
 * Generates a random, valid CPF.
 *
 * By default, it returns an unformatted 11-digit string. When `state` is
 * provided, the 9th digit (index 8) is forced to the corresponding regional
 * digit according to `STATES_REGION_MAP`.
 *
 * Generation rules:
 * - Creates 8 random digits for indices `0..7`.
 * - Sets index `8` from state mapping or random digit.
 * - Applies an all-same-digit guard by re-rolling one digit in indices `0..7`.
 * - Computes both check digits using CPF checksum weights.
 *
 * @param options - Optional generation options:
 * - `state`: Brazilian state code used to force the CPF 9th digit region.
 * - `formatted`: If `true`, returns CPF masked as `###.###.###-##`.
 * @returns A valid CPF string, formatted or unformatted.
 *
 * @example
 * ```TypeScript
 * generate(); // "12345678909"
 * generate({ formatted: true }); // "123.456.789-09"
 * generate({ state: "SP" }); // 9th digit is always "8"
 * ```
 */
export function generate(options: GenerateOptions = {}): string {
  const { state, formatted = false } = options;

  const baseDigits = Array.from({ length: 8 }, randomDigit);
  baseDigits.push(state ? STATES_REGION_MAP[state] : randomDigit());

  if (baseDigits.every((digit) => digit === baseDigits[0])) {
    const rerollIndex = Math.floor(Math.random() * 8);

    let rerolled = randomDigit();
    while (rerolled === baseDigits[8]) {
      rerolled = randomDigit();
    }

    baseDigits[rerollIndex] = rerolled;
  }

  const firstCheckDigit = computeCheckDigit(baseDigits, 10);
  const withFirst = [...baseDigits, firstCheckDigit];
  const secondCheckDigit = computeCheckDigit(withFirst, 11);

  const generated = [...withFirst, secondCheckDigit].join("");

  return formatted ? format(generated) : generated;
}

function calculateCheckDigit(digits: string, weights: number[]): number {
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
 * @throws {CpfError} If the CPF is invalid (code: `INVALID_FORMAT`, `INVALID_LENGTH`, `REPEATED_DIGITS`, or `INVALID_CHECKSUM`).
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
): { success: boolean; error: CpfError | null } {
  try {
    validate(cpf, options);
    return { success: true, error: null };
  } catch (error) {
    if (error instanceof CpfError) {
      return { success: false, error };
    }

    return {
      success: false,
      error: invalid(cpf, "INVALID_CHECKSUM", "Unexpected CPF validation error."),
    };
  }
}
