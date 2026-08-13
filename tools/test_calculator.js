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

db.prepare("insert into rail_cost_rail_public_quotes (borderCode, destinationStationCode, containerSize, ownership, quoteUsd, enabled) values (?, ?, ?, ?, ?, 1)").run(
  "MANZHOULI",
  "183502",
  "40",
  "SOC",
  3870,
);
db.prepare("insert into rail_cost_rail_public_quotes (borderCode, destinationStationCode, containerSize, ownership, quoteUsd, enabled) values (?, ?, ?, ?, ?, 1)").run(
  "MANZHOULI",
  "183502",
  "40",
  "COC",
  3900,
);
db.prepare("insert into rail_cost_rail_public_quotes (borderCode, destinationStationCode, containerSize, ownership, quoteUsd, enabled) values (?, ?, ?, ?, ?, 1)").run(
  "ERLIAN",
  "033004",
  "40",
  "SOC",
  4250,
);
db.prepare("insert into rail_cost_rail_public_quotes (borderCode, destinationStationCode, containerSize, ownership, quoteUsd, enabled) values (?, ?, ?, ?, ?, 1)").run(
  "ERLIAN",
  "033004",
  "40",
  "COC",
  4280,
);
const ownershipCatalog = loadQueryData(db);

const vorsino = findRailDestination("Vorsino", catalog);
assert.equal(vorsino.stationCode, "183502");
assert.equal(vorsino.nameCn, "沃尔西诺");

assert.equal(
  findRailDestinationFromInput("谢利亚基诺 / Selyatino / 181102", catalog)?.stationCode,
  "181102",
  "destination input label should resolve to the newly selected station",
);

assert.deepEqual(
  calculateRailCost({
    border: "MANZHOULI",
    destinationCode: "183502",
    containerSize: "40",
    ownership: "SOC",
  }, ownershipCatalog).totalUsd,
  3870,
  "Manzhouli 40 SOC should use the ownership-specific quote when maintained",
);

assert.equal(
  calculateRailCost({
    border: "MANZHOULI",
    destinationCode: "183502",
    containerSize: "40",
    ownership: "COC",
  }, ownershipCatalog).totalUsd,
  3900,
  "Manzhouli 40 COC should use the ownership-specific quote when maintained",
);

assert.equal(
  calculateRailCost({
    border: "ERLIAN",
    destinationCode: "033004",
    containerSize: "40",
    ownership: "SOC",
  }, ownershipCatalog).totalUsd,
  4250,
  "Erlian Shushary 40 SOC should use the maintained ownership-specific quote even without a rail rule",
);

assert.equal(
  calculateRailCost({
    border: "ERLIAN",
    destinationCode: "033004",
    containerSize: "40",
    ownership: "COC",
  }, ownershipCatalog).totalUsd,
  4280,
  "Erlian Shushary 40 COC should use the maintained ownership-specific quote even without a rail rule",
);

assert.equal(
  calculateRailCost({
    border: "MANZHOULI",
    destinationCode: "183502",
    containerSize: "20",
    ownership: "SOC",
  }, catalog).totalUsd,
  1767,
  "Manzhouli 20 should use public quote directly",
);

assert.equal(
  calculateRailCost({
    border: "ERLIAN",
    destinationCode: "181102",
    containerSize: "40",
    ownership: "COC",
  }, catalog).totalUsd,
  4300,
  "Erlian Selyatino 40 COC should use fixed cost",
);

assert.equal(
  calculateRailCost({
    border: "ERLIAN",
    destinationCode: "144809",
    containerSize: "40",
    ownership: "SOC",
  }, catalog).totalUsd,
  4330,
  "Erlian Minsk/Kolyadichi 40 should use fixed cost",
);

assert.equal(
  calculateRailCost({
    border: "ERLIAN",
    destinationCode: "183502",
    containerSize: "20",
    ownership: "SOC",
  }, catalog).available,
  false,
  "Erlian should not provide 20 ft cost",
);

assert.equal(
  calculateLeaseCost({
    border: "MANZHOULI",
    pickupCode: "TAICANG",
    containerSize: "40",
  }, catalog).totalUsd,
  1900,
  "Manzhouli 40 Taicang lease should be fixed at 1900",
);

assert.equal(
  calculateLeaseCost({
    border: "MANZHOULI",
    pickupCode: "XINGANG",
    containerSize: "40",
  }, catalog).totalUsd,
  1700,
  "Manzhouli 40 Tianjin lease should be table price 1850 - 150",
);

assert.equal(
  calculateLeaseCost({
    border: "MANZHOULI",
    pickupCode: "SHANGHAI",
    containerSize: "20",
  }, catalog).totalUsd,
  300,
  "Manzhouli 20 lease should be table price - 100",
);

assert.equal(
  calculateLeaseCost({
    border: "ERLIAN",
    pickupCode: "TAICANG",
    containerSize: "40",
  }, catalog).totalUsd,
  1930,
  "Erlian 40 Taicang lease should be fixed at 1930",
);

assert.equal(
  calculateLeaseCost({
    border: "ERLIAN",
    pickupCode: "NINGBO",
    containerSize: "20",
  }, catalog).available,
  false,
  "Erlian lease should not provide 20 ft",
);

assert.ok(
  getAvailableLeasePickups("MANZHOULI", "40", catalog).some((item) => item.code === "XINGANG"),
  "Manzhouli 40 should expose Tianjin/Xingang pickup option",
);

console.log("calculator tests passed");
