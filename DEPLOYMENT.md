# Vercel 部署指南

## 方案一：Vercel 统一部署（推荐）

前后端一起部署到 Vercel，免费额度够用。

### 部署步骤

1. 访问 https://vercel.com/new
2. 导入 GitHub 仓库 `epicmike-gpu/panic-index-app`
3. 配置：
   - **Framework Preset**: Expo
   - **Root Directory**: `.`（根目录）
   - **Build Command**: `cd client && npx expo export --platform web`
   - **Output Directory**: `client/dist`
4. 添加环境变量（从 `.coze` 文件获取）：
   - `COZE_API_KEY`
   - `COZE_API_URL`
   - `COZE_BOT_ID`
5. 点击 **Deploy**

### 环境变量配置

在 Vercel 项目设置 → Environment Variables 中添加：
- `COZE_API_KEY` = (从 .coze 文件获取)
- `COZE_API_URL` = (从 .coze 文件获取)
- `COZE_BOT_ID` = (从 .coze 文件获取)

---

## 方案二：分离部署（前端 Vercel + 后端 Railway）

### 前端部署到 Vercel

```bash
cd client
vercel --prod
```

### 后端部署到 Railway

1. 访问 https://railway.app
2. 连接 GitHub 仓库
3. 选择 `server` 目录作为根目录
4. 自动部署

### 环境变量配置

在 Vercel 项目设置中添加：
```
EXPO_PUBLIC_BACKEND_BASE_URL=https://your-backend-url.railway.app
```

---

## 成本估算

### Vercel 统一部署
- **免费计划**：100GB 带宽/月 + 100 万函数调用/月
- **Pro 计划**：$20/月（无限带宽）

### 分离部署
- **Vercel（前端）**：免费 100GB 带宽/月
- **Railway（后端）**：免费 $5/月额度

### 总成本
- **初期**：免费（用户量少时）
- **增长期**：约 $0-20/月
