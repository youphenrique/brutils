import { assertOptions } from "../_shared/assert-options";
import { formatProgressive } from "../_shared/progressive-format";
import {
  CEP_LENGTH,
  CEP_RAW_PATTERN,
  DEFAULT_PROVIDER_ORDER,
  DEFAULT_TIMEOUT_MS,
} from "./constants";
import type {
  AddressResponse,
  CepFormatOptions,
  CepLookupResult,
  CepValidationResult,
  GetAddressOptions,
} from "./types";
import {
  assertValid,
  CepNotFoundError,
  CepProviderError,
  CepValidationError,
  resolveCacheConfig,
  runFallback,
  runRace,
} from "./utils";

/**
 * Normalizes a CEP string by stripping all non-digit characters.
 *
 * @param value - The CEP string to normalize.
 * @returns A digits-only string representing the normalized CEP.
 * @throws {TypeError} If the provided value is not a string.
 *
 * @example
 * ```TypeScript
 * normalize("01001-000"); // "01001000"
 * normalize("01.001-000"); // "01001000"
 * ```
 */
export function normalize(value: string): string {
  if (typeof value !== "string") {
    throw new TypeError(
      `Expected a string for CEP normalization, but received ${value === null ? "null" : typeof value}`,
    );
  }

  return value.replace(/\D/g, "");
}

/**
 * Validates a CEP string.
 *
 * @param value - CEP value to validate.
 * @returns `{ success: true, error: null }` if valid; `{ success: false, error: CepValidationError }` if invalid.
 * @throws {TypeError} If the provided value is not a string.
 *
 * @example
 * ```TypeScript
 * validate("01001-000"); // { success: true, error: null }
 * validate("01001000"); // { success: true, error: null }
 * validate("123"); // { success: false, error: CepValidationError }
 * validate("01001-A00"); // { success: false, error: CepValidationError }
 * ```
 */
export function validate(value: string): CepValidationResult {
  if (typeof value !== "string") {
    throw new TypeError(
      `Expected a string for CEP validation, but received ${value === null ? "null" : typeof value}`,
    );
  }

  try {
    assertValid(value);

    return { success: true, error: null };
  } catch (error) {
    if (error instanceof CepValidationError) {
      return { success: false, error };
    }

    return {
      success: false,
      error: new CepValidationError(
        "UNKNOWN_ERROR",
        "An unexpected error occurred during validation.",
      ),
    };
  }
}

/**
 * Formats a CEP string into the standard mask (`XXXXX-XXX`).
 * CEP value (invalid, badly formatted, or not) returns as is.
 *
 * @param value - CEP value in any form.
 * @param options - Optional formatting options. Set `pad` to `true` to
 *   left-pad with zeros up to 8 characters.
 * @returns The formatted CEP string or the original value if it doesn't have 8 digits.
 * @throws {TypeError} If the provided value is not a string.
 *
 * @example
 * ```TypeScript
 * format("01001000"); // "01001-000"
 * format("01001-000"); // "01001-000"
 * format("123"); // "123"
 * format("73450", { pad: true }); // "00073-450"
 * ```
 */
export function format(value: string, options: CepFormatOptions = {}): string {
  if (typeof value !== "string") {
    throw new TypeError(
      `Expected a string for CEP format, but received ${value === null ? "null" : typeof value}`,
    );
  }

  assertOptions(options);

  const baseValue = options.pad ? value.padStart(CEP_LENGTH, "0") : value;

  if (!CEP_RAW_PATTERN.test(baseValue)) {
    return value;
  }

  return `${baseValue.slice(0, 5)}-${baseValue.slice(5)}`;
}

/**
 * Progressively formats a CEP while typing using the pattern `XXXXX-XXX`.
 *
 * @param value - CEP value in any form.
 * @returns A progressively formatted CEP string.
 * @throws {TypeError} If the provided value is not a string.
 *
 * @example
 * ```TypeScript
 * formatAsYouType("0100"); // "0100"
 * formatAsYouType("01001"); // "01001"
 * formatAsYouType("010010"); // "01001-0"
 * formatAsYouType("01001000"); // "01001-000"
 * ```
 */
export function formatAsYouType(value: string): string {
  if (typeof value !== "string") {
    throw new TypeError(
      `Expected a string for CEP format, but received ${value === null ? "null" : typeof value}`,
    );
  }

  const normalized = normalize(value).slice(0, CEP_LENGTH);

  return formatProgressive(normalized, [5, 3], ["-"]);
}

/**
 * Resolves a Brazilian CEP into a normalized address DTO using one or multiple providers.
 *
 * @param value - The CEP string to resolve.
 * @param options - Optional configuration for provider resolution, caching, timeout, and strategy.
 * @returns A promise that resolves to the address details.
 * @throws {TypeError} If the provided value is not a string.
 * @throws {CepValidationError} If the CEP is invalid.
 * @throws {CepNotFoundError} If the CEP is not found by the providers.
 * @throws {CepProviderError} If all providers fail to respond.
 *
 * @example
 * ```TypeScript
 * await getAddress("01001-000"); // { cep: "01001000", state: "SP", city: "São Paulo", ... }
 * await getAddress("01001-000", { strategy: "race", timeout: 2000 });
 * ```
 */
export async function getAddress(
  value: string,
  options: GetAddressOptions = {},
): Promise<AddressResponse> {
  const validation = validate(value);

  if (!validation.success) {
    throw validation.error;
  }

  const normalized = normalize(value);

  const providers = options.providers ?? DEFAULT_PROVIDER_ORDER;
  const timeout = options.timeout ?? DEFAULT_TIMEOUT_MS;
  const strategy = options.strategy ?? "fallback";

  const cacheConfig = resolveCacheConfig(options.cache);

  if (cacheConfig.enabled) {
    const cached = await cacheConfig.store.get(normalized);
    if (cached) {
      return cached;
    }
  }

  const response =
    strategy === "race"
      ? await runRace(normalized, providers, timeout)
      : await runFallback(normalized, providers, timeout);

  if (cacheConfig.enabled) {
    await cacheConfig.store.set(normalized, response, cacheConfig.ttl);
  }

  return response;
}

/**
 * Looks up a CEP and returns a non-throwing result object for provider outcomes.
 *
 * @param value - The CEP string to look up.
 * @param options - Optional configuration for provider resolution, caching, timeout, and strategy.
 * @returns A promise that resolves to a `CepLookupResult` detailing the lookup outcome (FOUND, NOT_FOUND, UNAVAILABLE).
 * @throws {TypeError} If the provided value is not a string.
 * @throws {CepValidationError} If the CEP is invalid.
 *
 * @example
 * ```TypeScript
 * await lookup("01001-000"); // { status: "FOUND", cep: "01001000", provider: "viacep", error: null }
 * await lookup("99999-999"); // { status: "NOT_FOUND", cep: "99999999", provider: "...", error: CepNotFoundError }
 * ```
 */
export async function lookup(
  value: string,
  options: GetAddressOptions = {},
): Promise<CepLookupResult> {
  const validation = validate(value);

  if (!validation.success) {
    throw validation.error;
  }

  const normalized = normalize(value);
  const providers = options.providers ?? DEFAULT_PROVIDER_ORDER;
  const lastProvider = providers[providers.length - 1] ?? DEFAULT_PROVIDER_ORDER[0];
  const cacheConfig = resolveCacheConfig(options.cache);

  if (cacheConfig.enabled) {
    const cached = await cacheConfig.store.get(normalized);
    if (cached) {
      return {
        status: "FOUND",
        cep: normalized,
        provider: cached.provider,
        error: null,
      };
    }
  }

  try {
    const response = await getAddress(normalized, options);

    return {
      status: "FOUND",
      cep: normalized,
      provider: response.provider,
      error: null,
    };
  } catch (error) {
    if (error instanceof CepNotFoundError) {
      return {
        status: "NOT_FOUND",
        cep: normalized,
        provider: error.provider ?? lastProvider,
        error,
      };
    }

    if (error instanceof CepProviderError) {
      return {
        status: "UNAVAILABLE",
        cep: normalized,
        provider: error.provider ?? lastProvider,
        error,
      };
    }

    throw error;
  }
}
