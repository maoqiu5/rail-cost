import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "../server/app.js";

const serverSource = readFileSync(join(process.cwd(), "server", "app.js"), "utf8");
assert.match(serverSource, /process\.env\.HOST \|\| "127\.0\.0\.1"/);
assert.match(serverSource, /server\.listen\(port, host/);

const dir = mkdtempSync(join(tmpdir(), "rail-cost-api-"));
const server = createServer(createApp({ dbPath: join(dir, "rail-cost.db") }));

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const { port } = server.address();
const base = `http://127.0.0.1:${port}`;

try {
  const me = await jsonFetch(`${base}/api/me`, {
    headers: {
      "X-BrianHub-User": "brian",
      "X-BrianHub-Role": "admin",
      "X-BrianHub-Locale": "zh-CN",
    },
  });
  assert.equal(me.status, 200);
  assert.equal(me.body.user, "brian");
  assert.equal(me.body.role, "admin");
  assert.equal(me.body.isAdmin, true);
  assert.equal(me.body.locale, "zh-CN");

  const fallback = await jsonFetch(`${base}/api/me`, {
    headers: {
      "X-BrianHub-User": "alice",
      "X-BrianHub-Role": "user",
      "X-BrianHub-Locale": "fr-FR",
    },
  });
  assert.equal(fallback.body.locale, "en-US");
  assert.equal(fallback.body.isAdmin, false);

  const bootstrap = await jsonFetch(`${base}/api/query/bootstrap`);
  assert.equal(bootstrap.status, 200);
  assert.equal(bootstrap.body.leaseRules.some((rule) => rule.fixedUsd === 1900), true);

  const html = await textFetch(`${base}/rail-cost/`, {
    headers: { "X-BrianHub-Locale": "zh-CN" },
  });
  assert.equal(html.status, 200);
  assert.match(html.body, /data-bh-header-locale='zh-CN'/);
  assert.match(html.body, /id="queryView"/);

  const js = await textFetch(`${base}/rail-cost/app.js`);
  assert.equal(js.status, 200);
  assert.match(js.body, /initAdminModule/);

  const redirect = await fetch(`${base}/rail-cost`, { redirect: "manual" });
  assert.equal(redirect.status, 308);
  assert.equal(redirect.headers.get("location"), "/rail-cost/");

  const forbidden = await jsonFetch(`${base}/api/admin/lease-pickups`, {
    headers: { "X-BrianHub-User": "alice", "X-BrianHub-Role": "user" },
  });
  assert.equal(forbidden.status, 403);

  const adminRows = await jsonFetch(`${base}/api/admin/lease-pickups`, {
    headers: { "X-BrianHub-User": "brian", "X-BrianHub-Role": "admin" },
  });
  assert.equal(adminRows.status, 200);
  assert.equal(adminRows.body.rows.some((row) => row.code === "TAICANG"), true);

  const created = await jsonFetch(`${base}/api/admin/lease-pickups`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-BrianHub-User": "brian",
      "X-BrianHub-Role": "admin",
    },
    body: JSON.stringify({
      code: "TESTPORT",
      nameCn: "测试港",
      nameEn: "Test Port",
      sortOrder: 999,
      enabled: true,
    }),
  });
  assert.equal(created.status, 201);
  assert.equal(created.body.row.code, "TESTPORT");

  const invalid = await jsonFetch(`${base}/api/admin/lease-rules`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-BrianHub-User": "brian",
      "X-BrianHub-Role": "admin",
    },
    body: JSON.stringify({
      borderCode: "MANZHOULI",
      pickupCode: "TAICANG",
      containerSize: "45",
      ruleType: "fixed",
      fixedUsd: 2000,
      priority: 1,
      enabled: true,
    }),
  });
  assert.equal(invalid.status, 400);
  assert.equal(invalid.body.error, "invalid_field");

  const deleted = await jsonFetch(`${base}/api/admin/lease-pickups/TESTPORT`, {
    method: "DELETE",
    headers: { "X-BrianHub-User": "brian", "X-BrianHub-Role": "admin" },
  });
  assert.equal(deleted.status, 200);
  assert.equal(deleted.body.deleted, true);

  const seededDelete = await jsonFetch(`${base}/api/admin/lease-pickups/TAICANG`, {
    method: "DELETE",
    headers: { "X-BrianHub-User": "brian", "X-BrianHub-Role": "admin" },
  });
  assert.equal(seededDelete.status, 200);
  assert.equal(seededDelete.body.deleted, true);
  await new Promise((resolve) => server.close(resolve));

  const restartedServer = createServer(createApp({ dbPath: join(dir, "rail-cost.db") }));
  await new Promise((resolve) => restartedServer.listen(0, "127.0.0.1", resolve));
  try {
    const restartedBase = `http://127.0.0.1:${restartedServer.address().port}`;
    const rowsAfterRestart = await jsonFetch(`${restartedBase}/api/admin/lease-pickups`, {
      headers: { "X-BrianHub-User": "brian", "X-BrianHub-Role": "admin" },
    });
    assert.equal(rowsAfterRestart.body.rows.some((row) => row.code === "TAICANG"), false);
  } finally {
    await new Promise((resolve) => restartedServer.close(resolve));
  }
} finally {
  if (server.listening) await new Promise((resolve) => server.close(resolve));
}

async function jsonFetch(url, options) {
  const response = await fetch(url, options);
  return {
    status: response.status,
    body: await response.json(),
  };
}

async function textFetch(url, options) {
  const response = await fetch(url, options);
  return {
    status: response.status,
    body: await response.text(),
  };
}

console.log("api tests passed");
