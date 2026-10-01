import type { AddressResponse, ProviderName } from "../types";

export interface CepProvider {
  name: ProviderName;
  fetch(cep: string, timeout: number): Promise<AddressResponse>;
}
