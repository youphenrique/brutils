import { DEFAULT_PROVIDER_ORDER, DEFAULT_TIMEOUT_MS } from "./constants";
import { providerRegistry } from "./providers";
import type { ProviderName, AddressResponse, GetByCepOptions } from "./types";
import {
  CepNotFoundError,
  CepProviderError,
  ProviderNotFoundSignal,
  ProviderRequestError,
  normalizeCep,
  resolveCacheConfig,
  validateCep,
} from "./utils";

async function runFallback(
  cep: string,
  providers: ProviderName[],
  timeout: number,
): Promise<AddressResponse> {
  const failures: Array<{ provider: string; reason: string }> = [];

  for (const providerName of providers) {
    const provider = providerRegistry[providerName];

    try {
      return await provider.fetch(cep, timeout);
    } catch (error) {
      if (error instanceof ProviderNotFoundSignal) {
        throw new CepNotFoundError(cep);
      }

      if (error instanceof ProviderRequestError) {
        failures.push({ provider: providerName, reason: error.message });
        continue;
      }

      failures.push({
        provider: providerName,
        reason: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  throw new CepProviderError(cep, failures);
}

async function runRace(
  cep: string,
  providers: ProviderName[],
  timeout: number,
): Promise<AddressResponse> {
  const tasks = providers.map(async (providerName) => {
    const provider = providerRegistry[providerName];

    try {
      return await provider.fetch(cep, timeout);
    } catch (error) {
      if (error instanceof ProviderNotFoundSignal) {
        throw new CepNotFoundError(cep);
      }

      if (error instanceof ProviderRequestError) {
        throw error;
      }

      throw new ProviderRequestError(
        providerName,
        error instanceof Error ? error.message : "Unknown error",
      );
    }
  });

  try {
    return await Promise.any(tasks);
  } catch {
    const settled = await Promise.allSettled(tasks);

    const hasNotFound = settled.some(
      (result) => result.status === "rejected" && result.reason instanceof CepNotFoundError,
    );

    if (hasNotFound) {
      throw new CepNotFoundError(cep);
    }

    const failures = settled
      .filter((result): result is PromiseRejectedResult => result.status === "rejected")
      .map((result) => {
        const reason = result.reason;
        if (reason instanceof ProviderRequestError) {
          return { provider: reason.provider, reason: reason.message };
        }

        return {
          provider: "unknown",
          reason: reason instanceof Error ? reason.message : "Unknown error",
        };
      });

    throw new CepProviderError(cep, failures);
  }
}

/**
 * Resolve a Brazilian CEP into a normalized address DTO using one or many providers.
 *
 * @param cep - CEP string in raw (`01310100`) or masked (`01310-100`) format.
 * @param options - Optional providers, strategy, timeout and cache controls.
 * @returns A normalized address payload with provider metadata.
 * @throws {TypeError} If CEP is not a string.
 * @throws {CepValidationError} If normalized CEP is not 8 digits.
 * @throws {CepNotFoundError} If CEP is not found by tried providers.
 * @throws {CepProviderError} If all tried providers fail with provider/network errors.
 */
export async function getByCep(
  cep: string,
  options: GetByCepOptions = {},
): Promise<AddressResponse> {
  const normalizedCep = normalizeCep(cep);
  validateCep(normalizedCep);

  const providers = options.providers ?? DEFAULT_PROVIDER_ORDER;
  const timeout = options.timeout ?? DEFAULT_TIMEOUT_MS;
  const strategy = options.strategy ?? "fallback";

  const cacheConfig = resolveCacheConfig(options.cache);
  if (cacheConfig.enabled) {
    const cached = await cacheConfig.store.get(normalizedCep);
    if (cached) {
      return cached;
    }
  }

  const response =
    strategy === "race"
      ? await runRace(normalizedCep, providers, timeout)
      : await runFallback(normalizedCep, providers, timeout);

  if (cacheConfig.enabled) {
    await cacheConfig.store.set(normalizedCep, response, cacheConfig.ttl);
  }

  return response;
}
