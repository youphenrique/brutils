import { afterEach, describe, expect, expectTypeOf, it, vi } from "vite-plus/test";

import { cpf } from "../../src/index.ts";
import { CpfError } from "../../src/utilities/cpf";

describe("cpf.normalize", () => {
  it("strips non-digit characters from a partial, overlong, or well-formed CPF", () => {
    expect(cpf.normalize("779.333.21")).toBe("77933321");
    expect(cpf.normalize("916.534.780-39")).toBe("91653478039");
    expect(cpf.normalize("779.333.210-5466")).toBe("7793332105466");
  });

  it("handles partially formatted and mixed inputs", () => {
    expect(cpf.normalize("916.534780-39")).toBe("91653478039");
    expect(cpf.normalize("abc916!!!534...780--39def")).toBe("91653478039");
    expect(cpf.normalize(" 916.534.780-39 ")).toBe("91653478039");
    // "９" is U+FF19 (full-width nine), not ASCII "9"; normalize keeps only ASCII digits, so it's dropped.
    expect(cpf.normalize("９16.534.780-39")).toBe("1653478039");
  });

  it("returns the same string for already-normalized input", () => {
    expect(cpf.normalize("91653478039")).toBe("91653478039");
  });

  it("preserves leading zeros", () => {
    expect(cpf.normalize("00000000191")).toBe("00000000191");
    expect(cpf.normalize("000.000.001-91")).toBe("00000000191");
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
  it("reveals only the last two digits of a raw CPF", () => {
    expect(cpf.mask("91653478039")).toBe("***.***.***-39");
    expect(cpf.mask("00000000191")).toBe("***.***.***-91");
  });

  it("masks a canonically formatted CPF", () => {
    expect(cpf.mask("916.534.780-39")).toBe("***.***.***-39");
  });

  it("accepts a well-shaped CPF even when its checksum is wrong", () => {
    expect(cpf.validate("12345678900").error?.code).toBe("INVALID_CHECKSUM");
    expect(cpf.mask("12345678900")).toBe("***.***.***-00");
    expect(cpf.mask("123.456.789-00")).toBe("***.***.***-00");
  });

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

  it("returns null for empty, partial, overlong, and mixed input", () => {
    for (const value of [
      "",
      "12",
      "1234567890",
      "916.534.780-3",
      "241550840318",
      "916.534.780-39621",
      "91653478039\n",
      "916.534.780-39\n",
      "916.534780-39",
      "abc916!!!534...780--39def",
      " 916.534.780-39 ",
      "９1653478039",
    ]) {
      expect(cpf.mask(value)).toBeNull();
    }
  });

  it("throws a TypeError for invalid type input", () => {
    expect(() => cpf.mask(null as any)).toThrow(TypeError);
    expect(() => cpf.mask(undefined as any)).toThrow(TypeError);
    expect(() => cpf.mask(12345678909 as any)).toThrow(TypeError);
    expect(() => cpf.mask({} as any)).toThrow(TypeError);
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
      "\u00a0",
      "\u0301",
      "\u200d",
      "\u0000",
      "\ud800",
      "\udc00",
      "\u3164",
      "\uffa0",
      "\u2800",
      "\ue000",
      "\u0378",
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

describe("cpf.format", () => {
  it("formats valid unformatted CPF", () => {
    expect(cpf.format("52263944621")).toBe("522.639.446-21");
  });

  it("preserves canonical formatted CPF", () => {
    expect(cpf.format("522.639.446-21")).toBe("522.639.446-21");
  });

  it("formats well-shaped CPF without checking its checksum", () => {
    expect(cpf.format("12345678900")).toBe("123.456.789-00");
    expect(cpf.format("123.456.789-00")).toBe("123.456.789-00");
  });

  it("preserves leading zeros", () => {
    expect(cpf.format("00000000191")).toBe("000.000.001-91");
  });

  it("returns as is for CPFs with whitespace and non-numeric characters", () => {
    expect(cpf.format("  522 639 446 21  ")).toBe("  522 639 446 21  ");
    expect(cpf.format("943.?ABC895.751-04abc")).toBe("943.?ABC895.751-04abc");
    expect(cpf.format("522.63944621")).toBe("522.63944621");
    expect(cpf.format("９1653478039")).toBe("９1653478039");
  });

  it("returns as is for invalid CPF lengths", () => {
    expect(cpf.format("")).toBe("");
    expect(cpf.format("9")).toBe("9");
    expect(cpf.format("9438")).toBe("9438");
    expect(cpf.format("51660311055742")).toBe("51660311055742");
  });

  it("throws a TypeError for invalid type input", () => {
    expect(() => cpf.format(null as any)).toThrow(TypeError);
    expect(() => cpf.format(undefined as any)).toThrow(TypeError);
    expect(() => cpf.format(12345678909 as any)).toThrow(TypeError);
    expect(() => cpf.format({} as any)).toThrow(TypeError);
  });
});

describe("cpf.validate", () => {
  it("returns failure with INVALID_FORMAT for malformed input", () => {
    const result = cpf.validate("101#688!!!!!!542......36");
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("INVALID_FORMAT");

    for (const value of [
      "916.534780-39",
      "abc916!!!534...780--39def",
      " 916.534.780-39 ",
      "９1653478039",
    ]) {
      expect(cpf.validate(value).error?.code).toBe("INVALID_FORMAT");
    }
  });

  it("returns failure with INVALID_FORMAT for wrong length", () => {
    let result = cpf.validate("1004218907");
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("INVALID_FORMAT");

    result = cpf.validate("512.010.189");
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("INVALID_FORMAT");

    result = cpf.validate("232948430542");
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("INVALID_FORMAT");

    result = cpf.validate("");
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("INVALID_FORMAT");
  });

  it("returns failure with REPEATED_DIGITS for all-same-digit CPF", () => {
    const result = cpf.validate("000.000.000-00");
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("REPEATED_DIGITS");

    expect(cpf.validate("11111111111").success).toBe(false);
    expect(cpf.validate("55555555555").success).toBe(false);
    expect(cpf.validate("99999999999").success).toBe(false);
  });

  it("returns failure with INVALID_CHECKSUM for incorrect check digits", () => {
    let result = cpf.validate("12345678900");
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("INVALID_CHECKSUM");

    result = cpf.validate("11257245286");
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("INVALID_CHECKSUM");

    result = cpf.validate("123.456.789-00");
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("INVALID_CHECKSUM");
  });

  it("returns success for raw and formatted valid inputs", () => {
    expect(cpf.validate("32678128016")).toEqual({ success: true, error: null });
    expect(cpf.validate("422.091.120-01")).toEqual({ success: true, error: null });
    expect(cpf.validate("00000000191")).toEqual({ success: true, error: null });
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

  it("exposes only an optional boolean formatted option", () => {
    expectTypeOf<keyof cpf.CpfGenerateOptions>().toEqualTypeOf<"formatted">();
    expectTypeOf<cpf.CpfGenerateOptions["formatted"]>().toEqualTypeOf<boolean | undefined>();
  });

  it.each([undefined, {}, { formatted: undefined }, { formatted: false }, { formatted: true }])(
    "generates a structurally valid CPF with options %j",
    (options) => {
      const generated = cpf.generate(options);

      expect(generated).toMatch(options?.formatted ? /^\d{3}\.\d{3}\.\d{3}-\d{2}$/ : /^\d{11}$/);
      expect(cpf.validate(generated).success).toBe(true);
    },
  );

  it.each([
    ["00000000191", 2, 10],
    ["00000000515", 10, 6],
    ["00000000604", 1, 7],
    ["00000000949", 7, 2],
    ["00000001406", 0, 5],
    ["00000001830", 8, 1],
    ["00000001910", 10, 0],
  ])(
    "preserves leading zeroes and computes %s (checksum remainders %i, %i)",
    (expected, first, second) => {
      const remainder = (digits: string, weightStart: number) =>
        Array.from(digits, Number).reduce(
          (sum, digit, index) => sum + digit * (weightStart - index),
          0,
        ) % 11;
      expect(remainder(expected.slice(0, 9), 10)).toBe(first);
      expect(remainder(expected.slice(0, 10), 11)).toBe(second);

      const randomSpy = vi.spyOn(Math, "random");
      for (const digit of expected.slice(0, 9)) {
        randomSpy.mockReturnValueOnce((Number(digit) + 0.5) / 10);
      }

      expect(cpf.generate()).toBe(expected);
      expect(cpf.validate(expected).success).toBe(true);
      expect(randomSpy).toHaveBeenCalledTimes(9);
    },
  );

  it("preserves leading zeroes in formatted output", () => {
    const randomSpy = vi.spyOn(Math, "random");
    for (const digit of "000000001") {
      randomSpy.mockReturnValueOnce((Number(digit) + 0.5) / 10);
    }

    const generated = cpf.generate({ formatted: true });

    expect(generated).toBe("000.000.001-91");
    expect(cpf.validate(generated).success).toBe(true);
  });

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
  const cases: Array<[string, string]> = [
    ["", ""],
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
    ["52263944621", "522.639.446-21"],
    ["522639446219", "522.639.446-21"],
    ["52263944621999", "522.639.446-21"],
    ["522.639.446-21", "522.639.446-21"],
    ["12345678900", "123.456.789-00"],
    ["00000000191", "000.000.001-91"],
    ["abc522.639.446-21xyz", "522.639.446-21"],
    ["５٢52263944621", "522.639.446-21"],
    ["abc", ""],
  ];

  it("applies progressive CPF formatting", () => {
    for (const [input, expected] of cases) {
      expect(cpf.formatAsYouType(input)).toBe(expected);
    }
  });

  it("does not establish validity of the original input", () => {
    const pasted = "abc52263944621";

    expect(cpf.formatAsYouType(pasted)).toBe("522.639.446-21");
    expect(cpf.validate(pasted).success).toBe(false);
  });

  it("throws a TypeError for invalid type input", () => {
    expect(() => cpf.formatAsYouType(null as any)).toThrow(TypeError);
    expect(() => cpf.formatAsYouType(undefined as any)).toThrow(TypeError);
    expect(() => cpf.formatAsYouType(12345678909 as any)).toThrow(TypeError);
    expect(() => cpf.formatAsYouType({} as any)).toThrow(TypeError);
  });
});
