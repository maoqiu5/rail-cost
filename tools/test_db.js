import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ensureSchema, loadQueryData, openDatabase, seedDatabase } from "../server/db.js";

const dir = mkdtempSync(join(tmpdir(), "rail-cost-db-"));
const db = openDatabase(join(dir, "rail-cost.db"));

ensureSchema(db);
seedDatabase(db);

const agents = db.prepare("select code, nameEn from rail_cost_agents order by sortOrder").all();
assert.deepEqual(agents.map((row) => row.code), ["TC", "BA", "FESCO", "LOA"]);
assert.equal(agents.every((row) => row.nameEn), true);

assert.equal(db.prepare("select count(1) as c from rail_cost_borders").get().c, 2);
assert.equal(db.prepare("select count(1) as c from rail_cost_destinations where stationCode in ('230506','181403')").get().c, 2);
assert.equal(db.prepare("select count(1) as c from rail_cost_rail_public_quotes").get().c > 0, true);
assert.equal(db.prepare("select count(1) as c from rail_cost_lease_prices").get().c, 0, "lease prices are empty because containers are unavailable");

const manzhouliVorsino40 = db
  .prepare("select agentCode, socPriceUsd, cocPriceUsd from (select agentCode, case when ownership = 'SOC' then quoteUsd end as socPriceUsd, case when ownership = 'COC' then quoteUsd end as cocPriceUsd from rail_cost_rail_public_quotes where agentCode = 'TC' and borderCode = 'MANZHOULI' and destinationStationCode = '183502' and containerSize = '40')")
  .all();
assert.deepEqual(manzhouliVorsino40.map((row) => row.agentCode), ["TC", "TC"]);
assert.equal(manzhouliVorsino40.some((row) => row.socPriceUsd === 3900), true);
assert.equal(manzhouliVorsino40.some((row) => row.cocPriceUsd === 3930), true);

const erlianVorsino40 = db
  .prepare("select ownership, quoteUsd from rail_cost_rail_public_quotes where agentCode = 'TC' and borderCode = 'ERLIAN' and destinationStationCode = '183502' and containerSize = '40' order by ownership")
  .all();
assert.deepEqual(
  erlianVorsino40.map((row) => ({ ownership: row.ownership, quoteUsd: row.quoteUsd })),
  [
    { ownership: "COC", quoteUsd: 4330 },
    { ownership: "SOC", quoteUsd: 4550 },
  ],
);

const queryData = loadQueryData(db);
assert.equal(queryData.agents.length, 4);
assert.equal(queryData.railPublicQuotes.some((row) => row.agentCode === "TC" && row.quoteUsd === 3930), true);
assert.equal(queryData.leasePrices.length, 0);
assert.equal("freightPrices" in queryData, false, "legacy freight price table should not be exposed");
assert.equal("railRules" in queryData, false, "legacy rail rules should not be exposed");

console.log("database tests passed");
