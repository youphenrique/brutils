import type { CPF_MASK_MODES, UFS_REGION_MAP } from "./constants";
import type { CpfError } from "./utils";

export type CpfErrorCode =
  | "INVALID_FORMAT"
  | "REPEATED_DIGITS"
  | "INVALID_CHECKSUM"
  | "UNKNOWN_ERROR";

export type CpfValidateResult =
  | { success: true; error: null }
  | { success: false; error: CpfError };

export interface CpfGenerateOptions {
  uf?: keyof typeof UFS_REGION_MAP;
  formatted?: boolean;
}

export type CpfMaskMode = (typeof CPF_MASK_MODES)[number];

export type CpfMaskOptions = {
  char?: string;
  mode?: CpfMaskMode;
};
