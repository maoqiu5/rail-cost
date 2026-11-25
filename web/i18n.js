export const SUPPORTED_LOCALES = ["zh-CN", "en-US"];

export const TRANSLATIONS = {
  "en-US": {
    "app.title": "Rail Cost Desk",
    "app.eyebrow": "Rail Cost Desk",
    "app.loadError": "Data failed to load. Please refresh and try again.",
    "nav.query": "Query",
    "downloads.label": "Original PDF downloads",
    "downloads.publicQuote": "Public quote PDF",
    "locale.zh": "中文",
    "locale.en": "English",
    "rail.title": "Overseas rail cost",
    "rail.description": "Imported agent quotes by border, destination, container size, and ownership.",
    "rail.agent": "Agent",
    "rail.border": "Transshipment border",
    "rail.destination": "Destination station",
    "rail.destination.placeholder": "Type Chinese, English, station code, or click to choose",
    "rail.containerSize": "Container size",
    "rail.ownership": "Transport type",
    "rail.submit": "Calculate rail cost",
    "rail.empty": "Choose an agent, border, destination station, and container size to calculate.",
    "rail.result.agent": "Agent",
    "rail.result.destination": "Destination station",
    "rail.result.ownership": "Transport type",
    "rail.result.total": "Freight / container",
    "lease.title": "Container lease price",
    "lease.description": "Lease quotes are currently unavailable because containers are in short supply.",
    "lease.agent": "Agent",
    "lease.border": "Transshipment border",
    "lease.pickup": "Pickup location",
    "lease.pickup.placeholder": "Type Chinese, English, or choose from the list",
    "lease.containerSize": "Container size",
    "lease.submit": "Calculate lease price",
    "lease.empty": "Choose an agent, border, pickup location, and container size to calculate.",
    "lease.result.agent": "Agent",
    "lease.result.pickup": "Pickup location",
    "lease.result.table": "Table price",
    "lease.result.adjustment": "Adjustment",
    "lease.result.total": "Lease price / container",
    "container.20": "20 ft",
    "container.40": "40 ft",
    "error.rail.unknownAgent": "Unknown agent",
    "error.rail.destinationNotFound": "Destination station not found",
    "error.rail.unknownBorder": "Unknown transshipment border",
    "error.rail.noQuote": "No quote for this agent, border, destination, container size, and transport type",
    "error.lease.unknownAgent": "Unknown agent",
    "error.lease.unknownBorder": "Unknown transshipment border",
    "error.lease.pickupNotFound": "Pickup location not found",
    "error.lease.noContainer": "No lease quote currently available because containers are in short supply.",
    "rule.rail.importedQuote": "Imported from the current agent quote sheet.",
    "rule.lease.importedQuote": "Imported from the current agent lease quote sheet.",
  },
  "zh-CN": {
    "app.title": "境外段成本查询",
    "app.eyebrow": "Rail Cost Desk",
    "app.loadError": "数据加载失败，请刷新后重试。",
    "nav.query": "查询",
    "downloads.label": "原始报价单下载",
    "downloads.publicQuote": "公共报价单",
    "locale.zh": "中文",
    "locale.en": "English",
    "rail.title": "境外段运价成本",
    "rail.description": "按导入的代理报价单，根据口岸、目的站、箱型和箱属查询。",
    "rail.agent": "代理",
    "rail.border": "换装口岸",
    "rail.destination": "目的站",
    "rail.destination.placeholder": "输入中文、英文、站编或点击选择",
    "rail.containerSize": "箱型",
    "rail.ownership": "运输类型",
    "rail.submit": "查询运费",
    "rail.empty": "选择代理、口岸、目的站和箱型后查询。",
    "rail.result.agent": "代理",
    "rail.result.destination": "目的站",
    "rail.result.ownership": "运输类型",
    "rail.result.total": "运费 / 柜",
    "lease.title": "租箱价格",
    "lease.description": "当前缺箱，暂无租箱报价。",
    "lease.agent": "代理",
    "lease.border": "换装口岸",
    "lease.pickup": "提箱地",
    "lease.pickup.placeholder": "输入中文、英文或下拉选择",
    "lease.containerSize": "箱型",
    "lease.submit": "查询租箱价",
    "lease.empty": "选择代理、口岸、提箱地和箱型后查询。",
    "lease.result.agent": "代理",
    "lease.result.pickup": "提箱地",
    "lease.result.table": "表价",
    "lease.result.adjustment": "调整",
    "lease.result.total": "租箱价 / 柜",
    "container.20": "20尺",
    "container.40": "40尺",
    "error.rail.unknownAgent": "未知代理",
    "error.rail.destinationNotFound": "未找到目的站",
    "error.rail.unknownBorder": "未知换装口岸",
    "error.rail.noQuote": "该代理、口岸、目的站、箱型和运输类型暂无报价",
    "error.lease.unknownAgent": "未知代理",
    "error.lease.unknownBorder": "未知换装口岸",
    "error.lease.pickupNotFound": "未找到提箱地",
    "error.lease.noContainer": "当前缺箱，暂无租箱报价。",
    "rule.rail.importedQuote": "按当前代理报价单导入。",
    "rule.lease.importedQuote": "按当前代理租箱报价单导入。",
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
