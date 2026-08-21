import assert from "node:assert/strict";
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

console.log("admin display tests passed");
