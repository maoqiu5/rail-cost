# Rail Cost PRD

## Project Goal

Provide a standalone lightweight internal page for overseas rail cost lookup and TC container lease price lookup.

## Users and Scenarios

- Users: internal quotation and operations staff.
- Scenario: calculate overseas rail cost by transshipment border, destination station, container size, and SOC/COC; calculate TC lease price by transshipment border, pickup location, and container size.

## Implemented Features

- Overseas rail cost query.
- TC container lease price query.
- Download buttons for the original public quote PDF and container lease fee PDF.
- Destination station supports Chinese, English, and station-code search in one input.
- BrianHub bilingual UI support for `zh-CN` and `en-US`.

## BrianHub Locale Rules

- Supported locales: `zh-CN`, `en-US`.
- Initial priority: `X-BrianHub-Locale`, then `brianhub_locale` cookie, then `en-US`.
- Unknown locale values fall back to `en-US`.
- Manual language switching updates the current page immediately and writes `brianhub_locale` for BrianHub-wide reuse.
- Only UI copy is translated. Business data, user input, PDFs, document body text, and generated/AI output are not automatically translated.

## Explicit Non-Goals

- Do not integrate into the `rates` project sidebar or codebase.
- Do not include truck freight, rail prediction, market reference, GPS tracking, or map features.
- Do not generate formal customer quotations.
- Do not add database, account, AI, or admin management features.

## Data Sources

- `TOP客户-全铁公共报价单2026.08.01.pdf`
- `箱使费2026.08.01-2026.08.31pdf.pdf`
- Confirmed manual cost rules encoded in `web/calculator.js`.

## Storage

- Frontend source: `web/`
- Private PDF data: `web/data/`

## Entry Points

- Production: `https://brianhub.net/rail-cost/`
- Local: open `web/index.html` or serve `web/` with a static file server.

## Current Limits and Risks

- Covers only the currently entered 2026-08 rules.
- Files under `web/data/` are sensitive business materials and must not enter GitHub or a public repository.
- Monthly quote updates require updating both rules and source PDFs.
