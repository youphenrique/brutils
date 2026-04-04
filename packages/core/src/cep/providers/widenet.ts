import { getByCode } from "../../ufs";
import type { CepProvider } from "./types";
import {
  CepProviderNotFoundSignal,
  CepProviderRequestError,
  throttleProvider,
  unfetch,
} from "../utils";
import { format } from "../cep";

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
      const formattedCep = format(cep);
      response = await unfetch(`https://cdn.apicep.com/file/apicep/${formattedCep}.json`, timeout);
    } catch (error) {
      throw new CepProviderRequestError(
        "widenet",
        error instanceof Error ? error.message : "Unknown error",
      );
    }

    if (response.status === 404) {
      throw new CepProviderNotFoundSignal();
    }

    if (!response.ok) {
      throw new CepProviderRequestError("widenet", `HTTP ${response.status}`);
    }

    const data = (await response.json()) as WidenetResponse;

    if (!data.ok || data.status === 404 || data.code === undefined) {
      throw new CepProviderNotFoundSignal();
    }

    return {
      cep: data.code.replace(/-/g, ""),
      street: data.address ?? "",
      neighborhood: data.district ?? "",
      city: data.city ?? "",
      uf: data.state ?? "",
      state: getByCode(data.state ?? "")?.name ?? "",
      provider: "widenet",
    };
  },
};
