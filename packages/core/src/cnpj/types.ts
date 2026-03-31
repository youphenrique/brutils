import { CnpjError } from "./utils";

export type CnpjErrorCode =
  | "INVALID_FORMAT"
  | "INVALID_LENGTH"
  | "INVALID_CHECK_DIGITS"
  | "UNKNOWN_ERROR";

export type CnpjValidateOptions = {
  strict?: boolean;
};

export type CnpjFormatOptions = {
  pad?: boolean;
};

export type CnpjGenerateOptions = {
  formatted?: boolean;
  alphanumeric?: boolean;
};

export interface CnpjValidateResult {
  success: boolean;
  error: CnpjError | null;
}
