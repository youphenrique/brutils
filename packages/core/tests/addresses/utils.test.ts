import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

import type { AddressResponse } from "../../src/addresses";
import {
  CepNotFoundError,
  CepProviderError,
  CepValidationError,
  clearCache,
  normalizeCep,
  resetThrottler,
  resolveCacheConfig,
  throttleProvider,
  validateCep,
} from "../../src/addresses/utils";

describe("addresses CEP validation/normalization", () => {
  it("normalizes CEP by stripping non-digits", () => {
    expect(normalizeCep("01310-100")).toBe("01310100");
    expect(normalizeCep("01.310-100")).toBe("01310100");
  });

  it("throws for invalid normalize input type", () => {
    expect(() => normalizeCep(null as any)).toThrow(TypeError);
    expect(() => normalizeCep(undefined as any)).toThrow(TypeError);
    expect(() => normalizeCep(123 as any)).toThrow(TypeError);
  });

  it("validates 8-digit CEP", () => {
    expect(() => validateCep("01310100")).not.toThrow();
    expect(() => validateCep("")).toThrow(CepValidationError);
    expect(() => validateCep("1234567")).toThrow(CepValidationError);
    expect(() => validateCep("123456789")).toThrow(CepValidationError);
  });
});

describe("addresses errors", () => {
  it("creates typed errors with codes", () => {
    const validation = new CepValidationError("abc");
    expect(validation.code).toBe("INVALID_CEP_FORMAT");
    expect(validation.input).toBe("abc");

    const notFound = new CepNotFoundError("01310100");
    expect(notFound.code).toBe("CEP_NOT_FOUND");
    expect(notFound.cep).toBe("01310100");

    const provider = new CepProviderError("01310100", [{ provider: "viacep", reason: "HTTP 500" }]);
    expect(provider.code).toBe("PROVIDER_ERROR");
    expect(provider.failures).toHaveLength(1);
  });
});

describe("addresses cache helpers", () => {
  afterEach(() => {
    clearCache();
  });

  it("uses default cache when true", async () => {
    const config = resolveCacheConfig(true);
    expect(config.enabled).toBe(true);
    expect(config.ttl).toBe(3600);
  });

  it("supports custom store and ttl", async () => {
    let stored: AddressResponse | null = null;
    const store = {
      async get() {
        return stored;
      },
      async set(_key: string, value: AddressResponse) {
        stored = value;
      },
    };

    const config = resolveCacheConfig({ ttl: 12, store });
    expect(config.ttl).toBe(12);
    const sample: AddressResponse = {
      cep: "01310100",
      street: "A",
      neighborhood: "B",
      city: "C",
      uf: "SP",
      state: "São Paulo",
      provider: "viacep",
    };

    await config.store.set("01310100", sample, 12);
    expect(await config.store.get("01310100")).toEqual(sample);
  });

  it("expires default cache entries by ttl", async () => {
    vi.useFakeTimers();
    const config = resolveCacheConfig(true);
    const sample: AddressResponse = {
      cep: "01310100",
      street: "A",
      neighborhood: "B",
      city: "C",
      uf: "SP",
      state: "São Paulo",
      provider: "viacep",
    };

    await config.store.set("01310100", sample, 1);
    expect(await config.store.get("01310100")).toEqual(sample);

    vi.advanceTimersByTime(1001);
    expect(await config.store.get("01310100")).toBeNull();
    vi.useRealTimers();
  });
});

describe("addresses throttle", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetThrottler();
  });

  afterEach(() => {
    resetThrottler();
    vi.useRealTimers();
  });

  it("consumes tokens and waits when exhausted", async () => {
    const calls = Array.from({ length: 11 }, () => throttleProvider("viacep"));

    await Promise.all(calls.slice(0, 10));

    let finished = false;
    calls[10].then(() => {
      finished = true;
    });

    await Promise.resolve();
    expect(finished).toBe(false);

    vi.advanceTimersByTime(1000);
    await calls[10];
    expect(finished).toBe(true);
  });

  it("reset restores token availability", async () => {
    const tenCalls = Array.from({ length: 10 }, () => throttleProvider("viacep"));
    await Promise.all(tenCalls);

    const eleventh = throttleProvider("viacep");
    let waited = true;
    eleventh.then(() => {
      waited = false;
    });

    await Promise.resolve();
    expect(waited).toBe(true);

    resetThrottler();
    await eleventh;
  });
});
