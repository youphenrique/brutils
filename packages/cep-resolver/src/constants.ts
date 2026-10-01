import type { ProviderName } from "./types";

export const DEFAULT_PROVIDER_ORDER: ProviderName[] = ["viacep", "brasilapi", "apicep"];
export const DEFAULT_TIMEOUT_MS = 5000;
export const DEFAULT_CACHE_TTL_SECONDS = 3600;

export const PROVIDER_THROTTLE: Record<ProviderName, { rps: number }> = {
  viacep: { rps: 10 },
  apicep: { rps: 5 },
  brasilapi: { rps: 15 },
};
