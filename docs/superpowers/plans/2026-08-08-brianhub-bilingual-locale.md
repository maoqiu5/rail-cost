# BrianHub Bilingual Locale Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add BrianHub-compatible zh-CN/en-US UI localization to rail-cost with locale persistence and regression coverage.

**Architecture:** Keep the project as a static app. Add a small `web/i18n.js` module for locale normalization, cookie handling, and translation lookup; update `web/app.js` to render all UI text from translation keys while leaving business data unchanged. Use Caddy response injection for the first request header value because browser JavaScript cannot read `X-BrianHub-Locale` from the original document request.

**Tech Stack:** Vanilla HTML/CSS/ES modules, Node.js smoke tests, Caddy gateway.

## Global Constraints

- Supported locales are exactly `zh-CN` and `en-US`.
- Initial priority is `X-BrianHub-Locale`, then `brianhub_locale` cookie, then `en-US`.
- Unknown locale values fall back to `en-US`.
- Manual switching writes `brianhub_locale` with `Path=/; SameSite=Lax`.
- Only UI copy is translated. Business data, user input, PDFs, document body text, and generated/AI content are not automatically translated.
- Do not touch the rates project.
- Do not commit `web/data/` PDF files.

---

### Task 1: Add Locale Regression Tests

**Files:**
- Create: `tools/test_i18n.js`
- Modify: `package.json`
- Modify: `tools/test_html_smoke.js`

**Interfaces:**
- Consumes: `normalizeLocale`, `resolveInitialLocale`, `localeCookieString`, `t`, and `TRANSLATIONS` from `web/i18n.js`.
- Produces: failing tests proving locale priority, fallback, cookie persistence, switcher presence, and UI key coverage.

- [ ] **Step 1: Write failing tests**

Create `tools/test_i18n.js` with assertions for supported locales, fallback to `en-US`, `header > cookie > default`, cookie string properties, and representative UI strings in both languages.

- [ ] **Step 2: Add smoke assertions**

Update `tools/test_html_smoke.js` to require the language switcher, the header-locale meta placeholder, `web/i18n.js`, and absence of hard-coded result-only station code fields.

- [ ] **Step 3: Run tests to verify failure**

Run `node tools/test_i18n.js` and `node tools/test_html_smoke.js`. Expected: fail because `web/i18n.js` and the switcher do not exist yet.

### Task 2: Implement Static App I18n

**Files:**
- Create: `web/i18n.js`
- Modify: `web/index.html`
- Modify: `web/app.js`
- Modify: `web/styles.css`

**Interfaces:**
- Produces `SUPPORTED_LOCALES`, `TRANSLATIONS`, `normalizeLocale(value)`, `resolveInitialLocale({ headerLocale, cookieString })`, `localeCookieString(locale)`, and `t(locale, key)`.
- `app.js` uses `t(currentLocale, key)` for UI text and keeps station/pickup names as business data.

- [ ] **Step 1: Create translation module**

Implement locale normalization, cookie helpers, and all UI copy keys for menu/download links, form labels, placeholders, buttons, empty states, result labels, and unavailable/error copy.

- [ ] **Step 2: Update HTML shell**

Add `data-bh-header-locale="{{placeholder \"http.request.header.X-BrianHub-Locale\"}}"`, add language switcher buttons, convert static UI nodes to `data-i18n` / `data-i18n-placeholder`, and load `app.js` as before.

- [ ] **Step 3: Update app rendering**

Initialize locale from injected header and cookie, render static labels, update language switcher state, write cookie on manual switch, and localize dynamic result/empty/error labels.

- [ ] **Step 4: Style switcher**

Add compact switcher styling consistent with existing topbar controls.

- [ ] **Step 5: Run tests to verify pass**

Run `node tools/test_i18n.js`, `node tools/test_calculator.js`, and `node tools/test_html_smoke.js`.

### Task 3: Update Docs and Gateway Deployment Notes

**Files:**
- Modify: `docs/PRD.md`
- Modify: `docs/DEPLOYMENT.md`
- Modify: `docs/CHANGELOG.md`

**Interfaces:**
- Documents the bilingual behavior and the Caddy `templates` requirement for `/rail-cost/*`.

- [ ] **Step 1: Update docs**

Document supported locales, priority, cookie behavior, gateway injection, and non-translation boundaries.

- [ ] **Step 2: Verify docs and tests**

Run all Node tests again.

### Task 4: Commit, Push, Deploy, and Verify

**Files:**
- Git commit all tracked source/test/doc changes.
- VPS modify: `/root/apps/rail-cost/web/*`
- VPS modify: `/root/apps/brianhub-gateway/Caddyfile` only inside `/rail-cost/*` route.

**Interfaces:**
- GitHub remote: `git@github.com:maoqiu5/rail-cost.git`
- VPS SSH: `root@192.236.235.229` with local key `~/.ssh/cnstock_vps`

- [ ] **Step 1: Commit and push**

Commit with `feat: add BrianHub bilingual locale support` and push `main` to `github`.

- [ ] **Step 2: Deploy static files**

Copy `web/index.html`, `web/app.js`, `web/i18n.js`, and `web/styles.css` to `/root/apps/rail-cost/web/`. Do not copy `web/data/`.

- [ ] **Step 3: Patch gateway route**

Backup Caddyfile, add `templates` inside `route /rail-cost/*`, validate Caddy, and reload Caddy.

- [ ] **Step 4: Verify production**

Verify gateway files contain the switcher and template injection, and use direct authenticated/browser or server-side checks where possible.

