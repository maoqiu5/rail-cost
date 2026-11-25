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
assert.doesNotMatch(serverSource, /api\/admin/);
assert.doesNotMatch(serverSource, /initAdminModule/);

const dir = mkdtempSync(join(tmpdir(), "rail-cost-api-"));
const server = createServer(createApp({ dbPath: join(dir, "rail-cost.db") }));

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const { port } = server.address();
const base = `http://127.0.0.1:${port}`;

try {
  const health = await jsonFetch(`${base}/health`);
  assert.equal(health.status, 200);
  assert.deepEqual(health.body, { ok: true });

  const bootstrap = await jsonFetch(`${base}/api/query/bootstrap`);
  assert.equal(bootstrap.status, 200);
  assert.deepEqual(bootstrap.body.agents.map((agent) => agent.code), ["TC", "BA", "FESCO", "LOA"]);
  assert.equal(bootstrap.body.railPublicQuotes.some((quote) => quote.agentCode === "TC" && quote.quoteUsd === 3930), true);
  assert.equal(bootstrap.body.leasePrices.length, 0);
  assert.equal("freightPrices" in bootstrap.body, false);
  assert.equal("railRules" in bootstrap.body, false);

  const html = await textFetch(`${base}/rail-cost/`, {
    headers: { "X-BrianHub-Locale": "zh-CN" },
  });
  assert.equal(html.status, 200);
  assert.match(html.body, /data-bh-header-locale='zh-CN'/);
  assert.match(html.body, /id="queryView"/);
  assert.match(html.body, /data-agent-select/);
  assert.doesNotMatch(html.body, /adminView/);
  assert.doesNotMatch(html.body, /数据维护/);

  const js = await textFetch(`${base}/rail-cost/app.js`);
  assert.equal(js.status, 200);
  assert.match(js.body, /calculateRailCost/);
  assert.doesNotMatch(js.body, /initAdminModule/);

  const redirect = await fetch(`${base}/rail-cost`, { redirect: "manual" });
  assert.equal(redirect.status, 308);
  assert.equal(redirect.headers.get("location"), "/rail-cost/");

  const removedAdmin = await jsonFetch(`${base}/api/admin/borders`);
  assert.equal(removedAdmin.status, 404);
  const removedMe = await jsonFetch(`${base}/api/me`);
  assert.equal(removedMe.status, 404);

  console.log("api tests passed");
} finally {
  await new Promise((resolve) => server.close(resolve));
}

async function jsonFetch(url, options) {
  const response = await fetch(url, options);
  return { status: response.status, body: await response.json() };
}

async function textFetch(url, options) {
  const response = await fetch(url, options);
  return { status: response.status, body: await response.text() };
}
