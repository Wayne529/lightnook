# LightNook / 轻有间

移动端 React + TypeScript 应用。岩蓝与暖纸配色，真实系统状态栏由浏览器/iOS提供，无手机机身外框。

## 离线版（不需要数据库或后端）

```sh
nvm use
corepack pnpm install
corepack pnpm dev:offline
```

离线数据只保存在当前浏览器 localStorage，不自动同步或上传；核心业务不发送 API 请求。支持偏好、计划、餐单/收藏/自建基础餐单、随机和转盘、换餐、记录/更正/撤销、运动计时、月历、采购清单、日签/周签、照片、导出与导入备份。清除浏览器数据会删除本机数据，请在“我的 → 隐私与数据”定期备份。多标签页通过 Web Locks 串行写入；照片压缩后保存，存储空间不足会明确报错，不伪装成功。

构建免依赖运行包：
```sh
corepack pnpm build:offline
node scripts/serve-offline.mjs
# http://localhost:5174
```

离线包预先包含编译后的资源，运行只需 Node，不需 npm 安装、不需网络、不需 PostgreSQL/Redis。首次打开后 Service Worker 缓存应用，支持离线刷新。建议使用同一个 localhost 地址和浏览器保存数据。外部菜谱仍需网络；核心功能不依赖外站。

## 接口版

需要 Node 22.12+、PostgreSQL 与 Redis。本机开发可使用已安装的 initdb/pg_ctl/redis-server：
```sh
nvm use
corepack pnpm install
corepack pnpm local:infra
corepack pnpm db:generate
corepack pnpm db:migrate
corepack pnpm --filter @lightnook/api build
corepack pnpm db:seed
corepack pnpm dev
```

访问 http://localhost:5173；Nest 接口 http://localhost:3100/api/v1；Swagger http://localhost:3100/api/docs。
项目独立数据库端口 55436、Redis 56386，数据目录 ../work/lightnook-runtime，不操作已有默认端口服务。停止项目基础设施：`corepack pnpm local:stop`。

接口版使用 Prisma/PostgreSQL、NestJS/Express、数据库唯一约束、可撤销 Cookie 会话、CSRF、版本冲突校验、幂等请求、私有本地媒体文件、事务 outbox、BullMQ/Redis、Sharp。API 与 Worker 分进程运行。OpenAPI 从真实 Controller/DTO 生成到 docs/openapi.json。

本机体验账号仅在 DEV_AUTH=true 且请求来自回环地址时开放，生产模式拒绝启用。短信登录保留 HTTPS webhook 适配入口，需要自行配置 SMS_WEBHOOK_URL / SMS_WEBHOOK_SECRET；没有配置时明确拒绝短信请求，不模拟发送。

本地媒体目录是开发存储，生产部署须配置可持久化私有卷或接入云对象存储，并配置真实域名/HTTPS、短信、字体、备份与访问策略。签卡 Worker 的 Linux 环境应安装授权中文字体与 fontconfig。

## 验证

```sh
corepack pnpm test
corepack pnpm typecheck
corepack pnpm build
node scripts/verify-api.mjs  # 需已启动 API 与 Worker；创建并删除专属测试账号
corepack pnpm e2e           # 离线构建后执行浏览器流程测试
```

浏览器自动化优先使用本机 Chrome，也可用 `pnpm exec playwright install chromium` 安装测试浏览器。自动化不代替 iOS Safari/微信真机验收。

## 内容与范围

内置 21 份开发示例餐单，营养是估算，不是经过专业审核的正式内容。配餐按已有过敏资料筛选，不输出安全保证；未知过敏资料的组合不进入设置了过敏条件的自动池。正式对外使用前需审核食材、调味品、过敏信息、营养与来源。

`docs/technical-plan.md` 为技术设计；`docs/openapi.json` 是当前实现接口。初版自建餐单支持基础信息，完整结构化自建食材编辑、云存储适配、微信账号定制分享、通知与生产运维需要后续接入。无需这些外部服务即可完整使用本机离线主流程。

## 可选容器资源

`docker compose up -d` 可启动 PostgreSQL 17 和 Redis 7，仅绑定回环端口；随后把 `.env` 的 DATABASE_URL 改为 `postgresql://lightnook:lightnook-local-dev@127.0.0.1:55436/lightnook`（如设置自定义密码则相应修改）。不要与 `local:infra` 同时使用相同端口。Dockerfile 提供 API/Worker 构建基础；生产仍需独立配置连接、密钥、HTTPS和媒体卷。当前环境没有 Docker，容器流程未实测；本机已安装的 PostgreSQL/Redis 流程已验证。
