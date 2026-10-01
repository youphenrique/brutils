import { cep } from "@brutils/core";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import {
  CepNotFoundError,
  CepProviderError,
  clearCache,
  getAddress,
  resetThrottler,
} from "../src/index.ts";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  clearCache();
  resetThrottler();
  vi.restoreAllMocks();
});

describe("getAddress", () => {
  it("throws validation error before provider call", async () => {
    const fetchSpy = vi.fn();

    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    await expect(getAddress("123")).rejects.toBeInstanceOf(cep.CepValidationError);

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejects non-string input with INVALID_TYPE before provider call", async () => {
    const fetchSpy = vi.fn();

    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    await expect(getAddress(null as unknown as string)).rejects.toMatchObject({
      name: "CepValidationError",
      code: "INVALID_TYPE",
    });

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("fallback succeeds on first provider", async () => {
    globalThis.fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            cep: "01310-100",
            logradouro: "Avenida Paulista",
            bairro: "Bela Vista",
            localidade: "São Paulo",
            uf: "SP",
          }),
          { status: 200 },
        ),
    ) as typeof fetch;

    const result = await getAddress("01310-100", {
      strategy: "fallback",
      providers: ["viacep"],
    });
    expect(result.provider).toBe("viacep");
    expect(result.cep).toBe("01310100");
  });

  it("fallback succeeds on second after first provider error", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 500 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            cep: "01310-100",
            street: "Avenida Paulista",
            neighborhood: "Bela Vista",
            city: "São Paulo",
            state: "SP",
          }),
          { status: 200 },
        ),
      ) as typeof fetch;

    const result = await getAddress("01310100", { providers: ["viacep", "brasilapi"] });

    expect(result.provider).toBe("brasilapi");
  });

  it("fallback returns not-found when provider indicates not-found", async () => {
    globalThis.fetch = vi.fn(
      async () => new Response(JSON.stringify({ erro: true }), { status: 200 }),
    ) as typeof fetch;

    await expect(getAddress("00000000", { providers: ["viacep"] })).rejects.toBeInstanceOf(
      cep.CepValidationError,
    );
  });

  it("fallback throws provider error when all providers fail", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 500 }))
      .mockRejectedValueOnce(new Error("network")) as typeof fetch;

    await expect(
      getAddress("01310100", { providers: ["viacep", "brasilapi"] }),
    ).rejects.toBeInstanceOf(CepProviderError);
  });

  it("race returns first successful response", async () => {
    globalThis.fetch = vi
      .fn()
      .mockImplementationOnce(async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
        return new Response(
          JSON.stringify({
            cep: "01310-100",
            logradouro: "X",
            bairro: "Y",
            localidade: "Z",
            uf: "SP",
          }),
          { status: 200 },
        );
      })
      .mockImplementationOnce(
        async () =>
          new Response(
            JSON.stringify({
              cep: "01310-100",
              street: "A",
              neighborhood: "B",
              city: "C",
              state: "SP",
            }),
            { status: 200 },
          ),
      ) as typeof fetch;

    const result = await getAddress("01310100", {
      strategy: "race",
      providers: ["viacep", "brasilapi"],
    });

    expect(result.provider).toBe("brasilapi");
  });

  it("race prefers not-found when mixed failures", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ erro: true }), { status: 200 }))
      .mockRejectedValueOnce(new Error("network")) as typeof fetch;

    await expect(
      getAddress("00000000", {
        strategy: "race",
        providers: ["viacep", "brasilapi"],
      }),
    ).rejects.toBeInstanceOf(cep.CepValidationError);
  });

  it("cache hit skips providers", async () => {
    const fetchSpy = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            cep: "01310-100",
            logradouro: "A",
            bairro: "B",
            localidade: "C",
            uf: "SP",
          }),
          { status: 200 },
        ),
    );

    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    await getAddress("01310100", { providers: ["viacep"], cache: true });
    await getAddress("01310-100", { providers: ["viacep"], cache: true });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("disabled cache always calls providers", async () => {
    const fetchSpy = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            cep: "01310-100",
            logradouro: "A",
            bairro: "B",
            localidade: "C",
            uf: "SP",
          }),
          { status: 200 },
        ),
    );

    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    await getAddress("01310100", { providers: ["viacep"], cache: false });
    await getAddress("01310-100", { providers: ["viacep"], cache: false });

    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("respects timeout per provider", async () => {
    globalThis.fetch = vi.fn(async (_input, init) => {
      const signal = init?.signal as AbortSignal;

      await new Promise((resolve, reject) => {
        signal.addEventListener("abort", () =>
          reject(Object.assign(new Error("aborted"), { name: "AbortError" })),
        );
        setTimeout(resolve, 50);
      });

      return new Response(null, { status: 200 });
    }) as typeof fetch;

    await expect(
      getAddress("01310100", { providers: ["viacep"], timeout: 10 }),
    ).rejects.toBeInstanceOf(CepProviderError);
  });
});

describe("lookup errors", () => {
  it("CepNotFoundError is a proper subclass of Error", () => {
    const err = new CepNotFoundError("viacep");
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(CepNotFoundError);
  });

  it("CepProviderError is a proper subclass of Error", () => {
    const err = new CepProviderError("viacep", [{ provider: "viacep", reason: "HTTP 500" }]);
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(CepProviderError);
  });

  it("CepNotFoundError creates typed errors with its properties", () => {
    const notFound = new CepNotFoundError("viacep");
    expect(notFound.name).toBe("CepNotFoundError");
    expect(notFound.code).toBe("NOT_FOUND");
    expect(notFound.provider).toBe("viacep");
  });

  it("CepProviderError creates typed errors with its properties", () => {
    const provider = new CepProviderError("viacep", [{ provider: "viacep", reason: "HTTP 500" }]);
    expect(provider.name).toBe("CepProviderError");
    expect(provider.code).toBe("PROVIDER_ERROR");
    expect(provider.provider).toBe("viacep");
    expect(provider.failures).toHaveLength(1);
  });
});
