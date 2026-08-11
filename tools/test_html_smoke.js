import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const html = readFileSync(join(root, "web", "index.html"), "utf8");
const app = readFileSync(join(root, "web", "app.js"), "utf8");
const calculator = readFileSync(join(root, "web", "calculator.js"), "utf8");
const i18n = readFileSync(join(root, "web", "i18n.js"), "utf8");
const css = readFileSync(join(root, "web", "styles.css"), "utf8");

assert.match(html, /data-bh-header-locale/);
assert.match(html, /data-bh-header-locale='\{\{placeholder "http\.request\.header\.X-BrianHub-Locale"\}\}'/);
assert.equal(html.includes('{{placeholder \\"'), false, "Caddy template placeholders must not contain escaped quotes");
assert.match(html, /id="localeSwitch"/);
assert.match(html, /class="language-switcher"/);
assert.match(html, /styles\.css\?v=20260811-admin-db/);
assert.match(html, /data-locale="zh-CN"/);
assert.match(html, /data-locale="en-US"/);
assert.match(html, /id="railNav"/);
assert.match(html, /id="queryView"/);
assert.match(html, /id="adminNav"/);
assert.match(html, /id="adminView"/);
assert.match(html, /admin-view/);
assert.match(css, /\.language-switcher button \+ button/);
assert.match(css, /\.language-switcher button \{[^}]*min-width: 64px/s);
assert.match(css, /\.sidebar/);
assert.match(css, /\.admin-table/);
assert.equal(css.includes(".locale-switch"), false, "rail-cost should use the same language-switcher class as the portal");
assert.match(app, /\.\/i18n\.js/);
assert.match(app, /fetch\("\.\/api\/me"\)/);
assert.match(app, /fetch\("\.\/api\/query\/bootstrap"\)/);
assert.match(app, /initAdminModule/);
assert.equal(calculator.includes("RAIL_DESTINATIONS"), false, "frontend calculator must not ship destination seed data");
assert.equal(calculator.includes("LEASE_PICKUPS"), false, "frontend calculator must not ship lease pickup seed data");
assert.equal(calculator.includes("Vorsino"), false, "frontend bundle must not ship rail business rows");
assert.equal(calculator.includes("TAICANG"), false, "frontend bundle must not ship lease business rows");
assert.match(html, /Rail Cost Desk/);
assert.match(i18n, /境外段成本查询/);
assert.match(i18n, /TC 箱租箱价格/);
assert.match(i18n, /换装口岸/);
assert.match(i18n, /数据维护/);
assert.match(i18n, /Data Maintenance/);
assert.match(html, /Overseas rail cost/);
assert.match(html, /TC container lease price/);
assert.equal(html.includes("railStationCode"), false, "rail form should not expose a separate station code input");
assert.equal(html.includes("<span>站编</span>"), false, "rail form should not show a separate station code label");
assert.equal(html.includes('id="railDestination" list='), false, "destination input should not rely on native datalist filtering");
assert.match(html, /id="railDestinationOptions"/);
assert.equal(app.includes("<span>站编</span>"), false, "rail result should not show a separate station code row");
assert.match(app, /showDestinationOptions\(\{ filter: false \}\)/);
assert.equal(html.includes("还箱口岸"), false, "lease border label should use 换装口岸");
assert.match(html, /TOP客户-全铁公共报价单2026\.08\.01\.pdf/);
assert.match(html, /箱使费2026\.08\.01-2026\.08\.31pdf\.pdf/);

for (const forbidden of ["卡车运价", "铁路预测", "市场参考", "GPS轨迹", "rates"]) {
  assert.equal(html.includes(forbidden), false, `page should not include old module text: ${forbidden}`);
}

assert.equal(existsSync(join(root, "web", "data", "TOP客户-全铁公共报价单2026.08.01.pdf")), true);
assert.equal(existsSync(join(root, "web", "data", "箱使费2026.08.01-2026.08.31pdf.pdf")), true);

console.log("html smoke tests passed");
