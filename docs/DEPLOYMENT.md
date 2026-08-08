# Rail Cost Deployment

## Basic Information

- Project slug: `rail-cost`
- Production path: `https://brianhub.net/rail-cost/`
- VPS directory: `/root/apps/rail-cost`
- Frontend directory: `/root/apps/rail-cost/web`
- Data directory: `/root/apps/rail-cost/web/data`
- GitHub remote: `git@github.com:maoqiu5/rail-cost.git`

## Service Shape

This is a static frontend project. It has no backend API, database, or Docker container.

Public traffic is served by `brianhub-gateway`; this project must not bind public `80/443` ports.

## Gateway Requirements

- Gateway project: `/root/apps/brianhub-gateway`
- Caddyfile: `/root/apps/brianhub-gateway/Caddyfile`
- Route: `/rail-cost/*`
- Static root inside Caddy container: `/srv/rail-cost`
- Host bind mount: `/root/apps/rail-cost/web:/srv/rail-cost:ro`

The `/rail-cost/*` route must enable Caddy `templates` so `web/index.html` can read the first request's `X-BrianHub-Locale` header through:

```html
data-bh-header-locale='{{placeholder "http.request.header.X-BrianHub-Locale"}}'
```

After changing the gateway, run Caddy validate and reload.

## Locale Behavior

- Supported locales: `zh-CN`, `en-US`.
- Initial priority: `X-BrianHub-Locale`, then `brianhub_locale` cookie, then `en-US`.
- Unknown locale values fall back to `en-US`.
- Manual switching writes `brianhub_locale=...; Path=/; SameSite=Lax; Max-Age=31536000`.
- Only UI copy is translated; business data and documents are not automatically translated.

## Sensitive Files

Do not commit or publish these through Git:

- `web/data/`
- `.env`
- `.env.*`
- `node_modules/`
- `.pnpm-store/`
- `.codex/`
- `.codex-*/`
- `.work/`
- `work/`
- `logs/`
- `runtime/`
- `backups/`
- `secrets/`
- `*.sqlite`

## Release

1. Verify locally:

```bash
node tools/test_i18n.js
node tools/test_calculator.js
node tools/test_html_smoke.js
```

2. Commit and push to GitHub.
3. Sync static source files to VPS `/root/apps/rail-cost/web`. Do not overwrite `web/data/` unless intentionally updating source PDFs.
4. If the route or locale injection changed, update `/root/apps/brianhub-gateway/Caddyfile`, validate, and reload.
5. Verify production:

```bash
curl -sS --max-time 15 -o /dev/null -w 'page %{http_code} %{time_total}\n' https://brianhub.net/rail-cost/
curl -sS --max-time 15 -o /dev/null -w 'pdf %{http_code} %{time_total}\n' https://brianhub.net/rail-cost/data/TOP客户-全铁公共报价单2026.08.01.pdf
```

## Rollback

- Page source rollback: restore the previous Git commit and sync to `/root/apps/rail-cost/web` again.
- Data rollback: restore the previous PDFs under `web/data/`.
- Gateway rollback: restore the previous `/root/apps/brianhub-gateway/Caddyfile` backup, validate, and reload.
