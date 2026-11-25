import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import * as XLSX from "xlsx";

pdfjs.GlobalWorkerOptions.workerSrc = import.meta.resolve("pdfjs-dist/legacy/build/pdf.worker.mjs");

const BORDER_ALIASES = {
  MANZHOULI: "MANZHOULI",
  "满洲里": "MANZHOULI",
  "后贝加尔": "MANZHOULI",
  ERLIAN: "ERLIAN",
  "二连": "ERLIAN",
  "扎门乌德": "ERLIAN",
};

const XLSX_HEADER_MAP = {
  agentcode: "agentCode",
  "代理": "agentCode",
  bordercode: "borderCode",
  "口岸": "borderCode",
  "换装口岸": "borderCode",
  destinationstationcode: "destinationStationCode",
  "目的站站编": "destinationStationCode",
  "站编": "destinationStationCode",
  containersize: "containerSize",
  "箱型": "containerSize",
  ownership: "ownership",
  "箱属": "ownership",
  "运输类型": "ownership",
  quoteusd: "quoteUsd",
  "报价": "quoteUsd",
  "报价usd": "quoteUsd",
  effectivestart: "effectiveFrom",
  effectivefrom: "effectiveFrom",
  "生效日期": "effectiveFrom",
  effectiveend: "effectiveTo",
  effectiveto: "effectiveTo",
  "失效日期": "effectiveTo",
  enabled: "enabled",
  "启用": "enabled",
};

export async function parsePdfQuote({ buffer, agentCode }) {
  const text = await extractPdfText(buffer);
  return parseQuoteText(text, agentCode);
}

export async function extractPdfText(buffer) {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer), disableFontFace: true }).promise;
  const lines = [];
  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
    const page = await doc.getPage(pageNumber);
    const content = await page.getTextContent();
    let line = "";
    for (const item of content.items) {
      if (item.str) line += item.str;
      if (item.hasEOL) {
        lines.push(line);
        line = "";
      } else {
        line += " ";
      }
    }
    if (line.trim()) lines.push(line);
  }
  return lines.join("\n");
}

export function parseQuoteText(text, agentCode) {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const effectiveFrom = findDate(lines, /报价日期/);
  const effectiveTo = findDate(lines, /有效期至/);
  const warnings = [];
  const sections = [];

  let current = null;
  for (const line of lines) {
    if (/接驳口岸|Border-crossing/i.test(line)) {
      const borderCode = detectBorderCode(line);
      current = borderCode ? { borderCode, stationCodes: [], cocLine: "", socLine: "" } : null;
      if (current) sections.push(current);
      continue;
    }
    if (!current) continue;
    if (/站编|Code of station/i.test(line)) {
      const stationCodes = [...line.matchAll(/\d{6}/g)].map((match) => match[0]);
      if (stationCodes.length) current.stationCodes = stationCodes;
      continue;
    }
    if (/^COC/i.test(line)) {
      current.cocLine = line;
      continue;
    }
    if (/^SOC/i.test(line)) {
      current.socLine = line;
    }
  }

  const quotes = [];
  for (const section of sections) {
    if (!section.stationCodes.length || !section.cocLine || !section.socLine) {
      warnings.push(`Skipped incomplete ${section.borderCode} section`);
      continue;
    }
    const dataCount = section.stationCodes.length * 2;
    const cocTokens = lastTokens(section.cocLine, dataCount);
    const socTokens = lastTokens(section.socLine, dataCount);
    if (cocTokens.length !== dataCount || socTokens.length !== dataCount) {
      warnings.push(`Unexpected ${section.borderCode} column count`);
      continue;
    }
    for (let index = 0; index < section.stationCodes.length; index += 1) {
      const stationCode = section.stationCodes[index];
      for (const [sizeIndex, containerSize] of ["20", "40"].entries()) {
        addQuote(quotes, agentCode, section.borderCode, stationCode, containerSize, "COC", cocTokens[index * 2 + sizeIndex]);
        addQuote(quotes, agentCode, section.borderCode, stationCode, containerSize, "SOC", socTokens[index * 2 + sizeIndex]);
      }
    }
  }

  if (!quotes.length) throw importError("quote_parse_failed", "No rail quotes could be parsed from this PDF.");
  return { quotes, effectiveFrom, effectiveTo, warnings };
}

export function parseXlsxQuote({ buffer, agentCode, reference = {} }) {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw importError("quote_parse_failed", "The XLSX file has no worksheets.");
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "", raw: true });
  const quotes = [];
  const warnings = [];
  let effectiveFrom = "";
  let effectiveTo = "";

  rows.forEach((rawRow, rowIndex) => {
    const row = normalizeXlsxRow(rawRow);
    if (!Object.values(row).some((value) => String(value).trim())) return;
    const rowAgent = String(row.agentCode || agentCode || "").trim().toUpperCase();
    if (rowAgent !== agentCode) {
      warnings.push(`Row ${rowIndex + 2}: agent ${rowAgent || "(empty)"} does not match ${agentCode}`);
      return;
    }
    const borderCode = resolveBorderCode(row.borderCode);
    const destinationStationCode = resolveDestinationCode(row.destinationStationCode, reference.destinations);
    const containerSize = normalizeContainerSize(row.containerSize);
    const ownership = String(row.ownership || "").trim().toUpperCase();
    const quoteUsd = parseUsd(row.quoteUsd);
    if (!borderCode || !destinationStationCode || !containerSize || !["COC", "SOC"].includes(ownership) || !Number.isFinite(quoteUsd) || quoteUsd < 0) {
      warnings.push(`Row ${rowIndex + 2}: invalid quote row`);
      return;
    }
    effectiveFrom ||= normalizeDateValue(row.effectiveFrom);
    effectiveTo ||= normalizeDateValue(row.effectiveTo);
    const enabled = normalizeEnabled(row.enabled);
    if (enabled) quotes.push({ agentCode, borderCode, destinationStationCode, containerSize, ownership, quoteUsd, enabled: true });
  });

  if (!quotes.length) throw importError("quote_parse_failed", "No valid quote rows found in the XLSX file.");
  return { quotes, effectiveFrom, effectiveTo, warnings };
}

export function buildXlsxTemplate({ borders = [], destinations = [] } = {}) {
  const workbook = XLSX.utils.book_new();
  const headers = [
    "agentCode",
    "borderCode",
    "destinationStationCode",
    "containerSize",
    "ownership",
    "quoteUsd",
    "effectiveFrom",
    "effectiveTo",
    "enabled",
  ];
  const quoteSheet = XLSX.utils.aoa_to_sheet([headers]);
  quoteSheet["!cols"] = headers.map((header) => ({ wch: Math.max(14, header.length + 4) }));
  XLSX.utils.book_append_sheet(workbook, quoteSheet, "quotes");

  const instructions = [
    ["Field", "说明"],
    ["agentCode", "代理代码：TC / BA / FESCO / LOA"],
    ["borderCode", "口岸代码：MANZHOULI / ERLIAN，或填写 满洲里 / 二连"],
    ["destinationStationCode", "目的站 6 位站编，或填写目的站中文/英文名称"],
    ["containerSize", "20 或 40"],
    ["ownership", "COC 或 SOC"],
    ["quoteUsd", "报价金额，单位 USD，只填数字"],
    ["effectiveFrom", "生效日期，例如 2026-11-01"],
    ["effectiveTo", "失效日期，例如 2026-11-30"],
    ["enabled", "是否启用：TRUE / FALSE"],
  ];
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(instructions), "说明");

  const referenceRows = [["borderCode", "borderNameCn", "borderNameEn", "stationCode", "nameCn", "nameEn"]];
  for (const border of borders) {
    for (const destination of destinations) {
      referenceRows.push([border.code, border.nameCn, border.nameEn, destination.stationCode, destination.nameCn, destination.nameEn]);
    }
  }
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(referenceRows), "reference");

  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
}

function detectBorderCode(line) {
  for (const [alias, code] of Object.entries(BORDER_ALIASES)) {
    if (line.includes(alias)) return code;
  }
  return "";
}

function addQuote(quotes, agentCode, borderCode, destinationStationCode, containerSize, ownership, token) {
  const quoteUsd = parseUsd(token);
  if (!Number.isFinite(quoteUsd) || quoteUsd <= 0) return;
  quotes.push({ agentCode, borderCode, destinationStationCode, containerSize, ownership, quoteUsd, enabled: true });
}

function lastTokens(line, count) {
  if (count <= 0) return [];
  const tokens = String(line || "").trim().split(/\s+/);
  return tokens.slice(-count);
}

function parseUsd(value) {
  const text = String(value ?? "").replaceAll(",", "").replaceAll("$", "").replaceAll("，", "").trim();
  if (!text || text === "-") return NaN;
  return Number(text);
}

function findDate(lines, labelPattern) {
  const line = lines.find((value) => labelPattern.test(value));
  if (!line) return "";
  const match = line.match(/(\d{4})\s*[\/-]\s*(\d{1,2})\s*[\/-]\s*(\d{1,2})/);
  if (!match) return "";
  return `${match[1]}-${String(match[2]).padStart(2, "0")}-${String(match[3]).padStart(2, "0")}`;
}

function normalizeXlsxRow(rawRow) {
  const row = {};
  for (const [key, value] of Object.entries(rawRow)) {
    const normalized = XLSX_HEADER_MAP[String(key).trim().toLowerCase().replace(/\s+/g, "")] || key;
    row[normalized] = value;
  }
  return row;
}

function resolveBorderCode(value) {
  const normalized = String(value || "").trim();
  return BORDER_ALIASES[normalized.toUpperCase()] || BORDER_ALIASES[normalized] || "";
}

function resolveDestinationCode(value, destinations = []) {
  const normalized = String(value || "").trim();
  if (/^\d{6}$/.test(normalized)) return normalized;
  const lower = normalized.toLowerCase();
  return destinations.find((item) => [item.stationCode, item.nameCn, item.nameEn].some((field) => String(field).toLowerCase() === lower))?.stationCode || "";
}

function normalizeContainerSize(value) {
  const text = String(value ?? "").trim();
  if (text.includes("20")) return "20";
  if (text.includes("40")) return "40";
  return "";
}

function normalizeEnabled(value) {
  if (value === false || value === 0) return false;
  const text = String(value ?? "").trim().toLowerCase();
  return !["false", "0", "no", "n", "否", "禁用"].includes(text);
}

function normalizeDateValue(value) {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "number") {
    const date = XLSX.SSF.parse_date_code(value);
    if (!date) return "";
    return `${date.y}-${String(date.m).padStart(2, "0")}-${String(date.d).padStart(2, "0")}`;
  }
  const match = String(value).trim().match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})/);
  if (!match) return "";
  return `${match[1]}-${String(match[2]).padStart(2, "0")}-${String(match[3]).padStart(2, "0")}`;
}

function importError(code, message) {
  return Object.assign(new Error(message), { code, statusCode: 400 });
}
