# Rail Cost Docs

Rail Cost is a standalone BrianHub project for overseas rail cost lookup, TC container lease lookup, source PDF downloads, and admin-only data maintenance.

## Documents

- `docs/PRD.md`: product boundary, supported workflows, data ownership, and non-goals.
- `docs/DEPLOYMENT.md`: local/VPS deployment, BrianHub gateway route, database file, and release checks.
- `docs/CHANGELOG.md`: released project changes.

## Maintenance Rules

- This project is independent from `rates`.
- Business data is stored in the dedicated rail-cost SQLite database.
- Original PDFs stay in `web/data/` and must not be committed.
- Database files under `data/` are runtime state and must not be committed.
