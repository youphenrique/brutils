import { providerRegistry } from "./providers";
import type { AddressResponse, CacheStore, CepErrorCode, ProviderName } from "./types";
import {
  CEP_FORMATTED_PATTERN,
  CEP_RAW_PATTERN,
  DEFAULT_CACHE_TTL_SECONDS,
  DEFAULT_PROVIDER_ORDER,
  PROVIDER_THROTTLE,
} from "./constants";

export class CepValidationError extends Error {
  constructor(
    readonly code: CepErrorCode,
    message?: string,
  ) {
    super(message ?? code);
    this.name = "CepValidationError";
  }
}

export class CepNotFoundError extends Error {
  readonly code = "NOT_FOUND" as const;

  constructor(readonly provider: ProviderName) {
    super("There was no result for the provided CEP.");
    this.name = "CepNotFoundError";
  }
}

export class CepProviderError extends Error {
  readonly code = "PROVIDER_ERROR" as const;
  readonly provider: ProviderName;
  readonly failures: Array<{ provider: string; reason: string }>;

  constructor(provider: ProviderName, failures: Array<{ provider: string; reason: string }>) {
    super("All providers failed due to provider/network errors.");
    this.name = "CepProviderError";
    this.provider = provider;
    this.failures = failures;
  }
}

export class CepProviderNotFoundSignal extends Error {
  readonly code = "PROVIDER_NOT_FOUND" as const;

  constructor() {
    super("There was no result from provider found for the given CEP.");
    this.name = "CepProviderNotFoundSignal";
  }
}

export class CepProviderRequestError extends Error {
  readonly provider: ProviderName;

  constructor(provider: ProviderName, reason: string) {
    super(reason);
    this.name = "CepProviderRequestError";
    this.provider = provider;
  }
}

export function assertValid(value: string): void {
  if (!CEP_RAW_PATTERN.test(value) && !CEP_FORMATTED_PATTERN.test(value)) {
    throw new CepValidationError(
      "INVALID_FORMAT",
      "Only 8 digits or #####-### format are accepted.",
    );
  }

  const normalized = value.replace(/\D/g, "");

  if (/^(\d)\1{7}$/.test(normalized)) {
    throw new CepValidationError(
      "REPEATED_DIGITS",
      "There are no valid CEP's with sequences of repeated numbers.",
    );
  }
}

class InMemoryCacheStore implements CacheStore {
  private readonly store = new Map<string, { value: AddressResponse; expiresAt: number }>();

  async get(key: string): Promise<AddressResponse | null> {
    const entry = this.store.get(key);
    if (!entry) {
      return null;
    }

    if (Date.now() >= entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.value;
  }

  async set(key: string, value: AddressResponse, ttl: number): Promise<void> {
    const expiresAt = Date.now() + ttl * 1000;
    this.store.set(key, { value, expiresAt });
  }

  clear(): void {
    this.store.clear();
  }
}

const defaultCacheStore = new InMemoryCacheStore();

export function resolveCacheConfig(
  cache: boolean | { ttl?: number; store?: CacheStore } | undefined,
): { enabled: boolean; ttl: number; store: CacheStore } {
  if (typeof cache === "boolean" || cache === undefined) {
    return { enabled: Boolean(cache), ttl: DEFAULT_CACHE_TTL_SECONDS, store: defaultCacheStore };
  }

  return {
    enabled: true,
    ttl: cache.ttl ?? DEFAULT_CACHE_TTL_SECONDS,
    store: cache.store ?? defaultCacheStore,
  };
}

export function clearCache(): void {
  defaultCacheStore.clear();
}

class TokenBucket {
  private tokens: number;
  private readonly queue: Array<() => void> = [];
  private readonly maxTokens: number;
  private readonly timer: ReturnType<typeof setInterval>;

  constructor(private readonly rps: number) {
    this.maxTokens = rps;
    this.tokens = rps;

    this.timer = setInterval(() => {
      this.tokens = Math.min(this.tokens + this.rps, this.maxTokens);
      this.flushQueue();
    }, 1000);
  }

  private flushQueue(): void {
    while (this.tokens > 0 && this.queue.length > 0) {
      this.tokens -= 1;
      const next = this.queue.shift();
      next?.();
    }
  }

  take(): Promise<void> {
    if (this.tokens > 0) {
      this.tokens -= 1;
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      this.queue.push(resolve);
    });
  }

  stop(): void {
    clearInterval(this.timer);
    while (this.queue.length > 0) {
      const queued = this.queue.shift();
      queued?.();
    }
  }
}

let throttlers: Record<ProviderName, TokenBucket> = {
  viacep: new TokenBucket(PROVIDER_THROTTLE.viacep.rps),
  apicep: new TokenBucket(PROVIDER_THROTTLE.apicep.rps),
  brasilapi: new TokenBucket(PROVIDER_THROTTLE.brasilapi.rps),
};

export async function throttleProvider(provider: ProviderName): Promise<void> {
  await throttlers[provider].take();
}

export function resetThrottler(): void {
  Object.values(throttlers).forEach((bucket) => bucket.stop());

  throttlers = {
    viacep: new TokenBucket(PROVIDER_THROTTLE.viacep.rps),
    apicep: new TokenBucket(PROVIDER_THROTTLE.apicep.rps),
    brasilapi: new TokenBucket(PROVIDER_THROTTLE.brasilapi.rps),
  };
}

export async function unfetch(url: string, timeout: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    return await fetch(url, { signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Request timeout after ${timeout}ms`);
    }

    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function runFallback(
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
      if (error instanceof CepProviderNotFoundSignal) {
        throw new CepNotFoundError(providerName);
      }

      if (error instanceof CepProviderRequestError) {
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

  throw new CepProviderError(lastProvider, failures);
}

export async function runRace(
  cep: string,
  providers: ProviderName[],
  timeout: number,
): Promise<AddressResponse> {
  const tasks = providers.map(async (providerName) => {
    const provider = providerRegistry[providerName];

    try {
      return await provider.fetch(cep, timeout);
    } catch (error) {
      if (error instanceof CepProviderNotFoundSignal) {
        throw new CepNotFoundError(providerName);
      }

      if (error instanceof CepProviderRequestError) {
        throw error;
      }

      throw new CepProviderRequestError(
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
        if (reason instanceof CepProviderRequestError) {
          return { provider: reason.provider, reason: reason.message };
        }

        return {
          provider: "unknown",
          reason: reason instanceof Error ? reason.message : "Unknown error",
        };
      });

    const lastProvider = failures[failures.length - 1]?.provider;

    const provider = (providers.find((provider) => provider === lastProvider) ??
      providers[providers.length - 1] ??
      DEFAULT_PROVIDER_ORDER[0]) as ProviderName;

    throw new CepProviderError(provider, failures);
  }
}
