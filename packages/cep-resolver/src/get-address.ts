import { cep } from "@brutils/core";

import { DEFAULT_PROVIDER_ORDER, DEFAULT_TIMEOUT_MS } from "./constants";
import type { AddressResponse, GetAddressOptions } from "./types";
import { resolveCacheConfig, runFallback, runRace } from "./utils";

/**
 * Resolves a Brazilian CEP into a normalized address DTO using one or multiple providers.
 *
 * @param value - The CEP string to resolve.
 * @param options - Optional configuration for provider resolution, caching, timeout, and strategy.
 * @returns A promise that resolves to the address details.
 * @throws {cep.CepValidationError} From `@brutils/core`, if the value is not a string (`INVALID_TYPE`) or the CEP is invalid.
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
  const validation = cep.validate(value);

  if (!validation.success) {
    throw validation.error;
  }

  const normalized = cep.normalize(value);

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
