import { describe, expect, it } from "vite-plus/test";

import { cpf } from "../src/index.ts";

describe("cpf.format", () => {
  it("formats valid unformatted CPF", () => {
    expect(cpf.format("52263944621")).toBe("522.639.446-21");
  });

  it("reformats valid formatted CPF", () => {
    expect(cpf.format("522.639.446-21")).toBe("522.639.446-21");
  });

  it("formats partially formatted CPF", () => {
    expect(cpf.format("522.63944621")).toBe("522.639.446-21");
  });

  it("preserves leading zeros", () => {
    expect(cpf.format("00000000191")).toBe("000.000.001-91");
  });

  it("strips whitespace and non-numeric characters", () => {
    expect(cpf.format("  522 639 446 21  ")).toBe("522.639.446-21");
    expect(cpf.format("943.?ABC895.751-04abc")).toBe("943.895.751-04");
  });

  it("handles invalid lengths and empty input", () => {
    expect(cpf.format("")).toBe("");
    expect(cpf.format("9")).toBe("9");
    expect(cpf.format("9438")).toBe("943.8");
    expect(cpf.format("94389575104000000")).toBe("943.895.751-04");
  });

  it("left-pads with zeros when pad option is enabled", () => {
    expect(cpf.format("", { pad: true })).toBe("000.000.000-00");
    expect(cpf.format("9", { pad: true })).toBe("000.000.000-09");
    expect(cpf.format("94389575104", { pad: true })).toBe("943.895.751-04");
  });
});

describe("cpf.validate", () => {
  it("accepts valid unformatted CPF", () => {
    expect(cpf.validate("12345678909")).toBe(true);
  });

  it("accepts valid formatted CPF", () => {
    expect(cpf.validate("123.456.789-09")).toBe(true);
  });

  it("accepts valid CPF with garbage in default mode", () => {
    expect(cpf.validate("101#688!!!!!!542......36")).toBe(true);
  });

  it("accepts short digit string after left-pad in default mode", () => {
    expect(cpf.validate("00000000191")).toBe(true);
    expect(cpf.validate("0000000191")).toBe(true);
    expect(cpf.validate("5120101")).toBe(true);
  });

  it("rejects all-same-digit CPF with REPEATED_DIGITS code", () => {
    const result = cpf.safeValidate("000.000.000-00");

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.code).toBe("REPEATED_DIGITS");
    }
  });

  it("rejects wrong length with INVALID_LENGTH code", () => {
    const result = cpf.safeValidate("1234567890912");

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.code).toBe("INVALID_LENGTH");
    }
  });

  it("rejects incorrect check digits with INVALID_CHECKSUM code", () => {
    const result = cpf.safeValidate("12345678900");

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.code).toBe("INVALID_CHECKSUM");
    }
  });

  it("strict mode rejects malformed input with INVALID_FORMAT code", () => {
    const result = cpf.safeValidate("101#688!!!!!!542......36", { strict: true });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.code).toBe("INVALID_FORMAT");
    }
  });

  it("strict mode accepts raw and masked valid inputs", () => {
    expect(cpf.validate("12345678909", { strict: true })).toBe(true);
    expect(cpf.validate("123.456.789-09", { strict: true })).toBe(true);
  });
});

describe("cpf.safeValidate", () => {
  it("never throws and returns success for valid CPF", () => {
    expect(() => cpf.safeValidate("12345678909")).not.toThrow();
    expect(cpf.safeValidate("12345678909")).toEqual({ success: true });
  });

  it("never throws and returns InvalidCpfError for invalid CPF", () => {
    expect(() => cpf.safeValidate("123")).not.toThrow();

    const result = cpf.safeValidate("123", { strict: true });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error).toBeInstanceOf(cpf.InvalidCpfError);
      expect(result.error.code).toBe("INVALID_FORMAT");
    }
  });
});
