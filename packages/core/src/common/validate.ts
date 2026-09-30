export type ValidationResult<E extends Error> =
  | { success: true; error: null }
  | { success: false; error: E };

type ValidationErrorClass<E extends Error> = new (code: "INVALID_TYPE", message?: string) => E;

function describeType(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

/**
 * Shared `validate()` policy: non-strings return `INVALID_TYPE` without coercion,
 * `ErrorClass` failures from `assertValid` become results, and any other
 * exception is rethrown unchanged.
 */
export function runValidation<E extends Error>(
  value: unknown,
  label: string,
  ErrorClass: ValidationErrorClass<E>,
  assertValid: (value: string) => void,
): ValidationResult<E> {
  if (typeof value !== "string") {
    return {
      success: false,
      error: new ErrorClass(
        "INVALID_TYPE",
        `Expected a string for ${label} validation, but received ${describeType(value)}.`,
      ),
    };
  }

  try {
    assertValid(value);

    return { success: true, error: null };
  } catch (error) {
    if (error instanceof ErrorClass) {
      return { success: false, error };
    }

    throw error;
  }
}
