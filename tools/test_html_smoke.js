import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const html = readFileSync(join(root, "web", "index.html"), "utf8");

assert.match(html, /境外段成本查询/);
assert.match(html, /TC 箱租箱价格/);
assert.match(html, /TOP客户-全铁公共报价单2026\.08\.01\.pdf/);
assert.match(html, /箱使费2026\.08\.01-2026\.08\.31pdf\.pdf/);

for (const forbidden of ["卡车运价", "铁路预测", "市场参考", "GPS轨迹", "rates"]) {
  assert.equal(html.includes(forbidden), false, `page should not include old module text: ${forbidden}`);
}

assert.equal(existsSync(join(root, "web", "data", "TOP客户-全铁公共报价单2026.08.01.pdf")), true);
assert.equal(existsSync(join(root, "web", "data", "箱使费2026.08.01-2026.08.31pdf.pdf")), true);

console.log("html smoke tests passed");
