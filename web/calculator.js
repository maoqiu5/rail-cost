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
  if (!destination) return unavailable("未找到目的站");

  if (border === "二连") {
    if (containerSize === "20") return unavailable("二连口岸暂不提供 20 尺成本");
    const fixedCost = ERLIAN_FIXED_COSTS_40.get(destination.stationCode);
    if (!fixedCost) return unavailable("二连口岸该目的站暂无成本规则");
    return result({ border, destination, containerSize, ownership, baseUsd: fixedCost, adjustmentUsd: 0, totalUsd: fixedCost, rule: "二连 40 尺固定成本，SOC/COC 同价" });
  }

  if (border === "满洲里") {
    const baseUsd = destination.manzhouliPublic[containerSize];
    if (!baseUsd) return unavailable("满洲里口岸该箱型暂无表价");
    const adjustmentUsd = containerSize === "40" ? (ownership === "SOC" ? -230 : -200) : 0;
    return result({
      border,
      destination,
      containerSize,
      ownership,
      baseUsd,
      adjustmentUsd,
      totalUsd: baseUsd + adjustmentUsd,
      rule: containerSize === "40" ? `满洲里 40 尺 ${ownership} 按公共表价 ${adjustmentUsd} USD` : "满洲里 20 尺按公共表价",
    });
  }

  return unavailable("未知换装口岸");
}

export function getAvailableLeasePickups(border, containerSize) {
  return LEASE_PICKUPS.filter((pickup) => calculateLeaseCost({ border, pickupCode: pickup.code, containerSize }).available);
}

export function calculateLeaseCost({ border, pickupCode, containerSize }) {
  const pickup = LEASE_PICKUPS.find((item) => item.code === pickupCode);
  if (!pickup) return unavailable("未找到提箱地");
  const tablePrice = pickup.table[containerSize];
  if (tablePrice === null || tablePrice === undefined) return unavailable("该提箱地无表价");

  if (border === "满洲里") {
    if (containerSize === "20") return leaseResult(border, pickup, containerSize, tablePrice, -100, "满洲里 20 尺按表价减 100 USD");
    if (pickup.code === "TAICANG") return leaseResult(border, pickup, containerSize, tablePrice, 1950 - tablePrice, "满洲里 40 尺太仓提固定 1950 USD");
    return leaseResult(border, pickup, containerSize, tablePrice, pickup.code === "XINGANG" ? -150 : -350, "满洲里 40 尺按提箱地规则调整");
  }

  if (border === "二连") {
    if (containerSize === "20") return unavailable("二连口岸暂不提供 20 尺租箱价");
    if (pickup.code === "TAICANG") return leaseResult(border, pickup, containerSize, tablePrice, 1930 - tablePrice, "二连 40 尺太仓提固定 1930 USD");
    return leaseResult(border, pickup, containerSize, tablePrice, -150, "二连 40 尺其他提箱地按表价减 150 USD");
  }

  return unavailable("未知还箱口岸");
}

function leaseResult(border, pickup, containerSize, tableUsd, adjustmentUsd, rule) {
  return { available: true, border, pickup, containerSize, tableUsd, adjustmentUsd, totalUsd: tableUsd + adjustmentUsd, rule };
}

function result(payload) {
  return { available: true, ...payload };
}

function unavailable(reason) {
  return { available: false, reason };
}
