import { assertOptions } from "../_shared/assert-options";
import { formatProgressive } from "../_shared/progressive-format";
import { ALPHANUMERIC_CHARS, DIGIT_CHARS, LENGTH } from "./constants";
import { assertValid, calcCheckDigits, preNormalize, CnpjError } from "./utils";
import type { CnpjFormatOptions, CnpjGenerateOptions, CnpjValidateResult } from "./types";

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

  return value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
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
export function format(value: string, options: CnpjFormatOptions = {}): string {
  if (typeof value !== "string") {
    throw new TypeError(
      `Expected a string for CNPJ format, but received ${value === null ? "null" : typeof value}`,
    );
  }

  assertOptions(options);

  const preNormalized = value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  const normalized = options.pad ? preNormalized.padStart(LENGTH, "0") : preNormalized;

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
 * Progressively formats a CNPJ while typing using the pattern `XX.XXX.XXX/XXXX-XX`.
 *
 * Supports alphanumeric characters through the first 12 positions. The final
 * two check-digit positions accept only numeric digits.
 *
 * @param value - CNPJ value in any form.
 * @returns A progressively formatted CNPJ string.
 * @throws {TypeError} If the provided value is not a string.
 *
 * @example
 * ```TypeScript
 * formatAsYouType("12ABC34501DE"); // "12.ABC.345/01DE"
 * formatAsYouType("12ABC34501DE35"); // "12.ABC.345/01DE-35"
 * formatAsYouType("12.ABC.345/01DE-35"); // "12.ABC.345/01DE-35"
 * ```
 */
export function formatAsYouType(value: string): string {
  if (typeof value !== "string") {
    throw new TypeError(
      `Expected a string for CNPJ formatAsYouType, but received ${value === null ? "null" : typeof value}`,
    );
  }

  const normalized = normalize(value).slice(0, LENGTH);
  const base = normalized.slice(0, 12);
  const checkDigits = normalized.slice(12).replace(/\D/g, "").slice(0, 2);

  return formatProgressive(`${base}${checkDigits}`, [2, 3, 3, 4, 2], [".", ".", "/", "-"]);
}

/**
 * Generates a random, structurally valid CNPJ with correct check digits.
 *
 * @param options - Optional generation options:
 *   - `alphanumeric`: If `true`, the first 12 base characters may include
 *     uppercase letters; positions 13–14 are always digits.
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
export function generate(options: CnpjGenerateOptions = {}): string {
  assertOptions(options);

  const { formatted = false, alphanumeric = false } = options;
  const charset = alphanumeric ? ALPHANUMERIC_CHARS : DIGIT_CHARS;

  // Build the first 12 characters (may include letters if alphanumeric)
  const chars: string[] = Array.from({ length: 12 }, () => randomFrom(charset));

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
 * Only two input formats are accepted:
 * - Raw: exactly 12 alphanumeric characters followed by 2 digits (e.g., `"73450392000164"`).
 * - Masked: standard CNPJ punctuation (`XX.XXX.XXX/XXXX-XX`) where the last
 *   two characters must be digits (e.g., `"73.450.392/0001-64"`).
 *
 * Any other format throws `CnpjError("INVALID_FORMAT")`.
 * Never throws for validation errors — always returns a result object.
 *
 * @param value - CNPJ value to validate.
 * @returns `{ success: true, error: null }` if valid; `{ success: false, error: CnpjError }` if invalid.
 * @throws {TypeError} If `value` is not a string.
 *
 * @example
 * ```TypeScript
 * validate("73.450.392/0001-64"); // { success: true, error: null }
 * validate("12ABC34501DE99"); // { success: false, error: CnpjError (INVALID_CHECKSUM) }
 * validate("73$450392000164"); // { success: false, error: CnpjError (INVALID_FORMAT) }
 * ```
 */
export function validate(value: string): CnpjValidateResult {
  if (typeof value !== "string") {
    throw new TypeError(
      `Expected a string for CNPJ validate, but received ${value === null ? "null" : typeof value}`,
    );
  }

  try {
    const normalized = preNormalize(value);

    assertValid(normalized);

    return { success: true, error: null };
  } catch (error) {
    if (error instanceof CnpjError) {
      return { success: false, error };
    }

    return {
      success: false,
      error: new CnpjError("UNKNOWN_ERROR", "Unexpected CNPJ validation error."),
    };
  }
}
