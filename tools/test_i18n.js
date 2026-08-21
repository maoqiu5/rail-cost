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
}

assert.equal(t("en-US", "app.title"), "Rail Cost Desk");
assert.equal(t("zh-CN", "app.title"), "境外段成本查询");
assert.equal(t("en-US", "rail.submit"), "Calculate rail cost");
assert.equal(t("zh-CN", "rail.submit"), "查询成本");
assert.equal(t("fr-FR", "rail.submit"), "Calculate rail cost");
assert.equal(t("en-US", "nav.admin"), "Data Maintenance");
assert.equal(t("zh-CN", "nav.admin"), "数据维护");

for (const key of [
  "admin.title",
  "admin.empty",
  "admin.actions",
  "admin.save",
  "admin.delete",
  "admin.new",
  "admin.error.load",
  "admin.error.save",
  "admin.error.delete",
  "admin.sections.priceMaintenance",
  "admin.resources.freightPrices",
  "admin.resources.leasePrices",
  "admin.fields.socPriceUsd",
  "admin.fields.cocPriceUsd",
  "admin.fields.displayPriceUsd",
  "admin.error.finalPriceNonNegative",
]) {
  assert.equal(typeof TRANSLATIONS["en-US"][key], "string", `en-US missing admin key: ${key}`);
  assert.equal(typeof TRANSLATIONS["zh-CN"][key], "string", `zh-CN missing admin key: ${key}`);
}

console.log("i18n tests passed");
