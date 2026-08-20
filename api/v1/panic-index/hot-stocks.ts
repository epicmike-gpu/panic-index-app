// Vercel Serverless Function: GET /api/v1/panic-index/hot-stocks
import { getTopTurnoverStocks } from "../../../server/src/services/hotStocksService.js";

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).json({});
    return;
  }

  try {
    const countParam = req.query?.count;
    const count = parseInt(Array.isArray(countParam) ? countParam[0] : countParam || '9') || 9;
    const stocks = await getTopTurnoverStocks(count);
    res.status(200).json({ success: true, data: stocks });
  } catch (error) {
    console.error("获取热门股票失败:", error);
    res.status(500).json({ success: false, error: "获取热门股票失败" });
  }
}
