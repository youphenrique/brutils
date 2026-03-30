import type { STATES_REGION_MAP } from "./constants";

export type BrazilianState = keyof typeof STATES_REGION_MAP;

export type CpfErrorCode =
  | "INVALID_FORMAT"
  | "INVALID_LENGTH"
  | "REPEATED_DIGITS"
  | "INVALID_CHECKSUM";

export interface ValidateOptions {
  strict?: boolean;
}

export interface FormatOptions {
  pad?: boolean;
}

export interface GenerateOptions {
  state?: BrazilianState;
  formatted?: boolean;
}
