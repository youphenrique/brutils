import { describe, expect, it, vi } from "vite-plus/test";

import { cpf } from "../src/index.ts";
import { CpfError } from "../src/cpf/index.ts";

describe("cpf.normalize", () => {
  it("strips non-digit characters from a formatted CPF", () => {
    expect(cpf.normalize("916.534.780-39")).toBe("91653478039");
  });

  it("handles partially formatted and mixed inputs", () => {
    expect(cpf.normalize("916.534780-39")).toBe("91653478039");
    expect(cpf.normalize("abc916!!!534...780--39def")).toBe("91653478039");
  });

  it("returns the same string for already-normalized input", () => {
    expect(cpf.normalize("91653478039")).toBe("91653478039");
  });

  it("returns an empty string for an empty input", () => {
    expect(cpf.normalize("")).toBe("");
  });

  it("throws a TypeError for invalid type input", () => {
    expect(() => cpf.normalize(null as any)).toThrow(TypeError);
    expect(() => cpf.normalize(undefined as any)).toThrow(TypeError);
    expect(() => cpf.normalize(12345678909 as any)).toThrow(TypeError);
    expect(() => cpf.normalize({} as any)).toThrow(TypeError);
  });
});

describe("cpf.mask", () => {
  it("masks a normalized CPF correctly", () => {
    expect(cpf.mask("91653478039")).toBe("916.***.***-39");
  });

  it("masks a formatted CPF correctly", () => {
    expect(cpf.mask("916.534.780-39")).toBe("916.***.***-39");
  });

  it("masks partially formatted and mixed inputs correctly", () => {
    expect(cpf.mask("abc916!!!534...780--39def")).toBe("916.***.***-39");
  });

  it("returns an empty string for an empty input", () => {
    expect(cpf.mask("")).toBe("");
  });

  it("handles short inputs progressively", () => {
    expect(cpf.mask("12")).toBe("12");
    expect(cpf.mask("1234")).toBe("123.*");
    expect(cpf.mask("123456")).toBe("123.***");
    expect(cpf.mask("1234567")).toBe("123.***.*");
    expect(cpf.mask("1234567890")).toBe("123.***.***-0");
  });

  it("throws a TypeError for invalid type input", () => {
    expect(() => cpf.mask(null as any)).toThrow(TypeError);
    expect(() => cpf.mask(undefined as any)).toThrow(TypeError);
    expect(() => cpf.mask(12345678909 as any)).toThrow(TypeError);
    expect(() => cpf.mask({} as any)).toThrow(TypeError);
  });
});

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

  it("accepts undefined options and uses defaults", () => {
    expect(cpf.format("52263944621", undefined)).toBe("522.639.446-21");
  });

  it("throws a TypeError for invalid options type", () => {
    expect(() => cpf.format("52263944621", null as any)).toThrow(TypeError);
    expect(() => cpf.format("52263944621", 123 as any)).toThrow(TypeError);
    expect(() => cpf.format("52263944621", "x" as any)).toThrow(TypeError);
    expect(() => cpf.format("52263944621", true as any)).toThrow(TypeError);
    expect(() => cpf.format("52263944621", [] as any)).toThrow(TypeError);
  });

  it("throws a TypeError for invalid type input", () => {
    expect(() => cpf.format(null as any)).toThrow(TypeError);
    expect(() => cpf.format(undefined as any)).toThrow(TypeError);
    expect(() => cpf.format(12345678909 as any)).toThrow(TypeError);
    expect(() => cpf.format({} as any)).toThrow(TypeError);
  });
});

describe("cpf.validate", () => {
  it("returns success for valid unformatted CPF", () => {
    expect(cpf.validate("12345678909")).toEqual({ success: true, error: null });
  });

  it("returns success for valid formatted CPF", () => {
    expect(cpf.validate("123.456.789-09")).toEqual({ success: true, error: null });
  });

  it("returns success for valid CPF with garbage in default mode", () => {
    expect(cpf.validate("101#688!!!!!!542......36").success).toBe(true);
  });

  it("returns failure with INVALID_LENGTH for short digit string", () => {
    let result = cpf.validate("0000000191");
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("INVALID_LENGTH");

    result = cpf.validate("123");
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("INVALID_LENGTH");
  });

  it("returns failure with REPEATED_DIGITS for all-same-digit CPF", () => {
    const result = cpf.validate("000.000.000-00");
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("REPEATED_DIGITS");

    expect(cpf.validate("99999999999").success).toBe(false);
  });

  it("returns failure with INVALID_LENGTH for wrong length", () => {
    const result = cpf.validate("1234567890912");
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("INVALID_LENGTH");
  });

  it("returns failure with INVALID_CHECKSUM for incorrect check digits", () => {
    const result = cpf.validate("12345678900");
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("INVALID_CHECKSUM");
  });

  it("strict mode returns failure with INVALID_FORMAT for malformed input", () => {
    const result = cpf.validate("101#688!!!!!!542......36", { strict: true });
    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(CpfError);
    expect(result.error?.code).toBe("INVALID_FORMAT");
  });

  it("strict mode returns success for raw and masked valid inputs", () => {
    expect(cpf.validate("12345678909", { strict: true })).toEqual({ success: true, error: null });
    expect(cpf.validate("123.456.789-09", { strict: true })).toEqual({
      success: true,
      error: null,
    });
  });

  it("accepts undefined options and uses defaults", () => {
    expect(cpf.validate("12345678909", undefined)).toEqual({ success: true, error: null });
  });

  it("throws a TypeError for invalid options type", () => {
    expect(() => cpf.validate("12345678909", null as any)).toThrow(TypeError);
    expect(() => cpf.validate("12345678909", 123 as any)).toThrow(TypeError);
    expect(() => cpf.validate("12345678909", "x" as any)).toThrow(TypeError);
    expect(() => cpf.validate("12345678909", true as any)).toThrow(TypeError);
    expect(() => cpf.validate("12345678909", [] as any)).toThrow(TypeError);
  });

  it("throws a TypeError for invalid type input", () => {
    expect(() => cpf.validate(null as any)).toThrow(TypeError);
    expect(() => cpf.validate(undefined as any)).toThrow(TypeError);
    expect(() => cpf.validate(12345678909 as any)).toThrow(TypeError);
    expect(() => cpf.validate({} as any)).toThrow(TypeError);
  });
});

describe("CpfError", () => {
  it("is a proper subclass of Error", () => {
    const err = new CpfError("INVALID_FORMAT");
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(CpfError);
  });

  it("has name CpfError", () => {
    const err = new CpfError("INVALID_LENGTH");
    expect(err.name).toBe("CpfError");
  });

  it("stores the error code", () => {
    const err = new CpfError("INVALID_CHECKSUM");
    expect(err.code).toBe("INVALID_CHECKSUM");
  });

  it("uses code as default message when no message is provided", () => {
    const err = new CpfError("INVALID_FORMAT");
    expect(err.message).toBe("INVALID_FORMAT");
  });

  it("uses custom message when provided", () => {
    const err = new CpfError("INVALID_LENGTH", "Custom message");
    expect(err.message).toBe("Custom message");
  });
});

describe("cpf.generate", () => {
  it("always generates a valid 11-digit CPF", () => {
    const generated = cpf.generate();

    expect(generated).toMatch(/^\d{11}$/);
    expect(cpf.validate(generated).success).toBe(true);
  });

  it("forces 9th digit to 8 for SP", () => {
    for (let i = 0; i < 100; i += 1) {
      expect(cpf.generate({ state: "SP" })[8]).toBe("8");
    }
  });

  it("forces 9th digit to 1 for GO and DF", () => {
    for (let i = 0; i < 100; i += 1) {
      expect(cpf.generate({ state: "GO" })[8]).toBe("1");
      expect(cpf.generate({ state: "DF" })[8]).toBe("1");
    }
  });

  it("all-same-digit guard never mutates index 8", () => {
    const randomSpy = vi.spyOn(Math, "random");

    randomSpy
      .mockReturnValueOnce(0.2)
      .mockReturnValueOnce(0.2)
      .mockReturnValueOnce(0.2)
      .mockReturnValueOnce(0.2)
      .mockReturnValueOnce(0.2)
      .mockReturnValueOnce(0.2)
      .mockReturnValueOnce(0.2)
      .mockReturnValueOnce(0.2)
      .mockReturnValueOnce(0.6)
      .mockReturnValueOnce(0.3);

    const generated = cpf.generate({ state: "AC" });

    expect(generated[8]).toBe("2");

    randomSpy.mockRestore();
  });

  it("returns formatted CPF when requested", () => {
    expect(cpf.generate({ formatted: true })).toMatch(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/);
  });

  it("never generates all-same-digit CPF across 1000 runs", () => {
    for (let i = 0; i < 1000; i += 1) {
      const generated = cpf.generate();
      expect(/^([0-9])\1{10}$/.test(generated)).toBe(false);
    }
  });

  it("accepts undefined options and uses defaults", () => {
    expect(cpf.generate(undefined)).toMatch(/^\d{11}$/);
  });

  it("throws a TypeError for invalid options type", () => {
    expect(() => cpf.generate(null as any)).toThrow(TypeError);
    expect(() => cpf.generate(123 as any)).toThrow(TypeError);
    expect(() => cpf.generate("x" as any)).toThrow(TypeError);
    expect(() => cpf.generate(true as any)).toThrow(TypeError);
    expect(() => cpf.generate([] as any)).toThrow(TypeError);
  });
});
