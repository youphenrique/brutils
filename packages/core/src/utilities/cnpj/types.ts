import type { CnpjError } from "./utils";

export type CnpjErrorCode =
  | "REPEATED_DIGITS"
  | "INVALID_FORMAT"
  | "INVALID_CHECKSUM"
  | "INVALID_TYPE";

export type CnpjFormatOptions = {
  pad?: boolean;
};

export type CnpjGenerateOptions = {
  formatted?: boolean;
  alphanumeric?: boolean;
};

export type CnpjValidationResult =
  | { success: true; error: null }
  | { success: false; error: CnpjError };
