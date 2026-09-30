import type { CPF_MASK_MODES } from "./constants";
import type { CpfError } from "./utils";

export type CpfErrorCode =
  | "INVALID_FORMAT"
  | "REPEATED_DIGITS"
  | "INVALID_CHECKSUM"
  | "INVALID_TYPE";

export type CpfValidationResult =
  | { success: true; error: null }
  | { success: false; error: CpfError };

/** @deprecated Use {@link CpfValidationResult}. */
export type CpfValidateResult = CpfValidationResult;

export interface CpfGenerateOptions {
  formatted?: boolean;
}

export type CpfMaskMode = (typeof CPF_MASK_MODES)[number];

export type CpfMaskOptions = {
  char?: string;
  mode?: CpfMaskMode;
};
