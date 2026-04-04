import type { ProviderName } from "../types";
import { brasilapiProvider } from "./brasilapi";
import type { CepProvider } from "./types";
import { viacepProvider } from "./viacep";
import { apicepProvider } from "./apicep";

export const providerRegistry: Record<ProviderName, CepProvider> = {
  viacep: viacepProvider,
  brasilapi: brasilapiProvider,
  apicep: apicepProvider,
};
