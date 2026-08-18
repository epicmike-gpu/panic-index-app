import { Router } from "express";
import type { Request, Response } from "express";
import { analyzePanicIndex } from "../services/panicIndexService.js";
import { getStockNameByCode, isStockCode } from "../services/stockLookupService.js";
import { HeaderUtils } from "coze-coding-dev-sdk";

const router = Router();

// POST /api/v1/panic-index/analyze
// Body: { stockName: string, stockCode?: string, market?: number }
router.post("/analyze", async (req: Request, res: Response) => {
  try {
    let { stockName, stockCode, market } = req.body;

    // 如果输入的是股票代码，自动转换为股票名称
    if (isStockCode(stockName)) {
      stockCode = stockName;
      // 根据股票代码判断市场：6 开头为上海 (1)，其他为深圳 (0)
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

    const forwardHeaders = HeaderUtils.extractForwardHeaders(
      req.headers as Record<string, string>
    );

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
});

export default router;
