import type { CepNotFoundError, CepProviderError, CepValidationError } from "./utils";

export type CepErrorCode = "INVALID_FORMAT" | "REPEATED_DIGITS" | "UNKNOWN_ERROR";

export type CepFormatOptions = {
  pad?: boolean;
};

export const PROVIDERS = ["viacep", "brasilapi", "apicep"] as const;

export type ProviderName = (typeof PROVIDERS)[number];

export interface AddressResponse {
  cep: string;
  street: string;
  neighborhood: string;
  city: string;
  uf: string;
  state: string;
  provider: ProviderName;
  ibgeCode?: string;
  ddd?: string;
}

export interface CacheStore {
  get(key: string): Promise<AddressResponse | null>;
  set(key: string, value: AddressResponse, ttl: number): Promise<void>;
}

export interface GetAddressOptions {
  providers?: ProviderName[];
  strategy?: "fallback" | "race";
  timeout?: number;
  cache?: boolean | { ttl?: number; store?: CacheStore };
}

export type CepValidationResult =
  | { success: true; error: null }
  | { success: false; error: CepValidationError };

export type CepLookupResult =
  | { status: "FOUND"; cep: string; provider: ProviderName; error: null }
  | { status: "NOT_FOUND"; cep: string; provider: ProviderName; error: CepNotFoundError }
  | { status: "UNAVAILABLE"; cep: string; provider: ProviderName; error: CepProviderError };
