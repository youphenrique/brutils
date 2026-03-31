export type CnpjErrorCode = "INVALID_FORMAT" | "INVALID_LENGTH" | "INVALID_CHECK_DIGITS";

export type ValidateOptions = {
  strict?: boolean;
};

export type FormatOptions = {
  pad?: boolean;
};

export type GenerateOptions = {
  formatted?: boolean;
  alphanumeric?: boolean;
};
