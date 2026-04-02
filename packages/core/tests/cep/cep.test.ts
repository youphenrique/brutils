import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { cep } from "../../src";
import type { GetAddressOptions } from "../../src/cep";
import * as cepModule from "../../src/cep/cep";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  cep.clearCache();
  cep.resetThrottler();
  vi.restoreAllMocks();
});

describe("cep.validate", () => {
  it("returns success for valid CEPs", () => {
    expect(cep.validate("60740380")).toEqual({ success: true, error: null });
    expect(cep.validate("60740-380")).toEqual({ success: true, error: null });
    expect(cep.validate("01000000")).toEqual({ success: true, error: null });
  });

  it("returns failure for invalid CEPs", () => {
    for (const input of ["abc", "", "1234567", "123456789", "00000000", "11111111"]) {
      const result = cep.validate(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(cep.CepValidationError);
      }
    }
  });

  it("throws for edge-case input types", () => {
    expect(() => cep.validate(null as unknown as string)).toThrow(TypeError);
    expect(() => cep.validate(undefined as unknown as string)).toThrow(TypeError);
    expect(() => cep.validate(12345678 as unknown as string)).toThrow(TypeError);
  });
});

describe("cep.lookup", () => {
  it("throws validation error synchronously and does not call getAddress", async () => {
    const spy = vi.spyOn(cepModule, "getAddress");

    await expect(cep.lookup("123")).rejects.toBeInstanceOf(cep.CepValidationError);
    expect(spy).not.toHaveBeenCalled();
  });

  it("maps successful lookup to FOUND", async () => {
    const spy = vi.spyOn(cepModule, "getAddress").mockResolvedValue({
      cep: "60740380",
      street: "Rua A",
      neighborhood: "Centro",
      city: "Fortaleza",
      uf: "CE",
      state: "Ceará",
      provider: "viacep",
    });

    await expect(cep.lookup("60740-380")).resolves.toEqual({
      status: "FOUND",
      cep: "60740380",
      provider: "viacep",
      error: null,
    });

    expect(spy).toHaveBeenCalledWith("60740380", {});
  });

  it("maps not found errors to NOT_FOUND without throwing", async () => {
    vi.spyOn(cepModule, "getAddress").mockRejectedValue(
      new cep.CepNotFoundError("60740380", "widenet"),
    );

    await expect(cep.lookup("60740380")).resolves.toMatchObject({
      status: "NOT_FOUND",
      cep: "60740380",
      provider: "widenet",
    });
  });

  it("maps provider errors to UNAVAILABLE without throwing", async () => {
    vi.spyOn(cepModule, "getAddress").mockRejectedValue(
      new cep.CepProviderError("60740380", "brasilapi", [
        { provider: "brasilapi", reason: "timeout" },
      ]),
    );

    await expect(cep.lookup("60740380")).resolves.toMatchObject({
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

    const spy = vi.spyOn(cepModule, "getAddress").mockResolvedValue({
      cep: "60740380",
      street: "Rua A",
      neighborhood: "Centro",
      city: "Fortaleza",
      uf: "CE",
      state: "Ceará",
      provider: "widenet",
    });

    await cep.lookup("60740380", options);

    expect(spy).toHaveBeenCalledWith("60740380", options);
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

    const spy = vi.spyOn(cepModule, "getAddress");

    const result = await cep.lookup("60740380", { cache: { store } });

    expect(result).toEqual({ status: "FOUND", cep: "60740380", provider: "viacep", error: null });
    expect(spy).not.toHaveBeenCalled();
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

  it("throws for edge-case input types", () => {
    expect(() => cep.format(null as unknown as string)).toThrow(TypeError);
    expect(() => cep.format(undefined as unknown as string)).toThrow(TypeError);
    expect(() => cep.format(60740380 as unknown as string)).toThrow(TypeError);
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
    expect(() => cep.formatAsYouType(null as unknown as string)).toThrow(TypeError);
    expect(() => cep.formatAsYouType(undefined as unknown as string)).toThrow(TypeError);
    expect(() => cep.formatAsYouType(60740380 as unknown as string)).toThrow(TypeError);
  });
});

describe("cep.normalize", () => {
  it("normalizes CEP input", () => {
    expect(cep.normalize("60740-380")).toBe("60740380");
    expect(cep.normalize("60740380")).toBe("60740380");
    expect(cep.normalize("abc")).toBe("");
    expect(cep.normalize("")).toBe("");
  });

  it("throws for edge-case input types", () => {
    expect(() => cep.normalize(null as unknown as string)).toThrow(TypeError);
    expect(() => cep.normalize(undefined as unknown as string)).toThrow(TypeError);
    expect(() => cep.normalize(60740380 as unknown as string)).toThrow(TypeError);
  });
});
