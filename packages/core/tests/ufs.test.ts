import { describe, expect, it } from "vite-plus/test";

import { ufs } from "../src/index.ts";

describe("ufs.list", () => {
  it("returns all 27 UFs when no args are provided", () => {
    const allUFs = ufs.list();
    expect(allUFs.length).toBe(27);
    expect(allUFs.some((uf) => uf.code === "SP")).toBe(true);
    expect(allUFs.some((uf) => uf.code === "DF")).toBe(true);
  });

  it("filters by region correctly", () => {
    const neUFs = ufs.list({ region: "NE" });
    expect(neUFs.length).toBe(9);
    expect(neUFs.every((uf) => uf.region.code === "NE")).toBe(true);
    expect(neUFs.some((uf) => uf.code === "BA")).toBe(true);

    const sUFs = ufs.list({ region: "s" });
    expect(sUFs.length).toBe(3);
    expect(sUFs.every((uf) => uf.region.code === "S")).toBe(true);
    expect(sUFs.some((uf) => uf.code === "PR")).toBe(true);
  });

  it("sorts by name correctly", () => {
    const sortedByName = ufs.list({ sortBy: "name" });
    expect(sortedByName.length).toBe(27);
    expect(sortedByName[0].name).toBe("Acre"); // First alphabetically
    expect(sortedByName[sortedByName.length - 1].name).toBe("Tocantins"); // Last alphabetically
  });

  it("sorts by code by default", () => {
    const sortedByCode = ufs.list();
    expect(sortedByCode.length).toBe(27);
    expect(sortedByCode[0].code).toBe("AC"); // First alphabetically by code
    expect(sortedByCode[sortedByCode.length - 1].code).toBe("TO"); // Last alphabetically by code
  });

  it("throws Error for invalid region", () => {
    expect(() => ufs.list({ region: "XX" })).toThrowError(/Invalid region/);
  });

  it("throws Error for invalid sortBy", () => {
    // @ts-expect-error Testing invalid runtime value
    expect(() => ufs.list({ sortBy: "invalid" })).toThrowError(/Invalid sortBy/);
  });

  it("throws TypeError for invalid non-object options", () => {
    expect(ufs.list(undefined)).toHaveLength(27);
    // @ts-expect-error Testing invalid runtime value
    expect(() => ufs.list("SP")).toThrowError(TypeError);
    // @ts-expect-error Testing invalid runtime value
    expect(() => ufs.list(null)).toThrowError(TypeError);
    // @ts-expect-error Testing invalid runtime value
    expect(() => ufs.list(123)).toThrowError(TypeError);
    // @ts-expect-error Testing invalid runtime value
    expect(() => ufs.list(true)).toThrowError(TypeError);
    // @ts-expect-error Testing invalid runtime value
    expect(() => ufs.list([])).toThrowError(TypeError);
  });

  it("throws Error for invalid sortBy value", () => {
    // @ts-expect-error Testing invalid runtime value
    expect(() => ufs.list({ sortBy: "invalid" })).toThrowError(/Invalid sortBy/);
    // @ts-expect-error Testing invalid runtime value
    expect(() => ufs.list({ sortBy: 123 })).toThrowError(/Invalid sortBy/);
  });
});

describe("list.getByCode", () => {
  it("returns UF by code", () => {
    const sp = ufs.getByCode("SP");
    expect(sp).not.toBeNull();
    expect(sp?.code).toBe("SP");
    expect(sp?.name).toBe("São Paulo");
    expect(sp?.region.code).toBe("SE");
  });

  it("returns UF ignoring case and accents", () => {
    const sp1 = ufs.getByCode("sp");
    expect(sp1?.code).toBe("SP");
  });

  it("returns null for unknown inputs", () => {
    expect(ufs.getByCode("XX")).toBeNull();
    expect(ufs.getByCode("São Paulo")).toBeNull();
    expect(ufs.getByCode("")).toBeNull();
  });

  it("throws TypeError for invalid non-string input", () => {
    // @ts-expect-error Testing invalid runtime value
    expect(() => ufs.getByCode(null)).toThrowError(TypeError);
    // @ts-expect-error Testing invalid runtime value
    expect(() => ufs.getByCode(undefined)).toThrowError(TypeError);
    // @ts-expect-error Testing invalid runtime value
    expect(() => ufs.getByCode(123)).toThrowError(TypeError);
    // @ts-expect-error Testing invalid runtime value
    expect(() => ufs.getByCode({})).toThrowError(TypeError);
  });
});

describe("list.getByName", () => {
  it("returns UF by name", () => {
    const rj = ufs.getByName("Rio de Janeiro");
    expect(rj).not.toBeNull();
    expect(rj?.code).toBe("RJ");
    expect(rj?.name).toBe("Rio de Janeiro");
    expect(rj?.region.code).toBe("SE");
  });

  it("returns UF ignoring case and accents", () => {
    const sp1 = ufs.getByName("são paulo");
    expect(sp1?.code).toBe("SP");

    const sp2 = ufs.getByName("SAO PAULO");
    expect(sp2?.code).toBe("SP");

    const ce = ufs.getByName("ceará");
    expect(ce?.code).toBe("CE");

    const mg = ufs.getByName(" minas Gerais ");
    expect(mg?.code).toBe("MG");
  });

  it("returns null for unknown inputs", () => {
    expect(ufs.getByName("Unknown State")).toBeNull();
    expect(ufs.getByName("SP")).toBeNull(); // Code shouldn't match name
    expect(ufs.getByName("")).toBeNull();
  });

  it("throws TypeError for invalid non-string input", () => {
    // @ts-expect-error Testing invalid runtime value
    expect(() => ufs.getByName(null)).toThrowError(TypeError);
    // @ts-expect-error Testing invalid runtime value
    expect(() => ufs.getByName(undefined)).toThrowError(TypeError);
    // @ts-expect-error Testing invalid runtime value
    expect(() => ufs.getByName(123)).toThrowError(TypeError);
    // @ts-expect-error Testing invalid runtime value
    expect(() => ufs.getByName({})).toThrowError(TypeError);
  });
});
