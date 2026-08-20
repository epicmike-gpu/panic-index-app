// Vercel Serverless Function - 纯 Node.js 实现，不依赖 Express
import { analyzePanicIndex } from "../server/src/services/panicIndexService.js";
import { getStockNameByCode, isStockCode } from "../server/src/services/stockLookupService.js";
import { getTopTurnoverStocks } from "../server/src/services/hotStocksService.js";

// 类型定义（不依赖 @vercel/node）
interface VercelRequest {
  method?: string;
  url?: string;
  query: Record<string, string | string[]>;
  body?: any;
  headers: Record<string, string | string[] | undefined>;
}

interface VercelResponse {
  status: (code: number) => VercelResponse;
  json: (data: any) => void;
  setHeader: (key: string, value: string) => void;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).json({});
    return;
  }

  const url = req.url || '';

  // Health check
  if (url.includes('/api/v1/health') || url === '/api') {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
    return;
  }

  // Hot stocks: GET /api/v1/panic-index/hot-stocks
  if (url.includes('/hot-stocks') && req.method === 'GET') {
    try {
      const countParam = req.query.count;
      const count = parseInt(Array.isArray(countParam) ? countParam[0] : countParam || '9') || 9;
      const stocks = await getTopTurnoverStocks(count);
      res.status(200).json({ success: true, data: stocks });
    } catch (error) {
      console.error("获取热门股票失败:", error);
      res.status(500).json({ success: false, error: "获取热门股票失败" });
    }
    return;
  }

  // Analyze: POST /api/v1/panic-index/analyze
  if (url.includes('/analyze') && req.method === 'POST') {
    try {
      let { stockName, stockCode, market } = req.body || {};

      // 如果输入的是股票代码，自动转换为股票名称
      if (isStockCode(stockName)) {
        stockCode = stockName;
        market = stockName.startsWith('6') ? 1 : 0;
        stockName = await getStockNameByCode(stockCode, market);
        
        if (!stockName) {
          res.status(400).json({
            error: "无法识别该股票代码",
            code: "INVALID_STOCK_CODE",
          });
          return;
        }
      }

      if (!stockName || typeof stockName !== "string" || stockName.trim().length === 0) {
        res.status(400).json({
          error: "请提供股票名称或代码",
          code: "INVALID_INPUT",
        });
        return;
      }

      // 提取转发 headers
      const forwardHeaders: Record<string, string> = {};
      const headersToForward = ['x-request-id', 'x-trace-id', 'authorization'];
      for (const key of headersToForward) {
        const value = req.headers[key];
        if (value && typeof value === 'string') {
          forwardHeaders[key] = value;
        }
      }

      const result = await analyzePanicIndex(
        stockName.trim(),
        stockCode,
        market,
        forwardHeaders
      );

      res.status(200).json(result);
    } catch (error) {
      console.error("Panic index analysis error:", error);
      res.status(500).json({
        error: "分析服务暂时不可用，请稍后重试",
        code: "ANALYSIS_ERROR",
      });
    }
    return;
  }

  // 404
  res.status(404).json({ error: "Not Found", url });
}
