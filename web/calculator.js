export const RAIL_DESTINATIONS = [
  { nameCn: "沃尔西诺", nameEn: "Vorsino", stationCode: "183502", manzhouliPublic: { "20": 1767, "40": 4100 } },
  { nameCn: "谢利亚基诺", nameEn: "Selyatino", stationCode: "181102", manzhouliPublic: { "20": 1767, "40": 4100 } },
  { nameCn: "科利亚季奇", nameEn: "Kolyadichi", stationCode: "144809", manzhouliPublic: { "20": 2190, "40": 4500 } },
  { nameCn: "沙巴内", nameEn: "Shabany", stationCode: "145201", manzhouliPublic: { "20": 2190, "40": 4500 } },
  { nameCn: "叶卡捷琳堡", nameEn: "Ekaterinburg-Tovarny", stationCode: "780302", manzhouliPublic: { "20": 1565, "40": 3300 } },
  { nameCn: "舒沙雷", nameEn: "Shushary-Logistika", stationCode: "033004", manzhouliPublic: { "20": 1830, "40": 4000 } },
  { nameCn: "克列希哈", nameEn: "Kleshchikha", stationCode: "850204", manzhouliPublic: { "20": 1209, "40": 2900 } },
];

export const LEASE_PICKUPS = [
  { code: "SHANGHAI", nameCn: "上海", nameEn: "Shanghai", table: { "20": 400, "40": 2450 } },
  { code: "NINGBO", nameCn: "宁波", nameEn: "Ningbo", table: { "20": 300, "40": 2500 } },
  { code: "QINGDAO", nameCn: "青岛", nameEn: "Qingdao", table: { "20": 500, "40": 2100 } },
  { code: "XINGANG", nameCn: "天津新港", nameEn: "Xingang / Tianjin", table: { "20": 950, "40": 1850 } },
  { code: "DALIAN", nameCn: "大连", nameEn: "Dalian", table: { "20": 400, "40": 2000 } },
  { code: "GUANGZHOU", nameCn: "广州", nameEn: "Guangzhou", table: { "20": 550, "40": 2400 } },
  { code: "SHENZHEN", nameCn: "深圳", nameEn: "Shenzhen", table: { "20": 550, "40": 2500 } },
  { code: "XIAMEN", nameCn: "厦门", nameEn: "Xiamen", table: { "20": 1000, "40": 2200 } },
  { code: "ZHENGZHOU", nameCn: "郑州", nameEn: "Zhengzhou", table: { "20": 300, "40": 2200 } },
  { code: "XIAN", nameCn: "西安", nameEn: "Xi'an", table: { "20": 250, "40": 2100 } },
  { code: "CHENGDU", nameCn: "成都", nameEn: "Chengdu", table: { "20": 200, "40": 1800 } },
  { code: "CHONGQING", nameCn: "重庆", nameEn: "Chongqing", table: { "20": 200, "40": 2000 } },
  { code: "WUHAN", nameCn: "武汉", nameEn: "Wuhan", table: { "20": 300, "40": 2200 } },
  { code: "HARBIN", nameCn: "哈尔滨", nameEn: "Harbin", table: { "20": 1000, "40": 2300 } },
  { code: "SHENYANG", nameCn: "沈阳", nameEn: "Shenyang", table: { "20": 400, "40": 2200 } },
  { code: "SUIFENHE", nameCn: "绥芬河", nameEn: "Suifenhe", table: { "20": 1000, "40": 1450 } },
  { code: "CHANGSHA", nameCn: "长沙", nameEn: "Changsha", table: { "20": 200, "40": 2200 } },
  { code: "YIWU", nameCn: "义乌", nameEn: "Yiwu", table: { "20": 1000, "40": 2800 } },
  { code: "LIANYUNGANG", nameCn: "连云港", nameEn: "Lianyungang", table: { "20": 300, "40": 1400 } },
  { code: "SHANTOU", nameCn: "汕头", nameEn: "Shantou", table: { "20": null, "40": 2550 } },
  { code: "TAICANG", nameCn: "太仓", nameEn: "Taicang", table: { "20": 400, "40": 2300 } },
  { code: "ERLIAN", nameCn: "二连", nameEn: "Erlian", table: { "20": 1000, "40": 2550 } },
  { code: "CHANGCHUN", nameCn: "长春", nameEn: "Changchun", table: { "20": 1000, "40": 1200 } },
  { code: "HEFEI", nameCn: "合肥", nameEn: "Hefei", table: { "20": 1000, "40": 2300 } },
];

const ERLIAN_FIXED_COSTS_40 = new Map([
  ["181102", 4300],
  ["183502", 4300],
  ["144809", 4330],
]);

export function findRailDestination(query) {
  const normalized = String(query || "").trim().toLowerCase();
  return RAIL_DESTINATIONS.find((item) =>
    [item.nameCn, item.nameEn, item.stationCode].some((value) =>
      String(value).toLowerCase() === normalized,
    ),
  );
}

export function findRailDestinationFromInput(query) {
  const normalized = String(query || "").trim().toLowerCase();
  return RAIL_DESTINATIONS.find((item) =>
    [item.nameCn, item.nameEn, item.stationCode, `${item.nameCn} / ${item.nameEn} / ${item.stationCode}`].some((value) =>
      String(value).toLowerCase() === normalized,
    ),
  );
}

export function calculateRailCost({ border, destinationCode, containerSize, ownership }) {
  const destination = findRailDestination(destinationCode);
  if (!destination) return unavailable("error.rail.destinationNotFound");

  if (border === "二连") {
    if (containerSize === "20") return unavailable("error.rail.erlianNo20");
    const fixedCost = ERLIAN_FIXED_COSTS_40.get(destination.stationCode);
    if (!fixedCost) return unavailable("error.rail.erlianNoRule");
    return result({ border, destination, containerSize, ownership, baseUsd: fixedCost, adjustmentUsd: 0, totalUsd: fixedCost, ruleKey: "rule.rail.erlianFixed40" });
  }

  if (border === "满洲里") {
    const baseUsd = destination.manzhouliPublic[containerSize];
    if (!baseUsd) return unavailable("error.rail.manzhouliNoQuote");
    const adjustmentUsd = containerSize === "40" ? (ownership === "SOC" ? -230 : -200) : 0;
    return result({
      border,
      destination,
      containerSize,
      ownership,
      baseUsd,
      adjustmentUsd,
      totalUsd: baseUsd + adjustmentUsd,
      ruleKey: containerSize === "40" ? "rule.rail.manzhouli40" : "rule.rail.manzhouli20",
      ruleParams: { ownership, adjustment: adjustmentUsd },
    });
  }

  return unavailable("error.rail.unknownBorder");
}

export function getAvailableLeasePickups(border, containerSize) {
  return LEASE_PICKUPS.filter((pickup) => calculateLeaseCost({ border, pickupCode: pickup.code, containerSize }).available);
}

export function calculateLeaseCost({ border, pickupCode, containerSize }) {
  const pickup = LEASE_PICKUPS.find((item) => item.code === pickupCode);
  if (!pickup) return unavailable("error.lease.pickupNotFound");
  const tablePrice = pickup.table[containerSize];
  if (tablePrice === null || tablePrice === undefined) return unavailable("error.lease.noTablePrice");

  if (border === "满洲里") {
    if (containerSize === "20") return leaseResult(border, pickup, containerSize, tablePrice, -100, "rule.lease.manzhouli20");
    if (pickup.code === "TAICANG") return leaseResult(border, pickup, containerSize, tablePrice, 1900 - tablePrice, "rule.lease.manzhouli40Taicang");
    return leaseResult(border, pickup, containerSize, tablePrice, pickup.code === "XINGANG" ? -150 : -350, "rule.lease.manzhouli40Other");
  }

  if (border === "二连") {
    if (containerSize === "20") return unavailable("error.lease.erlianNo20");
    if (pickup.code === "TAICANG") return leaseResult(border, pickup, containerSize, tablePrice, 1930 - tablePrice, "rule.lease.erlian40Taicang");
    return leaseResult(border, pickup, containerSize, tablePrice, -150, "rule.lease.erlian40Other");
  }

  return unavailable("error.lease.unknownBorder");
}

function leaseResult(border, pickup, containerSize, tableUsd, adjustmentUsd, ruleKey) {
  return { available: true, border, pickup, containerSize, tableUsd, adjustmentUsd, totalUsd: tableUsd + adjustmentUsd, ruleKey };
}

function result(payload) {
  return { available: true, ...payload };
}

function unavailable(reasonKey) {
  return { available: false, reasonKey };
}
