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
    expect(cnpj.validate("73.450.392/0001-64")).toBe(true);
  });

  it("accepts a valid unformatted numeric CNPJ", () => {
    expect(cnpj.validate("73450392000164")).toBe(true);
  });

  it("rejects all-same-character CNPJ", () => {
    expect(cnpj.validate("00000000000000")).toBe(false);
    expect(cnpj.validate("11111111111111")).toBe(false);
  });

  it("rejects a CNPJ with wrong check digits", () => {
    expect(cnpj.validate("73450392000100")).toBe(false);
  });

  // Alphanumeric CNPJ
  it("accepts the official SERPRO alphanumeric example", () => {
    expect(cnpj.validate("12.ABC.345/01DE-35")).toBe(true);
  });

  it("accepts alphanumeric CNPJ with spaces stripped", () => {
    expect(cnpj.validate("12ABC3450 1DE35")).toBe(true);
  });

  it("rejects alphanumeric CNPJ with wrong check digits", () => {
    expect(cnpj.validate("12ABC3450 1DE99")).toBe(false);
  });

  it("accepts lowercase input by uppercasing internally", () => {
    expect(cnpj.validate("12.abc.345/01de-35")).toBe(true);
  });

  it("rejects CNPJ with invalid length", () => {
    expect(cnpj.validate("1234")).toBe(false);
    expect(cnpj.validate("")).toBe(false);
  });

  // Strict mode
  it("strict: accepts valid unformatted CNPJ", () => {
    expect(cnpj.validate("73450392000164", { strict: true })).toBe(true);
  });

  it("strict: accepts valid formatted CNPJ", () => {
    expect(cnpj.validate("73.450.392/0001-64", { strict: true })).toBe(true);
  });

  it("strict: throws INVALID_FORMAT for characters outside [A-Za-z0-9./-]", () => {
    expect(() => cnpj.validate("73$450392000164", { strict: true })).toThrow(CnpjError);

    try {
      cnpj.validate("73$450392000164", { strict: true });
    } catch (e) {
      expect(e).toBeInstanceOf(CnpjError);
      if (e instanceof CnpjError) {
        expect(e.code).toBe("INVALID_FORMAT");
      }
    }
  });

  it("strict: throws INVALID_LENGTH for short input", () => {
    expect(() => cnpj.validate("1234", { strict: true })).toThrow(CnpjError);

    try {
      cnpj.validate("1234", { strict: true });
    } catch (e) {
      if (e instanceof CnpjError) {
        expect(e.code).toBe("INVALID_LENGTH");
      }
    }
  });

  it("strict: throws INVALID_CHECK_DIGITS for wrong DVs", () => {
    expect(() => cnpj.validate("73450392000100", { strict: true })).toThrow(CnpjError);

    try {
      cnpj.validate("73450392000100", { strict: true });
    } catch (e) {
      if (e instanceof CnpjError) {
        expect(e.code).toBe("INVALID_CHECK_DIGITS");
      }
    }
  });

  it("strict: throws INVALID_FORMAT for spaces in input", () => {
    expect(() => cnpj.validate("12ABC3450 1DE35", { strict: true })).toThrow(CnpjError);
  });

  it("accepts undefined options and uses defaults", () => {
    expect(cnpj.validate("73450392000164", undefined)).toBe(true);
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

// ─── cnpj.safeValidate ───────────────────────────────────────────────────────

describe("cnpj.safeValidate", () => {
  it("returns success: true for a valid formatted CNPJ", () => {
    expect(cnpj.safeValidate("12.ABC.345/01DE-35")).toEqual({
      success: true,
      error: null,
    });
  });

  it("returns success: true for a valid numeric CNPJ", () => {
    expect(cnpj.safeValidate("73.450.392/0001-64")).toEqual({
      success: true,
      error: null,
    });
  });

  it("returns success: false with INVALID_CHECK_DIGITS for wrong DVs", () => {
    const result = cnpj.safeValidate("12ABC3450 1DE99");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeInstanceOf(CnpjError);
      expect(result.error.code).toBe("INVALID_CHECK_DIGITS");
    }
  });

  it("returns success: false with INVALID_LENGTH for short input", () => {
    const result = cnpj.safeValidate("1234");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("INVALID_LENGTH");
    }
  });

  it("returns success: false with INVALID_CHECK_DIGITS for all-same CNPJ", () => {
    const result = cnpj.safeValidate("00000000000000");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("INVALID_CHECK_DIGITS");
    }
  });

  it("never throws for any string input", () => {
    expect(() => cnpj.safeValidate("")).not.toThrow();
    expect(() => cnpj.safeValidate("gibberish!@#")).not.toThrow();
    expect(() => cnpj.safeValidate("00000000000000")).not.toThrow();
  });

  it("throws TypeError for non-string input", () => {
    expect(() => cnpj.safeValidate(null as unknown as string)).toThrow(TypeError);
    expect(() => cnpj.safeValidate(undefined as unknown as string)).toThrow(TypeError);
    expect(() => cnpj.safeValidate(73450392000164 as unknown as string)).toThrow(TypeError);
  });
});

// ─── cnpj.generate ───────────────────────────────────────────────────────────

describe("cnpj.generate", () => {
  it("generates a valid 14-character numeric CNPJ by default", () => {
    const generated = cnpj.generate();
    expect(generated).toMatch(/^\d{14}$/);
    expect(cnpj.validate(generated)).toBe(true);
  });

  it("generates a valid formatted CNPJ when formatted: true", () => {
    const generated = cnpj.generate({ formatted: true });
    expect(generated).toMatch(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/);
    expect(cnpj.validate(generated)).toBe(true);
  });

  it("generates a valid alphanumeric CNPJ", () => {
    const generated = cnpj.generate({ alphanumeric: true });
    expect(cnpj.validate(generated)).toBe(true);
  });

  it("generates a valid formatted alphanumeric CNPJ", () => {
    const generated = cnpj.generate({ formatted: true, alphanumeric: true });
    expect(generated).toMatch(/^\w{2}\.\w{3}\.\w{3}\/\w{4}-\d{2}$/);
    expect(cnpj.validate(generated)).toBe(true);
  });

  it("never generates an all-same-character CNPJ across 1000 runs", () => {
    for (let i = 0; i < 1000; i++) {
      const generated = cnpj.generate();
      expect(/^(.)\1{13}$/.test(generated)).toBe(false);
    }
  });

  it("alphanumeric mode: positions 9–12 (branch segment) are always digits", () => {
    for (let i = 0; i < 100; i++) {
      const generated = cnpj.generate({ alphanumeric: true });
      const branch = generated.slice(8, 12);
      expect(branch).toMatch(/^\d{4}$/);
    }
  });

  it("validates 100 generated CNPJs (numeric)", () => {
    for (let i = 0; i < 100; i++) {
      expect(cnpj.validate(cnpj.generate())).toBe(true);
    }
  });

  it("validates 100 generated CNPJs (alphanumeric)", () => {
    for (let i = 0; i < 100; i++) {
      expect(cnpj.validate(cnpj.generate({ alphanumeric: true }))).toBe(true);
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

// ─── Algorithm correctness (SERPRO official example) ─────────────────────────

describe("CNPJ DV algorithm — official SERPRO example", () => {
  it("validates the official SERPRO alphanumeric CNPJ: 12.ABC.345/01DE-35", () => {
    expect(cnpj.validate("12.ABC.345/01DE-35")).toBe(true);
  });

  it("rejects the example with incorrect check digits", () => {
    expect(cnpj.validate("12.ABC.345/01DE-99")).toBe(false);
    expect(cnpj.validate("12.ABC.345/01DE-00")).toBe(false);
  });

  it("rejects check digits that are only partially correct", () => {
    expect(cnpj.validate("12.ABC.345/01DE-30")).toBe(false);
    expect(cnpj.validate("12.ABC.345/01DE-05")).toBe(false);
  });
});
