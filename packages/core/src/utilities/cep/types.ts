import type { CepValidationError } from "./utils";

export type CepErrorCode = "INVALID_FORMAT" | "REPEATED_DIGITS" | "INVALID_TYPE";

export type CepFormatOptions = {
  pad?: boolean;
};

export type CepValidationResult =
  | { success: true; error: null }
  | { success: false; error: CepValidationError };
