import { afterEach, describe, expect, expectTypeOf, it, vi } from "vite-plus/test";

import { cep } from "../../src/index.ts";
import { CepValidationError } from "../../src/utilities/cep";
import * as cepUtils from "../../src/utilities/cep/utils.ts";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("cep.validate", () => {
  it("returns failure with INVALID_FORMAT for malformed input", () => {
    let result = cep.validate("01#310!!!!!!10......0");
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("INVALID_FORMAT");

    result = cep.validate("abc");
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("INVALID_FORMAT");
  });

  it("returns success for valid raw and formatted CEPs", () => {
    expect(cep.validate("54490120")).toEqual({ success: true, error: null });
    expect(cep.validate("54490-120")).toEqual({ success: true, error: null });
    expect(cep.validate("01310100")).toEqual({ success: true, error: null });
    expect(cep.validate("09973-130")).toEqual({ success: true, error: null });
  });

  it("returns failure with INVALID_FORMAT for wrong length", () => {
    let result = cep.validate("60740.38");
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("INVALID_FORMAT");

    result = cep.validate("544901206");
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("INVALID_FORMAT");

    result = cep.validate("");
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("INVALID_FORMAT");
  });

  it("returns failure with REPEATED_DIGITS for all-same-digit", () => {
    let result = cep.validate("00000-000");
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("REPEATED_DIGITS");

    result = cep.validate("11111111");
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("REPEATED_DIGITS");

    expect(cep.validate("55555555").success).toBe(false);
    expect(cep.validate("99999999").success).toBe(false);
  });
});

describe("cep.validate", () => {
  it.each(
    [
      null,
      undefined,
      123,
      NaN,
      true,
      123n,
      Symbol("identifier"),
      {},
      [],
      new String("01001000"),
      () => "01001000",
      {
        toString() {
          throw new Error("Must not coerce input");
        },
      },
    ].map((value) => ({ value })),
  )("returns INVALID_TYPE for non-string input %#", ({ value }) => {
    const result = cep.validate(value);
    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(CepValidationError);
    expect(result.error?.code).toBe("INVALID_TYPE");
  });

  it("describes the received type in the INVALID_TYPE message", () => {
    expect(cep.validate(null).error?.message).toBe(
      "Expected a string for CEP validation, but received null.",
    );
    expect(cep.validate([]).error?.message).toMatch(/received array\.$/);
    expect(cep.validate(123).error?.message).toMatch(/received number\.$/);
  });

  it.each(["", "123", "abc", " 01001000 ", "01001000\n", "９1001000", "010010000"])(
    "returns INVALID_FORMAT for malformed string %#",
    (value) => {
      expect(cep.validate(value).error?.code).toBe("INVALID_FORMAT");
    },
  );

  it("returns the original expected validation error", () => {
    const error = new CepValidationError("INVALID_FORMAT");
    vi.spyOn(cepUtils, "assertValid").mockImplementation(() => {
      throw error;
    });
    expect(cep.validate("01001000").error).toBe(error);
  });

  it.each([
    new Error("Internal defect"),
    new TypeError("Internal type error"),
    { defect: true },
    "defect",
    null,
    undefined,
  ])("rethrows unexpected exceptions unchanged %#", (error) => {
    vi.spyOn(cepUtils, "assertValid").mockImplementation(() => {
      throw error;
    });

    const caught = vi.fn();

    try {
      cep.validate("01001000");
    } catch (thrown) {
      caught(thrown);
    }

    expect(caught).toHaveBeenCalledExactlyOnceWith(error);
  });

  it("narrows the public result type in both branches", () => {
    const successResult: cep.CepValidationResult = cep.validate("01001000");
    const failureResult: cep.CepValidationResult = cep.validate("123");

    if (successResult.success) {
      expectTypeOf(successResult.error).toEqualTypeOf<null>();
    }

    if (!failureResult.success) {
      expectTypeOf(failureResult.error).toEqualTypeOf<cep.CepValidationError>();
      expectTypeOf(failureResult.error.code).toEqualTypeOf<cep.CepErrorCode>();
    }
  });
});

describe("cep.format", () => {
  it("formats only valid 8-digit CEP", () => {
    expect(cep.format("60740380")).toBe("60740-380");
    expect(cep.format("60740-380")).toBe("60740-380");
    expect(cep.format("abc")).toBe("abc");
    expect(cep.format("607403800")).toBe("607403800");
  });

  it("formats valid unformatted CEP", () => {
    expect(cep.format("60740380")).toBe("60740-380");
    expect(cep.format("01310100")).toBe("01310-100");
  });

  it("reformats valid formatted CEP", () => {
    expect(cep.format("60740-380")).toBe("60740-380");
    expect(cep.format("01310-100")).toBe("01310-100");
  });

  it("preserves leading zeros", () => {
    expect(cep.format("00000191")).toBe("00000-191");
  });

  it("returns as is for CEPs with whitespace and non-numeric characters", () => {
    expect(cep.format("  60740380  ")).toBe("  60740380  ");
    expect(cep.format("09.?ABC973.-130abc")).toBe("09.?ABC973.-130abc");
  });

  it("returns as is for invalid CEP lengths", () => {
    expect(cep.format("")).toBe("");
    expect(cep.format("9")).toBe("9");
    expect(cep.format("9438")).toBe("9438");
    expect(cep.format("0997313066")).toBe("0997313066");
  });

  it("left-pads with zeros when pad option is enabled", () => {
    expect(cep.format("", { pad: true })).toBe("00000-000");
    expect(cep.format("9", { pad: true })).toBe("00000-009");
    expect(cep.format("09973130", { pad: true })).toBe("09973-130");
    expect(cep.format("0997313066", { pad: true })).toBe("0997313066");
  });

  it("accepts undefined options and uses defaults", () => {
    expect(cep.format("76811392", undefined)).toBe("76811-392");
  });

  it("throws for edge-case input types", () => {
    expect(() => cep.format(null as any)).toThrow(TypeError);
    expect(() => cep.format(undefined as any)).toThrow(TypeError);
    expect(() => cep.format(60740380 as any)).toThrow(TypeError);
    expect(() => cep.format({} as any)).toThrow(TypeError);
  });
});

describe("cep errors", () => {
  it("CepValidationError is a proper subclass of Error", () => {
    const err = new CepValidationError("INVALID_FORMAT");
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(CepValidationError);
  });

  it("CepValidationError creates typed errors with its properties", () => {
    const validation = new CepValidationError("INVALID_FORMAT");
    expect(validation.name).toBe("CepValidationError");
    expect(validation.code).toBe("INVALID_FORMAT");
  });
});

describe("cep.formatAsYouType", () => {
  const cases: Array<[string, string]> = [
    ["6", "6"],
    ["60", "60"],
    ["607", "607"],
    ["6074", "6074"],
    ["60740", "60740"],
    ["607403", "60740-3"],
    ["6074038", "60740-38"],
    ["60740380", "60740-380"],
    ["607403801", "60740-380"],
    ["60740380123", "60740-380"],
    ["60740-3", "60740-3"],
    ["60740-380", "60740-380"],
    ["00001-000", "00001-000"],
    ["abc60740-380xyz", "60740-380"],
    ["６۰60740380", "60740-380"],
    ["", ""],
    ["abc", ""],
  ];

  it("applies progressive formatting", () => {
    for (const [input, expected] of cases) {
      expect(cep.formatAsYouType(input)).toBe(expected);
    }
  });

  it("throws for edge-case input types", () => {
    expect(() => cep.formatAsYouType(null as any)).toThrow(TypeError);
    expect(() => cep.formatAsYouType(undefined as any)).toThrow(TypeError);
    expect(() => cep.formatAsYouType(60740380 as any)).toThrow(TypeError);
    expect(() => cep.formatAsYouType({} as any)).toThrow(TypeError);
  });
});

describe("cep.normalize", () => {
  it("normalizes CEP input", () => {
    expect(cep.normalize("54490-120")).toBe("54490120");
    expect(cep.normalize("01001-000")).toBe("01001000");
  });

  it("handles invalid chars and mixed inputs lengths", () => {
    expect(cep.normalize("abc")).toBe("");
    expect(cep.normalize("abc544!!!90...12--0def")).toBe("54490120");
    expect(cep.normalize("54490-")).toBe("54490");
    expect(cep.normalize("54490-12067")).toBe("5449012067");
  });

  it("returns the same string for already-normalized input", () => {
    expect(cep.normalize("54490120")).toBe("54490120");
  });

  it("returns an empty string for an empty input", () => {
    expect(cep.normalize("")).toBe("");
  });

  it("throws for edge-case input types", () => {
    expect(() => cep.normalize(null as any)).toThrow(TypeError);
    expect(() => cep.normalize(undefined as any)).toThrow(TypeError);
    expect(() => cep.normalize(60740380 as any)).toThrow(TypeError);
    expect(() => cep.normalize({} as any)).toThrow(TypeError);
  });
});

describe("cep namespace", () => {
  it("exposes no network lookup API", () => {
    expect(Object.keys(cep).sort()).toEqual([
      "CepValidationError",
      "format",
      "formatAsYouType",
      "normalize",
      "validate",
    ]);
  });
});
