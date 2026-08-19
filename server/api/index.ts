import type { VercelRequest, VercelResponse } from "@vercel/node";
import express, { Request, Response } from "express";
import cors from "cors";
import panicIndexRouter from "../src/routes/panicIndex.js";

// 创建 Express app（用于 Vercel）
const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Routes
app.get('/api/v1/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

app.use('/api/v1/panic-index', panicIndexRouter);

// 导出 Vercel handler
export default function handler(req: VercelRequest, res: VercelResponse) {
  return new Promise((resolve) => {
    // 让 Express 处理请求
    app(req as any, res as any, () => {
      resolve(undefined);
    });
  });
}
