export const CPF_LENGTH = 11;

export interface FormatCpfOptions {
  pad?: boolean;
}

/**
 * Formats a CPF string into the standard Brazilian mask (`XXX.XXX.XXX-XX`).
 * Non-numeric characters are removed before formatting, and values longer than
 * 11 digits are truncated.
 *
 * @param value - CPF value in any form (formatted, unformatted, or mixed).
 * @param options - Optional formatting options. Set `pad` to `true` to left-pad with zeros up to 11 digits.
 * @returns The CPF string with progressive or full mask applied.
 *
 * @example
 * ```TypeScript
 * format("12345678909"); // "123.456.789-09"
 * ```
 */
export function format(value: string, options: FormatCpfOptions = {}): string {
  const digits = value.replace(/\D/g, "").slice(0, CPF_LENGTH);
  const normalized = options.pad ? digits.padStart(CPF_LENGTH, "0") : digits;

  if (normalized.length === 0) {
    return "";
  }

  const part1 = normalized.slice(0, 3);
  const part2 = normalized.slice(3, 6);
  const part3 = normalized.slice(6, 9);
  const part4 = normalized.slice(9, 11);

  const masked = [part1, part2, part3].filter(Boolean).join(".");

  return part4.length > 0 ? `${masked}-${part4}` : masked;
}
