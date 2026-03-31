import { assertOptions } from "../_shared/assert-options";
import { LENGTH } from "./constants";
import { CnpjError, calcCheckDigits, clean, cleanStrict, assertValid } from "./utils";
import type { SafeResult } from "./utils";
import type { FormatOptions, GenerateOptions, ValidateOptions } from "./types";

// Re-export for public surface
export { CnpjError };
export type { SafeResult };

// Alphanumeric characters valid in CNPJ base (A-Z, 0-9)
const ALPHANUMERIC_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const DIGIT_CHARS = "0123456789";

function randomFrom(chars: string): string {
  return chars[Math.floor(Math.random() * chars.length)];
}

/**
 * Normalizes a CNPJ string by stripping all non-alphanumeric characters
 * and uppercasing. Does not validate.
 *
 * @param value - The CNPJ string to normalize.
 * @returns The normalized CNPJ string (alphanumeric only, uppercase).
 * @throws {TypeError} If the provided value is not a string.
 *
 * @example
 * ```TypeScript
 * normalize("73.450.392/0001-64"); // "73450392000164"
 * normalize("12.ABC.345/01DE-35"); // "12ABC34501DE35"
 * ```
 */
export function normalize(value: string): string {
  if (typeof value !== "string") {
    throw new TypeError(
      `Expected a string for CNPJ normalization, but received ${value === null ? "null" : typeof value}`,
    );
  }
  return clean(value);
}

/**
 * Formats a CNPJ string into the standard mask (`XX.XXX.XXX/XXXX-XX`).
 * Non-alphanumeric characters are removed before formatting.
 *
 * If the cleaned length is not 14 (after optional padding), the original
 * value is returned unchanged.
 *
 * @param value - CNPJ value in any form.
 * @param options - Optional formatting options. Set `pad` to `true` to
 *   left-pad with zeros up to 14 characters.
 * @returns The formatted CNPJ string or the original value if the length
 *   is not valid.
 *
 * @example
 * ```TypeScript
 * format("73450392000164"); // "73.450.392/0001-64"
 * format("73450", { pad: true }); // "00.000.000/0734-50"
 * format("12ABC34501DE35"); // "12.ABC.345/01DE-35"
 * ```
 */
export function format(value: string, options: FormatOptions = {}): string {
  if (typeof value !== "string") {
    throw new TypeError(
      `Expected a string for CNPJ format, but received ${value === null ? "null" : typeof value}`,
    );
  }

  assertOptions(options);

  const cleaned = clean(value);
  const normalized = options.pad ? cleaned.padStart(LENGTH, "0") : cleaned;

  if (normalized.length !== LENGTH) {
    return value;
  }

  const p1 = normalized.slice(0, 2);
  const p2 = normalized.slice(2, 5);
  const p3 = normalized.slice(5, 8);
  const p4 = normalized.slice(8, 12);
  const p5 = normalized.slice(12, 14);

  return `${p1}.${p2}.${p3}/${p4}-${p5}`;
}

/**
 * Generates a random, structurally valid CNPJ with correct check digits.
 *
 * @param options - Optional generation options:
 *   - `alphanumeric`: If `true`, the first 8 base characters may include
 *     uppercase letters; positions 9–12 are always digits.
 *   - `formatted`: If `true`, returns CNPJ in `XX.XXX.XXX/XXXX-XX` format.
 * @returns A valid CNPJ string.
 *
 * @example
 * ```TypeScript
 * generate(); // "73450392000164"
 * generate({ formatted: true }); // "73.450.392/0001-64"
 * generate({ alphanumeric: true }); // "12ABC34501DE35"
 * ```
 */
export function generate(options: GenerateOptions = {}): string {
  assertOptions(options);

  const { formatted = false, alphanumeric = false } = options;
  const charset = alphanumeric ? ALPHANUMERIC_CHARS : DIGIT_CHARS;

  // Build the first 8 characters (may include letters if alphanumeric)
  const chars: string[] = Array.from({ length: 8 }, () => randomFrom(charset));

  // Positions 9–12 are always digits (branch segment)
  for (let i = 0; i < 4; i++) {
    chars.push(randomFrom(DIGIT_CHARS));
  }

  // Guard: prevent all-same-character base
  if (chars.every((c) => c === chars[0])) {
    const firstChar = chars[0];
    let replacement = randomFrom(charset);
    while (replacement === firstChar) {
      replacement = randomFrom(charset);
    }
    chars[0] = replacement;
  }

  const base12 = chars.join("");
  const checkDigits = calcCheckDigits(base12);
  const result = base12 + checkDigits;

  return formatted ? format(result) : result;
}

/**
 * Validates a CNPJ string.
 *
 * Checks for:
 * - Valid characters (alphanumeric + allowed punctuation)
 * - Length (exactly 14 characters after stripping punctuation)
 * - All-same-character rejection
 * - Correct check digits
 *
 * In strict mode, throws `CnpjError` with the appropriate code instead of
 * returning `false`. Additionally, rejects any character that is not
 * alphanumeric or standard CNPJ punctuation (`. / -`).
 *
 * @param value - CNPJ value to validate.
 * @param options - Optional validation options.
 * @returns `true` if valid; `false` if invalid (non-strict mode).
 * @throws {CnpjError} On invalid input in strict mode.
 * @throws {TypeError} If `value` is not a string.
 *
 * @example
 * ```TypeScript
 * validate("73.450.392/0001-64"); // true
 * validate("00000000000000"); // false
 * validate("73$450392000164", { strict: true }); // throws CnpjError("INVALID_FORMAT")
 * ```
 */
export function validate(value: string, options: ValidateOptions = {}): boolean {
  if (typeof value !== "string") {
    throw new TypeError(
      `Expected a string for CNPJ validate, but received ${value === null ? "null" : typeof value}`,
    );
  }

  assertOptions(options);

  const strict = options.strict ?? false;

  try {
    const cleaned = strict ? cleanStrict(value) : clean(value);
    assertValid(cleaned);
    return true;
  } catch (error) {
    if (error instanceof CnpjError) {
      if (strict) {
        throw error;
      }
      return false;
    }
    throw error;
  }
}

/**
 * Validates a CNPJ string without throwing errors.
 *
 * Returns a result object indicating success or failure. Useful when
 * throwing exceptions is undesirable.
 *
 * @param value - CNPJ value to validate.
 * @returns `{ success: true, error: null }` if valid;
 *   `{ success: false, error: CnpjError }` if invalid.
 * @throws {TypeError} If `value` is not a string.
 *
 * @example
 * ```TypeScript
 * safeValidate("12.ABC.345/01DE-35"); // { success: true, error: null }
 *
 * const result = safeValidate("12ABC34501DE99");
 * if (!result.success) {
 *   console.error(result.error.code); // "INVALID_CHECK_DIGITS"
 * }
 * ```
 */
export function safeValidate(value: string): SafeResult {
  if (typeof value !== "string") {
    throw new TypeError(
      `Expected a string for CNPJ safeValidate, but received ${value === null ? "null" : typeof value}`,
    );
  }

  try {
    const cleaned = clean(value);
    assertValid(cleaned);
    return { success: true, error: null };
  } catch (error) {
    if (error instanceof CnpjError) {
      return { success: false, error };
    }
    throw error;
  }
}
