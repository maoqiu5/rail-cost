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
- Dedicated SQLite-backed rail-cost data store.
- Admin-only data maintenance area for creating, reading, updating, and deleting rail-cost tables.

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
- Do not implement local rail-cost accounts; BrianHub authentication and forwarded role headers remain the authority.
- Do not add AI or document-body translation features.

## Data Sources

- `TOP客户-全铁公共报价单2026.08.01.pdf`
- `箱使费2026.08.01-2026.08.31pdf.pdf`
- Confirmed manual cost rules seeded into the dedicated rail-cost SQLite database.

## Storage

- Frontend source: `web/`
- Backend source: `server/`
- Runtime database: `data/rail-cost.db` locally and `/root/apps/rail-cost/data/rail-cost.db` on VPS.
- Private PDF data: `web/data/`

## Entry Points

- Production: `https://brianhub.net/rail-cost/`
- Local: run the Node service with `npm start`, then open `http://127.0.0.1:8036/rail-cost/`.

## Current Limits and Risks

- Covers only the currently entered 2026-08 rules.
- Files under `web/data/` are sensitive business materials and must not enter GitHub or a public repository.
- Database files are runtime state and must not enter GitHub.
- Monthly quote updates should be made through the admin maintenance page and source PDFs should be updated separately.
