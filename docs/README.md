# Rail Cost Docs

Rail Cost is a standalone BrianHub project for overseas rail freight quote lookup by agent, transshipment border, destination station, container size, and SOC/COC ownership.

## Documents

- `docs/PRD.md`: product boundary, supported workflows, data ownership, and non-goals.
- `docs/DEPLOYMENT.md`: local/VPS deployment, BrianHub gateway route, database file, and release checks.
- `docs/CHANGELOG.md`: released project changes.

## Maintenance Rules

- This project is independent from `rates`.
- Business data is stored in the dedicated rail-cost SQLite database.
- Original quote PDFs stay in `web/data/` and must not be committed.
- Database files under `data/` are runtime state and must not be committed.
- The legacy data-maintenance page and `/api/admin/*` endpoints have been removed.

## Quote Sources

- Agent quotes are imported from source PDF/XLSX quote sheets.
- Supported agents currently include `TC`, `BA`, `FESCO`, and `LOA`.
- TC November 2026 quote data is imported under agent `TC`.
- COC prices represent the COC freight portion only and do not include container lease fees.
- Container lease prices are currently empty because containers are in short supply.
