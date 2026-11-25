export const QUOTE_DATA_VERSION = "2026-11-01-tc";

const AGENTS = [
  { code: "TC", nameCn: "TC", nameEn: "TC", sortOrder: 10, enabled: true },
  { code: "BA", nameCn: "BA", nameEn: "BA", sortOrder: 20, enabled: true },
  { code: "FESCO", nameCn: "FESCO", nameEn: "FESCO", sortOrder: 30, enabled: true },
  { code: "LOA", nameCn: "LOA", nameEn: "LOA", sortOrder: 40, enabled: true },
];

const BORDERS = [
  { code: "MANZHOULI", nameCn: "满洲里", nameEn: "Manzhouli", sortOrder: 10, enabled: true },
  { code: "ERLIAN", nameCn: "二连", nameEn: "Erlian", sortOrder: 20, enabled: true },
];

const DESTINATIONS = [
  { stationCode: "183502", nameCn: "沃尔西诺", nameEn: "Vorsino", sortOrder: 10, enabled: true },
  { stationCode: "181102", nameCn: "谢利亚基诺", nameEn: "Selyatino", sortOrder: 20, enabled: true },
  { stationCode: "144809", nameCn: "科利亚季奇", nameEn: "Kolyadichi", sortOrder: 30, enabled: true },
  { stationCode: "145201", nameCn: "沙巴尼", nameEn: "Shabany", sortOrder: 40, enabled: true },
  { stationCode: "780302", nameCn: "叶卡捷琳堡", nameEn: "Ekaterinburg-Tovarny", sortOrder: 50, enabled: true },
  { stationCode: "033004", nameCn: "舒沙雷", nameEn: "Shushary-Logistika", sortOrder: 60, enabled: true },
  { stationCode: "850204", nameCn: "克列希哈", nameEn: "Kleshchikha", sortOrder: 70, enabled: true },
  { stationCode: "230506", nameCn: "库帕夫纳", nameEn: "Kupavna", sortOrder: 80, enabled: true },
  { stationCode: "181403", nameCn: "克列斯季", nameEn: "Kresty", sortOrder: 90, enabled: true },
];

function quote(agentCode, borderCode, destinationStationCode, containerSize, ownership, quoteUsd) {
  return { agentCode, borderCode, destinationStationCode, containerSize, ownership, quoteUsd, enabled: true };
}

// Source: TOP客户-全铁公共报价单2026.11.01.pdf (TC).
// COC is the COC freight portion only; it does not include container lease fees.
const TC_RAIL_QUOTES = [
  // Manzhouli / Transbaikal
  quote("TC", "MANZHOULI", "183502", "20", "COC", 1854),
  quote("TC", "MANZHOULI", "183502", "20", "SOC", 1854),
  quote("TC", "MANZHOULI", "183502", "40", "COC", 3930),
  quote("TC", "MANZHOULI", "183502", "40", "SOC", 3900),

  quote("TC", "MANZHOULI", "181102", "20", "COC", 1854),
  quote("TC", "MANZHOULI", "181102", "20", "SOC", 1854),
  quote("TC", "MANZHOULI", "181102", "40", "COC", 3930),
  quote("TC", "MANZHOULI", "181102", "40", "SOC", 3900),

  quote("TC", "MANZHOULI", "144809", "20", "COC", 2240),
  quote("TC", "MANZHOULI", "144809", "20", "SOC", 2240),
  quote("TC", "MANZHOULI", "144809", "40", "COC", 4230),
  quote("TC", "MANZHOULI", "144809", "40", "SOC", 4200),

  quote("TC", "MANZHOULI", "780302", "20", "COC", 1640),
  quote("TC", "MANZHOULI", "780302", "20", "SOC", 1640),
  quote("TC", "MANZHOULI", "780302", "40", "COC", 3160),
  quote("TC", "MANZHOULI", "780302", "40", "SOC", 3130),

  quote("TC", "MANZHOULI", "033004", "20", "COC", 1919),
  quote("TC", "MANZHOULI", "033004", "20", "SOC", 1919),
  quote("TC", "MANZHOULI", "033004", "40", "COC", 3830),
  quote("TC", "MANZHOULI", "033004", "40", "SOC", 3800),

  quote("TC", "MANZHOULI", "850204", "20", "COC", 1269),
  quote("TC", "MANZHOULI", "850204", "20", "SOC", 1269),
  quote("TC", "MANZHOULI", "850204", "40", "COC", 2730),
  quote("TC", "MANZHOULI", "850204", "40", "SOC", 2700),

  // Erlian / Zamyn-Uud, 40 ft only
  quote("TC", "ERLIAN", "183502", "40", "COC", 4330),
  quote("TC", "ERLIAN", "183502", "40", "SOC", 4550),

  quote("TC", "ERLIAN", "181102", "40", "COC", 4330),
  quote("TC", "ERLIAN", "181102", "40", "SOC", 4550),

  quote("TC", "ERLIAN", "230506", "40", "COC", 4330),
  quote("TC", "ERLIAN", "230506", "40", "SOC", 4550),

  quote("TC", "ERLIAN", "181403", "40", "COC", 4330),
  quote("TC", "ERLIAN", "181403", "40", "SOC", 4550),

  quote("TC", "ERLIAN", "780302", "40", "COC", 4060),
  quote("TC", "ERLIAN", "780302", "40", "SOC", 4280),

  quote("TC", "ERLIAN", "033004", "40", "COC", 4430),
  quote("TC", "ERLIAN", "033004", "40", "SOC", 4550),

  quote("TC", "ERLIAN", "144809", "40", "COC", 4330),
  quote("TC", "ERLIAN", "144809", "40", "SOC", 4500),

  quote("TC", "ERLIAN", "145201", "40", "COC", 4330),
  quote("TC", "ERLIAN", "145201", "40", "SOC", 4500),
];

export function buildSeedRows() {
  return {
    agents: AGENTS,
    borders: BORDERS,
    destinations: DESTINATIONS,
    railQuotes: TC_RAIL_QUOTES,
  };
}
