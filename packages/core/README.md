# @brutils/core

Brazilian data utilities for TypeScript.

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

`validate` accepts only 11 ASCII digits or exact canonical punctuation. Length and syntax failures both use `INVALID_FORMAT`; repeated digits use `REPEATED_DIGITS`, and other well-shaped invalid values use `INVALID_CHECKSUM`.

### Decisions

- `normalize` keeps its name and stays permissive digit extraction. No separate extraction helper is added; the lossy behavior is documented above instead.
- `format` changes only exactly 11 ASCII digits and returns every other string unchanged. It has no padding option, because formatting must not invent identifier digits.
- `validate` accepts only 11 ASCII digits or exact `###.###.###-##`. Whitespace, other punctuation, and non-ASCII numerals are rejected.
- `INVALID_FORMAT` covers both length and syntax failures. No `INVALID_LENGTH` code is added unless callers need to tell them apart.
- Whether `validate` keeps throwing `TypeError` for non-string input or returns an `INVALID_TYPE` failure is deferred to [#63](https://github.com/youphenrique/brutils/issues/63).
- CNPJ and CEP adopt a coherent contract in [#65](https://github.com/youphenrique/brutils/issues/65) and [#66](https://github.com/youphenrique/brutils/issues/66).
