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

## GitHub Pages 可访问页面

仓库内 `.github/workflows/pages.yml` 在推送 main 时自动构建并发布纯浏览器版本，无需配置数据库或 API，也无需把个人 Token 写入 Actions。

首次启用：进入仓库 **Settings → Pages → Build and deployment → Source → GitHub Actions**。然后在 **Actions → Deploy LightNook to GitHub Pages → Run workflow** 手动运行一次，部署完成后访问：

https://wayne529.github.io/lightnook/

使用 `/lightnook/` 资源路径与 Hash 路由（例如 `#/profile`），支持直接打开和刷新页面。Service Worker 缓存限定在当前应用目录。数据保存在当前设备的浏览器里，换设备不会自动同步；外部菜谱链接需要网络。Pages 不运行 Node.js 后端，接口版需独立部署。

本机验证 Pages 构建：`pnpm build:pages`；产物目录为 `apps/web/dist-offline`，需挂载在服务器的 `/lightnook/` 路径下。普通本地运行包仍用 `pnpm build:offline` 构建。

## 自定义食材偏好

在首次定制或“我的 → 饮食偏好”中管理常买得到的食材、更喜欢的食材与不吃的食材。可从常见分类勾选，也可逐项输入自定义名称；常买和喜好每组最多 60 项。

“优先使用”会优先匹配常买食材，自动计划与抽餐选用采购匹配度最高的做饭候选；推荐列表保留其他可选餐单并提示需要补买的食材。“只用已选食材”要求做饭配方的全部原料（含调味品）均已选择，配料未知的自建餐单不会自动入选。番茄/西红柿等少量同义词可匹配，不擅自替换不同原料。外食不受采购清单限制，过敏与忌口始终保留，忌口也会检查菜谱实际配料。

保存影响新计划、推荐、换餐和抽餐；已有计划与记录不会被自动重写。候选池与计划草案通过偏好版本检查失效。旧版离线数据及备份会补齐默认字段，无需清空记录。偏好存储在现有 JSON 字段中，无新增数据库表或迁移。

## 移动端与签卡更新

食材选择和已选清单按肉类、鱼类、虾贝类、蛋豆类、蔬菜类、菌菇类、主食类、水果类、奶制品类、调味类及其他分类；支持按类切换和跨分类搜索。详情页顶部提供返回首页入口，底部主导航适配 Pages 的 Hash 路由。

转盘扇区使用餐食插画和编号，点击中心抽取，完整餐名在结果中展示。新生成的一日签包含完成率、三餐实记、活动与寄语；一周签增加七天节奏与记录天数。手账与岩蓝两种配色均导出 1170×2256 PNG，在线与离线共用设计。旧签卡保持可查看；历史周签没有逐日数据时明确提示重新生成。分享不会包含私人备注、体重或未主动选用的照片。

`node scripts/verify-mobile-updates.mjs` 在 Pages 构建挂载到 localhost:5175/lightnook/ 后验证分类、首页入口、插画转盘与新版签卡。

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
node scripts/verify-ingredients.mjs  # Pages 构建挂载 /lightnook/ 到 localhost:5175 后验证食材操作
node scripts/verify-ingredient-api.mjs # 本机 API 启动后验证食材偏好接口；创建并清理测试账号
```

浏览器自动化优先使用本机 Chrome，也可用 `pnpm exec playwright install chromium` 安装测试浏览器。自动化不代替 iOS Safari/微信真机验收。

## 内容与范围

内置 21 份开发示例餐单，营养是估算，不是经过专业审核的正式内容。配餐按已有过敏资料筛选，不输出安全保证；未知过敏资料的组合不进入设置了过敏条件的自动池。正式对外使用前需审核食材、调味品、过敏信息、营养与来源。

`docs/technical-plan.md` 为技术设计；`docs/openapi.json` 是当前实现接口。初版自建餐单支持基础信息，完整结构化自建食材编辑、云存储适配、微信账号定制分享、通知与生产运维需要后续接入。无需这些外部服务即可完整使用本机离线主流程。

## 可选容器资源

`docker compose up -d` 可启动 PostgreSQL 17 和 Redis 7，仅绑定回环端口；随后把 `.env` 的 DATABASE_URL 改为 `postgresql://lightnook:lightnook-local-dev@127.0.0.1:55436/lightnook`（如设置自定义密码则相应修改）。不要与 `local:infra` 同时使用相同端口。Dockerfile 提供 API/Worker 构建基础；生产仍需独立配置连接、密钥、HTTPS和媒体卷。当前环境没有 Docker，容器流程未实测；本机已安装的 PostgreSQL/Redis 流程已验证。
