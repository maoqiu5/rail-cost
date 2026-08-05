# Rail Cost 部署说明

## 基本信息

- 项目 slug：`rail-cost`
- 线上路径：`https://brianhub.net/rail-cost/`
- VPS 目录：`/root/apps/rail-cost`
- 前端目录：`/root/apps/rail-cost/web`
- 数据目录：`/root/apps/rail-cost/web/data`

## 服务形态

本项目为静态前端页面，无后端 API、无数据库、无 Docker 容器。

对外入口由 `brianhub-gateway` 统一提供，业务项目不单独占用 80/443。

## 网关要求

- 网关项目：`/root/apps/brianhub-gateway`
- Caddyfile：`/root/apps/brianhub-gateway/Caddyfile`
- 路由：`/rail-cost/*`
- 修改网关后执行 Caddy validate 和 reload。

## 环境变量

无项目级环境变量。

## 数据和敏感文件

不得提交 Git：

- `web/data/`
- `.env`
- `.env.*`
- `node_modules/`
- `.pnpm-store/`
- `.codex/`
- `.codex-*/`
- `.work/`
- `logs/`
- `runtime/`
- `backups/`
- `secrets/`
- `*.sqlite`

## 发布

1. 本地验证：

```bash
node tools/test_calculator.js
node tools/test_html_smoke.js
```

2. 同步源码到 VPS `/root/apps/rail-cost`。
3. 单独同步 `web/data/` 下的原始 PDF。
4. 如首次上线或路由变更，更新网关 Caddyfile 并 reload。
5. 验证：

```bash
curl -sS --max-time 15 -o /dev/null -w 'page %{http_code} %{time_total}\n' https://brianhub.net/rail-cost/
curl -sS --max-time 15 -o /dev/null -w 'pdf %{http_code} %{time_total}\n' https://brianhub.net/rail-cost/data/TOP客户-全铁公共报价单2026.08.01.pdf
```

## 回滚

- 页面源码回滚：从 Git 恢复上一版本并重新同步到 `/root/apps/rail-cost`。
- 数据回滚：恢复 `web/data/` 中上一版 PDF。
- 网关回滚：恢复 `/root/apps/brianhub-gateway/Caddyfile` 备份后 validate 和 reload。

## 版本管理

- 本地仓库：`C:\Users\12514\Documents\rail-cost`
- VPS 裸仓库：计划使用 `/root/git/rail-cost.git`
- 远端名：`vps`
- Git push 仅做版本管理，不自动部署。
