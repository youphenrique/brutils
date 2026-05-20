import type { Region, UF } from "./types";

export const REGIONS: Record<string, Region> = {
  N: { code: "N", name: "Norte" },
  NE: { code: "NE", name: "Nordeste" },
  CO: { code: "CO", name: "Centro-Oeste" },
  SE: { code: "SE", name: "Sudeste" },
  S: { code: "S", name: "Sul" },
};

export const UFS: UF[] = [
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
