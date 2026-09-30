# @brutils/cep-resolver

Resolves Brazilian CEPs into addresses using third-party providers (ViaCEP, BrasilAPI, ApiCEP).

This package performs network I/O and depends on external APIs, so it is versioned separately from [`@brutils/core`](../core). Provider outages or response-shape changes are handled here without affecting core.

```ts
import { getAddress } from "@brutils/cep-resolver";

await getAddress("01001-000"); // { cep: "01001000", uf: "SP", city: "São Paulo", provider: "viacep", ... }
await getAddress("01001-000", { strategy: "race", timeout: 2000, cache: true });
```

Input is validated with `cep.validate` from `@brutils/core`, so invalid or non-string input rejects with `cep.CepValidationError`. A CEP unknown to the providers rejects with `CepNotFoundError`; when every provider fails, it rejects with `CepProviderError`.

## Node.js support

Same as `@brutils/core`: Node.js 24.13.1 or newer within the Node.js 24 release line.
