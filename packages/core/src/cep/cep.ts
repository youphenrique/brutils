import { DEFAULT_PROVIDER_ORDER, DEFAULT_TIMEOUT_MS } from "./constants";
import { providerRegistry } from "./providers";
import type {
  AddressResponse,
  CepLookupResult,
  CepValidationResult,
  GetAddressOptions,
  ProviderName,
} from "./types";
import {
  CepNotFoundError,
  CepProviderError,
  CepValidationError,
  ProviderNotFoundSignal,
  ProviderRequestError,
  normalize,
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
        throw new CepNotFoundError(cep, providerName);
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

  const lastProvider = providers[providers.length - 1] ?? DEFAULT_PROVIDER_ORDER[0];
  throw new CepProviderError(cep, lastProvider, failures);
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
        throw new CepNotFoundError(cep, providerName);
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

    const firstNotFound = settled.find(
      (result): result is PromiseRejectedResult =>
        result.status === "rejected" && result.reason instanceof CepNotFoundError,
    );

    if (firstNotFound?.reason instanceof CepNotFoundError) {
      throw firstNotFound.reason;
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

    const lastProvider = failures[failures.length - 1]?.provider;
    throw new CepProviderError(
      cep,
      (providers.find((provider) => provider === lastProvider) ??
        providers[providers.length - 1] ??
        DEFAULT_PROVIDER_ORDER[0]) as ProviderName,
      failures,
    );
  }
}

/**
 * Normalizes a CEP by removing non-digit characters.
 */
export function normalizeCep(value: string): string {
  return normalize(value);
}

/**
 * Validates a CEP and returns a discriminated result.
 */
export function validate(value: string): CepValidationResult {
  const normalizedCep = normalize(value);

  try {
    validateCep(normalizedCep);
    return { success: true, error: null };
  } catch (error) {
    if (error instanceof CepValidationError) {
      return { success: false, error: new CepValidationError(value) };
    }

    throw error;
  }
}

/**
 * Formats CEP to XXXXX-XXX when the normalized value has exactly 8 digits.
 */
export function format(value: string): string {
  const digits = normalize(value);

  if (digits.length !== 8) {
    return value;
  }

  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

/**
 * Progressively formats CEP while the user types.
 */
export function formatAsYouType(value: string): string {
  const digits = normalize(value).slice(0, 8);

  if (digits.length <= 5) {
    return digits;
  }

  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

/**
 * Resolve a Brazilian CEP into a normalized address DTO using one or many providers.
 */
export async function getAddress(
  value: string,
  options: GetAddressOptions = {},
): Promise<AddressResponse> {
  const normalizedCep = normalize(value);
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

/**
 * Looks up a CEP and returns a non-throwing result shape for provider outcomes.
 */
export async function lookup(
  value: string,
  options: GetAddressOptions = {},
): Promise<CepLookupResult> {
  const validation = validate(value);
  if (!validation.success) {
    throw validation.error;
  }

  const normalizedCep = normalize(value);
  const providers = options.providers ?? DEFAULT_PROVIDER_ORDER;
  const lastProvider = providers[providers.length - 1] ?? DEFAULT_PROVIDER_ORDER[0];

  const cacheConfig = resolveCacheConfig(options.cache);
  if (cacheConfig.enabled) {
    const cached = await cacheConfig.store.get(normalizedCep);
    if (cached) {
      return {
        status: "FOUND",
        cep: normalizedCep,
        provider: cached.provider,
        error: null,
      };
    }
  }

  try {
    const response = await getAddress(normalizedCep, options);

    return {
      status: "FOUND",
      cep: normalizedCep,
      provider: response.provider,
      error: null,
    };
  } catch (error) {
    if (error instanceof CepNotFoundError) {
      return {
        status: "NOT_FOUND",
        cep: normalizedCep,
        provider: error.provider ?? lastProvider,
        error,
      };
    }

    if (error instanceof CepProviderError) {
      return {
        status: "UNAVAILABLE",
        cep: normalizedCep,
        provider: error.provider ?? lastProvider,
        error,
      };
    }

    throw error;
  }
}
