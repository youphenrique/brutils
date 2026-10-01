import { describe, expect, it } from "vite-plus/test";
import { cpf } from "@brutils/core";

// Fixed fixtures: includes remainder 0/1 boundaries for each check digit, independent of generate().
const fixtures = [
  ["12345678909", "123.456.789-09"],
  ["52263944621", "522.639.446-21"],
  ["00000000191", "000.000.001-91"],
  ["00000000604", "000.000.006-04"],
  ["00000001406", "000.000.014-06"],
  ["00000001830", "000.000.018-30"],
  ["00000001910", "000.000.019-10"],
] as const;

describe("CPF checksum conformance", () => {
  it.each(fixtures)("accepts %s and its canonical representation", (raw, formatted) => {
    for (const value of [raw, formatted]) {
      expect(cpf.validate(value)).toEqual({ success: true, error: null });
      expect(cpf.normalize(value)).toBe(raw);
      expect(cpf.format(value)).toBe(formatted);
      expect(cpf.formatAsYouType(value)).toBe(formatted);
      expect(cpf.mask(value)).toBe(`***.***.***-${raw.slice(-2)}`);
      expect(cpf.normalize(cpf.format(value))).toBe(raw);
      expect(cpf.format(cpf.normalize(value))).toBe(formatted);
      expect(cpf.format(cpf.format(value))).toBe(formatted);
    }
  });

  it.each(fixtures)("rejects independent corruption of either check digit of %s", (raw) => {
    for (const position of [9, 10]) {
      for (const replacement of "0123456789") {
        if (replacement === raw[position]) continue;
        const corrupted = raw.slice(0, position) + replacement + raw.slice(position + 1);
        for (const value of [corrupted, cpf.format(corrupted)]) {
          const result = cpf.validate(value);
          expect(result.success).toBe(false);
          expect(result.error).toBeInstanceOf(cpf.CpfError);
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
    { value: "1234567890", digits: "1234567890", display: "123.456.789-0" },
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
    expect(cpf.validate(value).error?.code).toBe("INVALID_TYPE");
  });

  it("formats and masks a bad checksum without claiming validity", () => {
    expect(cpf.format("12345678900")).toBe("123.456.789-00");
    expect(cpf.normalize("123.456.789-00")).toBe("12345678900");
    expect(cpf.mask("123.456.789-00")).toBe("***.***.***-00");
    expect(cpf.validate("123.456.789-00").error?.code).toBe("INVALID_CHECKSUM");
  });

  // CPF scope of #34 and #38; constants remain public pending the broader API audit.
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
});
