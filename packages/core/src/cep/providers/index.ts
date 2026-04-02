import type { ProviderName } from "../types";
import { brasilapiProvider } from "./brasilapi";
import type { CepProvider } from "./types";
import { viacepProvider } from "./viacep";
import { widenetProvider } from "./widenet";

export const providerRegistry: Record<ProviderName, CepProvider> = {
  viacep: viacepProvider,
  brasilapi: brasilapiProvider,
  widenet: widenetProvider,
};
