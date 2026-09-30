export const CPF_LENGTH = 11;

export const CPF_RAW_PATTERN = /^\d{11}$/;
export const CPF_FORMATTED_PATTERN = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;

export const CPF_MASK_MODES = ["suffix", "prefix-suffix", "redacted"] as const;

/** Matches characters that cannot be a mask char: numbers, invisible characters, and CPF separators. */
export const CPF_MASK_CHAR_FORBIDDEN_PATTERN =
  /[\p{N}\p{White_Space}\p{M}\p{C}\p{Default_Ignorable_Code_Point}\u2800.-]/u;
