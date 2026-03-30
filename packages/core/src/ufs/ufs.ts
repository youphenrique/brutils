import { assertOptions } from "../_shared/assert-options";
import { REGIONS, UFS } from "./constants";
import { normalizeFilter } from "./utils";
import type { ListOptions, UF } from "./types";

/**
 * Returns a list of Brazilian UFs (states + Distrito Federal).
 *
 * @param options - Options to filter and sort the list.
 * @returns An array of UF objects.
 *
 * @example
 * ```typescript
 * ufs.list();
 * ufs.list({ region: "NE" });
 * ufs.list({ sortBy: "name" });
 * ```
 */
export function list(options?: ListOptions): UF[] {
  assertOptions(options);

  let result = [...UFS];

  if (options?.region !== undefined) {
    const regionUpper = options.region.toUpperCase();

    if (!REGIONS[regionUpper]) {
      throw new Error(`Invalid region: ${options.region}. Valid regions are N, NE, CO, SE, S.`);
    }

    result = result.filter((uf) => uf.region.code === regionUpper);
  }

  if (options?.sortBy !== undefined && options.sortBy !== "code" && options.sortBy !== "name") {
    throw new Error(
      `Invalid sortBy: ${String(options.sortBy)}. Valid options are 'code' or 'name'.`,
    );
  }

  const sortBy = options?.sortBy ?? "code";

  result.sort((a, b) => a[sortBy].localeCompare(b[sortBy], "pt-BR"));

  return result;
}

/**
 * Gets a UF by its code (e.g., "SP").
 * Matching is case-insensitive and accent-insensitive.
 *
 * @param code - The UF code to search for.
 * @returns The matching UF object, or null if not found.
 *
 * @example
 * ```typescript
 * ufs.getByCode("SP"); // Returns São Paulo UF object
 * ufs.getByCode("sp"); // Returns São Paulo UF object
 * ```
 */
export function getByCode(code: string): UF | null {
  if (typeof code !== "string") {
    throw new TypeError(`Code must be a string, got ${typeof code}`);
  }

  const normalizedCode = normalizeFilter(code).trim();

  for (const uf of UFS) {
    if (normalizeFilter(uf.code) === normalizedCode) {
      return uf;
    }
  }

  return null;
}

/**
 * Gets a UF by its full name (e.g., "São Paulo").
 * Matching is case-insensitive and accent-insensitive.
 *
 * @param name - The UF name to search for.
 * @returns The matching UF object, or null if not found.
 *
 * @example
 * ```typescript
 * ufs.getByName("São Paulo"); // Returns São Paulo UF object
 * ufs.getByName("sao paulo"); // Returns São Paulo UF object
 * ```
 */
export function getByName(name: string): UF | null {
  if (typeof name !== "string") {
    throw new TypeError(`Name must be a string, got ${typeof name}`);
  }

  const normalizedName = normalizeFilter(name).trim();

  for (const uf of UFS) {
    if (normalizeFilter(uf.name) === normalizedName) {
      return uf;
    }
  }

  return null;
}
