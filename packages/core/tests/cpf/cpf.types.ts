import { expectTypeOf } from "vite-plus/test";
import { cpf } from "@brutils/core";

// Compile-only consumer checks, included by the package typecheck. CPF scope of #34 and #38.
export function checkCpfConsumer(value: unknown): void {
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

  const result: cpf.CpfValidationResult = cpf.validate(value);
  if (result.success) {
    expectTypeOf(result.error).toEqualTypeOf<null>();
  } else {
    expectTypeOf(result.error).toEqualTypeOf<cpf.CpfError>();
    expectTypeOf(result.error.code).toEqualTypeOf<cpf.CpfErrorCode>();
    expectTypeOf(result.error).toExtend<Error>();
  }

  cpf.generate();
  cpf.generate({ formatted: true });
  cpf.mask("12345678909", { char: "#", mode: "redacted" });

  // @ts-expect-error formatted is a boolean, even for JavaScript-style truthy values.
  cpf.generate({ formatted: "true" });
  // @ts-expect-error Region control was removed in #62.
  cpf.generate({ uf: "SP" });
  // @ts-expect-error Privacy modes use the documented literal union.
  cpf.mask("12345678909", { mode: "invalid" });
  // @ts-expect-error Mask characters must be strings.
  cpf.mask("12345678909", { char: 1 });
  // @ts-expect-error Padding was removed in #59.
  cpf.format("123", { pad: true });
  // @ts-expect-error String transformations do not accept unknown input.
  cpf.normalize(value);
  // @ts-expect-error Internal checksum helpers are not public.
  void cpf.computeCheckDigit;
  // @ts-expect-error Internal validators are not public.
  void cpf.assertValid;
  // @ts-expect-error Internal random helpers are not public.
  void cpf.randomDigit;
  // @ts-expect-error Internal mask validators are not public.
  void cpf.assertMaskOptions;
  // @ts-expect-error Retired validation result aliases are not public.
  const retiredResult: cpf.CpfValidateResult = result;
  void retiredResult;
  // @ts-expect-error Retired padding option types are not public.
  const retiredOptions: cpf.CpfFormatOptions = {};
  void retiredOptions;
}
