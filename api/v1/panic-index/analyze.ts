// Vercel Serverless Function: POST /api/v1/panic-index/analyze
import { analyzePanicIndex } from "../../../server/src/services/panicIndexService.js";
import { getStockNameByCode, isStockCode } from "../../../server/src/services/stockLookupService.js";

// 允许最长执行时间（Vercel Hobby 最高 60s）
export const maxDuration = 60;

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).json({});
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  try {
    let { stockName, stockCode, market } = req.body || {};

    // 如果输入的是股票代码，自动转换为股票名称
    if (isStockCode(stockName)) {
      stockCode = stockName;
      market = stockName.startsWith('6') ? 1 : 0;
      stockName = await getStockNameByCode(stockCode, market);

      if (!stockName) {
        res.status(400).json({ error: "无法识别该股票代码", code: "INVALID_STOCK_CODE" });
        return;
      }
    }

    if (!stockName || typeof stockName !== "string" || stockName.trim().length === 0) {
      res.status(400).json({ error: "请提供股票名称或代码", code: "INVALID_INPUT" });
      return;
    }

    // 提取转发 headers
    const forwardHeaders: Record<string, string> = {};
    const headersToForward = ['x-request-id', 'x-trace-id', 'authorization'];
    for (const key of headersToForward) {
      const value = req.headers?.[key];
      if (value && typeof value === 'string') {
        forwardHeaders[key] = value;
      }
    }

    const result = await analyzePanicIndex(stockName.trim(), stockCode, market, forwardHeaders);
    res.status(200).json(result);
  } catch (error) {
    console.error("Panic index analysis error:", error);
    res.status(500).json({ error: "分析服务暂时不可用，请稍后重试", code: "ANALYSIS_ERROR" });
  }
}
