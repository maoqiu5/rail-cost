export const SUPPORTED_LOCALES = ["zh-CN", "en-US"];

export const TRANSLATIONS = {
  "en-US": {
    "app.title": "Rail Cost Desk",
    "app.eyebrow": "Rail Cost Desk",
    "downloads.label": "Original PDF downloads",
    "downloads.publicQuote": "Public quote PDF",
    "downloads.leaseFee": "Container lease fee PDF",
    "locale.zh": "中文",
    "locale.en": "English",
    "rail.title": "Overseas rail cost",
    "rail.description": "Manzhouli follows August public quote adjustments; Erlian uses configured fixed costs.",
    "rail.border": "Transshipment border",
    "rail.destination": "Destination station",
    "rail.destination.placeholder": "Type Chinese, English, station code, or click to choose",
    "rail.containerSize": "Container size",
    "rail.ownership": "Transport type",
    "rail.submit": "Calculate rail cost",
    "rail.empty": "Choose a border, destination station, and container size to calculate.",
    "rail.result.destination": "Destination station",
    "rail.result.base": "Quote / base",
    "rail.result.adjustment": "Adjustment",
    "rail.result.total": "Cost / container",
    "lease.title": "TC container lease price",
    "lease.description": "Calculated from pickup table prices and border adjustment rules.",
    "lease.border": "Transshipment border",
    "lease.pickup": "Pickup location",
    "lease.pickup.placeholder": "Type Chinese, English, or choose from the list",
    "lease.containerSize": "Container size",
    "lease.submit": "Calculate lease price",
    "lease.empty": "Choose a border, pickup location, and container size to calculate.",
    "lease.result.pickup": "Pickup location",
    "lease.result.table": "Table price",
    "lease.result.adjustment": "Adjustment",
    "lease.result.total": "Lease price / container",
    "container.20": "20 ft",
    "container.40": "40 ft",
    "border.manzhouli": "Manzhouli",
    "border.erlian": "Erlian",
    "error.rail.destinationNotFound": "Destination station not found",
    "error.rail.erlianNo20": "Erlian does not provide 20 ft rail cost yet",
    "error.rail.erlianNoRule": "No Erlian cost rule for this destination station",
    "error.rail.manzhouliNoQuote": "No Manzhouli quote for this container size",
    "error.rail.unknownBorder": "Unknown transshipment border",
    "error.lease.pickupNotFound": "Pickup location not found",
    "error.lease.noTablePrice": "No table price for this pickup location",
    "error.lease.erlianNo20": "Erlian does not provide 20 ft lease price yet",
    "error.lease.unknownBorder": "Unknown transshipment border",
    "rule.rail.erlianFixed40": "Erlian 40 ft fixed cost; same price for SOC/COC",
    "rule.rail.manzhouli40": "Manzhouli 40 ft {ownership}: public quote {adjustment} USD",
    "rule.rail.manzhouli20": "Manzhouli 20 ft uses public quote",
    "rule.lease.manzhouli20": "Manzhouli 20 ft: table price minus 100 USD",
    "rule.lease.manzhouli40Taicang": "Manzhouli 40 ft Taicang pickup fixed at 1900 USD",
    "rule.lease.manzhouli40Other": "Manzhouli 40 ft adjusted by pickup location rule",
    "rule.lease.erlian40Taicang": "Erlian 40 ft Taicang pickup fixed at 1930 USD",
    "rule.lease.erlian40Other": "Erlian 40 ft other pickup locations: table price minus 150 USD",
  },
  "zh-CN": {
    "app.title": "境外段成本查询",
    "app.eyebrow": "Rail Cost Desk",
    "downloads.label": "原始报价单下载",
    "downloads.publicQuote": "公共报价单",
    "downloads.leaseFee": "箱使费",
    "locale.zh": "中文",
    "locale.en": "English",
    "rail.title": "境外段运价成本",
    "rail.description": "满洲里按 8 月公共表价调整，二连按指定固定成本。",
    "rail.border": "换装口岸",
    "rail.destination": "目的站",
    "rail.destination.placeholder": "输入中文、英文、站编或点击选择",
    "rail.containerSize": "箱型",
    "rail.ownership": "运输类型",
    "rail.submit": "查询成本",
    "rail.empty": "选择口岸、目的站和箱型后查询。",
    "rail.result.destination": "目的站",
    "rail.result.base": "表价/基准",
    "rail.result.adjustment": "调整",
    "rail.result.total": "成本价 / 柜",
    "lease.title": "TC 箱租箱价格",
    "lease.description": "按提箱地表价和口岸规则计算。",
    "lease.border": "换装口岸",
    "lease.pickup": "提箱地",
    "lease.pickup.placeholder": "输入中文、英文或下拉选择",
    "lease.containerSize": "箱型",
    "lease.submit": "查询租箱价",
    "lease.empty": "选择换装口岸、提箱地和箱型后查询。",
    "lease.result.pickup": "提箱地",
    "lease.result.table": "表价",
    "lease.result.adjustment": "调整",
    "lease.result.total": "租箱价 / 柜",
    "container.20": "20尺",
    "container.40": "40尺",
    "border.manzhouli": "满洲里",
    "border.erlian": "二连",
    "error.rail.destinationNotFound": "未找到目的站",
    "error.rail.erlianNo20": "二连口岸暂不提供 20 尺成本",
    "error.rail.erlianNoRule": "二连口岸该目的站暂无成本规则",
    "error.rail.manzhouliNoQuote": "满洲里口岸该箱型暂无表价",
    "error.rail.unknownBorder": "未知换装口岸",
    "error.lease.pickupNotFound": "未找到提箱地",
    "error.lease.noTablePrice": "该提箱地无表价",
    "error.lease.erlianNo20": "二连口岸暂不提供 20 尺租箱价",
    "error.lease.unknownBorder": "未知换装口岸",
    "rule.rail.erlianFixed40": "二连 40 尺固定成本，SOC/COC 同价",
    "rule.rail.manzhouli40": "满洲里 40 尺 {ownership} 按公共表价 {adjustment} USD",
    "rule.rail.manzhouli20": "满洲里 20 尺按公共表价",
    "rule.lease.manzhouli20": "满洲里 20 尺按表价减 100 USD",
    "rule.lease.manzhouli40Taicang": "满洲里 40 尺太仓提固定 1900 USD",
    "rule.lease.manzhouli40Other": "满洲里 40 尺按提箱地规则调整",
    "rule.lease.erlian40Taicang": "二连 40 尺太仓提固定 1930 USD",
    "rule.lease.erlian40Other": "二连 40 尺其他提箱地按表价减 150 USD",
  },
};

const DEFAULT_LOCALE = "en-US";

export function normalizeLocale(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "zh-cn") return "zh-CN";
  if (normalized === "en-us") return "en-US";
  return DEFAULT_LOCALE;
}

export function isSupportedLocale(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "zh-cn" || normalized === "en-us";
}

export function resolveInitialLocale({ headerLocale, cookieString }) {
  if (isSupportedLocale(headerLocale)) return normalizeLocale(headerLocale);
  const cookieLocale = readLocaleCookie(cookieString);
  if (isSupportedLocale(cookieLocale)) return normalizeLocale(cookieLocale);
  return DEFAULT_LOCALE;
}

export function readLocaleCookie(cookieString) {
  return String(cookieString || "")
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("brianhub_locale="))
    ?.slice("brianhub_locale=".length) || "";
}

export function localeCookieString(locale) {
  return `brianhub_locale=${normalizeLocale(locale)}; Path=/; SameSite=Lax; Max-Age=31536000`;
}

export function t(locale, key, params = {}) {
  const template = TRANSLATIONS[normalizeLocale(locale)]?.[key] || TRANSLATIONS[DEFAULT_LOCALE][key] || key;
  return Object.entries(params).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, String(value)), template);
}
