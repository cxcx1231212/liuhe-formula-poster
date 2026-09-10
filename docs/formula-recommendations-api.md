# 公式推荐接口

公开地址：`GET /api/formula-recommendations?lotteryType=5`

彩种参数支持 `1`、`5`、`8`。接口按固定顺序为每种公式推荐一条近期连准优先的结果，并返回 `规律一`、`规律二`等卡片名称，可直接渲染为宫格。

仅取一种公式：`GET /api/formula-recommendations?lotteryType=5&formulaType=平特一肖`

主要字段：

- `cardName`：宫格显示名称。
- `typeName`：公式类型。
- `formula`：公式名称。
- `prediction`：当期推荐结果。
- `recentStreak`：当前连续命中期数。
- `recent30Hits`、`recent30Rate`：近30期表现。
- `url`：本站公式详情页。
- `imageUrl`、`thumbnailUrl`：当期公式内容缩略图地址，直接放入 `<img>` 即可；开奖和推荐更新后图片会自动更新。

接口允许跨域 GET 请求，建议调用方每五分钟更新一次。
