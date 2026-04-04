import { ProviderNotFoundSignal, ProviderRequestError, throttleProvider, unfetch } from "../utils";
import type { CepProvider } from "./types";

type BrasilApiResponse = {
  cep?: string;
  street?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  ibge?: string;
  ddd?: string;
  errors?: Array<{ message: string }>;
};

export const brasilapiProvider: CepProvider = {
  name: "brasilapi",
  async fetch(cep, timeout) {
    await throttleProvider("brasilapi");

    let response: Response;
    try {
      response = await unfetch(`https://brasilapi.com.br/api/cep/v1/${cep}`, timeout);
    } catch (error) {
      throw new ProviderRequestError(
        "brasilapi",
        error instanceof Error ? error.message : "Unknown error",
      );
    }

    if (response.status === 404) {
      throw new ProviderNotFoundSignal();
    }

    if (!response.ok) {
      throw new ProviderRequestError("brasilapi", `HTTP ${response.status}`);
    }

    const data = (await response.json()) as BrasilApiResponse;
    if (!data.cep || data.errors?.length) {
      throw new ProviderNotFoundSignal();
    }

    return {
      cep: data.cep.replace(/-/g, ""),
      street: data.street ?? "",
      neighborhood: data.neighborhood ?? "",
      city: data.city ?? "",
      uf: data.state ?? "",
      state: "",
      provider: "brasilapi",
      ibgeCode: data.ibge,
      ddd: data.ddd,
    };
  },
};
