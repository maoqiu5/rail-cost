# Rail Cost PRD

## Project Goal

Provide a standalone lightweight internal page for querying overseas rail freight quotes from multiple agents and, when available, container lease quotes.

## Users and Scenarios

- Users: internal quotation and operations staff.
- Scenario: choose an agent, transshipment border, destination station, container size, and SOC/COC ownership to look up the current rail freight quote.
- Scenario: when container lease quotes are available, choose an agent, border, pickup location, and container size to look up the lease price.

## Implemented Features

- Agent-aware overseas rail freight quote lookup.
- Supported agents: `TC`, `BA`, `FESCO`, `LOA`.
- TC November 2026 quote imported from `TOP客户-全铁公共报价单2026.11.01.pdf`.
- COC and SOC prices are stored separately where the source quote distinguishes them.
- COC prices represent the COC freight portion only and exclude container lease fees.
- BrianHub bilingual UI support for `zh-CN` and `en-US`.
- Source quote PDF download entry.

## Removed Features

- The legacy data-maintenance page.
- `/api/admin/*` maintenance endpoints.
- Manual admin CRUD for borders, destinations, freight prices, and lease prices.

## Planned Features

- Upload and import agent quote PDFs.
- Upload and import manually filled XLSX quote sheets.
- Support additional agents and quote versions without code changes.
- Import container lease quotes when containers become available again.

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
- Do not implement local rail-cost accounts; BrianHub authentication remains the authority.
- Do not add AI or document-body translation features.

## Storage

- Frontend source: `web/`
- Backend source: `server/`
- Runtime database: `data/rail-cost.db` locally and `/root/apps/rail-cost/data/rail-cost.db` on VPS.
- Private PDF data: `web/data/`.

## Entry Points

- Production: `https://brianhub.net/rail-cost/`
- Local: run the Node service with `npm start`, then open `http://127.0.0.1:8036/rail-cost/`.

## Current Limits and Risks

- Only the TC November 2026 quote is currently imported; BA, FESCO, and LOA quotes are not yet imported.
- Container lease prices are empty because containers are in short supply.
- Quote imports are currently code/data driven; PDF/XLSX upload is the next planned step.
- Files under `web/data/` are sensitive business materials and must not enter GitHub or a public repository.
- Database files are runtime state and must not enter GitHub.
