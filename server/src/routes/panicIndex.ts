import { Router } from "express";
import type { Request, Response } from "express";
import { analyzePanicIndex } from "../services/panicIndexService.js";
import { HeaderUtils } from "coze-coding-dev-sdk";

const router = Router();

// POST /api/v1/panic-index/analyze
// Body: { stockName: string }
router.post("/analyze", async (req: Request, res: Response) => {
  try {
    const { stockName } = req.body;

    if (!stockName || typeof stockName !== "string" || stockName.trim().length === 0) {
      res.status(400).json({
        error: "请提供股票名称",
        code: "INVALID_INPUT",
      });
      return;
    }

    const forwardHeaders = HeaderUtils.extractForwardHeaders(
      req.headers as Record<string, string>
    );

    const result = await analyzePanicIndex(stockName.trim(), forwardHeaders);

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
