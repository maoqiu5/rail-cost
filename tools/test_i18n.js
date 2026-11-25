import assert from "node:assert/strict";
import {
  SUPPORTED_LOCALES,
  TRANSLATIONS,
  localeCookieString,
  normalizeLocale,
  resolveInitialLocale,
  t,
} from "../web/i18n.js";

assert.deepEqual(SUPPORTED_LOCALES, ["zh-CN", "en-US"]);

assert.equal(normalizeLocale("zh-CN"), "zh-CN");
assert.equal(normalizeLocale("en-US"), "en-US");
assert.equal(normalizeLocale("zh-cn"), "zh-CN");
assert.equal(normalizeLocale("en-us"), "en-US");
assert.equal(normalizeLocale("fr-FR"), "en-US");
assert.equal(normalizeLocale(""), "en-US");
assert.equal(normalizeLocale(undefined), "en-US");

assert.equal(
  resolveInitialLocale({ headerLocale: "zh-CN", cookieString: "brianhub_locale=en-US" }),
  "zh-CN",
  "header locale should beat cookie locale",
);
assert.equal(
  resolveInitialLocale({ headerLocale: "fr-FR", cookieString: "brianhub_locale=zh-CN" }),
  "zh-CN",
  "unknown header locale should fall through to valid cookie locale",
);
assert.equal(
  resolveInitialLocale({ headerLocale: "", cookieString: "brianhub_locale=zh-CN" }),
  "zh-CN",
  "cookie locale should be used when header is absent",
);
assert.equal(
  resolveInitialLocale({ headerLocale: "", cookieString: "brianhub_locale=fr-FR" }),
  "en-US",
  "unknown cookie locale should fall back to English",
);
assert.equal(resolveInitialLocale({ headerLocale: "", cookieString: "" }), "en-US");

assert.equal(localeCookieString("zh-CN"), "brianhub_locale=zh-CN; Path=/; SameSite=Lax; Max-Age=31536000");
assert.equal(localeCookieString("fr-FR"), "brianhub_locale=en-US; Path=/; SameSite=Lax; Max-Age=31536000");

for (const locale of SUPPORTED_LOCALES) {
  for (const key of Object.keys(TRANSLATIONS["en-US"])) {
    assert.equal(typeof TRANSLATIONS[locale][key], "string", `${locale} missing i18n key: ${key}`);
    assert.notEqual(TRANSLATIONS[locale][key], "", `${locale} has empty i18n key: ${key}`);
  }
  for (const key of Object.keys(TRANSLATIONS[locale])) {
    assert.equal(key.startsWith("admin."), false, `${locale} should not contain removed admin key: ${key}`);
  }
}

assert.equal(t("en-US", "app.title"), "Rail Cost Desk");
assert.equal(t("zh-CN", "app.title"), "境外段成本查询");
assert.equal(t("en-US", "rail.agent"), "Agent");
assert.equal(t("zh-CN", "rail.agent"), "代理");
assert.equal(t("en-US", "rail.submit"), "Calculate rail cost");
assert.equal(t("zh-CN", "rail.submit"), "查询运费");
assert.equal(t("fr-FR", "rail.submit"), "Calculate rail cost");
assert.equal(t("zh-CN", "error.lease.noContainer"), "当前缺箱，暂无租箱报价。");

for (const key of [
  "rail.agent",
  "rail.result.agent",
  "lease.agent",
  "error.rail.unknownAgent",
  "error.rail.noQuote",
  "error.lease.noContainer",
  "rule.rail.importedQuote",
  "rule.lease.importedQuote",
]) {
  assert.equal(typeof TRANSLATIONS["en-US"][key], "string", `en-US missing key: ${key}`);
  assert.equal(typeof TRANSLATIONS["zh-CN"][key], "string", `zh-CN missing key: ${key}`);
}

console.log("i18n tests passed");
