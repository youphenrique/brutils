import { assertOptions } from "../../common/assert.ts";
import { formatProgressive } from "../../common/format.ts";
import { CPF_FORMATTED_PATTERN, CPF_LENGTH, CPF_RAW_PATTERN } from "./constants";
import { CpfError, randomDigit, computeCheckDigit, assertValid, assertMaskOptions } from "./utils";
import type { CpfGenerateOptions, CpfMaskOptions, CpfValidationResult } from "./types";

/**
 * Extracts all ASCII digits from a CPF string without validating it.
 * This is lossy: malformed input can produce the same result as a valid CPF.
 *
 * @param value - The CPF string to normalize. Can be formatted, unformatted, or mixed.
 * @returns All extracted digits, including those from partial or overlong input.
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
 * Masks a complete CPF for display. By default, reveals only the last 2 digits.
 * Accepts exactly 11 ASCII digits or the canonical formatted shape without checking the checksum.
 * This is display masking, not anonymization.
 *
 * @param value - A raw or canonically formatted CPF string.
 * @param options - Optional visibility `mode` (`"suffix"`, `"prefix-suffix"`, or `"redacted"`) and
 *   mask `char`. `char` must be exactly one visible Unicode code point (checked by code point, not
 *   grapheme) other than a number, whitespace, mark, control/format character, `.`, or `-`.
 * @returns The masked CPF, or `null` for malformed strings. Handle `null` with a neutral placeholder, never the original value.
 * @throws {TypeError} If the value, options, mode, or character is invalid.
 *
 * @example
 * ```TypeScript
 * mask("52263944621"); // "***.***.***-21"
 * mask("522.639.446-21"); // "***.***.***-21"
 * mask("52263944621", { mode: "prefix-suffix" }); // "522.***.***-21"
 * mask("52263944621", { mode: "redacted", char: "#" }); // "###.###.###-##"
 * mask("5226"); // null
 * ```
 */
export function mask(value: string, options: CpfMaskOptions = {}): string | null {
  if (typeof value !== "string") {
    throw new TypeError(
      `Expected a string for CPF mask, but received ${value === null ? "null" : typeof value}`,
    );
  }

  assertOptions(options);

  const { char = "*", mode = "suffix" } = options;

  assertMaskOptions(mode, char);

  const isRaw = value.length === CPF_LENGTH && CPF_RAW_PATTERN.test(value);
  const isFormatted = value.length === CPF_LENGTH + 3 && CPF_FORMATTED_PATTERN.test(value);

  if (!isRaw && !isFormatted) {
    return null;
  }

  const hiddenGroup = char.repeat(3);
  const prefix = mode === "prefix-suffix" ? value.slice(0, 3) : hiddenGroup;
  const suffix = mode === "redacted" ? char.repeat(2) : value.slice(-2);

  return `${prefix}.${hiddenGroup}.${hiddenGroup}-${suffix}`;
}

/**
 * Formats exactly 11 ASCII digits as `XXX.XXX.XXX-XX`.
 * All other strings, including canonical formatted input, return unchanged.
 * Formatting does not check CPF validity or add digits.
 *
 * @param value - CPF string to format.
 * @returns The formatted CPF or the original string.
 * @throws {TypeError} If the provided value is not a string.
 *
 * @example
 * ```TypeScript
 * format("52263944621"); // "522.639.446-21"
 * format("522.639.446-21"); // "522.639.446-21"
 * format("123"); // "123"
 * ```
 */
export function format(value: string): string {
  if (typeof value !== "string") {
    throw new TypeError(
      `Expected a string for CPF format, but received ${value === null ? "null" : typeof value}`,
    );
  }

  return value.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
}

/**
 * Displays an editable CPF field using the pattern `XXX.XXX.XXX-XX`.
 * Keeps only ASCII digits, takes the first 11, and inserts each separator only
 * when the following segment has a digit. Empty and partial strings are accepted.
 * This is lossy UI behavior, not parsing or validation: validate the original
 * submitted value, not this output. No checksum check occurs.
 *
 * @param value - The current input-field string.
 * @returns The progressively formatted display string.
 * @throws {TypeError} If the provided value is not a string.
 *
 * @example
 * ```TypeScript
 * formatAsYouType("5226"); // "522.6"
 * formatAsYouType("5226394462"); // "522.639.446-2"
 * formatAsYouType("52263944621"); // "522.639.446-21"
 * formatAsYouType("522.639.446-21"); // "522.639.446-21"
 * formatAsYouType("abc522639446219"); // "522.639.446-21" (lossy)
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
 * Generates a random CPF with valid check digits for test fixtures.
 * Generated values can coincide with real assigned CPFs. Uses Math.random,
 * which is not cryptographically secure; do not use as an identity or secret.
 * Region control is not supported.
 *
 * @param options - Optional generation options:
 * - `formatted`: A boolean; if `true`, returns `XXX.XXX.XXX-XX`.
 * @returns An 11-digit CPF string, with punctuation when requested.
 * @throws {TypeError} If options are invalid, formatted is not a boolean.
 *
 * @example
 * ```TypeScript
 * generate(); // "12345678909"
 * generate({ formatted: true }); // "123.456.789-09"
 * ```
 */
export function generate(options: CpfGenerateOptions = {}): string {
  assertOptions(options);

  const { formatted = false } = options;

  if (typeof formatted !== "boolean") {
    throw new TypeError("Expected CPF generate formatted to be a boolean.");
  }

  const baseDigits = Array.from({ length: 9 }, randomDigit);

  if (baseDigits.every((digit) => digit === baseDigits[0])) {
    const rerollIndex = Math.floor(Math.random() * baseDigits.length);

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
 * Validates exactly 11 ASCII digits or the canonical `###.###.###-##` format.
 * Other strings return `INVALID_FORMAT`; well-shaped values are checked for
 * repeated digits and checksum errors.
 * This does not prove issuance or check Receita Federal cadastral status.
 *
 * @param value - CPF value to validate.
 * @returns `{ success: true, error: null }` if valid; `{ success: false, error: CpfError }` if invalid.
 * Non-string values return `INVALID_TYPE`. Unexpected internal exceptions are rethrown.
 *
 * @example
 * ```TypeScript
 * validate("522.639.446-21"); // { success: true, error: null }
 * validate("52263944621"); // { success: true, error: null }
 * validate("123"); // { success: false, error: CpfError ("INVALID_FORMAT") }
 * validate("688#639!!!!!!446...21"); // { success: false, error: CpfError (INVALID_FORMAT) }
 * ```
 */
export function validate(value: unknown): CpfValidationResult {
  if (typeof value !== "string") {
    return {
      success: false,
      error: new CpfError("INVALID_TYPE", "Expected a string for CPF validation."),
    };
  }

  try {
    assertValid(value);

    return { success: true, error: null };
  } catch (error) {
    if (error instanceof CpfError) {
      return { success: false, error };
    }

    throw error;
  }
}
