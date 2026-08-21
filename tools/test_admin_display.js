import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { formatAdminValue, renderAdminField } from "../web/admin.js";

const catalog = {
  borders: [{ code: "MANZHOULI", nameCn: "满洲里", nameEn: "Manzhouli" }],
  destinations: [{ stationCode: "033004", nameCn: "舒沙雷", nameEn: "Shushary-Logistika" }],
  leasePickups: [{ code: "TAICANG", nameCn: "太仓", nameEn: "Taicang" }],
};

const destinationField = {
  key: "destinationStationCode",
  type: "text",
  required: true,
  reference: { collection: "destinations", valueKey: "stationCode" },
};

assert.equal(formatAdminValue("033004", destinationField, catalog), "033004 / 舒沙雷 / Shushary-Logistika");
assert.equal(formatAdminValue("999999", destinationField, catalog), "999999");

const fieldHtml = renderAdminField({
  field: destinationField,
  value: "033004",
  editingRow: { id: 51 },
  currentIdField: "id",
  catalog,
  t: (key) => key,
});

assert.match(fieldHtml, /<select name="destinationStationCode"/);
assert.match(fieldHtml, /value="033004" selected/);
assert.match(fieldHtml, /033004 \/ 舒沙雷 \/ Shushary-Logistika/);


const freightBorderField = {
  key: "borderCode",
  type: "text",
  required: true,
  reference: { collection: "borders", valueKey: "code" },
};

const freightFieldHtml = renderAdminField({
  field: freightBorderField,
  value: "MANZHOULI",
  editingRow: { id: 1 },
  currentIdField: "id",
  catalog,
  t: (key) => key,
});

assert.match(freightFieldHtml, /<select name="borderCode"/);
assert.match(freightFieldHtml, /value="MANZHOULI" selected/);
assert.match(freightFieldHtml, /MANZHOULI \/ 满洲里 \/ Manzhouli/);


const adminSource = readFileSync(new URL("../web/admin.js", import.meta.url), "utf8");
assert.match(adminSource, /editingRow\?\.\[field\.key\]/, "readonly edit fields should be preserved in the save payload");
assert.match(adminSource, /currentResource\.key === "lease-prices"/, "lease price rows should not expose manual creation from the generic form");

console.log("admin display tests passed");
