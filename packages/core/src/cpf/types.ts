import type { UFS_REGION_MAP } from "./constants";
import type { CpfError } from "./utils";

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
  uf?: keyof typeof UFS_REGION_MAP;
  formatted?: boolean;
}
