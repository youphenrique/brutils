import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { cep } from "../../src/index.ts";
import {
  CepNotFoundError,
  CepProviderError,
  CepValidationError,
  type GetAddressOptions,
} from "../../src/cep/index.ts";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  cep.clearCache();
  cep.resetThrottler();
  vi.restoreAllMocks();
});

describe("cep.validate", () => {
  it("returns failure with INVALID_FORMAT for malformed input", () => {
    let result = cep.validate("01#310!!!!!!10......0");
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("INVALID_FORMAT");

    result = cep.validate("abc");
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("INVALID_FORMAT");
  });

  it("returns success for valid raw and formatted CEPs", () => {
    expect(cep.validate("54490120")).toEqual({ success: true, error: null });
    expect(cep.validate("54490-120")).toEqual({ success: true, error: null });
    expect(cep.validate("01310100")).toEqual({ success: true, error: null });
    expect(cep.validate("09973-130")).toEqual({ success: true, error: null });
  });

  it("returns failure with INVALID_FORMAT for wrong length", () => {
    let result = cep.validate("60740.38");
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("INVALID_FORMAT");

    result = cep.validate("544901206");
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("INVALID_FORMAT");

    result = cep.validate("");
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("INVALID_FORMAT");
  });

  it("returns failure with REPEATED_DIGITS for all-same-digit", () => {
    let result = cep.validate("00000-000");
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("REPEATED_DIGITS");

    result = cep.validate("11111111");
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("REPEATED_DIGITS");

    expect(cep.validate("55555555").success).toBe(false);
    expect(cep.validate("99999999").success).toBe(false);
  });

  it("throws for edge-case input types", () => {
    expect(() => cep.validate(null as any)).toThrow(TypeError);
    expect(() => cep.validate(undefined as any)).toThrow(TypeError);
    expect(() => cep.validate(12345678 as any)).toThrow(TypeError);
    expect(() => cep.validate({} as any)).toThrow(TypeError);
  });
});

describe("cep.getAddress", () => {
  it("throws validation error before provider call", async () => {
    const fetchSpy = vi.fn();

    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    await expect(cep.getAddress("123")).rejects.toBeInstanceOf(cep.CepValidationError);

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

    const result = await cep.getAddress("01310-100", {
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

    const result = await cep.getAddress("01310100", { providers: ["viacep", "brasilapi"] });

    expect(result.provider).toBe("brasilapi");
  });

  it("fallback returns not-found when provider indicates not-found", async () => {
    globalThis.fetch = vi.fn(
      async () => new Response(JSON.stringify({ erro: true }), { status: 200 }),
    ) as typeof fetch;

    await expect(cep.getAddress("00000000", { providers: ["viacep"] })).rejects.toBeInstanceOf(
      cep.CepValidationError,
    );
  });

  it("fallback throws provider error when all providers fail", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 500 }))
      .mockRejectedValueOnce(new Error("network")) as typeof fetch;

    await expect(
      cep.getAddress("01310100", { providers: ["viacep", "brasilapi"] }),
    ).rejects.toBeInstanceOf(cep.CepProviderError);
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

    const result = await cep.getAddress("01310100", {
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
      cep.getAddress("00000000", {
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

    await cep.getAddress("01310100", { providers: ["viacep"], cache: true });
    await cep.getAddress("01310-100", { providers: ["viacep"], cache: true });

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

    await cep.getAddress("01310100", { providers: ["viacep"], cache: false });
    await cep.getAddress("01310-100", { providers: ["viacep"], cache: false });

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
      cep.getAddress("01310100", { providers: ["viacep"], timeout: 10 }),
    ).rejects.toBeInstanceOf(cep.CepProviderError);
  });
});

describe("cep.lookup", () => {
  it("throws validation error synchronously and does not call getAddress", async () => {
    globalThis.fetch = vi.fn();

    await expect(cep.lookup("123")).rejects.toBeInstanceOf(cep.CepValidationError);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("maps successful lookup to FOUND", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          cep: "54490-120",
          logradouro: "Rua Cubatão",
          bairro: "Barra de Jangada",
          localidade: "Jaboatão dos Guararapes",
          uf: "PE",
          estado: "Pernambuco",
          ibge: "2607901",
          ddd: "81",
        }),
        { status: 200 },
      ),
    );

    await expect(cep.lookup("54490120")).resolves.toEqual({
      status: "FOUND",
      cep: "54490120",
      provider: "viacep",
      error: null,
    });
  });

  it("maps not found errors to NOT_FOUND without throwing", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ erro: true }), { status: 200 }));

    await expect(cep.lookup("60740380", { providers: ["viacep"] })).resolves.toMatchObject({
      status: "NOT_FOUND",
      cep: "60740380",
      provider: "viacep",
    });
  });

  it("maps provider errors to UNAVAILABLE without throwing", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    await expect(cep.lookup("60740380", { providers: ["brasilapi"] })).resolves.toMatchObject({
      status: "UNAVAILABLE",
      cep: "60740380",
      provider: "brasilapi",
    });
  });

  it("forwards options unchanged to getAddress", async () => {
    const options: GetAddressOptions = {
      providers: ["widenet"],
      strategy: "race" as const,
      timeout: 2500,
      cache: { ttl: 10 },
    };

    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          code: "60740-380",
          state: "CE",
          city: "Fortaleza",
          district: "Itaoca",
          address: "Rua Outono",
          status: 200,
          ok: true,
        }),
        { status: 200 },
      ),
    );

    const result = await cep.lookup("60740380", options);

    expect(result.provider).toBe("widenet");
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining("widenet"),
      expect.any(Object),
    );
  });

  it("returns cache hit without calling getAddress", async () => {
    const store = {
      get: vi.fn().mockResolvedValue({
        cep: "60740380",
        street: "Rua A",
        neighborhood: "Centro",
        city: "Fortaleza",
        uf: "CE",
        state: "Ceará",
        provider: "viacep" as const,
      }),
      set: vi.fn(),
    };

    globalThis.fetch = vi.fn();

    const result = await cep.lookup("60740380", { cache: { store } });

    expect(result).toEqual({ status: "FOUND", cep: "60740380", provider: "viacep", error: null });
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("throws for edge-case input types", async () => {
    await expect(cep.lookup(null as unknown as string)).rejects.toBeInstanceOf(TypeError);
    await expect(cep.lookup(undefined as unknown as string)).rejects.toBeInstanceOf(TypeError);
    await expect(cep.lookup(60740380 as unknown as string)).rejects.toBeInstanceOf(TypeError);
  });
});

describe("cep.format", () => {
  it("formats only valid 8-digit CEP", () => {
    expect(cep.format("60740380")).toBe("60740-380");
    expect(cep.format("60740-380")).toBe("60740-380");
    expect(cep.format("abc")).toBe("abc");
    expect(cep.format("607403800")).toBe("607403800");
  });

  it("formats valid unformatted CEP", () => {
    expect(cep.format("60740380")).toBe("60740-380");
    expect(cep.format("01310100")).toBe("01310-100");
  });

  it("reformats valid formatted CEP", () => {
    expect(cep.format("60740-380")).toBe("60740-380");
    expect(cep.format("01310-100")).toBe("01310-100");
  });

  it("preserves leading zeros", () => {
    expect(cep.format("00000191")).toBe("00000-191");
  });

  it("returns as is for CEPs with whitespace and non-numeric characters", () => {
    expect(cep.format("  60740380  ")).toBe("  60740380  ");
    expect(cep.format("09.?ABC973.-130abc")).toBe("09.?ABC973.-130abc");
  });

  it("returns as is for invalid CEP lengths", () => {
    expect(cep.format("")).toBe("");
    expect(cep.format("9")).toBe("9");
    expect(cep.format("9438")).toBe("9438");
    expect(cep.format("0997313066")).toBe("0997313066");
  });

  it("left-pads with zeros when pad option is enabled", () => {
    expect(cep.format("", { pad: true })).toBe("00000-000");
    expect(cep.format("9", { pad: true })).toBe("00000-009");
    expect(cep.format("09973130", { pad: true })).toBe("09973-130");
    expect(cep.format("0997313066", { pad: true })).toBe("0997313066");
  });

  it("accepts undefined options and uses defaults", () => {
    expect(cep.format("76811392", undefined)).toBe("76811-392");
  });

  it("throws for edge-case input types", () => {
    expect(() => cep.format(null as any)).toThrow(TypeError);
    expect(() => cep.format(undefined as any)).toThrow(TypeError);
    expect(() => cep.format(60740380 as any)).toThrow(TypeError);
    expect(() => cep.format({} as any)).toThrow(TypeError);
  });
});

describe("cep errors", () => {
  it("CepValidationError is a proper subclass of Error", () => {
    const err = new CepValidationError("INVALID_FORMAT");
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(CepValidationError);
  });

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

  it("CepValidationError creates typed errors with its properties", () => {
    const validation = new CepValidationError("INVALID_FORMAT");
    expect(validation.name).toBe("CepValidationError");
    expect(validation.code).toBe("INVALID_FORMAT");
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

describe("cep.formatAsYouType", () => {
  const cases: Array<[string, string]> = [
    ["6", "6"],
    ["60", "60"],
    ["607", "607"],
    ["6074", "6074"],
    ["60740", "60740"],
    ["607403", "60740-3"],
    ["6074038", "60740-38"],
    ["60740380", "60740-380"],
    ["607403801", "60740-380"],
    ["60740-3", "60740-3"],
    ["60740-380", "60740-380"],
    ["", ""],
    ["abc", ""],
  ];

  it("applies progressive formatting", () => {
    for (const [input, expected] of cases) {
      expect(cep.formatAsYouType(input)).toBe(expected);
    }
  });

  it("throws for edge-case input types", () => {
    expect(() => cep.formatAsYouType(null as any)).toThrow(TypeError);
    expect(() => cep.formatAsYouType(undefined as any)).toThrow(TypeError);
    expect(() => cep.formatAsYouType(60740380 as any)).toThrow(TypeError);
    expect(() => cep.formatAsYouType({} as any)).toThrow(TypeError);
  });
});

describe("cep.normalize", () => {
  it("normalizes CEP input", () => {
    expect(cep.normalize("54490-120")).toBe("54490120");
    expect(cep.normalize("01001-000")).toBe("01001000");
  });

  it("handles invalid chars and mixed inputs lengths", () => {
    expect(cep.normalize("abc")).toBe("");
    expect(cep.normalize("abc544!!!90...12--0def")).toBe("54490120");
    expect(cep.normalize("54490-")).toBe("54490");
    expect(cep.normalize("54490-12067")).toBe("5449012067");
  });

  it("returns the same string for already-normalized input", () => {
    expect(cep.normalize("54490120")).toBe("54490120");
  });

  it("returns an empty string for an empty input", () => {
    expect(cep.normalize("")).toBe("");
  });

  it("throws for edge-case input types", () => {
    expect(() => cep.normalize(null as any)).toThrow(TypeError);
    expect(() => cep.normalize(undefined as any)).toThrow(TypeError);
    expect(() => cep.normalize(60740380 as any)).toThrow(TypeError);
    expect(() => cep.normalize({} as any)).toThrow(TypeError);
  });
});
