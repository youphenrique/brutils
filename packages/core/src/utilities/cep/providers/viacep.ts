import type { CepProvider } from "./types";
import {
  unfetch,
  CepProviderNotFoundSignal,
  CepProviderRequestError,
  throttleProvider,
} from "../utils";

type ViaCepResponse = {
  cep?: string;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  estado?: string;
  ibge?: string;
  ddd?: string;
  erro?: string;
};

export const viacepProvider: CepProvider = {
  name: "viacep",
  async fetch(cep, timeout) {
    await throttleProvider("viacep");

    let response: Response;

    try {
      response = await unfetch(`https://viacep.com.br/ws/${cep}/json/`, timeout);
    } catch (error) {
      throw new CepProviderRequestError(
        "viacep",
        error instanceof Error ? error.message : "Unknown error",
      );
    }

    if (response.status === 404) {
      throw new CepProviderNotFoundSignal();
    }

    if (!response.ok) {
      throw new CepProviderRequestError("viacep", `HTTP ${response.status}`);
    }

    const data = (await response.json()) as ViaCepResponse;
    if (data.erro === "true" || data.cep === undefined) {
      throw new CepProviderNotFoundSignal();
    }

    return {
      cep: data.cep.replace(/-/g, ""),
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
