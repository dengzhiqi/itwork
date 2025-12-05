# ItWork 办公用品管理系统 - 部署指南

本指南将指导您如何将 ItWork 系统部署到 Cloudflare Pages，并配置免费的 D1 数据库。

**注意：** 如果 Cloudflare 页面改版导致不知如何操作，请直接跳到 **方法二：命令行部署 (CLI)**。

## 方法一：通过 Dashboard 部署 (Web UI)

### 第一步：推送到 GitHub (Push to GitHub)

确保您当前的代码已经全部提交并推送到 GitHub 仓库：
`https://github.com/dengzhiqi/itwork`

如果您还没有推送，请在终端执行：
```bash
git add .
git commit -m "Initial commit"
git push
```

## 第二步：创建 Cloudflare Pages 项目

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)。
2. 进入 **Compute (Workers & Pages)**。
3. 点击 **Create Application** (创建应用)。
4. 选择 **Pages** 标签，点击 **Connect to Git**。
5. 选择您的 GitHub 账号和 `itwork` 仓库。
6. **配置构建设置 (Build Settings)**:
    - **Project Name**: `itwork` (或您喜欢的名字)
    - **Framework Preset**: 选择 `Remix`
    - **Build Command**: `npm run build`
    - **Build Output Directory**: `build/client`
7. 点击 **Save and Deploy**。
   *(注意：第一次部署可能会因为缺少数据库绑定而报错，这是正常的，请继续下一步)*

### 第三步：配置 D1 数据库 (Database)

我们需要创建一个 D1 数据库并将其连接到应用。

1. 在 Cloudflare Dashboard 左侧菜单，根据您的界面版本，找到 **Storage & Databases** -> **D1**。
2. 点击 **Create** 创建一个新数据库，命名为 `itwork-db`。
3. 创建成功后，返回 **Workers & Pages** -> 点击您的 `itwork` 项目。
4. 进入 **Settings** (设置) -> **Functions** (函数)。
5. 向下滚动找到 **D1 Database Bindings**。
6. 点击 **Add binding**：
    - **Variable name**: `DB` (必须完全一致，大写)
    - **D1 database**: 选择刚才创建的 `itwork-db`
7. 点击 **Save**。

### 第四步：配置 R2 存储 (可选 Setup R2)

如果您将来需要上传图片，可以配置 R2。目前系统已预留支持。

1. 在 Dashboard 左侧找到 **R2** -> **Create Bucket** -> 命名为 `itwork-bucket`。
2. 回到 `itwork` 项目 -> **Settings** -> **Functions** -> **R2 Bucket Bindings**。
3. 添加绑定：
    - **Variable name**: `BUCKET`
    - **R2 bucket**: 选择 `itwork-bucket`
4. 保存。

### 第五步：设置登录账号 (Environment Variables)

1. 在 `itwork` 项目页面，点击 **Settings** -> **Environment Variables**。
2. 点击 **Add variable**，添加以下两个变量（用于后台登录）：
    - `ADMIN_USER`: 设置您的用户名 (例如: `admin`)
    - `ADMIN_PASSWORD`: 设置您的密码 (例如: `123456`)
3. 保存。

### 第六步：初始化数据库表结构 (Initialize Schema)

这是最重要的一步。我们需要在 Cloudflare 上创建表。

1. 在本地打开 `schema.sql` 文件，**复制所有内容**。
2. 回到 Cloudflare Dashboard -> **Storage & Databases** -> **D1**。
3. 点击您的 `itwork-db`。
4. 点击 **Console** (控制台) 标签页。
5. 在输入框中**粘贴** `schema.sql` 的内容。
6. 点击 **Execute** (执行)。
   *(您应该能看到 "Success" 提示，这就表示表创建好了)*

### 第七步：重新部署 (Redeploy)

因为我们修改了设置（绑定了数据库和环境变量），需要重新部署才能生效。

1. 回到 **Workers & Pages** -> `itwork` 项目。
2. 点击 **Deployments** (部署记录) 标签。
3. 在最新的部署记录右侧，点击 **三个点** -> **Retry deployment** (重试部署)。
4. 等待构建完成，点击生成的 URL 即可访问！

---

## 方法二：命令行部署 (CLI) - 推荐！

如果 Web 界面操作困难，使用命令行是最快的方式。

### 1. 登录 Cloudflare
在 VSCode 终端运行：
```bash
npx wrangler login
```
(会弹跳出浏览器，请授权登录)

### 2. 创建并部署
直接运行：
```bash
npm run build
npx wrangler pages deploy ./build/client --project-name itwork
```
- 如果提示 `Create a new Pages project?`，输入 `y` 确认。
- **Production branch**: 输入 `main`。

### 3. 配置数据库 (绑定 D1)
部署成功后，我们需要在本地命令行绑定数据库到远程项目：

*(这步建议还是去 Dashboard 操作更直观，参考 **方法一的第三步和第五步**)*

但是，如果您想纯用命令行：

1. **创建远程数据库**:
   ```bash
   npx wrangler d1 create itwork-db
   ```
   *(记下返回的 `database_id`，替换下面 `wrangler.toml` 中的 ID)*

2. **修改 `wrangler.toml`**:
   取消注释并填入 ID：
   ```toml
   [[d1_databases]]
   binding = "DB"
   database_name = "itwork-db"
   database_id = "您刚才获取的ID"
   ```

3. **重新部署**:
   ```bash
   npx wrangler pages deploy ./build/client --project-name itwork
   ```
   *(这次它会自动读取 `wrangler.toml` 的配置)*

4. **初始化表结构**:
   ```bash
   npx wrangler d1 execute itwork-db --remote --file=./schema.sql
   ```

5. **设置密码**:
   ```bash
   npx wrangler pages project env add itwork production ADMINISTRATIVE_USER=admin
   npx wrangler pages project env add itwork production ADMINISTRATIVE_PASSWORD=your_password
   ```

---

## 常见问题

- **报错 "No such table: categories"**: 说明第六步数据库初始化没成功，请去 D1 Console 重新执行 SQL。
- **登录失败**: 检查第五步的环境变量是否设置正确，并且**必须重新部署**后才会生效。
