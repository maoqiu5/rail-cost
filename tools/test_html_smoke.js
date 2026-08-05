import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const html = readFileSync(join(root, "web", "index.html"), "utf8");
const app = readFileSync(join(root, "web", "app.js"), "utf8");

assert.match(html, /境外段成本查询/);
assert.match(html, /TC 箱租箱价格/);
assert.match(html, /换装口岸/);
assert.equal(html.includes("railStationCode"), false, "rail form should not expose a separate station code input");
assert.equal(html.includes("站编"), false, "rail form should not show a separate station code label");
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
