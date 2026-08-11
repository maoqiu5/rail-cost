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

console.log("admin display tests passed");
