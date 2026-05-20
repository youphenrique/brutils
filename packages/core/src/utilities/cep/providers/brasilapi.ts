import {
  CepProviderNotFoundSignal,
  CepProviderRequestError,
  throttleProvider,
  unfetch,
} from "../utils";
import type { CepProvider } from "./types";
import { getByCode } from "../../ufs";

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
      throw new CepProviderRequestError(
        "brasilapi",
        error instanceof Error ? error.message : "Unknown error",
      );
    }

    if (response.status === 404) {
      throw new CepProviderNotFoundSignal();
    }

    if (!response.ok) {
      throw new CepProviderRequestError("brasilapi", `HTTP ${response.status}`);
    }

    const data = (await response.json()) as BrasilApiResponse;
    if (data.cep === undefined || (data.errors !== undefined && data.errors.length > 0)) {
      throw new CepProviderNotFoundSignal();
    }

    return {
      cep: data.cep.replace(/-/g, ""),
      street: data.street ?? "",
      neighborhood: data.neighborhood ?? "",
      city: data.city ?? "",
      uf: data.state ?? "",
      state: getByCode(data.state ?? "")?.name ?? "",
      provider: "brasilapi",
      ibgeCode: data.ibge,
      ddd: data.ddd,
    };
  },
};
