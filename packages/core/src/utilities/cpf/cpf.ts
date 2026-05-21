import { assertOptions } from "../../common/assert-options";
import { formatProgressive } from "../../common/progressive-format";
import { CPF_LENGTH, CPF_RAW_PATTERN, UFS_REGION_MAP } from "./constants";
import {
  CpfError,
  CpfMaskInputError,
  CpfMaskOptionsError,
  randomDigit,
  computeCheckDigit,
  assertValid,
} from "./utils";
import type {
  CpfFormatOptions,
  CpfGenerateOptions,
  CpfMaskOptions,
  CpfValidateResult,
} from "./types";

const CPF_MASK_CHAR_DEFAULT = "*";
const CPF_MASK_VISIBLE_PREFIX_DEFAULT = 3;
const CPF_MASK_VISIBLE_SUFFIX_DEFAULT = 2;

/** Strips the standard CPF separator characters (`.` and `-`) from a string. */
function stripSeparators(value: string): string {
  return value.replaceAll(".", "").replaceAll("-", "");
}

/**
 * Sanitizes and validates raw `mask()` input.
 * Accepts only characters that are digits, `.`, or `-`.
 * After stripping separators, the result must be exactly 11 digits.
 *
 * @throws {CpfMaskInputError} `INVALID_INPUT` if non-separator, non-digit chars are present.
 * @throws {CpfMaskInputError} `INVALID_LENGTH` if the sanitized string is not 11 digits long.
 */
function normalizeMaskInput(value: string): string {
  const stripped = stripSeparators(value);

  if (/\D/.test(stripped)) {
    throw new CpfMaskInputError(
      "INVALID_INPUT",
      "CPF input may only contain digits, dots (.), and dashes (-).",
    );
  }

  if (stripped.length !== CPF_LENGTH) {
    throw new CpfMaskInputError(
      "INVALID_LENGTH",
      `CPF input must contain exactly ${CPF_LENGTH} digits after stripping separators, got ${stripped.length}.`,
    );
  }

  return stripped;
}

/**
 * Validates the `CpfMaskOptions` object and returns fully-resolved option values.
 *
 * @throws {CpfMaskOptionsError} `INVALID_MASK_CHAR` – char is not a single grapheme.
 * @throws {CpfMaskOptionsError} `INVALID_VISIBLE_PREFIX_LENGTH` – prefix length is not a non-negative integer.
 * @throws {CpfMaskOptionsError} `INVALID_VISIBLE_SUFFIX_LENGTH` – suffix length is not a non-negative integer.
 * @throws {CpfMaskOptionsError} `VISIBLE_LENGTH_OVERFLOW` – prefix + suffix would expose all CPF digits.
 */
function assertMaskOptions(options: CpfMaskOptions): Required<CpfMaskOptions> {
  const {
    char = CPF_MASK_CHAR_DEFAULT,
    visiblePrefixLength = CPF_MASK_VISIBLE_PREFIX_DEFAULT,
    visibleSuffixLength = CPF_MASK_VISIBLE_SUFFIX_DEFAULT,
  } = options;

  // `[...char].length === 1` is the validation strategy for single graphemes.
  // eslint-disable-next-line no-misused-spread
  if (typeof char !== "string" || [...char].length !== 1) {
    throw new CpfMaskOptionsError(
      "INVALID_MASK_CHAR",
      "The `char` option must be a string representing exactly one Unicode grapheme.",
    );
  }

  if (!Number.isInteger(visiblePrefixLength) || visiblePrefixLength < 0) {
    throw new CpfMaskOptionsError(
      "INVALID_VISIBLE_PREFIX_LENGTH",
      "The `visiblePrefixLength` option must be a non-negative integer.",
    );
  }

  if (!Number.isInteger(visibleSuffixLength) || visibleSuffixLength < 0) {
    throw new CpfMaskOptionsError(
      "INVALID_VISIBLE_SUFFIX_LENGTH",
      "The `visibleSuffixLength` option must be a non-negative integer.",
    );
  }

  if (visiblePrefixLength + visibleSuffixLength >= CPF_LENGTH) {
    throw new CpfMaskOptionsError(
      "VISIBLE_LENGTH_OVERFLOW",
      `The sum of visiblePrefixLength (${visiblePrefixLength}) and visibleSuffixLength (${visibleSuffixLength}) must be less than ${CPF_LENGTH}.`,
    );
  }

  return { char, visiblePrefixLength, visibleSuffixLength };
}

/**
 * Replaces digit positions between the visible prefix and visible suffix with `char`.
 * Returns an array of 11 segments (each either a digit or the mask char) so that
 * multi-codepoint characters are handled correctly by the caller.
 */
function applyMask(
  digits: string,
  char: string,
  visiblePrefixLength: number,
  visibleSuffixLength: number,
): string[] {
  const suffixStart = CPF_LENGTH - visibleSuffixLength;

  return digits.split("").map((digit, i) => {
    if (i < visiblePrefixLength || i >= suffixStart) return digit;
    return char;
  });
}

/**
 * Inserts the canonical CPF separators between the 11 logical segments,
 * producing the `XXX.XXX.XXX-XX` output format.
 * Operates on an array so that multi-codepoint mask characters are handled correctly.
 */
function formatCpfDigits(segments: string[]): string {
  const [d0, d1, d2, d3, d4, d5, d6, d7, d8, d9, d10] = segments;
  return `${d0}${d1}${d2}.${d3}${d4}${d5}.${d6}${d7}${d8}-${d9}${d10}`;
}

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
 * Masks a CPF string in canonical format (`XXX.XXX.XXX-XX`), replacing a configurable
 * range of digit positions with a mask character while keeping leading and trailing
 * digits visible.
 *
 * Accepts both raw (`"29650899006"`) and pre-formatted (`"296.508.990-06"`) input.
 * Input may only contain digit characters (`0–9`), dots (`.`), and dashes (`-`).
 * After stripping separators, the result must be exactly 11 digits.
 *
 * @param value - CPF string to mask, raw or pre-formatted.
 * @param options - Masking options.
 * @param options.char - Replacement character for masked positions. Must be a single
 *   Unicode grapheme. Default: `"*"`.
 * @param options.visiblePrefixLength - Number of leading digits to leave unmasked.
 *   Default: `3`.
 * @param options.visibleSuffixLength - Number of trailing digits to leave unmasked.
 *   Default: `2`.
 * @returns Masked CPF string in `XXX.XXX.XXX-XX` format.
 *
 * @throws {TypeError} If `value` is not a string, or if `options` is not a plain object.
 * @throws {CpfMaskInputError} `INVALID_INPUT` if `value` contains characters other than
 *   digits, `.`, or `-`.
 * @throws {CpfMaskInputError} `INVALID_LENGTH` if the sanitized input is not 11 digits long.
 * @throws {CpfMaskOptionsError} `INVALID_MASK_CHAR` if `char` is not a single grapheme.
 * @throws {CpfMaskOptionsError} `INVALID_VISIBLE_PREFIX_LENGTH` if `visiblePrefixLength`
 *   is not a non-negative integer.
 * @throws {CpfMaskOptionsError} `INVALID_VISIBLE_SUFFIX_LENGTH` if `visibleSuffixLength`
 *   is not a non-negative integer.
 * @throws {CpfMaskOptionsError} `VISIBLE_LENGTH_OVERFLOW` if the sum of
 *   `visiblePrefixLength` and `visibleSuffixLength` is ≥ 11.
 *
 * @example
 * ```TypeScript
 * mask("29650899006");
 * // → "296.***.***-06"
 *
 * mask("29650899006", { visiblePrefixLength: 0, visibleSuffixLength: 0 });
 * // → "***.***.***-**"
 *
 * mask("29650899006", { char: "#", visiblePrefixLength: 3, visibleSuffixLength: 2 });
 * // → "296.###.###-06"
 * ```
 */
export function mask(value: string, options: CpfMaskOptions = {}): string {
  if (typeof value !== "string") {
    throw new TypeError(
      `Expected a string for CPF mask, but received ${value === null ? "null" : typeof value}`,
    );
  }

  assertOptions(options);

  const { char, visiblePrefixLength, visibleSuffixLength } = assertMaskOptions(options);
  const digits = normalizeMaskInput(value);
  const masked = applyMask(digits, char, visiblePrefixLength, visibleSuffixLength);

  return formatCpfDigits(masked);
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
