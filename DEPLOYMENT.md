# Vercel 部署指南

## 快速部署步骤

### 1. 前端部署 (Expo Web)

```bash
# 进入 client 目录
cd client

# 安装 Vercel CLI (如果还没有)
npm i -g vercel

# 登录 Vercel
vercel login

# 部署
vercel

# 部署到生产环境
vercel --prod
```

### 2. 后端部署

**选项 A：使用 Railway (推荐，最简单)**
1. 访问 https://railway.app
2. 连接 GitHub 仓库
3. 选择 `server` 目录作为根目录
4. 自动部署

**选项 B：使用 Render**
1. 访问 https://render.com
2. 创建 Web Service
3. 设置 Build Command: `cd server && pnpm install`
4. 设置 Start Command: `cd server && pnpm start`

**选项 C：Vercel Serverless Functions**
需要将 Express 改为 Vercel 函数格式（较复杂，不推荐）

### 3. 环境变量配置

在 Vercel 项目设置中添加：
```
EXPO_PUBLIC_BACKEND_BASE_URL=https://your-backend-url.railway.app
```

### 4. 域名配置

- Vercel 自动提供 `.vercel.app` 域名
- 可以绑定自定义域名

### 5. 注意事项

- 首次部署可能需要 5-10 分钟
- 确保 `server/src/index.ts` 中的端口使用 `process.env.PORT`
- 前端需要知道后端 URL（通过环境变量）

## 成本估算

| 服务 | 免费额度 | 超出后费用 |
|------|---------|-----------|
| Vercel (前端) | 100GB 带宽/月 | $20/月 |
| Railway (后端) | $5 免费额度/月 | 按使用量 |
| 总计 | 足够初期使用 | 约 $20-40/月 |

## 上线前检查清单

- [ ] 添加免责声明
- [ ] 添加隐私政策
- [ ] 配置环境变量
- [ ] 测试所有功能
- [ ] 检查移动端适配
