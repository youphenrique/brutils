import { assertOptions } from "../_shared/assert-options";
import { LENGTH, STATES_REGION_MAP } from "./constants";
import { CpfError, randomDigit, computeCheckDigit, preNormalize, assertValid } from "./utils";
import type {
  CpfFormatOptions,
  CpfGenerateOptions,
  CpfValidateOptions,
  CpfValidateResult,
} from "./types";

/**
 * Normalizes a CPF string by stripping any non-digit characters.
 * It returns the canonical raw form of the CPF (digits only).
 *
 * @param value - The CPF string to normalize. Can be formatted, unformatted, or mixed.
 * @returns A digits-only string representing the normalized CPF.
 * @throws {TypeError} If the provided value is not a string.
 *
 * @example
 * ```TypeScript
 * normalize("779.333.210-54"); // "77933321054"
 * ```
 */
export function normalize(value: string): string {
  if (typeof value !== "string") {
    throw new TypeError(
      `Expected a string for CPF normalization, but received ${value === null ? "null" : typeof value}`,
    );
  }
  return value.replace(/\D/g, "");
}

/**
 * Masks a CPF string, keeping the first 3 and last 2 digits visible.
 * Digits 4-9 are replaced with asterisks (*), and standard separators are preserved.
 *
 * @param value - The CPF string to mask. Can be normalized or formatted.
 * @returns The masked CPF string.
 * @throws {TypeError} If the provided value is not a string.
 *
 * @example
 * ```TypeScript
 * mask("52263944621"); // "522.***.***-21"
 * mask("522.639.446-21"); // "522.***.***-21"
 * ```
 */
export function mask(value: string): string {
  const normalized = normalize(value).slice(0, LENGTH);

  if (normalized.length === 0) {
    return "";
  }

  const part1 = normalized.slice(0, 3);
  const part2 = normalized.slice(3, 6);
  const part3 = normalized.slice(6, 9);
  const part4 = normalized.slice(9, 11);

  const maskedPart2 = part2 ? "*".repeat(part2.length) : "";
  const maskedPart3 = part3 ? "*".repeat(part3.length) : "";

  const masked = [part1, maskedPart2, maskedPart3].filter(Boolean).join(".");

  return part4.length > 0 ? `${masked}-${part4}` : masked;
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
export function format(value: string, options: CpfFormatOptions = {}): string {
  if (typeof value !== "string") {
    throw new TypeError(
      `Expected a string for CPF format, but received ${value === null ? "null" : typeof value}`,
    );
  }

  assertOptions(options);

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

/**
 * Generates a random, valid CPF.
 *
 * By default, it returns an unformatted 11-digit string. When `state` is
 * provided, the 9th digit (index 8) is forced to the corresponding regional
 * digit according to `STATES_REGION_MAP\`.
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
export function generate(options: CpfGenerateOptions = {}): string {
  assertOptions(options);

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
 * Never throws for validation errors — always returns a result object.
 *
 * @param value - CPF value to validate.
 * @param options - Optional validation options.
 * @returns `{ success: true, error: null }` if valid; `{ success: false, error: CpfError }` if invalid.
 * @throws {TypeError} If the provided value is not a string or options is not a plain object.
 *
 * @example
 * ```TypeScript
 * validate("522.639.446-21"); // { success: true, error: null }
 * validate("52263944621"); // { success: true, error: null }
 * validate("123"); // { success: true, error: CpfError ("INVALID_LENGTH") }
 * validate("688#639!!!!!!446...21", { strict: true }); // { success: false, error: CpfError (INVALID_FORMAT) }
 * ```
 */
export function validate(value: string, options: CpfValidateOptions = {}): CpfValidateResult {
  if (typeof value !== "string") {
    throw new TypeError(
      `Expected a string for CPF validate, but received ${value === null ? "null" : typeof value}`,
    );
  }

  assertOptions(options);

  try {
    const normalized = preNormalize(value, options.strict ?? false);

    assertValid(normalized);

    return { success: true, error: null };
  } catch (error) {
    if (error instanceof CpfError) {
      return { success: false, error };
    }

    return {
      success: false,
      error: new CpfError("UNKNOWN_ERROR", "Unexpected CPF validation error."),
    };
  }
}
