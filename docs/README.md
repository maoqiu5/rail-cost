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

## Price Maintenance

- `rail_cost_freight_prices`: final rail freight prices by border, destination station, and container size.
- `rail_cost_lease_prices`: final lease prices by border, pickup location, and container size; the admin page edits only `displayPriceUsd`.
- Admin users maintain final prices directly; query pages read only the final price tables.
