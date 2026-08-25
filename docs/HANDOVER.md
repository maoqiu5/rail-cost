# Rail Cost 项目交接说明

> 更新时间：2026-08-25
> 接手原则：**VPS `/root/apps/rail-cost` 是当前最新生产事实；本地 `D:\codex\rail-cost` 已同步到 VPS 最新源码。**

---

## 1. 项目一句话

Rail Cost 是 BrianHub 下的独立内部工具，用于查询境外段铁路运费和 TC 箱租价格，并提供管理员价格维护页面。

---

## 2. 当前状态

- 已上线：`https://brianhub.net/rail-cost/`
- VPS 目录：`/root/apps/rail-cost`
- 本地目录：`D:\codex\rail-cost`
- 本地已与 VPS 源码对齐：✅
- 本地测试全部通过：✅
- 当前形态：Node.js 服务 + SQLite 数据库 + 静态前端 + 管理员维护页
- VPS 实际运行方式（2026-08-25 已确认）：**Docker 容器**，容器名 `rail-cost`
  - 镜像：`node:24-bookworm`
  - 网络：共享网络 `brianhub_edge`，容器地址 `rail-cost:8036`
  - 挂载：`/root/apps/rail-cost:/app`、`/root/apps/rail-cost/data:/app/data`
  - 环境变量：`PORT=8036`、`HOST=0.0.0.0`
  - 重启策略：`unless-stopped`；无宿主机端口映射，仅经网关内部访问
  - 运行方式：手动 `docker run` 创建，无 Compose/Dockerfile 文件
  - 内部健康检查通过：`docker exec rail-cost curl -fsS http://127.0.0.1:8036/health` → `{"ok":true}`
- 网关已确认：Caddy 对 `/rail-cost/*` 使用 `forward_auth` + `copy_headers` + `uri strip_prefix /rail-cost` + `reverse_proxy rail-cost:8036`
- 本地与 VPS 源码哈希已核对一致：✅

---

## 3. 架构

```text
rail-cost/
├── server/
│   ├── app.js          # HTTP 服务：静态页 + API + 管理员接口
│   ├── db.js           # SQLite 建表、种子数据、查询、CRUD
│   └── seed.js         # 初始价格数据
├── web/
│   ├── index.html      # 查询页
│   ├── admin.js        # 管理员价格维护逻辑
│   ├── admin-model.js  # 管理资源配置
│   ├── calculator.js
│   ├── i18n.js
│   ├── styles.css
│   └── data/           # 私有 PDF，不入 Git
├── tools/              # 6 个测试
├── docs/
└── data/               # 运行期 rail-cost.db（不入 Git）
```

技术要点：

- 使用 Node.js 内置 `node:sqlite`，需要 Node 24+。
- 本地默认监听 `127.0.0.1:8036`；VPS 容器内为 `0.0.0.0:8036` 且不映射宿主机端口，路径前缀 `/rail-cost`。
- 数据库文件：本地 `data/rail-cost.db`，VPS `/root/apps/rail-cost/data/rail-cost.db`。
- 启动时自动建表并 seed 缺失数据，使用 `insert or ignore`，不会覆盖管理员已改数据。

---

## 4. 核心 API

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/health` | 健康检查 |
| GET | `/api/me` | 返回当前用户、角色、语言 |
| GET | `/api/query/bootstrap` | 查询页所需全部基础数据 |
| GET | `/api/admin/:resource` | 管理员读取资源 |
| POST | `/api/admin/:resource` | 管理员新增 |
| PUT | `/api/admin/:resource/:id` | 管理员更新 |
| DELETE | `/api/admin/:resource/:id` | 管理员删除 |

管理员判断：

- 依赖网关转发的 `X-BrianHub-User`、`X-BrianHub-Role`、`X-BrianHub-Locale`。
- 只有 `X-BrianHub-Role` 中包含 `admin` 的用户才能访问 `/api/admin/*`。
- 网关必须剥离客户端伪造的 `X-BrianHub-*` 头。

---

## 5. 数据库表

- `rail_cost_borders`
- `rail_cost_destinations`
- `rail_cost_rail_public_quotes`
- `rail_cost_rail_rules`
- `rail_cost_freight_prices`
- `rail_cost_lease_pickups`
- `rail_cost_lease_table_prices`
- `rail_cost_lease_prices`
- `rail_cost_lease_rules`
- `rail_cost_meta`

管理员维护范围当前只开放：

- `borders`
- `destinations`
- `freight-prices`
- `lease-pickups`
- `lease-prices`

其中 `lease-prices` 只允许编辑最终展示价 `displayPriceUsd`，不暴露底价和折扣字段。

---

## 6. 本地命令

使用 Codex runtime Node 24：

```powershell
$node = 'C:\Users\12514\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
Set-Location 'D:\codex\rail-cost'

& $node --disable-warning=ExperimentalWarning tools/test_db.js
& $node --disable-warning=ExperimentalWarning tools/test_api.js
& $node tools/test_i18n.js
& $node --disable-warning=ExperimentalWarning tools/test_calculator.js
& $node tools/test_admin_display.js
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

## 7. 部署要点

- VPS 目录：`/root/apps/rail-cost`
- 数据库：`/root/apps/rail-cost/data/rail-cost.db`
- 私有 PDF：`/root/apps/rail-cost/web/data/`
- 服务通过 `brianhub_edge` 网络暴露为 `rail-cost:8036`
- 公网入口由 `brianhub-gateway` 的 Caddy 管理
- 路由：`/rail-cost/*`
- 网关必须转发 BrianHub 身份头

部署/重启常用：

```bash
cd /root/apps/rail-cost
docker restart rail-cost          # 代码/文件变更后重启容器
# 如需重建容器，参考 docs/DEPLOYMENT.md 中的 docker run 命令
```

> 已确认：当前 VPS rail-cost 使用 Docker 容器运行（非 systemd、非裸 Node 进程），容器名 `rail-cost`，详见“当前状态”中的运行方式说明。

---

## 8. 敏感文件与安全

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

## 9. 当前已知风险 / 待确认

- [x] VPS rail-cost 的实际运行方式已确认：Docker 容器（容器名 `rail-cost`，`node:24-bookworm`，`brianhub_edge` 网络，`unless-stopped`）
- [ ] 本地 `D:\codex\rail-cost` 已同步，但后续应以 VPS 为权威，修改前先对比
- [ ] `web/data/` 下的 PDF 是敏感业务材料，不能进 Git
- [ ] 月度报价更新时，需要同时更新数据库价格和 PDF
- [ ] 网关转发 `X-BrianHub-*` 头的安全性依赖 `brianhub-gateway` 配置正确

---

## 10. 新对话接续方式

新开 rail-cost 对话时，直接说：

```text
这是 rail-cost 项目对话。
请先读 D:\codex\HANDOVER_INDEX.md 和 D:\codex\rail-cost\docs\HANDOVER.md，
再查看 VPS /root/apps/rail-cost 的实际运行状态，然后开始工作。
```
