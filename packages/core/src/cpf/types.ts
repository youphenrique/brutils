import type { STATES_REGION_MAP } from "./constants";
import type { CpfError } from "./utils";

export type UfCode = keyof typeof STATES_REGION_MAP;

export type CpfErrorCode =
  | "INVALID_FORMAT"
  | "INVALID_LENGTH"
  | "REPEATED_DIGITS"
  | "INVALID_CHECKSUM"
  | "UNKNOWN_ERROR";

export interface CpfValidateResult {
  success: boolean;
  error: CpfError | null;
}

export interface CpfValidateOptions {
  strict?: boolean;
}

export interface CpfFormatOptions {
  pad?: boolean;
}

export interface CpfGenerateOptions {
  state?: UfCode;
  formatted?: boolean;
}
