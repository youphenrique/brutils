import { describe, expect, it } from "vite-plus/test";

import { cnpj } from "../../src/index.ts";
import { CnpjError } from "../../src/cnpj/index.ts";

describe("cnpj.normalize", () => {
  it("strips punctuation from a formatted numeric CNPJ", () => {
    expect(cnpj.normalize("73.450.392/0001-64")).toBe("73450392000164");
  });

  it("strips punctuation from a formatted alphanumeric CNPJ", () => {
    expect(cnpj.normalize("12.ABC.345/01DE-35")).toBe("12ABC34501DE35");
  });

  it("uppercases lowercase letters", () => {
    expect(cnpj.normalize("12.abc.345/01de-35")).toBe("12ABC34501DE35");
  });

  it("strips spaces and mixed non-alphanumeric characters", () => {
    expect(cnpj.normalize("12ABC3450 1DE35")).toBe("12ABC34501DE35");
    expect(cnpj.normalize("  73450392000164  ")).toBe("73450392000164");
  });

  it("returns already-normalized input unchanged", () => {
    expect(cnpj.normalize("73450392000164")).toBe("73450392000164");
  });

  it("returns an empty string for empty input", () => {
    expect(cnpj.normalize("")).toBe("");
  });

  it("throws TypeError for non-string input", () => {
    expect(() => cnpj.normalize(null as any)).toThrow(TypeError);
    expect(() => cnpj.normalize(undefined as any)).toThrow(TypeError);
    expect(() => cnpj.normalize(73450392000164 as any)).toThrow(TypeError);
    expect(() => cnpj.normalize({} as any)).toThrow(TypeError);
  });
});

describe("cnpj.format", () => {
  it("formats a clean numeric and alphanumeric CNPJ", () => {
    expect(cnpj.format("73450392000164")).toBe("73.450.392/0001-64");
    expect(cnpj.format("12ABC34501DE35")).toBe("12.ABC.345/01DE-35");
  });

  it("formats an already-formatted numeric and alphanumeric CNPJ (idempotent)", () => {
    expect(cnpj.format("73.450.392/0001-64")).toBe("73.450.392/0001-64");
    expect(cnpj.format("12.ABC.345/01DE-35")).toBe("12.ABC.345/01DE-35");
  });

  it("returns as is for CPFs with whitespace and non-numeric characters", () => {
    expect(cnpj.format(" 12 ABC 345 01DE 35")).toBe(" 12 ABC 345 01DE 35");
    expect(cnpj.format("12.?ABC@345-01DE$35abc")).toBe("12.?ABC@345-01DE$35abc");
    expect(cnpj.format("12.ABC.34501DE35")).toBe("12.ABC.34501DE35");
  });

  it("returns as is for invalid CNPJ lengths", () => {
    expect(cnpj.format("")).toBe("");
    expect(cnpj.format("AB34")).toBe("AB34");
    expect(cnpj.format("12ABC34501DE35ZZ")).toBe("12ABC34501DE35ZZ");
  });

  it("left-pads with zeros and formats when pad option is enabled", () => {
    expect(cnpj.format("", { pad: true })).toBe("00.000.000/0000-00");
    expect(cnpj.format("73450", { pad: true })).toBe("00.000.000/0734-50");
    expect(cnpj.format("73450392000164", { pad: true })).toBe("73.450.392/0001-64");
    expect(cnpj.format("12ABC34501DE35ZZ", { pad: true })).toBe("12ABC34501DE35ZZ");
  });

  it("accepts undefined options and uses defaults", () => {
    expect(cnpj.format("73450392000164", undefined)).toBe("73.450.392/0001-64");
  });

  it("throws TypeError for non-string input", () => {
    expect(() => cnpj.format(null as any)).toThrow(TypeError);
    expect(() => cnpj.format(undefined as any)).toThrow(TypeError);
    expect(() => cnpj.format(73450392000164 as any)).toThrow(TypeError);
  });

  it("throws TypeError for invalid options type", () => {
    expect(() => cnpj.format("73450392000164", null as any)).toThrow(TypeError);
    expect(() => cnpj.format("73450392000164", 123 as any)).toThrow(TypeError);
    expect(() => cnpj.format("73450392000164", [] as any)).toThrow(TypeError);
  });
});

describe("cnpj.validate", () => {
  it("rejects all-same-character CNPJ", () => {
    let result = cnpj.validate("00000000000000");
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("REPEATED_DIGITS");

    result = cnpj.validate("55.555.555/5555-55");
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("REPEATED_DIGITS");

    result = cnpj.validate("99999999999999");
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("REPEATED_DIGITS");
  });

  it("rejects CNPJ with partially or totally incorrect check digits", () => {
    let result = cnpj.validate("12.ABC.345/01DE-30");
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("INVALID_CHECKSUM");

    result = cnpj.validate("12.ABC.345/01DE-05");
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("INVALID_CHECKSUM");

    result = cnpj.validate("73450392000100");
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("INVALID_CHECKSUM");
  });

  it("rejects alphanumeric CNPJ with spaces (invalid format)", () => {
    const result = cnpj.validate("12 ABC3450 1DE35");
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("INVALID_FORMAT");
  });

  it("accepts lowercase input by uppercasing internally", () => {
    expect(cnpj.validate("12.abc.345/01de-35").success).toBe(true);
    expect(cnpj.validate("pb1s7s46000114").success).toBe(true);
  });

  it("rejects CNPJ with invalid length", () => {
    let result = cnpj.validate("AB1C2D3E");
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("INVALID_FORMAT");

    result = cnpj.validate("GE.YP8.K1W/000");
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("INVALID_FORMAT");

    result = cnpj.validate("");
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("INVALID_FORMAT");

    result = cnpj.validate("AB.1C2.D3E/4F5G-356");
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("INVALID_FORMAT");
  });

  it("accepts valid unformatted CNPJ", () => {
    expect(cnpj.validate("73450392000164")).toEqual({ success: true, error: null });
    expect(cnpj.validate("GEYP8K1W000177")).toEqual({ success: true, error: null });
  });

  it("accepts valid formatted CNPJ", () => {
    expect(cnpj.validate("73.450.392/0001-64")).toEqual({ success: true, error: null });
    expect(cnpj.validate("BT.HYV.1XM/0001-55")).toEqual({ success: true, error: null });
    // The official SERPRO alphanumeric example
    expect(cnpj.validate("12.ABC.345/01DE-35")).toEqual({ success: true, error: null });
  });

  it("returns failure with INVALID_FORMAT for characters outside [A-Za-z0-9./-]", () => {
    let result = cnpj.validate("73$450392000164");
    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(CnpjError);
    expect(result.error?.code).toBe("INVALID_FORMAT");

    result = cnpj.validate("BT%HYV&1XM@0001,55");
    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(CnpjError);
    expect(result.error?.code).toBe("INVALID_FORMAT");
  });

  it("throws TypeError for non-string input", () => {
    expect(() => cnpj.validate(null as unknown as string)).toThrow(TypeError);
    expect(() => cnpj.validate(undefined as unknown as string)).toThrow(TypeError);
    expect(() => cnpj.validate(73450392000164 as unknown as string)).toThrow(TypeError);
    expect(() => cnpj.validate({} as unknown as string)).toThrow(TypeError);
  });
});

describe("CnpjError", () => {
  it("is a proper subclass of Error", () => {
    const err = new CnpjError("INVALID_FORMAT");
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(CnpjError);
  });

  it("has name CnpjError", () => {
    const err = new CnpjError("INVALID_FORMAT");
    expect(err.name).toBe("CnpjError");
  });

  it("stores the error code", () => {
    const err = new CnpjError("INVALID_CHECKSUM");
    expect(err.code).toBe("INVALID_CHECKSUM");
  });

  it("uses code as default message when no message is provided", () => {
    const err = new CnpjError("INVALID_FORMAT");
    expect(err.message).toBe("INVALID_FORMAT");
  });

  it("uses custom message when provided", () => {
    const err = new CnpjError("INVALID_CHECKSUM", "Custom message");
    expect(err.message).toBe("Custom message");
  });
});

describe("cnpj.generate", () => {
  it("generates a valid 14-character numeric CNPJ by default", () => {
    const generated = cnpj.generate();
    expect(generated).toMatch(/^\d{14}$/);
    expect(cnpj.validate(generated).success).toBe(true);
  });

  it("generates a valid formatted CNPJ when formatted: true", () => {
    const generated = cnpj.generate({ formatted: true });
    expect(generated).toMatch(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/);
    expect(cnpj.validate(generated).success).toBe(true);
  });

  it("generates a valid alphanumeric CNPJ", () => {
    const generated = cnpj.generate({ alphanumeric: true });
    expect(cnpj.validate(generated).success).toBe(true);
  });

  it("generates a valid formatted alphanumeric CNPJ", () => {
    const generated = cnpj.generate({ formatted: true, alphanumeric: true });
    expect(generated).toMatch(/^\w{2}\.\w{3}\.\w{3}\/\w{4}-\d{2}$/);
    expect(cnpj.validate(generated).success).toBe(true);
  });

  it("never generates an all-same-character CNPJ across 1000 runs", () => {
    for (let i = 0; i < 1000; i++) {
      const generated = cnpj.generate();
      expect(/^(.)\1{13}$/.test(generated)).toBe(false);
    }
  });

  it("alphanumeric mode: positions 13–14 (branch segment) are always digits", () => {
    for (let i = 0; i < 100; i++) {
      const generated = cnpj.generate({ alphanumeric: true });
      const branch = generated.slice(12, 14);
      expect(branch).toMatch(/^\d{2}$/);
    }
  });

  it("validates 100 generated CNPJs (numeric)", () => {
    for (let i = 0; i < 100; i++) {
      expect(cnpj.validate(cnpj.generate()).success).toBe(true);
    }
  });

  it("validates 100 generated CNPJs (alphanumeric)", () => {
    for (let i = 0; i < 100; i++) {
      expect(cnpj.validate(cnpj.generate({ alphanumeric: true })).success).toBe(true);
    }
  });

  it("accepts undefined options and uses defaults", () => {
    expect(cnpj.generate(undefined)).toMatch(/^\d{14}$/);
  });

  it("throws TypeError for invalid options type", () => {
    expect(() => cnpj.generate(null as unknown as object)).toThrow(TypeError);
    expect(() => cnpj.generate(123 as unknown as object)).toThrow(TypeError);
    expect(() => cnpj.generate("x" as unknown as object)).toThrow(TypeError);
    expect(() => cnpj.generate([] as unknown as object)).toThrow(TypeError);
  });
});

describe("cnpj.formatAsYouType", () => {
  const cases: Array<[string, string]> = [
    ["1", "1"],
    ["11", "11"],
    ["111", "11.1"],
    ["1111", "11.11"],
    ["11111", "11.111"],
    ["111111", "11.111.1"],
    ["1111111", "11.111.11"],
    ["11111111", "11.111.111"],
    ["111111111", "11.111.111/1"],
    ["1111111111", "11.111.111/11"],
    ["11111111111", "11.111.111/111"],
    ["111111111111", "11.111.111/1111"],
    ["1111111111111", "11.111.111/1111-1"],
    ["11111111111111", "11.111.111/1111-11"],
    ["111111111111111", "11.111.111/1111-11"],
    ["11.111.111/1111-11", "11.111.111/1111-11"],
    ["12A", "12.A"],
    ["12ABC34501DE", "12.ABC.345/01DE"],
    ["12ABC34501DE3", "12.ABC.345/01DE-3"],
    ["12ABC34501DE35", "12.ABC.345/01DE-35"],
    ["12ABC34501DE3X", "12.ABC.345/01DE-3"],
    ["12.ABC.345/01DE-35", "12.ABC.345/01DE-35"],
    ["", ""],
    ["abc", "AB.C"],
  ];

  it("applies progressive CNPJ formatting", () => {
    for (const [input, expected] of cases) {
      expect(cnpj.formatAsYouType(input)).toBe(expected);
    }
  });

  it("throws TypeError for non-string input", () => {
    expect(() => cnpj.formatAsYouType(null as unknown as string)).toThrow(TypeError);
    expect(() => cnpj.formatAsYouType(undefined as unknown as string)).toThrow(TypeError);
    expect(() => cnpj.formatAsYouType(73450392000164 as unknown as string)).toThrow(TypeError);
    expect(() => cnpj.formatAsYouType({} as unknown as string)).toThrow(TypeError);
  });
});
