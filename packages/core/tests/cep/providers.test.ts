import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { brasilapiProvider } from "../../src/cep/providers/brasilapi.ts";
import { viacepProvider } from "../../src/cep/providers/viacep.ts";
import { apicepProvider } from "../../src/cep/providers/apicep.ts";
import {
  CepProviderNotFoundSignal,
  CepProviderRequestError,
  resetThrottler,
} from "../../src/cep/utils.ts";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  resetThrottler();
  vi.restoreAllMocks();
});

describe("cep provider adapters", () => {
  it("maps viacep response shape", async () => {
    globalThis.fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            cep: "01310-100",
            logradouro: "Avenida Paulista",
            bairro: "Bela Vista",
            localidade: "São Paulo",
            uf: "SP",
            ibge: "3550308",
            ddd: "11",
          }),
          { status: 200 },
        ),
    ) as typeof fetch;

    const result = await viacepProvider.fetch("01310100", 100);

    expect(result.provider).toBe("viacep");
    expect(result.cep).toBe("01310100");
    expect(result.ibgeCode).toBe("3550308");
    expect(result.ddd).toBe("11");
  });

  it("detects apicep not-found", async () => {
    globalThis.fetch = vi.fn(
      async () => new Response(JSON.stringify({ status: 404, ok: false }), { status: 200 }),
    ) as typeof fetch;

    await expect(apicepProvider.fetch("00000000", 100)).rejects.toBeInstanceOf(
      CepProviderNotFoundSignal,
    );
  });

  it("maps brasilapi response shape", async () => {
    globalThis.fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            cep: "01310-100",
            street: "Avenida Paulista",
            neighborhood: "Bela Vista",
            city: "São Paulo",
            state: "SP",
            ibge: "3550308",
            ddd: "11",
          }),
          { status: 200 },
        ),
    ) as typeof fetch;

    const result = await brasilapiProvider.fetch("01310100", 100);

    expect(result.provider).toBe("brasilapi");
    expect(result.cep).toBe("01310100");
  });

  it("converts http failures into CepProviderRequestError", async () => {
    globalThis.fetch = vi.fn(async () => new Response(null, { status: 500 })) as typeof fetch;

    await expect(brasilapiProvider.fetch("01310100", 100)).rejects.toBeInstanceOf(
      CepProviderRequestError,
    );
  });
});
