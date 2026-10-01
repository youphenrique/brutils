import { afterEach, describe, expect, expectTypeOf, it, vi } from "vite-plus/test";

import { cpf } from "../../src/index.ts";
import { CpfError } from "../../src/utilities/cpf";
import * as cpfUtils from "../../src/utilities/cpf/utils.ts";

// Fixed fixtures, independent of generate(). Remainders are the mod-11 sums behind each check digit;
// 0 and 1 both yield a zero check digit, so the table covers that boundary for each position.
const fixtures = [
  { raw: "12345678909", formatted: "123.456.789-09", remainders: [1, 2] },
  { raw: "52263944621", formatted: "522.639.446-21", remainders: [9, 10] },
  { raw: "00000000191", formatted: "000.000.001-91", remainders: [2, 10] },
  { raw: "00000000515", formatted: "000.000.005-15", remainders: [10, 6] },
  { raw: "00000000604", formatted: "000.000.006-04", remainders: [1, 7] },
  { raw: "00000000949", formatted: "000.000.009-49", remainders: [7, 2] },
  { raw: "00000001406", formatted: "000.000.014-06", remainders: [0, 5] },
  { raw: "00000001830", formatted: "000.000.018-30", remainders: [8, 1] },
  { raw: "00000001910", formatted: "000.000.019-10", remainders: [10, 0] },
] as const;

function mockRandomDigits(digits: string) {
  const randomSpy = vi.spyOn(Math, "random");
  for (const digit of digits) {
    randomSpy.mockReturnValueOnce((Number(digit) + 0.5) / 10);
  }
  return randomSpy;
}

describe("CPF checksum conformance", () => {
  it.each(fixtures)("accepts $raw and its canonical representation", ({ raw, formatted }) => {
    for (const value of [raw, formatted]) {
      expect(cpf.validate(value)).toEqual({ success: true, error: null });
      expect(cpf.normalize(value)).toBe(raw);
      expect(cpf.format(value)).toBe(formatted);
      expect(cpf.formatAsYouType(value)).toBe(formatted);
      expect(cpf.mask(value)).toBe(`***.***.***-${raw.slice(-2)}`);
    }
  });

  it.each(fixtures)("rejects independent corruption of either check digit of $raw", ({ raw }) => {
    for (const position of [9, 10]) {
      for (const replacement of "0123456789") {
        if (replacement === raw[position]) continue;
        const corrupted = raw.slice(0, position) + replacement + raw.slice(position + 1);
        for (const value of [corrupted, cpf.format(corrupted)]) {
          const result = cpf.validate(value);
          expect(result.success).toBe(false);
          expect(result.error).toBeInstanceOf(CpfError);
          expect(result.error?.code).toBe("INVALID_CHECKSUM");
        }
      }
    }
  });

  it.each(Array.from("0123456789"))("rejects all-%s digits in either shape", (digit) => {
    const raw = digit.repeat(11);
    for (const value of [raw, cpf.format(raw)]) {
      expect(cpf.validate(value).error?.code).toBe("REPEATED_DIGITS");
    }
  });
});

describe("CPF public input matrix", () => {
  const cases = [
    { value: "", digits: "", display: "" },
    { value: "123", digits: "123", display: "123" },
    { value: "abc", digits: "", display: "" },
    { value: "1234567890", digits: "1234567890", display: "123.456.789-0" },
    { value: "123.456.789-0", digits: "1234567890", display: "123.456.789-0" },
    { value: "123456789091", digits: "123456789091", display: "123.456.789-09" },
    { value: "123.456.789-09123", digits: "12345678909123", display: "123.456.789-09" },
    { value: "123.456789-09", digits: "12345678909", display: "123.456.789-09" },
    { value: "123-456.789.09", digits: "12345678909", display: "123.456.789-09" },
    { value: "123.456.789.09", digits: "12345678909", display: "123.456.789-09" },
    { value: "123a45678909", digits: "12345678909", display: "123.456.789-09" },
    { value: " 12345678909 ", digits: "12345678909", display: "123.456.789-09" },
    { value: "123 456\t78909", digits: "12345678909", display: "123.456.789-09" },
    { value: "12345678909\n", digits: "12345678909", display: "123.456.789-09" },
    { value: "123.456.789-09\r\n", digits: "12345678909", display: "123.456.789-09" },
    { value: "１２３４５６７８９０９", digits: "", display: "" },
    { value: "١٢٣٤٥٦٧٨٩٠٩", digits: "", display: "" },
    { value: "１2345678909", digits: "2345678909", display: "234.567.890-9" },
  ];

  it.each(cases)("applies each malformed-string policy to $value", ({ value, digits, display }) => {
    expect(cpf.normalize(value)).toBe(digits);
    expect(cpf.format(value)).toBe(value);
    expect(cpf.mask(value)).toBeNull();
    expect(cpf.formatAsYouType(value)).toBe(display);
    expect(cpf.validate(value).error?.code).toBe("INVALID_FORMAT");
  });

  it.each(
    [
      null,
      undefined,
      12345678909,
      NaN,
      true,
      123n,
      Symbol("cpf"),
      {},
      [],
      new String("12345678909"),
      () => "12345678909",
      {
        toString() {
          throw new Error("Input must not be coerced");
        },
      },
    ].map((value) => ({ value })),
  )("handles wrong runtime type %# without coercion", ({ value }) => {
    for (const transform of [cpf.normalize, cpf.format, cpf.mask, cpf.formatAsYouType]) {
      expect(() => transform(value as never)).toThrow(TypeError);
    }
    const result = cpf.validate(value);
    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(CpfError);
    expect(result.error?.code).toBe("INVALID_TYPE");
  });

  it("formats and masks a bad checksum without claiming validity", () => {
    expect(cpf.format("12345678900")).toBe("123.456.789-00");
    expect(cpf.format("123.456.789-00")).toBe("123.456.789-00");
    expect(cpf.normalize("123.456.789-00")).toBe("12345678900");
    expect(cpf.mask("123.456.789-00")).toBe("***.***.***-00");
    expect(cpf.validate("123.456.789-00").error?.code).toBe("INVALID_CHECKSUM");
  });
});

describe("cpf.mask", () => {
  it("uses defaults for omitted options and explicit undefined properties", () => {
    expect(cpf.mask("29650899006", {})).toBe("***.***.***-06");
    expect(cpf.mask("29650899006", { char: undefined, mode: undefined })).toBe("***.***.***-06");
    expect(cpf.mask("29650899006", undefined)).toBe("***.***.***-06");
  });

  it("applies each mode to raw and canonical input without checking the checksum", () => {
    const cases = [
      ["suffix", "***.***.***-06", "***.***.***-00"],
      ["prefix-suffix", "296.***.***-06", "123.***.***-00"],
      ["redacted", "***.***.***-**", "***.***.***-**"],
    ] as const;

    for (const [mode, validExpected, badChecksumExpected] of cases) {
      expect(cpf.mask("29650899006", { mode })).toBe(validExpected);
      expect(cpf.mask("296.508.990-06", { mode })).toBe(validExpected);
      expect(cpf.mask("12345678900", { mode })).toBe(badChecksumExpected);
      expect(cpf.mask("123.456.789-00", { mode })).toBe(badChecksumExpected);
    }
  });

  it("replaces every hidden digit with a custom character", () => {
    expect(cpf.mask("29650899006", { char: "#" })).toBe("###.###.###-06");
    expect(cpf.mask("29650899006", { char: "#", mode: "prefix-suffix" })).toBe("296.###.###-06");
    expect(cpf.mask("29650899006", { char: "#", mode: "redacted" })).toBe("###.###.###-##");
    expect(cpf.mask("29650899006", { char: "🔒", mode: "redacted" })).toBe(
      "🔒🔒🔒.🔒🔒🔒.🔒🔒🔒-🔒🔒",
    );
  });

  it("rejects invalid options containers and values with descriptive TypeErrors", () => {
    for (const options of [null, [], "redacted", 1]) {
      expect(() => cpf.mask("29650899006", options as never)).toThrow(/Expected an options object/);
    }

    for (const mode of ["redact", "", 0, null, false]) {
      expect(() => cpf.mask("29650899006", { mode } as never)).toThrow(/Expected CPF mask mode/);
    }

    expect(() => cpf.mask("29650899006", { mode: "redact" } as never)).toThrow(
      'Expected CPF mask mode to be one of "suffix", "prefix-suffix", "redacted", but received "redact"',
    );
    expect(() => cpf.mask("29650899006", { char: 1 } as never)).toThrow(/but received number$/);

    for (const char of [
      "",
      "##",
      "🔒️",
      "0",
      "١",
      "Ⅷ",
      " ",
      "\t",
      " ",
      "́",
      "‍",
      "\u0000",
      "\ud800",
      "\udc00",
      "ㅤ",
      "ﾠ",
      "⠀",
      "",
      "͸",
      ".",
      "-",
      1,
      null,
    ]) {
      expect(() => cpf.mask("29650899006", { char } as never)).toThrow(/Expected CPF mask char/);
    }
  });

  it("validates options before returning null for a malformed CPF", () => {
    expect(() => cpf.mask("12", { mode: "redact" } as never)).toThrow(/Expected CPF mask mode/);
    expect(() => cpf.mask("12", { char: "0" })).toThrow(/Expected CPF mask char/);
    expect(cpf.mask("12", { mode: "redacted" })).toBeNull();
  });
});

describe("cpf.validate", () => {
  afterEach(() => vi.restoreAllMocks());

  it("describes the received type in the INVALID_TYPE message", () => {
    expect(cpf.validate(null).error?.message).toBe(
      "Expected a string for CPF validation, but received null.",
    );
    expect(cpf.validate([]).error?.message).toMatch(/received array\.$/);
    expect(cpf.validate(123).error?.message).toMatch(/received number\.$/);
  });

  it("returns the original expected validation error", () => {
    const error = new CpfError("INVALID_FORMAT");
    vi.spyOn(cpfUtils, "assertValid").mockImplementation(() => {
      throw error;
    });
    expect(cpf.validate("52263944621").error).toBe(error);
  });

  it.each([
    new Error("Internal defect"),
    new TypeError("Internal type error"),
    { defect: true },
    "defect",
    null,
    undefined,
  ])("rethrows unexpected exceptions unchanged %#", (error) => {
    vi.spyOn(cpfUtils, "assertValid").mockImplementation(() => {
      throw error;
    });

    const caught = vi.fn();

    try {
      cpf.validate("52263944621");
    } catch (thrown) {
      caught(thrown);
    }

    expect(caught).toHaveBeenCalledExactlyOnceWith(error);
  });
});

describe("CpfError", () => {
  it("is a proper subclass of Error", () => {
    const err = new CpfError("INVALID_FORMAT");
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(CpfError);
  });

  it("CpfError has its properties", () => {
    const err = new CpfError("INVALID_FORMAT");
    expect(err.name).toBe("CpfError");
    expect(err.code).toBe("INVALID_FORMAT");
    // uses code as default message when no message is provided
    expect(err.message).toBe("INVALID_FORMAT");
  });

  it("uses custom message when provided", () => {
    const err = new CpfError("REPEATED_DIGITS", "Custom message");
    expect(err.message).toBe("Custom message");
  });
});

describe("cpf.generate", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([undefined, {}, { formatted: undefined }, { formatted: false }, { formatted: true }])(
    "generates a CPF with options %j",
    (options) => {
      mockRandomDigits("123456789");

      expect(cpf.generate(options)).toBe(options?.formatted ? "123.456.789-09" : "12345678909");
    },
  );

  it.each(fixtures)(
    "computes the fixed fixture $raw (checksum remainders $remainders)",
    ({ raw, formatted }) => {
      const randomSpy = mockRandomDigits(raw.slice(0, 9));
      expect(cpf.generate()).toBe(raw);
      expect(randomSpy).toHaveBeenCalledTimes(9);

      mockRandomDigits(raw.slice(0, 9));
      expect(cpf.generate({ formatted: true })).toBe(formatted);
    },
  );

  it.each(Array.from({ length: 10 }, (_, digit) => digit))(
    "rerolls an all-%i base until a different digit is drawn",
    (digit) => {
      const randomSpy = vi.spyOn(Math, "random");
      const repeated = (digit + 0.5) / 10;
      const replacement = (digit + 1) % 10;
      for (let i = 0; i < 9; i += 1) {
        randomSpy.mockReturnValueOnce(repeated);
      }
      randomSpy
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(repeated)
        .mockReturnValueOnce((replacement + 0.5) / 10);

      const generated = cpf.generate();

      expect(generated.slice(0, 9)).toBe(String(replacement) + String(digit).repeat(8));
      expect(cpf.validate(generated).success).toBe(true);
      expect(randomSpy).toHaveBeenCalledTimes(12);
    },
  );

  it.each([null, 123, "x", true, [], () => {}])(
    "throws a TypeError for invalid options container %j",
    (options) => {
      expect(() => cpf.generate(options as any)).toThrow(TypeError);
    },
  );

  it.each([null, "true", "false", "", 0, 1, {}, [], Object(false)])(
    "rejects non-boolean formatted value %j before drawing digits",
    (formatted) => {
      const randomSpy = vi.spyOn(Math, "random");

      expect(() => cpf.generate({ formatted } as any)).toThrow(
        new TypeError("Expected CPF generate formatted to be a boolean."),
      );
      expect(randomSpy).not.toHaveBeenCalled();
    },
  );
});

describe("cpf.formatAsYouType", () => {
  it.each([
    ["5", "5"],
    ["52", "52"],
    ["522", "522"],
    ["5226", "522.6"],
    ["52263", "522.63"],
    ["522639", "522.639"],
    ["5226394", "522.639.4"],
    ["52263944", "522.639.44"],
    ["522639446", "522.639.446"],
    ["5226394462", "522.639.446-2"],
  ])("inserts separators at each boundary for %s", (input, expected) => {
    expect(cpf.formatAsYouType(input)).toBe(expected);
  });
});

// CPF scope of #34 and #38; constants remain public pending the broader API audit.
describe("CPF public surface", () => {
  it("exposes the reviewed CPF runtime namespace", () => {
    expect(Object.keys(cpf).sort()).toEqual([
      "CPF_FORMATTED_PATTERN",
      "CPF_LENGTH",
      "CPF_MASK_MODES",
      "CPF_RAW_PATTERN",
      "CpfError",
      "format",
      "formatAsYouType",
      "generate",
      "mask",
      "normalize",
      "validate",
    ]);
  });

  // Type assertions are enforced by `tsc --noEmit` (the typecheck script), not at runtime.
  it("exposes the documented public types and signatures", () => {
    expectTypeOf<cpf.CpfGenerateOptions>().toEqualTypeOf<{ formatted?: boolean }>();
    expectTypeOf<cpf.CpfMaskOptions>().toEqualTypeOf<{
      char?: string;
      mode?: "suffix" | "prefix-suffix" | "redacted";
    }>();
    expectTypeOf<cpf.CpfMaskMode>().toEqualTypeOf<"suffix" | "prefix-suffix" | "redacted">();
    expectTypeOf<cpf.CpfErrorCode>().toEqualTypeOf<
      "INVALID_TYPE" | "INVALID_FORMAT" | "REPEATED_DIGITS" | "INVALID_CHECKSUM"
    >();
    for (const transform of [cpf.normalize, cpf.format, cpf.formatAsYouType]) {
      expectTypeOf(transform).toEqualTypeOf<(value: string) => string>();
    }
    expectTypeOf(cpf.mask).toEqualTypeOf<
      (value: string, options?: cpf.CpfMaskOptions) => string | null
    >();
    expectTypeOf(cpf.generate).toEqualTypeOf<(options?: cpf.CpfGenerateOptions) => string>();
    expectTypeOf(cpf.validate).parameter(0).toEqualTypeOf<unknown>();

    // @ts-expect-error formatted is a boolean, even for JavaScript-style truthy values.
    expectTypeOf(cpf.generate).toBeCallableWith({ formatted: "true" });
    // @ts-expect-error Region control was removed in #62.
    expectTypeOf(cpf.generate).toBeCallableWith({ uf: "SP" });
    // @ts-expect-error Privacy modes use the documented literal union.
    expectTypeOf(cpf.mask).toBeCallableWith("12345678909", { mode: "invalid" });
    // @ts-expect-error Mask characters must be strings.
    expectTypeOf(cpf.mask).toBeCallableWith("12345678909", { char: 1 });
    // @ts-expect-error Padding was removed in #59.
    expectTypeOf(cpf.format).toBeCallableWith("123", { pad: true });
    // @ts-expect-error Retired validation result aliases are not public.
    expectTypeOf<cpf.CpfValidateResult>().not.toBeNever();
    // @ts-expect-error Retired padding option types are not public.
    expectTypeOf<cpf.CpfFormatOptions>().not.toBeNever();
  });

  it("narrows the validation result by success", () => {
    const result: cpf.CpfValidationResult = cpf.validate("123");

    if (result.success) {
      expectTypeOf(result.error).toEqualTypeOf<null>();
    } else {
      expectTypeOf(result.error).toEqualTypeOf<cpf.CpfError>();
      expectTypeOf(result.error.code).toEqualTypeOf<cpf.CpfErrorCode>();
      expectTypeOf(result.error).toExtend<Error>();
    }
  });
});
