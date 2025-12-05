# 办公用品耗材管理系统 (IT Work)

这是一个轻量级的耗材与配件管理系统，专为 IT 运维或行政人员设计。

## 技术栈
- **前端**: React + Vite + Tailwind CSS (部署在 Cloudflare Pages)
- **后端**: Cloudflare Workers (Hono 框架)
- **数据库**: Cloudflare D1 (Serverless SQLite)
- **存储**: Cloudflare R2 (图片/附件存储)

## 🚀 快速开始 (本地开发)

1. **安装依赖**
   ```bash
   # 后端
   cd backend
   npm install

   # 前端
   cd ../frontend
   npm install
   ```

2. **本地启动后端**
   ```bash
   cd backend
   npm run dev
   # 服务将运行在 http://127.0.0.1:8787
   ```

3. **本地启动前端**
   ```bash
   cd frontend
   npm run dev
   # 打开浏览器访问 http://localhost:5173
   # 默认登录账号: admin / password (可在 backend/src/index.ts 或 wrangler.toml 中修改)
   ```

## ☁️ 部署到 Cloudflare

你需要一个 Cloudflare 账号并安装 Wrangler CLI。

### 1. 初始化资源
在终端中执行（确保已登录 `npx wrangler login`）：

```bash
# 创建 D1 数据库
npx wrangler d1 create itwork-db

# 创建 R2 存储桶
npx wrangler r2 bucket create itwork-assets
```

**重要**: 执行上述命令后，你会得到一个 `database_id`。请打开 `backend/wrangler.toml`，将 `database_id` 替换为你生成的真实 ID。

### 2. 初始化数据库表结构
```bash
cd backend
npx wrangler d1 execute itwork-db --file=./schema.sql --remote
```

### 3. 部署后端 API
```bash
cd backend
npm run deploy
```
部署成功后，你会获得一个 URL (例如 `https://itwork-backend.your-name.workers.dev`)。

### 4. 部署前端
1. 修改前端配置：
   打开 `frontend/vite.config.ts` 或代码中的 API 地址配置。**注意**：在生产环境 Cloudflare Pages 中，你需要将前端请求指向你的 Worker 地址。
   
   *更简单的做法*：在 Cloudflare Dashboard 中，将 Worker 绑定到 Pages 的路由，或者直接在前端代码中将 API Base URL 设置为你的 Worker URL (修改 `frontend/src/api.ts` 中的 fetch URL，或者使用 Pages Functions 转发)。
   
   为简单起见，建议部署后，在 Cloudflare 后台为 Worker 设置一个自定义域名（如 `api.itwork.com`），然后在前端代码中硬编码这个地址，或者使用 Cloudflare 的路由功能。

2. 构建并部署：
```bash
cd frontend
npm run build
npx wrangler pages deploy dist --project-name=itwork-ui
```

### 5. 设置账号密码
登录 Cloudflare Dashboard -> Workers & Pages -> itwork-backend -> Settings -> Variables:
添加环境变量：
- `ADMIN_USER`: 设置你的用户名
- `ADMIN_PASSWORD`: 设置你的密码

## 功能说明
- **分类管理**: 自定义耗材分类（打印耗材、办公文具等）。
- **物品管理**: 记录品牌、型号、单价、供应商、库存图片。
- **出入库**: 记录领用人、部门、时间，库存自动扣减。
- **R2 图片**: 上传物品图片自动存入 Cloudflare R2。
