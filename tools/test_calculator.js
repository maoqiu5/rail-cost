import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ensureSchema, loadQueryData, openDatabase, seedDatabase } from "../server/db.js";
import {
  calculateRailCost,
  calculateLeaseCost,
  findRailDestination,
  findRailDestinationFromInput,
  getAvailableLeasePickups,
} from "../web/calculator.js";

const dir = mkdtempSync(join(tmpdir(), "rail-cost-calc-"));
const db = openDatabase(join(dir, "rail-cost.db"));
ensureSchema(db);
seedDatabase(db);
const catalog = loadQueryData(db);

const vorsino = findRailDestination("Vorsino", catalog);
assert.equal(vorsino.stationCode, "183502");
assert.equal(vorsino.nameCn, "沃尔西诺");

assert.equal(
  findRailDestinationFromInput("谢利亚基诺 / Selyatino / 181102", catalog)?.stationCode,
  "181102",
  "destination input label should resolve to the selected station",
);

assert.equal(
  calculateRailCost({ agentCode: "TC", border: "MANZHOULI", destinationCode: "183502", containerSize: "40", ownership: "SOC" }, catalog).totalUsd,
  3900,
  "Manzhouli Vorsino 40 SOC should use the TC November quote",
);
assert.equal(
  calculateRailCost({ agentCode: "TC", border: "MANZHOULI", destinationCode: "183502", containerSize: "40", ownership: "COC" }, catalog).totalUsd,
  3930,
  "Manzhouli Vorsino 40 COC should use the TC November quote",
);
assert.equal(
  calculateRailCost({ agentCode: "TC", border: "MANZHOULI", destinationCode: "183502", containerSize: "20", ownership: "SOC" }, catalog).totalUsd,
  1854,
  "Manzhouli Vorsino 20 should use the TC November quote",
);
assert.equal(
  calculateRailCost({ agentCode: "TC", border: "ERLIAN", destinationCode: "183502", containerSize: "40", ownership: "SOC" }, catalog).totalUsd,
  4550,
  "Erlian Vorsino 40 SOC should use the TC November quote",
);
assert.equal(
  calculateRailCost({ agentCode: "TC", border: "ERLIAN", destinationCode: "183502", containerSize: "40", ownership: "COC" }, catalog).totalUsd,
  4330,
  "Erlian Vorsino 40 COC should use the TC November quote",
);

const missingQuote = calculateRailCost(
  { agentCode: "TC", border: "ERLIAN", destinationCode: "183502", containerSize: "20", ownership: "SOC" },
  catalog,
);
assert.equal(missingQuote.available, false);
assert.equal(missingQuote.reasonKey, "error.rail.noQuote");

const unknownAgent = calculateRailCost(
  { agentCode: "UNKNOWN", border: "MANZHOULI", destinationCode: "183502", containerSize: "40", ownership: "SOC" },
  catalog,
);
assert.equal(unknownAgent.available, false);
assert.equal(unknownAgent.reasonKey, "error.rail.unknownAgent");

const lease = calculateLeaseCost({ agentCode: "TC", border: "MANZHOULI", pickupCode: "TAICANG", containerSize: "40" }, catalog);
assert.equal(lease.available, false);
assert.equal(lease.reasonKey, "error.lease.noContainer");
assert.deepEqual(getAvailableLeasePickups("TC", "MANZHOULI", "40", catalog), []);

console.log("calculator tests passed");
