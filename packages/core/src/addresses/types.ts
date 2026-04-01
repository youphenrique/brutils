export const PROVIDERS = ["viacep", "brasilapi", "widenet"] as const;

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

export interface GetByCepOptions {
  providers?: ProviderName[];
  strategy?: "fallback" | "race";
  timeout?: number;
  cache?: boolean | { ttl?: number; store?: CacheStore };
}
