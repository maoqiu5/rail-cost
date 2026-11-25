# Rail Cost Changelog

## 2026-11-02

- Imported the TC `TOP客户-全铁公共报价单2026.11.01.pdf` quote for 2026-11-01 to 2026-11-30.
- Added the agent dimension (`TC`, `BA`, `FESCO`, `LOA`) to quote storage and query flows.
- Added agent selectors to the rail cost and container lease query forms.
- Imported TC Manzhouli and Erlian COC/SOC freight quotes exactly as published.
- Added Kupavna (230506) and Kresty (181403) destination stations.
- Cleared container lease prices because containers are currently in short supply.
- Removed the data-maintenance page, `/api/admin/*` endpoints, admin tests, and admin UI copy.
- Replaced the legacy public quote PDF download with the November 2026 TC quote PDF.

## 2026-08-11

- Added a dedicated SQLite database for rail-cost data.
- Added Node service APIs for query bootstrap and admin-only CRUD maintenance.
- Added a left-side directory with query and data maintenance views.
- Moved query calculation to database-backed bootstrap data.
- Added BrianHub role-header admin gating with `X-BrianHub-Role`.
- Added database, API, calculator, i18n, and HTML smoke regression tests.

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
