import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ensureSchema,
  loadAdminTables,
  loadQueryData,
  openDatabase,
  seedDatabase,
} from "../server/db.js";

const dir = mkdtempSync(join(tmpdir(), "rail-cost-db-"));
const db = openDatabase(join(dir, "rail-cost.db"));

ensureSchema(db);
seedDatabase(db);

assert.equal(
  db.prepare("select count(1) as c from rail_cost_borders").get().c,
  2,
  "seed should create the two transshipment borders",
);
assert.equal(
  db.prepare("select count(1) as c from rail_cost_lease_pickups where code = 'TAICANG'").get().c,
  1,
  "seed should include Taicang pickup",
);

assert.equal(
  db.prepare("select count(1) as c from rail_cost_freight_prices").get().c > 0,
  true,
  "seed should create final railway freight prices",
);
const manzhouliVorsino40 = db
  .prepare("select socPriceUsd, cocPriceUsd from rail_cost_freight_prices where borderCode = 'MANZHOULI' and destinationStationCode = '183502' and containerSize = '40'")
  .get();
assert.equal(manzhouliVorsino40.socPriceUsd, 3870, "Manzhouli Vorsino 40 ft SOC final price");
assert.equal(manzhouliVorsino40.cocPriceUsd, 3900, "Manzhouli Vorsino 40 ft COC final price");

const erlianVorsino40 = db
  .prepare("select socPriceUsd, cocPriceUsd from rail_cost_freight_prices where borderCode = 'ERLIAN' and destinationStationCode = '183502' and containerSize = '40'")
  .get();
assert.equal(erlianVorsino40.socPriceUsd, 4300, "Erlian Vorsino 40 ft SOC final price");
assert.equal(erlianVorsino40.cocPriceUsd, 4300, "Erlian Vorsino 40 ft COC final price");

const queryData = loadQueryData(db);
assert.equal(queryData.borders.some((border) => border.code === "MANZHOULI"), true);
assert.equal(
  queryData.leaseRules.some(
    (rule) =>
      rule.borderCode === "MANZHOULI" &&
      rule.pickupCode === "TAICANG" &&
      rule.containerSize === "40" &&
      rule.fixedUsd === 1900,
  ),
  true,
  "Manzhouli Taicang 40 ft lease rule should be fixed at 1900",
);

const adminTables = loadAdminTables(db);
assert.equal(adminTables["lease-pickups"].rows.some((row) => row.code === "TAICANG"), true);
assert.equal(adminTables["lease-rules"].fields.some((field) => field.key === "fixedUsd"), true);
assert.equal(adminTables["lease-prices"].fields.some((field) => field.key === "borderCode"), true);
assert.equal(adminTables["lease-prices"].fields.some((field) => field.key === "discountUsd"), true);
assert.equal(adminTables["lease-prices"].fields.some((field) => field.key === "displayPriceUsd"), true);
assert.equal(adminTables["rail-public-quotes"].fields.some((field) => field.key === "ownership"), true);
assert.equal(
  queryData.railPublicQuotes.every((row) => row.ownership),
  true,
  "rail public quotes should expose ownership as a price dimension",
);

console.log("database tests passed");
