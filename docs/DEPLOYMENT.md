# Rail Cost Deployment

## Basic Information

- Project slug: `rail-cost`
- Production path: `https://brianhub.net/rail-cost/`
- Local repo: `C:\Users\12514\Documents\rail-cost`
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
- Admin-only `GET/POST/PUT/DELETE /api/admin/:resource`.

The app listens on port `8036`. In Docker it must use `HOST=0.0.0.0` so the BrianHub gateway container can reach it over the shared Docker network. Public `80/443` traffic stays with the BrianHub gateway.

## BrianHub Headers

The gateway must keep `/rail-cost/*` behind BrianHub SSO and forward:

- `X-BrianHub-User`
- `X-BrianHub-Role`
- `X-BrianHub-Locale`

Only users whose forwarded role list contains `admin` can see or use the data maintenance page. Unknown locale values fall back to `en-US`.

The gateway is the security boundary for these headers. It must strip or overwrite any client-supplied `X-BrianHub-*` request headers before proxying to rail-cost, then set trusted values from BrianHub auth. Do not expose the rail-cost service directly to the public network.

## Database

The database file is independent from all other projects:

```bash
/root/apps/rail-cost/data/rail-cost.db
```

On startup, the service creates missing tables and seeds missing default rows. It uses `insert or ignore`, so existing edited rows are not overwritten by restart.

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
4. Preserve `/root/apps/rail-cost/web/data/` and `/root/apps/rail-cost/data/`.
5. Start or restart the rail-cost Node service on `127.0.0.1:8036`.
6. Ensure the BrianHub gateway proxies `/rail-cost/*` to the service and forwards the BrianHub headers.
7. Verify:

```bash
curl -fsS http://127.0.0.1:8036/health
curl -fsS https://brianhub.net/rail-cost/ >/dev/null
curl -fsS https://brianhub.net/rail-cost/api/query/bootstrap >/dev/null
```

## Rollback

- Code rollback: restore the previous Git commit and restart the service.
- Database rollback: restore `/root/apps/rail-cost/data/rail-cost.db` from backup.
- PDF rollback: restore the previous files under `/root/apps/rail-cost/web/data/`.
- Gateway rollback: restore the previous BrianHub gateway config and reload it.
