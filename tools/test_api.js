import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as XLSX from "xlsx";
import { createApp } from "../server/app.js";

const serverSource = readFileSync(join(process.cwd(), "server", "app.js"), "utf8");
assert.match(serverSource, /process\.env\.HOST \|\| "127\.0\.0\.1"/);
assert.match(serverSource, /server\.listen\(port, host/);
assert.match(serverSource, /api\/quotes\/import/);
assert.doesNotMatch(serverSource, /api\/admin/);

const dir = mkdtempSync(join(tmpdir(), "rail-cost-api-"));
const server = createServer(createApp({ dbPath: join(dir, "rail-cost.db"), importsDir: join(dir, "imports") }));

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const { port } = server.address();
const base = `http://127.0.0.1:${port}`;
const adminHeaders = { "X-BrianHub-User": "brian", "X-BrianHub-Role": "admin", "X-BrianHub-Locale": "zh-CN" };
const userHeaders = { "X-BrianHub-User": "alice", "X-BrianHub-Role": "user" };

try {
  const health = await jsonFetch(`${base}/health`);
  assert.equal(health.status, 200);
  assert.deepEqual(health.body, { ok: true });

  const adminMe = await jsonFetch(`${base}/api/me`, { headers: adminHeaders });
  assert.equal(adminMe.status, 200);
  assert.equal(adminMe.body.isAdmin, true);
  assert.equal(adminMe.body.user, "brian");
  assert.equal(adminMe.body.locale, "zh-CN");

  const userMe = await jsonFetch(`${base}/api/me`, { headers: userHeaders });
  assert.equal(userMe.status, 200);
  assert.equal(userMe.body.isAdmin, false);

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
  assert.match(html.body, /id="uploadView"/);
  assert.match(html.body, /id="uploadNav"/);
  assert.match(html.body, /data-agent-select/);
  assert.doesNotMatch(html.body, /adminView/);
  assert.doesNotMatch(html.body, /数据维护/);

  const js = await textFetch(`${base}/rail-cost/app.js`);
  assert.equal(js.status, 200);
  assert.match(js.body, /initUploadModule/);
  assert.match(js.body, /calculateRailCost/);
  assert.doesNotMatch(js.body, /initAdminModule/);

  const redirect = await fetch(`${base}/rail-cost`, { redirect: "manual" });
  assert.equal(redirect.status, 308);
  assert.equal(redirect.headers.get("location"), "/rail-cost/");

  const removedAdmin = await jsonFetch(`${base}/api/admin/borders`);
  assert.equal(removedAdmin.status, 404);

  const forbiddenTemplate = await fetch(`${base}/api/quotes/template.xlsx`, { headers: userHeaders });
  assert.equal(forbiddenTemplate.status, 403);

  const template = await fetch(`${base}/api/quotes/template.xlsx`, { headers: adminHeaders });
  assert.equal(template.status, 200);
  assert.match(template.headers.get("content-type") || "", /spreadsheetml/);
  const templateBuffer = Buffer.from(await template.arrayBuffer());
  assert.equal(templateBuffer[0], 0x50);
  assert.equal(templateBuffer[1], 0x4b);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet([
      ["agentCode", "borderCode", "destinationStationCode", "containerSize", "ownership", "quoteUsd", "effectiveFrom", "effectiveTo", "enabled"],
      ["TC", "MANZHOULI", "183502", "40", "COC", 3999, "2026-12-01", "2026-12-31", true],
      ["TC", "MANZHOULI", "183502", "40", "SOC", 3998, "2026-12-01", "2026-12-31", true],
    ]),
    "quotes",
  );
  const xlsxBase64 = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }).toString("base64");

  const forbiddenUpload = await jsonFetch(`${base}/api/quotes/import`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...userHeaders },
    body: JSON.stringify({ agentCode: "TC", fileName: "quote.xlsx", contentBase64: xlsxBase64 }),
  });
  assert.equal(forbiddenUpload.status, 403);

  const uploaded = await jsonFetch(`${base}/api/quotes/import`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...adminHeaders },
    body: JSON.stringify({ agentCode: "TC", fileName: "quote.xlsx", contentBase64: xlsxBase64 }),
  });
  assert.equal(uploaded.status, 200);
  assert.equal(uploaded.body.quoteCount, 2);
  assert.equal(uploaded.body.agentCode, "TC");
  assert.equal(uploaded.body.effectiveFrom, "2026-12-01");
  assert.equal(uploaded.body.effectiveTo, "2026-12-31");

  const updated = await jsonFetch(`${base}/api/query/bootstrap`);
  const updatedRows = updated.body.railPublicQuotes.filter(
    (quote) => quote.agentCode === "TC" && quote.borderCode === "MANZHOULI" && quote.destinationStationCode === "183502" && quote.containerSize === "40",
  );
  assert.equal(updatedRows.find((quote) => quote.ownership === "COC")?.quoteUsd, 3999);
  assert.equal(updatedRows.find((quote) => quote.ownership === "SOC")?.quoteUsd, 3998);

  const imports = await jsonFetch(`${base}/api/quotes/imports`, { headers: adminHeaders });
  assert.equal(imports.status, 200);
  assert.equal(imports.body.imports.length, 1);
  assert.equal(imports.body.imports[0].agentCode, "TC");
  assert.equal(imports.body.imports[0].quoteCount, 2);

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
