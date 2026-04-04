import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

import type { AddressResponse } from "../../src/cep/index.ts";
import {
  clearCache,
  resetThrottler,
  resolveCacheConfig,
  throttleProvider,
} from "../../src/cep/utils.ts";

describe("cep cache helpers", () => {
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

describe("cep throttle", () => {
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
    void calls[10].then(() => {
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
    void eleventh.then(() => {
      waited = false;
    });

    await Promise.resolve();
    expect(waited).toBe(true);

    resetThrottler();
    await eleventh;
  });
});
