import { fetchJsonWithTimeout, normalizeCep, ProviderNotFoundSignal, ProviderRequestError, throttleProvider } from "../utils";
import type { CepProvider } from "./types";

type ViaCepResponse = {
  cep?: string;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  estado?: string;
  ibge?: string;
  ddd?: string;
  erro?: boolean;
};

export const viacepProvider: CepProvider = {
  name: "viacep",
  async fetch(cep, timeout) {
    await throttleProvider("viacep");

    let response: Response;
    try {
      response = await fetchJsonWithTimeout(`https://viacep.com.br/ws/${cep}/json/`, timeout);
    } catch (error) {
      throw new ProviderRequestError("viacep", error instanceof Error ? error.message : "Unknown error");
    }

    if (response.status === 404) {
      throw new ProviderNotFoundSignal();
    }

    if (!response.ok) {
      throw new ProviderRequestError("viacep", `HTTP ${response.status}`);
    }

    const data = (await response.json()) as ViaCepResponse;
    if (data.erro || !data.cep) {
      throw new ProviderNotFoundSignal();
    }

    return {
      cep: normalizeCep(data.cep),
      street: data.logradouro ?? "",
      neighborhood: data.bairro ?? "",
      city: data.localidade ?? "",
      uf: data.uf ?? "",
      state: data.estado ?? "",
      provider: "viacep",
      ibgeCode: data.ibge,
      ddd: data.ddd,
    };
  },
};
