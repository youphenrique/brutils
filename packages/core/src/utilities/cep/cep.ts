import { assertOptions } from "../../common/assert.ts";
import { formatProgressive } from "../../common/format.ts";
import { runValidation } from "../../common/validate.ts";
import { CEP_LENGTH, CEP_RAW_PATTERN } from "./constants";
import type { CepFormatOptions, CepValidationResult } from "./types";
import { assertValid, CepValidationError } from "./utils";

/**
 * Normalizes a CEP string by stripping all non-digit characters.
 *
 * @param value - The CEP string to normalize.
 * @returns A digits-only string representing the normalized CEP.
 * @throws {TypeError} If the provided value is not a string.
 *
 * @example
 * ```TypeScript
 * normalize("01001-000"); // "01001000"
 * normalize("01.001-000"); // "01001000"
 * ```
 */
export function normalize(value: string): string {
  if (typeof value !== "string") {
    throw new TypeError(
      `Expected a string for CEP normalization, but received ${value === null ? "null" : typeof value}`,
    );
  }

  return value.replace(/\D/g, "");
}

/**
 * Validates CEP format and repeated digits without checking postal assignment.
 *
 * @param value - CEP value to validate.
 * @returns `{ success: true, error: null }` if valid; `{ success: false, error: CepValidationError }` if invalid.
 * Non-string values return `INVALID_TYPE`. Unexpected internal exceptions are rethrown.
 *
 * @example
 * ```TypeScript
 * validate("01001-000"); // { success: true, error: null }
 * validate("01001000"); // { success: true, error: null }
 * validate("123"); // { success: false, error: CepValidationError }
 * validate("01001-A00"); // { success: false, error: CepValidationError }
 * ```
 */
export function validate(value: unknown): CepValidationResult {
  return runValidation(value, "CEP", CepValidationError, assertValid);
}

/**
 * Formats a CEP string into the standard mask (`XXXXX-XXX`).
 * CEP value (invalid, badly formatted, or not) returns as is.
 *
 * @param value - CEP value in any form.
 * @param options - Optional formatting options. Set `pad` to `true` to
 *   left-pad with zeros up to 8 characters.
 * @returns The formatted CEP string or the original value if it doesn't have 8 digits.
 * @throws {TypeError} If the provided value is not a string.
 *
 * @example
 * ```TypeScript
 * format("01001000"); // "01001-000"
 * format("01001-000"); // "01001-000"
 * format("123"); // "123"
 * format("73450", { pad: true }); // "00073-450"
 * ```
 */
export function format(value: string, options: CepFormatOptions = {}): string {
  if (typeof value !== "string") {
    throw new TypeError(
      `Expected a string for CEP format, but received ${value === null ? "null" : typeof value}`,
    );
  }

  assertOptions(options);

  const baseValue = options.pad ? value.padStart(CEP_LENGTH, "0") : value;

  if (!CEP_RAW_PATTERN.test(baseValue)) {
    return value;
  }

  return `${baseValue.slice(0, 5)}-${baseValue.slice(5)}`;
}

/**
 * Displays an editable CEP field using the pattern `XXXXX-XXX`.
 * Keeps only ASCII digits, takes the first eight, and inserts `-` only when
 * a sixth digit exists. Empty and partial strings are accepted. This is lossy
 * UI behavior, not parsing or validation: validate the original submitted
 * value, not this output.
 *
 * @param value - The current input-field string.
 * @returns The progressively formatted display string.
 * @throws {TypeError} If the provided value is not a string.
 *
 * @example
 * ```TypeScript
 * formatAsYouType("0100"); // "0100"
 * formatAsYouType("01001"); // "01001"
 * formatAsYouType("010010"); // "01001-0"
 * formatAsYouType("01001000"); // "01001-000"
 * ```
 */
export function formatAsYouType(value: string): string {
  if (typeof value !== "string") {
    throw new TypeError(
      `Expected a string for CEP formatAsYouType, but received ${value === null ? "null" : typeof value}`,
    );
  }

  const normalized = normalize(value).slice(0, CEP_LENGTH);

  return formatProgressive(normalized, [5, 3], ["-"]);
}
