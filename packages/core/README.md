# @brutils/core

Brazilian data utilities for TypeScript.

## Node.js support

Node.js 24.13.1 or newer within the Node.js 24 release line is supported. Other Node.js major versions are not currently claimed as supported. The minimum version is recorded in the package's `engines.node` field; the CI matrix should test Node.js 24 before a release.

## CPF input contract

`cpf.normalize`, `cpf.format`, and `cpf.validate` serve different purposes. For string inputs, none throws because of malformed content. All three expect a string at runtime and throw `TypeError` for other types. `cpf.validate` returns a result object for strings; it is the only one of these functions that decides CPF validity.

| Input string                                                  | `normalize`                      | `format`                                       | `validate`                          |
| ------------------------------------------------------------- | -------------------------------- | ---------------------------------------------- | ----------------------------------- |
| Exactly 11 ASCII digits                                       | Same digits                      | `###.###.###-##`                               | Checks repeated digits and checksum |
| Exact canonical `###.###.###-##`                              | 11 digits                        | Same string                                    | Checks repeated digits and checksum |
| Well-shaped, bad checksum                                     | Digits                           | Formats raw input or preserves canonical input | `INVALID_CHECKSUM`                  |
| Empty or partial                                              | Extracted digits, possibly empty | Same string                                    | `INVALID_FORMAT`                    |
| Overlong                                                      | **All** extracted digits         | Same string                                    | `INVALID_FORMAT`                    |
| Mixed punctuation, letters, whitespace, or non-ASCII numerals | Extracted ASCII digits           | Same string                                    | `INVALID_FORMAT`                    |

`normalize` is lossy digit extraction. It does not parse or validate the original input, and it never truncates. For example, `cpf.normalize("abc916!!!534...780--39def")` returns `"91653478039"`, although the original string fails validation. Validate the original value when its syntax matters; sanitize first only when accepting such input is intentional.

`format` changes only a string of exactly 11 ASCII digits. It leaves every other string unchanged, including an already canonical CPF, and does not check the checksum or pad partial input. A formatted return value is no proof of validity. Use `cpf.formatAsYouType` to display partial input while typing.

`cpf.formatAsYouType` accepts an editable string, including `""` and partial input. It keeps ASCII digits only, takes the first 11, then inserts `.`, `.`, and `-` only when the following segment has a digit. For example, `"5226"` displays as `"522.6"`, `"5226394462"` as `"522.639.446-2"`, and `"522.639.446-21"` stays unchanged. Letters, Unicode numerals, and extra digits are discarded. This is **lossy input-field display**, not a parser or evidence that pasted text was valid; it does not check the checksum. Validate the **original submitted string** with `cpf.validate`, before replacing it with the displayed value. Among CPF APIs, only `formatAsYouType` _formats_ partial input; `normalize` also extracts digits from partial input, and `format` returns it unchanged.

The CNPJ and CEP typing helpers follow the same display-only policy. `cep.formatAsYouType` keeps the first eight ASCII digits and adds `-` when a sixth digit exists. `cnpj.formatAsYouType` removes non-ASCII alphanumeric characters, uppercases letters, keeps the first 12 base characters, then keeps the first two ASCII digits from the remaining characters for its check-digit positions. Both accept empty and partial strings, discard excess characters, and insert separators only when the next segment exists. Use `cnpj.validate` or `cep.validate` on the original submitted string. There is currently no phone utility in `@brutils/core` to which this policy can be applied.

`cpf.mask` displays a complete CPF with hidden digits. It accepts exactly 11 ASCII digits or the canonical `###.###.###-##` shape without checking the checksum. The default `"suffix"` mode reveals only the last two digits; `"prefix-suffix"` reveals the first three and last two; `"redacted"` hides every digit. The optional `char` replaces each hidden digit and defaults to `"*"`. It must be exactly one visible Unicode code point (counted by code point, not grapheme, so `"🔒"` is accepted but `"🔒️"` with a variation selector is not) and cannot be a number, whitespace, mark, control, format, or invisible filler character, `.`, or `-`:

```ts
cpf.mask("29650899006"); // "***.***.***-06"
cpf.mask("29650899006", { mode: "prefix-suffix" }); // "296.***.***-06"
cpf.mask("29650899006", { mode: "redacted", char: "#" }); // "###.###.###-##"
```

Empty, partial, overlong, or malformed strings return `null`. Non-string CPF values, invalid options containers, and invalid option values throw `TypeError`. If masking returns `null`, show a neutral placeholder or handle invalid input separately; never display the original value as a fallback. This mask is for display, not anonymization: even `"redacted"` reveals that the input has CPF shape. Use `cpf.format` for complete-number formatting and `cpf.formatAsYouType` for partial input while typing.

`validate` accepts only 11 ASCII digits or exact canonical punctuation. Length and syntax failures both use `INVALID_FORMAT`; repeated digits use `REPEATED_DIGITS`, and other well-shaped invalid values use `INVALID_CHECKSUM`.

### CPF generation

`cpf.generate(options?: { formatted?: boolean }): string` creates test fixtures with valid CPF check digits. It returns 11 digits by default, preserving leading zeroes; `{ formatted: true }` adds punctuation as `XXX.XXX.XXX-XX`. Omitted or `undefined` options and `formatted` use the default. Invalid options containers and non-boolean `formatted` values throw `TypeError`.

Region control is excluded from the 1.0 API. The former `uf` option and `UFS_REGION_MAP` export are removed: the ninth digit describes the fiscal region at initial registration and does not identify a person's current state. TypeScript flags `uf` and `region` in object literals as unknown properties; JavaScript callers passing them get no error, and the options are ignored (the ninth digit is random). Remove those options when migrating.

Generation uses `Math.random`, which is not cryptographically secure. Generated CPFs can coincide with real assigned numbers. Use them as test fixtures, never as identities or secrets.

### Decisions

- `normalize` keeps its name and stays permissive digit extraction. No separate extraction helper is added; the lossy behavior is documented above instead.
- `format` changes only exactly 11 ASCII digits and returns every other string unchanged. It has no padding option, because formatting must not invent identifier digits.
- `validate` accepts only 11 ASCII digits or exact `###.###.###-##`. Whitespace, other punctuation, and non-ASCII numerals are rejected.
- `INVALID_FORMAT` covers both length and syntax failures. No `INVALID_LENGTH` code is added unless callers need to tell them apart.
- Whether `validate` keeps throwing `TypeError` for non-string input or returns an `INVALID_TYPE` failure is deferred to [#63](https://github.com/youphenrique/brutils/issues/63).
- CNPJ and CEP adopt a coherent contract in [#65](https://github.com/youphenrique/brutils/issues/65) and [#66](https://github.com/youphenrique/brutils/issues/66).
