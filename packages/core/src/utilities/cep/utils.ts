import type { CepErrorCode } from "./types";
import { CEP_FORMATTED_PATTERN, CEP_RAW_PATTERN } from "./constants";

export class CepValidationError extends Error {
  constructor(
    readonly code: CepErrorCode,
    message?: string,
  ) {
    super(message ?? code);
    this.name = "CepValidationError";
  }
}

export function assertValid(value: string): void {
  if (!CEP_RAW_PATTERN.test(value) && !CEP_FORMATTED_PATTERN.test(value)) {
    throw new CepValidationError(
      "INVALID_FORMAT",
      "Only 8 digits or #####-### format are accepted.",
    );
  }

  const normalized = value.replace(/\D/g, "");

  if (/^(\d)\1{7}$/.test(normalized)) {
    throw new CepValidationError(
      "REPEATED_DIGITS",
      "There are no valid CEP's with sequences of repeated numbers.",
    );
  }
}
