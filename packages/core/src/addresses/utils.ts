import { DEFAULT_CACHE_TTL_SECONDS, PROVIDER_THROTTLE } from "./constants";
import type { AddressResponse, CacheStore, ProviderName } from "./types";

export class CepValidationError extends Error {
  readonly code = "INVALID_CEP_FORMAT" as const;
  readonly input: string;

  constructor(input: string, message = "CEP must contain exactly 8 digits after normalization.") {
    super(message);
    this.name = "CepValidationError";
    this.input = input;
  }
}

export class CepNotFoundError extends Error {
  readonly code = "CEP_NOT_FOUND" as const;
  readonly cep: string;

  constructor(cep: string, message = "CEP was not found.") {
    super(message);
    this.name = "CepNotFoundError";
    this.cep = cep;
  }
}

export class CepProviderError extends Error {
  readonly code = "PROVIDER_ERROR" as const;
  readonly cep: string;
  readonly failures: Array<{ provider: string; reason: string }>;

  constructor(
    cep: string,
    failures: Array<{ provider: string; reason: string }>,
    message = "All providers failed due to provider/network errors.",
  ) {
    super(message);
    this.name = "CepProviderError";
    this.cep = cep;
    this.failures = failures;
  }
}

export class ProviderNotFoundSignal extends Error {
  constructor() {
    super("NOT_FOUND");
    this.name = "ProviderNotFoundSignal";
  }
}

export class ProviderRequestError extends Error {
  readonly provider: ProviderName;

  constructor(provider: ProviderName, reason: string) {
    super(reason);
    this.name = "ProviderRequestError";
    this.provider = provider;
  }
}

export function normalizeCep(value: string): string {
  if (typeof value !== "string") {
    throw new TypeError(
      `Expected a string for CEP normalization, but received ${value === null ? "null" : typeof value}`,
    );
  }

  return value.replace(/\D/g, "");
}

export function validateCep(value: string): void {
  if (typeof value !== "string") {
    throw new TypeError(
      `Expected a string for CEP validation, but received ${value === null ? "null" : typeof value}`,
    );
  }

  if (!/^\d{8}$/.test(value)) {
    throw new CepValidationError(value);
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
  if (cache === false) {
    return { enabled: false, ttl: DEFAULT_CACHE_TTL_SECONDS, store: defaultCacheStore };
  }

  if (cache === true || cache === undefined) {
    return { enabled: true, ttl: DEFAULT_CACHE_TTL_SECONDS, store: defaultCacheStore };
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
  widenet: new TokenBucket(PROVIDER_THROTTLE.widenet.rps),
  brasilapi: new TokenBucket(PROVIDER_THROTTLE.brasilapi.rps),
};

export async function throttleProvider(provider: ProviderName): Promise<void> {
  await throttlers[provider].take();
}

export function resetThrottler(): void {
  Object.values(throttlers).forEach((bucket) => bucket.stop());

  throttlers = {
    viacep: new TokenBucket(PROVIDER_THROTTLE.viacep.rps),
    widenet: new TokenBucket(PROVIDER_THROTTLE.widenet.rps),
    brasilapi: new TokenBucket(PROVIDER_THROTTLE.brasilapi.rps),
  };
}

export async function fetchWithTimeout(url: string, timeout: number): Promise<Response> {
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
