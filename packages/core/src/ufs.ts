export interface Region {
  code: string;
  name: string;
}

export interface UF {
  code: string;
  name: string;
  region: Region;
}

const REGIONS: Record<string, Region> = {
  N: { code: "N", name: "Norte" },
  NE: { code: "NE", name: "Nordeste" },
  CO: { code: "CO", name: "Centro-Oeste" },
  SE: { code: "SE", name: "Sudeste" },
  S: { code: "S", name: "Sul" },
};

const UFS: UF[] = [
  { code: "AC", name: "Acre", region: REGIONS.N },
  { code: "AL", name: "Alagoas", region: REGIONS.NE },
  { code: "AM", name: "Amazonas", region: REGIONS.N },
  { code: "AP", name: "Amapá", region: REGIONS.N },
  { code: "BA", name: "Bahia", region: REGIONS.NE },
  { code: "CE", name: "Ceará", region: REGIONS.NE },
  { code: "DF", name: "Distrito Federal", region: REGIONS.CO },
  { code: "ES", name: "Espírito Santo", region: REGIONS.SE },
  { code: "GO", name: "Goiás", region: REGIONS.CO },
  { code: "MA", name: "Maranhão", region: REGIONS.NE },
  { code: "MG", name: "Minas Gerais", region: REGIONS.SE },
  { code: "MS", name: "Mato Grosso do Sul", region: REGIONS.CO },
  { code: "MT", name: "Mato Grosso", region: REGIONS.CO },
  { code: "PA", name: "Pará", region: REGIONS.N },
  { code: "PB", name: "Paraíba", region: REGIONS.NE },
  { code: "PE", name: "Pernambuco", region: REGIONS.NE },
  { code: "PI", name: "Piauí", region: REGIONS.NE },
  { code: "PR", name: "Paraná", region: REGIONS.S },
  { code: "RJ", name: "Rio de Janeiro", region: REGIONS.SE },
  { code: "RN", name: "Rio Grande do Norte", region: REGIONS.NE },
  { code: "RO", name: "Rondônia", region: REGIONS.N },
  { code: "RR", name: "Roraima", region: REGIONS.N },
  { code: "RS", name: "Rio Grande do Sul", region: REGIONS.S },
  { code: "SC", name: "Santa Catarina", region: REGIONS.S },
  { code: "SE", name: "Sergipe", region: REGIONS.NE },
  { code: "SP", name: "São Paulo", region: REGIONS.SE },
  { code: "TO", name: "Tocantins", region: REGIONS.N },
];

export interface ListOptions {
  region?: string;
  sortBy?: "code" | "name";
}

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
  if (options !== undefined && (typeof options !== "object" || options === null)) {
    throw new TypeError("Options must be an object.");
  }

  let result = [...UFS];

  if (options?.region !== undefined) {
    if (typeof options.region !== "string") {
      throw new TypeError("Option 'region' must be a string.");
    }
    const regionUpper = options.region.toUpperCase();
    if (!REGIONS[regionUpper]) {
      throw new Error(`Invalid region: ${options.region}. Valid regions are N, NE, CO, SE, S.`);
    }
    result = result.filter((uf) => uf.region.code === regionUpper);
  }

  if (options?.sortBy !== undefined) {
    if (typeof options.sortBy !== "string") {
      throw new TypeError("Option 'sortBy' must be a string.");
    }
    if (options.sortBy !== "code" && options.sortBy !== "name") {
      throw new Error(
        `Invalid sortBy: ${String(options.sortBy)}. Valid options are 'code' or 'name'.`,
      );
    }
  }

  const sortBy = options?.sortBy || "code";

  result.sort((a, b) => {
    return a[sortBy].localeCompare(b[sortBy], "pt-BR");
  });

  return result;
}

/**
 * Normalizes a string by converting it to lowercase and removing accents.
 */
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Gets a UF by its code (e.g., "SP") or full name (e.g., "São Paulo").
 * Matching is case-insensitive and accent-insensitive.
 *
 * @param query - The UF code or name to search for.
 * @returns The matching UF object, or null if not found.
 *
 * @example
 * ```typescript
 * ufs.get("SP"); // Returns São Paulo UF object
 * ufs.get("São Paulo"); // Returns São Paulo UF object
 * ufs.get("sao paulo"); // Returns São Paulo UF object
 * ```
 */
export function get(query: string): UF | null {
  if (typeof query !== "string") {
    throw new TypeError(`Query must be a string, got ${typeof query}`);
  }

  const normalizedQuery = normalizeString(query).trim();

  for (const uf of UFS) {
    if (
      normalizeString(uf.code) === normalizedQuery ||
      normalizeString(uf.name) === normalizedQuery
    ) {
      return uf;
    }
  }

  return null;
}

export const ufs = {
  list,
  get,
};

export default ufs;
