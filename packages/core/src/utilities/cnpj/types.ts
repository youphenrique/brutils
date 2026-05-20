import { CnpjError } from "./utils";

export type CnpjErrorCode =
  | "REPEATED_DIGITS"
  | "INVALID_FORMAT"
  | "INVALID_CHECKSUM"
  | "UNKNOWN_ERROR";

export type CnpjFormatOptions = {
  pad?: boolean;
};

export type CnpjGenerateOptions = {
  formatted?: boolean;
  alphanumeric?: boolean;
};

export type CnpjValidateResult =
  | { success: true; error: null }
  | { success: false; error: CnpjError };
