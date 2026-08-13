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
assert.equal(adminTables["rail-public-quotes"].fields.some((field) => field.key === "ownership"), true);
assert.equal(
  queryData.railPublicQuotes.every((row) => row.ownership),
  true,
  "rail public quotes should expose ownership as a price dimension",
);

console.log("database tests passed");
