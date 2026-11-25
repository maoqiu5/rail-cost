import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import * as XLSX from "xlsx";
import { buildXlsxTemplate, parsePdfQuote, parseQuoteText, parseXlsxQuote } from "../server/quote-import.js";

const sampleText = `
报价日期   2026/11/1   汇率   1
有效期至   2026/11/30
接驳口岸 ：   满洲里/后贝加尔
目的站：公共班列   Vorsino   Selyatino
站编：   183502   181102
箱型：   20‘<24ton   40’   20‘<24ton   40’
COC 不含箱   $1,854   $3,930   $1,854   $3,930
SOC   $1,854   $3,900   $1,854   $3,900
接驳口岸 ：   二连/扎门乌德
目的站：   Vorsino
站编：   183502
箱型：   20‘<24ton   40’
COC(50 -55*40HQ)   不含箱   -   $4,330
SOC(50 -55*40HQ)   -   $4,550
`;

const parsedText = parseQuoteText(sampleText, "TC");
assert.equal(parsedText.effectiveFrom, "2026-11-01");
assert.equal(parsedText.effectiveTo, "2026-11-30");
assert.equal(parsedText.quotes.length, 10);
assert.equal(parsedText.quotes.some((quote) => quote.borderCode === "MANZHOULI" && quote.destinationStationCode === "183502" && quote.containerSize === "40" && quote.ownership === "COC" && quote.quoteUsd === 3930), true);
assert.equal(parsedText.quotes.some((quote) => quote.borderCode === "ERLIAN" && quote.containerSize === "20"), false, "dash placeholders should be skipped");
assert.equal(parsedText.quotes.some((quote) => quote.borderCode === "ERLIAN" && quote.containerSize === "40" && quote.ownership === "SOC" && quote.quoteUsd === 4550), true);

const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(
  workbook,
  XLSX.utils.aoa_to_sheet([
    ["agentCode", "borderCode", "destinationStationCode", "containerSize", "ownership", "quoteUsd", "effectiveFrom", "effectiveTo", "enabled"],
    ["TC", "MANZHOULI", "183502", "40", "COC", 3999, "2026-12-01", "2026-12-31", true],
    ["TC", "二连", "Vorsino", "40尺", "SOC", "$4,550", "2026-12-01", "2026-12-31", true],
  ]),
  "quotes",
);
const xlsxBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
const parsedXlsx = parseXlsxQuote({
  buffer: xlsxBuffer,
  agentCode: "TC",
  reference: {
    destinations: [
      { stationCode: "183502", nameCn: "沃尔西诺", nameEn: "Vorsino" },
    ],
  },
});
assert.equal(parsedXlsx.effectiveFrom, "2026-12-01");
assert.equal(parsedXlsx.effectiveTo, "2026-12-31");
assert.equal(parsedXlsx.quotes.length, 2);
assert.equal(parsedXlsx.quotes.some((quote) => quote.borderCode === "ERLIAN" && quote.destinationStationCode === "183502" && quote.ownership === "SOC" && quote.quoteUsd === 4550), true);

const template = buildXlsxTemplate({
  borders: [{ code: "MANZHOULI", nameCn: "满洲里", nameEn: "Manzhouli" }],
  destinations: [{ stationCode: "183502", nameCn: "沃尔西诺", nameEn: "Vorsino" }],
});
assert.equal(template[0], 0x50);
assert.equal(template[1], 0x4b);
const templateWorkbook = XLSX.read(template, { type: "buffer" });
assert.equal(templateWorkbook.SheetNames.includes("quotes"), true);
assert.equal(templateWorkbook.SheetNames.includes("说明"), true);
assert.equal(templateWorkbook.SheetNames.includes("reference"), true);

const pdfPath = join(process.cwd(), "web", "data", "TOP客户-全铁公共报价单2026.11.01.pdf");
if (existsSync(pdfPath)) {
  const pdfBuffer = await readFile(pdfPath);
  const parsedPdf = await parsePdfQuote({ buffer: pdfBuffer, agentCode: "TC" });
  assert.equal(parsedPdf.effectiveFrom, "2026-11-01");
  assert.equal(parsedPdf.effectiveTo, "2026-11-30");
  assert.equal(parsedPdf.quotes.length, 40);
  assert.equal(parsedPdf.quotes.some((quote) => quote.borderCode === "MANZHOULI" && quote.destinationStationCode === "850204" && quote.containerSize === "40" && quote.ownership === "COC" && quote.quoteUsd === 2730), true);
}

console.log("quote import tests passed");
