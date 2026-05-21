import type { UFS_REGION_MAP } from "./constants";
import type { CpfError } from "./utils";

export type CpfErrorCode =
  | "INVALID_FORMAT"
  | "REPEATED_DIGITS"
  | "INVALID_CHECKSUM"
  | "UNKNOWN_ERROR";

export type CpfMaskInputErrorCode = "INVALID_INPUT" | "INVALID_LENGTH";

export type CpfMaskOptionsErrorCode =
  | "INVALID_MASK_CHAR"
  | "INVALID_VISIBLE_PREFIX_LENGTH"
  | "INVALID_VISIBLE_SUFFIX_LENGTH"
  | "VISIBLE_LENGTH_OVERFLOW";

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

export interface CpfMaskOptions {
  /**
   * Character used to replace masked positions.
   * Must represent exactly 1 Unicode character/grapheme.
   * Default: `'*'`
   */
  char?: string;

  /**
   * Number of leading digits to leave visible.
   * Refers to digit positions in the raw 11-digit CPF, not in the formatted output.
   * Must be a non-negative integer.
   * Default: `3`
   */
  visiblePrefixLength?: number;

  /**
   * Number of trailing digits to leave visible.
   * Refers to digit positions in the raw 11-digit CPF, not in the formatted output.
   * Must be a non-negative integer.
   * Default: `2`
   */
  visibleSuffixLength?: number;
}
