# 公式站入口与 123 六合网调用

## 发布前

1. 在 `liuhe-formula-poster` Worker 中设置随机生成的 `ENTRY_FIXED_KEY` Secret。不要写进仓库、公开页面或 123 六合网的代码。`wrangler secret put ENTRY_FIXED_KEY --config wrangler-cache.jsonc` 会立即产生一次 Worker 部署，须在约定的发布窗口执行；CI 会先检查该 Secret 是否存在，缺失时提前停止耗时构建。
2. 先部署公式站后端和入口 Worker。后端生成的 `dist/server/wrangler.json` 必须经 `scripts/private_backend_config.mjs` 设置 `workers_dev:false` 与 `preview_urls:false`，并确认后端没有其他公开路由。
3. 再部署 123 六合网 Worker。其 `FORMULA_SITE` 绑定指向公式站的 `FormulaInternalApi` 命名入口，不再回退到公开网址。
4. 两边都发布后再测试，不要只发布其中一边。

## 访问规则

- `/` 无 `t`：普通网址导航；正确的 `/?t=固定密钥`：外层 iframe。
- `/index.html?t=一次性凭证`：凭证绑定会话和域名、两分钟有效、只能核销一次；无凭证或重复使用均 403。
- 后续页面、静态资源及普通 API：需要已激活的 HttpOnly 会话 Cookie。
- 业务 HTML 正文及 JSON / RSC 响应在入口 Worker 用每会话密钥和随机 IV 作 AES-256-GCM 加密；页面壳及浏览器 fetch 解密后显示。`/_entry/key` 只向已激活会话提供会话解密密钥。浏览器可解密不代表内容不可复制，不能取代服务端校验。
- `/_entry/home`：已激活会话领取新一次性凭证后回首页。
- 123 六合网卡片：先访问它自己的 `/api/public/formula-open`，后台领取短时一次性跳转票；公式站 `/open` 核销后建立独立会话。
- 推荐数据和缩略图：123 六合网后台通过命名服务绑定获取，访客浏览器不直接请求公式站 API。
- 缩略图优先使用发布时生成的精简算法索引；旧索引缺预测字段时才回查完整清单。需要进帖子计算的类别显示“请点开帖子查看当期推算”，不误称“待更新”。

123 六合网向所有访客展示的推荐内容仍可被访客看到；入口校验不等于禁止复制已公开展示的内容。

## 验证

运行 `node --test scripts/test_entry_gate.mjs scripts/test_content_crypto.mjs`，再逐项检查入口四种参数情况、并发核销、Cookie-only 内层访问、返回首页、AES-GCM HTML/JSON/RSC 解密、123 推荐数据与缩略图、卡片跳转、直接访问公式站 API 和后端 workers.dev 均符合预期。未完成这些线上验证前不要宣称部署完成。
