import type { UFS_REGION_MAP } from "./constants";
import type { CpfError } from "./utils";

export type CpfErrorCode =
  | "INVALID_FORMAT"
  | "REPEATED_DIGITS"
  | "INVALID_CHECKSUM"
  | "UNKNOWN_ERROR";

export type CpfValidateResult =
  | { success: true; error: null }
  | { success: false; error: CpfError };

export interface CpfFormatOptions {
  pad?: boolean;
}

export interface CpfGenerateOptions {
  uf?: keyof typeof UFS_REGION_MAP;
  formatted?: boolean;
}
