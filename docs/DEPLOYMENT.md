# Rail Cost Deployment

## Basic Information

- Project slug: `rail-cost`
- Production path: `https://brianhub.net/rail-cost/`
- Local repo: `D:\codex\rail-cost`
- VPS directory: `/root/apps/rail-cost`
- Web directory: `/root/apps/rail-cost/web`
- Runtime database: `/root/apps/rail-cost/data/rail-cost.db`
- Private PDF directory: `/root/apps/rail-cost/web/data`
- GitHub remote: `git@github.com:maoqiu5/rail-cost.git`
- Default local service: `http://127.0.0.1:8036/rail-cost/`

## Service Shape

Rail Cost is a small Node.js service using the built-in `node:sqlite` module. The service owns:

- Public page and static assets under `/rail-cost/`.
- `GET /health`.
- `GET /api/me`.
- `GET /api/query/bootstrap`.
- Admin-only `GET /api/quotes/template.xlsx`.
- Admin-only `GET /api/quotes/imports`.
- Admin-only `POST /api/quotes/import`.

The legacy admin-only `/api/admin/*` endpoints and data-maintenance page have been removed.

Runtime dependencies are `pdfjs-dist` for PDF text extraction and `xlsx` for XLSX parsing/template generation. Install them with `npm install --omit=dev` after pulling code.

The app listens on port `8036`. In Docker it must use `HOST=0.0.0.0` and join the shared `brianhub_edge` network so the BrianHub gateway container can reach it at `rail-cost:8036`. Public `80/443` traffic stays with the BrianHub gateway.

## Current VPS Deployment (Confirmed 2026-08-25)

The production `/root/apps/rail-cost` runs as a **manually created Docker container** (no Compose/Dockerfile in the project). Confirmed container details:

- Container name: `rail-cost`
- Image: `node:24-bookworm` (Node 24)
- Working directory: `/app`
- Command: `node server/app.js`
- Network: `brianhub_edge` (container address `rail-cost:8036`)
- Mounts:
  - `/root/apps/rail-cost:/app`
  - `/root/apps/rail-cost/data:/app/data`
- Environment: `PORT=8036`, `HOST=0.0.0.0`
- Restart policy: `unless-stopped`
- No host port mapping; only reachable through the BrianHub gateway on the shared network

Equivalent `docker run` command for recreating the container:

```bash
docker run -d \
  --name rail-cost \
  --network brianhub_edge \
  --restart unless-stopped \
  -w /app \
  -e PORT=8036 \
  -e HOST=0.0.0.0 \
  -v /root/apps/rail-cost:/app \
  -v /root/apps/rail-cost/data:/app/data \
  node:24-bookworm \
  node server/app.js
```

Health check inside the container:

```bash
docker exec rail-cost curl -fsS http://127.0.0.1:8036/health
# {"ok":true}
```

## BrianHub Headers

The gateway keeps `/rail-cost/*` behind BrianHub SSO and forwards:

- `X-BrianHub-User`
- `X-BrianHub-Role`
- `X-BrianHub-Locale`

The gateway is the security boundary for these headers. It strips or overwrites client-supplied `X-BrianHub-*` request headers before proxying to rail-cost, then sets trusted values from BrianHub auth. Do not expose the rail-cost service directly to the public network.

## Database

The database file is independent from all other projects:

```bash
/root/apps/rail-cost/data/rail-cost.db
```

On startup, the service ensures the schema, inserts the four agent records (`TC`, `BA`, `FESCO`, `LOA`), and imports the current TC quote data. Quote data is versioned with the `quote_data_version` meta key.

The container lease prices are currently empty because containers are in short supply.

## Sensitive Files

Do not commit these files:

- `web/data/`
- `data/`
- `*.sqlite`
- `*.sqlite-shm`
- `*.sqlite-wal`
- `.env`
- `.env.*`
- `node_modules/`
- logs, runtime, backups, and secrets directories

## Local Verification

Use the bundled or system Node.js 24+ runtime:

```bash
node --disable-warning=ExperimentalWarning tools/test_db.js
node --disable-warning=ExperimentalWarning tools/test_api.js
node tools/test_i18n.js
node --disable-warning=ExperimentalWarning tools/test_calculator.js
node tools/test_html_smoke.js
```

Then start the service:

```bash
PORT=8036 HOST=127.0.0.1 node --disable-warning=ExperimentalWarning server/app.js
```

Open `http://127.0.0.1:8036/rail-cost/`.

## Release

1. Verify locally.
2. Commit and push to GitHub.
3. On the VPS, pull the GitHub commit into `/root/apps/rail-cost`.
4. Install runtime dependencies: `docker exec rail-cost sh -c 'cd /app && npm install --omit=dev'`.
5. Preserve `/root/apps/rail-cost/web/data/` and `/root/apps/rail-cost/data/`.
6. Restart the Docker container: `docker restart rail-cost`.
7. Ensure the BrianHub gateway proxies `/rail-cost/*` to `rail-cost:8036`.
8. Verify:

```bash
docker exec rail-cost curl -fsS http://127.0.0.1:8036/health
curl -fsS https://brianhub.net/rail-cost/ >/dev/null
curl -fsS https://brianhub.net/rail-cost/api/query/bootstrap >/dev/null
```

## Rollback

- Code rollback: restore the previous Git commit and restart the Docker container (`docker restart rail-cost`).
- Database rollback: restore `/root/apps/rail-cost/data/rail-cost.db` from backup.
- PDF rollback: restore the previous files under `/root/apps/rail-cost/web/data/`.
- Gateway rollback: restore the previous BrianHub gateway config and reload it.
