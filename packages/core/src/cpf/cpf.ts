import { assertOptions } from "../_shared/assert-options";
import { formatProgressive } from "../_shared/progressive-format";
import { CPF_LENGTH, CPF_RAW_PATTERN, UFS_REGION_MAP } from "./constants";
import { CpfError, randomDigit, computeCheckDigit, assertValid } from "./utils";
import type { CpfFormatOptions, CpfGenerateOptions, CpfValidateResult } from "./types";

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
 * normalize("779.333.21"); // "77933321"
 * normalize("779.333.210-54"); // "77933321054"
 * normalize("779.333.210-5466"); // "7793332105466"
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
  const normalized = normalize(value).slice(0, CPF_LENGTH);

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
 * Formats a CPF string into the standard Brazilian formatting (`XXX.XXX.XXX-XX`).
 * CPF value (invalid, badly formatted, or not) returns as is.
 *
 * @param value - CPF value in any form (formatted, unformatted, or mixed).
 * @param options - Optional formatting options. Set `pad` to `true` to left-pad with zeros up to 11 digits.
 * @returns The CPF string with formatting applied.
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

  const baseValue = options.pad ? value.padStart(CPF_LENGTH, "0") : value;

  if (!CPF_RAW_PATTERN.test(baseValue)) {
    return value;
  }

  return baseValue.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
}

/**
 * Progressively formats a CPF while typing using the pattern `XXX.XXX.XXX-XX`.
 *
 * @param value - CPF value in any form (formatted, unformatted, or mixed).
 * @returns A progressively formatted CPF string.
 * @throws {TypeError} If the provided value is not a string.
 *
 * @example
 * ```TypeScript
 * formatAsYouType("5226"); // "522.6"
 * formatAsYouType("52263944621"); // "522.639.446-21"
 * formatAsYouType("522.639.446-21"); // "522.639.446-21"
 * ```
 */
export function formatAsYouType(value: string): string {
  if (typeof value !== "string") {
    throw new TypeError(
      `Expected a string for CPF formatAsYouType, but received ${value === null ? "null" : typeof value}`,
    );
  }

  const digits = normalize(value).slice(0, CPF_LENGTH);

  return formatProgressive(digits, [3, 3, 3, 2], [".", ".", "-"]);
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

  const { uf, formatted = false } = options;

  const baseDigits = Array.from({ length: 8 }, randomDigit);
  baseDigits.push(uf !== undefined ? UFS_REGION_MAP[uf] : randomDigit());

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
 * @param value - CPF value to validate.
 * @returns `{ success: true, error: null }` if valid; `{ success: false, error: CpfError }` if invalid.
 * @throws {TypeError} If the provided value is not a string.
 *
 * @example
 * ```TypeScript
 * validate("522.639.446-21"); // { success: true, error: null }
 * validate("52263944621"); // { success: true, error: null }
 * validate("123"); // { success: false, error: CpfError ("INVALID_FORMAT") }
 * validate("688#639!!!!!!446...21"); // { success: false, error: CpfError (INVALID_FORMAT) }
 * ```
 */
export function validate(value: string): CpfValidateResult {
  if (typeof value !== "string") {
    throw new TypeError(
      `Expected a string for CPF validate, but received ${value === null ? "null" : typeof value}`,
    );
  }

  try {
    assertValid(value);

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
