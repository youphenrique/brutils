import { describe, expect, it } from "vite-plus/test";

import { cnpj } from "../src/index.ts";
import { CnpjError } from "../src/cnpj/index.ts";

// ─── cnpj.normalize ──────────────────────────────────────────────────────────

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
    expect(() => cnpj.normalize(null as unknown as string)).toThrow(TypeError);
    expect(() => cnpj.normalize(undefined as unknown as string)).toThrow(TypeError);
    expect(() => cnpj.normalize(73450392000164 as unknown as string)).toThrow(TypeError);
    expect(() => cnpj.normalize({} as unknown as string)).toThrow(TypeError);
  });
});

// ─── cnpj.format ─────────────────────────────────────────────────────────────

describe("cnpj.format", () => {
  it("formats a clean numeric CNPJ", () => {
    expect(cnpj.format("73450392000164")).toBe("73.450.392/0001-64");
  });

  it("formats an already-formatted CNPJ (idempotent)", () => {
    expect(cnpj.format("73.450.392/0001-64")).toBe("73.450.392/0001-64");
  });

  it("formats a clean alphanumeric CNPJ", () => {
    expect(cnpj.format("12ABC34501DE35")).toBe("12.ABC.345/01DE-35");
  });

  it("strips spaces before formatting", () => {
    expect(cnpj.format("12ABC3450 1DE35")).toBe("12.ABC.345/01DE-35");
  });

  it("returns original value unchanged when length is not 14 after cleaning", () => {
    const short = "1234";
    expect(cnpj.format(short)).toBe(short);
  });

  it("left-pads with zeros and formats when pad option is enabled", () => {
    // "73450" (5 chars) padded to 14 → "000000000" + "73450"... wait:
    // 5 chars, need 14 → prepend 9 zeros = "00000000073450"
    // Formatted: "00.000.000/0734-50"
    expect(cnpj.format("73450", { pad: true })).toBe("00.000.000/0734-50");
  });

  it("pad with already-14-char input is a no-op for padding", () => {
    expect(cnpj.format("73450392000164", { pad: true })).toBe("73.450.392/0001-64");
  });

  it("accepts undefined options and uses defaults", () => {
    expect(cnpj.format("73450392000164", undefined)).toBe("73.450.392/0001-64");
  });

  it("throws TypeError for non-string input", () => {
    expect(() => cnpj.format(null as unknown as string)).toThrow(TypeError);
    expect(() => cnpj.format(undefined as unknown as string)).toThrow(TypeError);
    expect(() => cnpj.format(73450392000164 as unknown as string)).toThrow(TypeError);
  });

  it("throws TypeError for invalid options type", () => {
    expect(() => cnpj.format("73450392000164", null as unknown as object)).toThrow(TypeError);
    expect(() => cnpj.format("73450392000164", 123 as unknown as object)).toThrow(TypeError);
    expect(() => cnpj.format("73450392000164", [] as unknown as object)).toThrow(TypeError);
  });
});

// ─── cnpj.validate ───────────────────────────────────────────────────────────

describe("cnpj.validate", () => {
  // Numeric CNPJ
  it("accepts a valid formatted numeric CNPJ", () => {
    expect(cnpj.validate("73.450.392/0001-64")).toEqual({ success: true, error: null });
  });

  it("accepts a valid unformatted numeric CNPJ", () => {
    expect(cnpj.validate("73450392000164")).toEqual({ success: true, error: null });
  });

  it("rejects all-same-character CNPJ", () => {
    expect(cnpj.validate("00000000000000").success).toBe(false);
    expect(cnpj.validate("11111111111111").success).toBe(false);
  });

  it("rejects a CNPJ with wrong check digits", () => {
    expect(cnpj.validate("73450392000100").success).toBe(false);
  });

  // Alphanumeric CNPJ
  it("accepts the official SERPRO alphanumeric example", () => {
    expect(cnpj.validate("12.ABC.345/01DE-35")).toEqual({ success: true, error: null });
  });

  it("rejects the example with incorrect check digits", () => {
    expect(cnpj.validate("12.ABC.345/01DE-99").success).toBe(false);
    expect(cnpj.validate("12.ABC.345/01DE-00").success).toBe(false);
  });

  it("rejects check digits that are only partially correct", () => {
    expect(cnpj.validate("12.ABC.345/01DE-30").success).toBe(false);
    expect(cnpj.validate("12.ABC.345/01DE-05").success).toBe(false);
  });

  it("accepts alphanumeric CNPJ with spaces stripped", () => {
    expect(cnpj.validate("12ABC3450 1DE35").success).toBe(true);
  });

  it("rejects alphanumeric CNPJ with wrong check digits", () => {
    expect(cnpj.validate("12ABC3450 1DE99").success).toBe(false);
  });

  it("accepts lowercase input by uppercasing internally", () => {
    expect(cnpj.validate("12.abc.345/01de-35").success).toBe(true);
  });

  it("rejects CNPJ with invalid length", () => {
    expect(cnpj.validate("1234").success).toBe(false);
    expect(cnpj.validate("").success).toBe(false);
  });

  // Strict mode
  it("strict: accepts valid unformatted CNPJ", () => {
    expect(cnpj.validate("73450392000164", { strict: true })).toEqual({
      success: true,
      error: null,
    });
  });

  it("strict: accepts valid formatted CNPJ", () => {
    expect(cnpj.validate("73.450.392/0001-64", { strict: true })).toEqual({
      success: true,
      error: null,
    });
  });

  it("strict: returns failure with INVALID_FORMAT for characters outside [A-Za-z0-9./-]", () => {
    const result = cnpj.validate("73$450392000164", { strict: true });
    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(CnpjError);
    expect(result.error?.code).toBe("INVALID_FORMAT");
  });

  it("strict: returns failure with INVALID_FORMAT for short input", () => {
    const result = cnpj.validate("1234", { strict: true });
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("INVALID_FORMAT");
  });

  it("strict: returns failure with INVALID_CHECK_DIGITS for wrong DVs", () => {
    const result = cnpj.validate("73450392000100", { strict: true });
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("INVALID_CHECK_DIGITS");
  });

  it("strict: returns failure with INVALID_FORMAT for spaces in input", () => {
    const result = cnpj.validate("12ABC3450 1DE35", { strict: true });
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("INVALID_FORMAT");
  });

  it("accepts undefined options and uses defaults", () => {
    expect(cnpj.validate("73450392000164", undefined)).toEqual({ success: true, error: null });
  });

  it("throws TypeError for non-string input", () => {
    expect(() => cnpj.validate(null as unknown as string)).toThrow(TypeError);
    expect(() => cnpj.validate(undefined as unknown as string)).toThrow(TypeError);
    expect(() => cnpj.validate(73450392000164 as unknown as string)).toThrow(TypeError);
    expect(() => cnpj.validate({} as unknown as string)).toThrow(TypeError);
  });

  it("throws TypeError for invalid options type", () => {
    expect(() => cnpj.validate("73450392000164", null as unknown as object)).toThrow(TypeError);
    expect(() => cnpj.validate("73450392000164", 123 as unknown as object)).toThrow(TypeError);
    expect(() => cnpj.validate("73450392000164", [] as unknown as object)).toThrow(TypeError);
  });
});

// ─── CnpjError class ─────────────────────────────────────────────────────────

describe("CnpjError", () => {
  it("is a proper subclass of Error", () => {
    const err = new CnpjError("INVALID_FORMAT");
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(CnpjError);
  });

  it("has name CnpjError", () => {
    const err = new CnpjError("INVALID_LENGTH");
    expect(err.name).toBe("CnpjError");
  });

  it("stores the error code", () => {
    const err = new CnpjError("INVALID_CHECK_DIGITS");
    expect(err.code).toBe("INVALID_CHECK_DIGITS");
  });

  it("uses code as default message when no message is provided", () => {
    const err = new CnpjError("INVALID_FORMAT");
    expect(err.message).toBe("INVALID_FORMAT");
  });

  it("uses custom message when provided", () => {
    const err = new CnpjError("INVALID_LENGTH", "Custom message");
    expect(err.message).toBe("Custom message");
  });
});

// ─── cnpj.generate ───────────────────────────────────────────────────────────

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

// ─── Algorithm correctness (SERPRO official example) ─────────────────────────

describe("CNPJ DV algorithm — official SERPRO example", () => {});
