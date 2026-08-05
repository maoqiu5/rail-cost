import assert from "node:assert/strict";
import {
  calculateRailCost,
  calculateLeaseCost,
  findRailDestination,
  findRailDestinationFromInput,
  getAvailableLeasePickups,
} from "../web/calculator.js";

const vorsino = findRailDestination("Vorsino");
assert.equal(vorsino.stationCode, "183502");
assert.equal(vorsino.nameCn, "沃尔西诺");

assert.equal(
  findRailDestinationFromInput("谢利亚基诺 / Selyatino / 181102")?.stationCode,
  "181102",
  "destination input label should resolve to the newly selected station",
);

assert.deepEqual(
  calculateRailCost({
    border: "满洲里",
    destinationCode: "183502",
    containerSize: "40",
    ownership: "SOC",
  }).totalUsd,
  3870,
  "Manzhouli 40 SOC should be public quote 4100 - 230",
);

assert.equal(
  calculateRailCost({
    border: "满洲里",
    destinationCode: "183502",
    containerSize: "40",
    ownership: "COC",
  }).totalUsd,
  3900,
  "Manzhouli 40 COC should be public quote 4100 - 200",
);

assert.equal(
  calculateRailCost({
    border: "满洲里",
    destinationCode: "183502",
    containerSize: "20",
    ownership: "SOC",
  }).totalUsd,
  1767,
  "Manzhouli 20 should use public quote directly",
);

assert.equal(
  calculateRailCost({
    border: "二连",
    destinationCode: "181102",
    containerSize: "40",
    ownership: "COC",
  }).totalUsd,
  4300,
  "Erlian Selyatino 40 COC should use fixed cost",
);

assert.equal(
  calculateRailCost({
    border: "二连",
    destinationCode: "144809",
    containerSize: "40",
    ownership: "SOC",
  }).totalUsd,
  4330,
  "Erlian Minsk/Kolyadichi 40 should use fixed cost",
);

assert.equal(
  calculateRailCost({
    border: "二连",
    destinationCode: "183502",
    containerSize: "20",
    ownership: "SOC",
  }).available,
  false,
  "Erlian should not provide 20 ft cost",
);

assert.equal(
  calculateLeaseCost({
    border: "满洲里",
    pickupCode: "TAICANG",
    containerSize: "40",
  }).totalUsd,
  1950,
  "Manzhouli 40 Taicang lease should be fixed at 1950",
);

assert.equal(
  calculateLeaseCost({
    border: "满洲里",
    pickupCode: "XINGANG",
    containerSize: "40",
  }).totalUsd,
  1700,
  "Manzhouli 40 Tianjin lease should be table price 1850 - 150",
);

assert.equal(
  calculateLeaseCost({
    border: "满洲里",
    pickupCode: "SHANGHAI",
    containerSize: "20",
  }).totalUsd,
  300,
  "Manzhouli 20 lease should be table price - 100",
);

assert.equal(
  calculateLeaseCost({
    border: "二连",
    pickupCode: "TAICANG",
    containerSize: "40",
  }).totalUsd,
  1930,
  "Erlian 40 Taicang lease should be fixed at 1930",
);

assert.equal(
  calculateLeaseCost({
    border: "二连",
    pickupCode: "NINGBO",
    containerSize: "20",
  }).available,
  false,
  "Erlian lease should not provide 20 ft",
);

assert.ok(
  getAvailableLeasePickups("满洲里", "40").some((item) => item.code === "XINGANG"),
  "Manzhouli 40 should expose Tianjin/Xingang pickup option",
);

console.log("calculator tests passed");
