import { ProviderNotFoundSignal, ProviderRequestError, throttleProvider, fetchJsonWithTimeout, normalizeCep } from "../utils";
import type { CepProvider } from "./types";

type WidenetResponse = {
  code?: string;
  state?: string;
  city?: string;
  district?: string;
  address?: string;
  status?: number;
  ok?: boolean;
};

export const widenetProvider: CepProvider = {
  name: "widenet",
  async fetch(cep, timeout) {
    await throttleProvider("widenet");

    let response: Response;
    try {
      response = await fetchJsonWithTimeout(`https://apps.widenet.com.br/busca-cep/api/cep/${cep}.json`, timeout);
    } catch (error) {
      throw new ProviderRequestError("widenet", error instanceof Error ? error.message : "Unknown error");
    }

    if (response.status === 404) {
      throw new ProviderNotFoundSignal();
    }

    if (!response.ok) {
      throw new ProviderRequestError("widenet", `HTTP ${response.status}`);
    }

    const data = (await response.json()) as WidenetResponse;
    if (!data.ok || data.status === 404 || !data.code) {
      throw new ProviderNotFoundSignal();
    }

    return {
      cep: normalizeCep(data.code),
      street: data.address ?? "",
      neighborhood: data.district ?? "",
      city: data.city ?? "",
      uf: data.state ?? "",
      state: "",
      provider: "widenet",
    };
  },
};
