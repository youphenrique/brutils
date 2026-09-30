import { afterEach, describe, expect, expectTypeOf, it, vi } from "vite-plus/test";
import { cep, cnpj, cpf } from "../src/index.ts";
import * as cepUtils from "../src/utilities/cep/utils.ts";
import * as cnpjUtils from "../src/utilities/cnpj/utils.ts";
import * as cpfUtils from "../src/utilities/cpf/utils.ts";

afterEach(() => vi.restoreAllMocks());

const validators = [
  {
    name: "cpf",
    validate: cpf.validate,
    utils: cpfUtils,
    ErrorClass: cpf.CpfError,
    valid: "52263944621",
  },
  {
    name: "cnpj",
    validate: cnpj.validate,
    utils: cnpjUtils,
    ErrorClass: cnpj.CnpjError,
    valid: "73450392000164",
  },
  {
    name: "cep",
    validate: cep.validate,
    utils: cepUtils,
    ErrorClass: cep.CepValidationError,
    valid: "01001000",
  },
] as const;

describe.each(validators)("$name validation contract", ({ validate, utils, ErrorClass, valid }) => {
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
      new String(validators[0].valid),
      () => "value",
      {
        toString() {
          throw new Error("Must not coerce input");
        },
      },
    ].map((value) => ({ value })),
  )("returns INVALID_TYPE for non-string input %#", ({ value }) => {
    const result = validate(value);
    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error).toBeInstanceOf(ErrorClass);
    expect(result.error?.code).toBe("INVALID_TYPE");
  });

  it.each(["", "123", "abc", ` ${valid} `, `${valid}\n`, `９${valid.slice(1)}`, `${valid}0`])(
    "returns INVALID_FORMAT for malformed string %#",
    (value) => {
      expect(validate(value).error?.code).toBe("INVALID_FORMAT");
    },
  );

  it("returns the original expected validation error", () => {
    const error = new ErrorClass("INVALID_FORMAT");
    vi.spyOn(utils, "assertValid").mockImplementation(() => {
      throw error;
    });
    expect(validate(valid)).toEqual({ success: false, error });
    expect(validate(valid).error).toBe(error);
  });

  it.each([
    new Error("Internal defect"),
    new TypeError("Internal type error"),
    { defect: true },
    "defect",
    null,
    undefined,
  ])("rethrows unexpected exceptions unchanged %#", (error) => {
    vi.spyOn(utils, "assertValid").mockImplementation(() => {
      throw error;
    });
    const caught = vi.fn();
    try {
      validate(valid);
    } catch (thrown) {
      caught(thrown);
    }
    expect(caught).toHaveBeenCalledExactlyOnceWith(error);
  });
});

it("narrows public result types on success", () => {
  const cpfResult: cpf.CpfValidationResult = cpf.validate("52263944621");
  if (cpfResult.success) {
    expectTypeOf(cpfResult.error).toEqualTypeOf<null>();
  } else {
    expectTypeOf(cpfResult.error).toEqualTypeOf<cpf.CpfError>();
    expectTypeOf(cpfResult.error.code).toEqualTypeOf<cpf.CpfErrorCode>();
  }
  const cnpjResult: cnpj.CnpjValidationResult = cnpj.validate("73450392000164");
  if (cnpjResult.success) {
    expectTypeOf(cnpjResult.error).toEqualTypeOf<null>();
  } else {
    expectTypeOf(cnpjResult.error).toEqualTypeOf<cnpj.CnpjError>();
    expectTypeOf(cnpjResult.error.code).toEqualTypeOf<cnpj.CnpjErrorCode>();
  }
  const cepResult: cep.CepValidationResult = cep.validate("01001000");
  if (cepResult.success) {
    expectTypeOf(cepResult.error).toEqualTypeOf<null>();
  } else {
    expectTypeOf(cepResult.error).toEqualTypeOf<cep.CepValidationError>();
    expectTypeOf(cepResult.error.code).toEqualTypeOf<cep.CepErrorCode>();
  }
});
