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

  const leasePrices = await jsonFetch(base + "/api/admin/lease-prices", {
    headers: { "X-BrianHub-User": "brian", "X-BrianHub-Role": "admin" },
  });
  assert.equal(leasePrices.status, 200);
  const taicangPrice = leasePrices.body.rows.find((row) => row.borderCode === "MANZHOULI" && row.pickupCode === "TAICANG" && row.containerSize === "40");
  assert.ok(taicangPrice);
  assert.equal(taicangPrice.displayPriceUsd, 1900);
  assert.equal(taicangPrice.discountUsd, 400);

  const savedLeasePrice = await jsonFetch(base + "/api/admin/lease-prices/" + taicangPrice.id, {
    method: "PUT",
    headers: { "Content-Type": "application/json", "X-BrianHub-User": "brian", "X-BrianHub-Role": "admin" },
    body: JSON.stringify({ ...taicangPrice, discountUsd: 350, displayPriceUsd: 1950, enabled: true }),
  });
  assert.equal(savedLeasePrice.status, 200);
  assert.equal(savedLeasePrice.body.row.displayPriceUsd, 1950);

  const invalidLeasePrice = await jsonFetch(base + "/api/admin/lease-prices/" + taicangPrice.id, {
    method: "PUT",
    headers: { "Content-Type": "application/json", "X-BrianHub-User": "brian", "X-BrianHub-Role": "admin" },
    body: JSON.stringify({ ...taicangPrice, discountUsd: 350, displayPriceUsd: 1900, enabled: true }),
  });
  assert.equal(invalidLeasePrice.status, 400);
  assert.equal(invalidLeasePrice.body.error, "invalid_lease_price");

  const negativeLeaseDiscount = await jsonFetch(base + "/api/admin/lease-prices/" + taicangPrice.id, {
    method: "PUT",
    headers: { "Content-Type": "application/json", "X-BrianHub-User": "brian", "X-BrianHub-Role": "admin" },
    body: JSON.stringify({ ...taicangPrice, discountUsd: -1, displayPriceUsd: 2301, enabled: true }),
  });
  assert.equal(negativeLeaseDiscount.status, 400);
  assert.equal(negativeLeaseDiscount.body.error, "invalid_lease_price");

  const negativeLeaseDisplayPrice = await jsonFetch(base + "/api/admin/lease-prices/" + taicangPrice.id, {
    method: "PUT",
    headers: { "Content-Type": "application/json", "X-BrianHub-User": "brian", "X-BrianHub-Role": "admin" },
    body: JSON.stringify({ ...taicangPrice, discountUsd: 2301, displayPriceUsd: -1, enabled: true }),
  });
  assert.equal(negativeLeaseDisplayPrice.status, 400);
  assert.equal(negativeLeaseDisplayPrice.body.error, "invalid_lease_price");

  const freightPrices = await jsonFetch(`${base}/api/admin/freight-prices`, {
    headers: { "X-BrianHub-User": "brian", "X-BrianHub-Role": "admin" },
  });
  assert.equal(freightPrices.status, 200);
  assert.equal(freightPrices.body.fields.some((field) => field.key === "socPriceUsd"), true);
  assert.equal(freightPrices.body.fields.some((field) => field.key === "cocPriceUsd"), true);
  const manzhouliVorsino40Freight = freightPrices.body.rows.find(
    (row) => row.borderCode === "MANZHOULI" && row.destinationStationCode === "183502" && row.containerSize === "40",
  );
  assert.ok(manzhouliVorsino40Freight);
  assert.equal(manzhouliVorsino40Freight.socPriceUsd, 3870);
  assert.equal(manzhouliVorsino40Freight.cocPriceUsd, 3900);

  const createdFreightPrice = await jsonFetch(`${base}/api/admin/freight-prices`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-BrianHub-User": "brian",
      "X-BrianHub-Role": "admin",
    },
    body: JSON.stringify({
      borderCode: "ERLIAN",
      destinationStationCode: "145201",
      containerSize: "40",
      socPriceUsd: 4400,
      cocPriceUsd: 4410,
      enabled: true,
    }),
  });
  assert.equal(createdFreightPrice.status, 201);
  assert.equal(createdFreightPrice.body.row.socPriceUsd, 4400);

  const invalidFreightPrice = await jsonFetch(`${base}/api/admin/freight-prices/${createdFreightPrice.body.row.id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-BrianHub-User": "brian",
      "X-BrianHub-Role": "admin",
    },
    body: JSON.stringify({
      ...createdFreightPrice.body.row,
      socPriceUsd: -1,
      cocPriceUsd: 4410,
      enabled: true,
    }),
  });
  assert.equal(invalidFreightPrice.status, 400);
  assert.equal(invalidFreightPrice.body.error, "invalid_field");

  const railQuotes = await jsonFetch(`${base}/api/admin/rail-public-quotes`, {
    headers: { "X-BrianHub-User": "brian", "X-BrianHub-Role": "admin" },
  });
  assert.equal(railQuotes.status, 200);
  assert.equal(railQuotes.body.fields.some((field) => field.key === "ownership"), true);

  const createdRailQuote = await jsonFetch(`${base}/api/admin/rail-public-quotes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-BrianHub-User": "brian",
      "X-BrianHub-Role": "admin",
    },
    body: JSON.stringify({
      borderCode: "MANZHOULI",
      destinationStationCode: "183502",
      containerSize: "40",
      ownership: "SOC",
      quoteUsd: 3870,
      enabled: true,
    }),
  });
  assert.equal(createdRailQuote.status, 201);
  assert.equal(createdRailQuote.body.row.ownership, "SOC");

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
