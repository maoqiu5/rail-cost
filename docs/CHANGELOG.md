# Rail Cost Changelog

## 2026-08-08

- Added BrianHub bilingual UI support for `zh-CN` and `en-US`.
- Added `中文 / English` switching with `brianhub_locale` cookie persistence.
- Added initial locale resolution from injected `X-BrianHub-Locale`, then cookie, then `en-US`.
- Added i18n regression tests for locale fallback, priority, cookie output, and UI key coverage.
- Updated deployment documentation for Caddy `templates` injection on `/rail-cost/*`.

## 2026-08-05

- Created standalone `rail-cost` static project.
- Added overseas rail cost query page.
- Added TC container lease price query page.
- Added original public quote and container lease fee PDF download entries.
- Added BrianHub new-project documentation.
- Added calculator tests and HTML smoke tests.
