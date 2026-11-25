# Rail Cost 项目交接说明

> 更新时间：2026-11-02
> 接手原则：**VPS `/root/apps/rail-cost` 是当前最新生产事实；本地 `D:\codex\rail-cost` 已同步到当前源码。**

---

## 1. 项目一句话

Rail Cost 是 BrianHub 下的独立内部工具，用于按代理、换装口岸、目的站、箱型和 SOC/COC 查询境外段铁路运费报价；租箱费当前因缺箱为空。

---

## 2. 当前状态

- 已上线：`https://brianhub.net/rail-cost/`
- VPS 目录：`/root/apps/rail-cost`
- 本地目录：`D:\codex\rail-cost`
- 当前形态：Node.js 服务 + SQLite 数据库 + 静态前端
- 已导入：`TOP客户-全铁公共报价单2026.11.01.pdf`（代理 TC）
- 已支持代理：`TC`、`BA`、`FESCO`、`LOA`
- 租箱费：空（缺箱）
- 数据维护功能：已删除（页面、`/api/admin/*`、测试和文案均已移除）
- 报价上传：已实现（PDF 报价单 + 人工填写 XLSX 报价单）
- 上传权限：仅 `X-BrianHub-Role` 包含 `admin` 的用户可见/可用
- 上传记录：写入 `rail_cost_quote_imports`，上传原文件保存到 `data/imports/<agentCode>/`

### VPS 实际运行方式（已确认）

- Docker 容器：`rail-cost`
- 镜像：`node:24-bookworm`
- 网络：`brianhub_edge`，容器地址 `rail-cost:8036`
- 挂载：
  - `/root/apps/rail-cost:/app`
  - `/root/apps/rail-cost/data:/app/data`
- 环境变量：`PORT=8036`、`HOST=0.0.0.0`
- 重启策略：`unless-stopped`
- 无宿主机端口映射，仅经网关内部访问
- 运行方式：手动 `docker run` 创建，无 Compose/Dockerfile
- 健康检查：`docker exec rail-cost curl -fsS http://127.0.0.1:8036/health` → `{"ok":true}`

网关已确认：Caddy 对 `/rail-cost/*` 使用 `forward_auth` + `copy_headers` + `uri strip_prefix /rail-cost` + `reverse_proxy rail-cost:8036`。

---

## 3. 架构

```text
rail-cost/
├── server/
│   ├── app.js          # HTTP 服务：静态页 + health + bootstrap + 上传 API
│   ├── db.js           # SQLite 建表、迁移、报价导入、查询数据加载
│   ├── quote-import.js # PDF/XLSX 解析与 XLSX 模板生成
│   └── seed.js         # 代理、口岸、目的站、TC 2026.11 报价数据
├── web/
│   ├── index.html      # 查询页 + 报价上传页
│   ├── app.js          # 页面逻辑：查询、权限、视图切换
│   ├── upload.js       # 报价上传与导入记录
│   ├── calculator.js   # 报价匹配逻辑
│   ├── i18n.js
│   ├── styles.css
│   └── data/           # 私有 PDF，不入 Git
├── tools/              # 回归测试
├── docs/
└── data/               # 运行期 rail-cost.db（不入 Git）
```

技术要点：

- 使用 Node.js 内置 `node:sqlite`，需要 Node 24+。
- 本地默认监听 `127.0.0.1:8036`；VPS 容器内为 `0.0.0.0:8036` 且不映射宿主机端口，路径前缀 `/rail-cost`。
- 数据库文件：本地 `data/rail-cost.db`，VPS `/root/apps/rail-cost/data/rail-cost.db`。
- 启动时自动建表、迁移旧表结构，并按 `quote_data_version` 导入当前 TC 报价。
- 租箱费当前为空，页面统一提示“当前缺箱，暂无租箱报价”。

---

## 4. 核心 API

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/health` | 健康检查 |
| GET | `/api/me` | 返回当前用户、角色、是否管理员、语言 |
| GET | `/api/query/bootstrap` | 返回代理、口岸、目的站、报价、提箱地和租箱价 |
| GET | `/api/quotes/template.xlsx` | 下载 XLSX 报价模板（仅管理员） |
| GET | `/api/quotes/imports` | 查看最近导入记录（仅管理员） |
| POST | `/api/quotes/import` | 上传并导入 PDF/XLSX 报价（仅管理员） |

已删除：

- `GET/POST/PUT/DELETE /api/admin/:resource`

---

## 5. 数据库表

当前使用：

- `rail_cost_agents`：代理（TC / BA / FESCO / LOA）
- `rail_cost_borders`：换装口岸
- `rail_cost_destinations`：目的站
- `rail_cost_rail_public_quotes`：代理铁路运费报价（含 `agentCode`、COC/SOC、箱型）
- `rail_cost_lease_pickups`：提箱地（预留）
- `rail_cost_lease_prices`：租箱价（当前为空）
- `rail_cost_quote_imports`：报价导入记录（代理、来源、文件、期间、条数、上传人）
- `rail_cost_meta`：元数据（含 `quote_data_version`）

旧数据维护相关表可能仍存在于历史数据库中，但当前代码不再读写：

- `rail_cost_freight_prices`
- `rail_cost_rail_rules`
- `rail_cost_lease_table_prices`
- `rail_cost_lease_rules`

---

## 6. 当前报价导入规则

来源：`web/data/TOP客户-全铁公共报价单2026.11.01.pdf`

- 代理：`TC`
- 报价期间：2026-11-01 至 2026-11-30
- COC 仅代表 COC 的运费部分，不包含租箱费
- 满洲里 40 尺 COC/SOC 分别按报价单导入
- 二连 40 尺 COC/SOC 分别按报价单导入
- 二连 20 尺报价单中无数据，查询时提示暂无报价
- 新增目的站：Kupavna（230506）、Kresty（181403）

### 上传导入

- 管理员登录后左侧会出现“报价上传”。
- PDF：选择代理并上传代理报价单，解析 `接驳口岸`、`站编`、`COC`、`SOC` 行，按 `$` 金额导入；`-` 视为无报价。
- XLSX：下载模板后按列填写，上传后按 `agentCode / borderCode / destinationStationCode / containerSize / ownership / quoteUsd` 导入。
- 上传会替换所选代理当前的报价（不会影响其他代理）。
- 上传原文件保存到 `data/imports/<agentCode>/`，导入记录写入 `rail_cost_quote_imports`。

---

## 7. 本地命令

使用 Codex runtime Node 24：

```powershell
$node = 'C:\Users\12514\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
Set-Location 'D:\codex\rail-cost'

& $node --disable-warning=ExperimentalWarning tools/test_db.js
& $node --disable-warning=ExperimentalWarning tools/test_api.js
& $node tools/test_i18n.js
& $node --disable-warning=ExperimentalWarning tools/test_calculator.js
& $node --disable-warning=ExperimentalWarning tools/test_import.js
& $node tools/test_html_smoke.js
```

或直接：

```powershell
& $node --disable-warning=ExperimentalWarning server/app.js
```

本地访问：

```text
http://127.0.0.1:8036/rail-cost/
```

---

## 8. 部署要点

- VPS 目录：`/root/apps/rail-cost`
- 数据库：`/root/apps/rail-cost/data/rail-cost.db`
- 私有 PDF：`/root/apps/rail-cost/web/data/`
- 服务通过 `brianhub_edge` 网络暴露为 `rail-cost:8036`
- 公网入口由 `brianhub-gateway` 的 Caddy 管理
- 路由：`/rail-cost/*`
- 网关转发 BrianHub 身份头

部署/重启常用：

```bash
cd /root/apps/rail-cost
git pull --ff-only github main
docker restart rail-cost
```

---

## 9. 敏感文件与安全

不要提交或外泄：

- `web/data/`
- `data/`
- `*.sqlite`
- `*.sqlite-shm`
- `*.sqlite-wal`
- `.env`
- `.env.*`
- `logs/`、`runtime/`、`backups/`、`secrets/`

---

## 10. 当前已知风险 / 待办

- [x] 数据维护功能已删除
- [x] 多代理维度已加入数据库和查询页
- [x] TC 2026.11 报价已导入
- [x] 租箱费已清空并显示缺箱提示
- [x] PDF 报价单上传功能已实现
- [x] 人工填写 XLSX 报价单上传读取已实现
- [x] 上传原文件保存到 `data/imports/`
- [x] 导入记录写入 `rail_cost_quote_imports`
- [ ] BA / FESCO / LOA 报价尚未导入
- [ ] 历史数据库中旧的维护表尚未物理删除，仅停止使用
- [ ] 当前 TC 初始数据仍来自代码中的 seed 数据；后续应改为上传驱动
- [ ] 更多代理的 PDF 版式可能需要单独适配
- [ ] `xlsx@0.18.5` 有 npm audit 告警，当前仅内网使用；后续评估替换或升级
- [ ] `web/data/` 下的 PDF 是敏感业务材料，不能进 Git

---

## 11. 新对话接续方式

新开 rail-cost 对话时，直接说：

```text
这是 rail-cost 项目对话。
请先读 D:\codex\HANDOVER_INDEX.md 和 D:\codex\rail-cost\docs\HANDOVER.md，
再查看 VPS /root/apps/rail-cost 的实际运行状态，然后开始工作。
```
