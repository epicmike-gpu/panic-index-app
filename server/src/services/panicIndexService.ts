import { SearchClient, Config as SearchConfig, HeaderUtils as SearchHeaderUtils } from "coze-coding-dev-sdk";
import { LLMClient, Config as LLMConfig, HeaderUtils as LLMHeaderUtils } from "coze-coding-dev-sdk";
import { fetchMarketIndicators, calculateMarketPanicScore, type MarketIndicators } from "./marketIndicatorsService";
import { analyzeInstitutionalReports, type InstitutionalAnalysis } from "./institutionalAnalysisService";

export interface PlatformComment {
  platform: string;
  title: string;
  snippet: string;
  url: string;
  publishTime: string;
}

export interface SentimentResult {
  sentiment: "positive" | "neutral" | "negative" | "panic";
  score: number; // 0-100, higher = more panic
  summary: string;
  keyPhrases: string[];
}

export interface PanicIndexResult {
  stockName: string;
  panicIndex: number; // 0-100
  recommendation: "buy" | "hold" | "sell";
  overallSentiment: string;
  platformData: {
    platform: string;
    commentCount: number;
    sentiment: string;
    hotComments: PlatformComment[];
  }[];
  marketIndicators: MarketIndicators;
  institutionalAnalysis: InstitutionalAnalysis;
  analysisSummary: string;
  analyzedAt: string;
}

const PLATFORMS = [
  {
    name: "微博",
    queries: ["讨论 评价 看法", "股票 走势 观点"],
    sites: "weibo.com",
  },
  {
    name: "小红书",
    queries: ["评论 分析 投资", "股票 观点 讨论"],
    sites: "xiaohongshu.com",
  },
  {
    name: "雪球",
    queries: ["讨论 分析 观点", "股票 看法 走势"],
    sites: "xueqiu.com",
  },
  {
    name: "东方财富",
    queries: ["股吧 讨论 评论", "股票 分析 看法"],
    sites: "eastmoney.com",
  },
  {
    name: "同花顺",
    queries: ["讨论 评价 走势", "股票 分析 观点"],
    sites: "10jqka.com.cn",
  },
  {
    name: "腾讯自选股",
    queries: ["讨论 评论 分析", "股票 看法 观点"],
    sites: "qq.com",
  },
  {
    name: "抖音",
    queries: ["股票 分析 评论", "投资 讨论 观点"],
    sites: "douyin.com",
  },
];

async function searchPlatformComments(
  stockName: string,
  platform: typeof PLATFORMS[number],
  customHeaders?: Record<string, string>
): Promise<PlatformComment[]> {
  const config = new SearchConfig();
  const client = new SearchClient(config, customHeaders);

  const allComments: PlatformComment[] = [];
  const seenUrls = new Set<string>();

  try {
    // 对每个平台用不同关键词搜索多次，合并去重
    const searchPromises = platform.queries.map((querySuffix) => {
      const query = `${stockName} ${querySuffix}`;
      const options: Parameters<typeof client.advancedSearch>[1] = {
        count: 15,
        needSummary: false,
        timeRange: "1m",
      };
      // 金融平台使用 sites 限定域名搜索
      if (platform.sites) {
        options.sites = platform.sites;
      }
      return client.advancedSearch(query, options);
    });

    const results = await Promise.all(searchPromises);

    for (const response of results) {
      if (!response.web_items || response.web_items.length === 0) continue;

      for (const item of response.web_items) {
        // 按 URL 去重
        if (item.url && seenUrls.has(item.url)) continue;
        if (item.url) seenUrls.add(item.url);

        allComments.push({
          platform: platform.name,
          title: item.title || "",
          snippet: item.snippet || "",
          url: item.url || "",
          publishTime: item.publish_time || "",
        });
      }
    }
  } catch (error) {
    console.error(`Search error for ${platform.name}:`, error);
  }

  return allComments;
}

async function analyzeSentiment(
  stockName: string,
  allComments: PlatformComment[],
  customHeaders?: Record<string, string>
): Promise<SentimentResult> {
  const config = new LLMConfig();
  const client = new LLMClient(config, customHeaders);

  const commentsText = allComments
    .map(
      (c, i) =>
        `[${i + 1}][${c.platform}] ${c.title}: ${c.snippet}`
    )
    .join("\n");

  const systemPrompt = `你是一个专业的股票市场情绪分析师。你需要分析来自多个社交平台（微博、小红书、雪球）的股票评论，判断市场情绪。

请严格按以下JSON格式返回分析结果，不要包含其他内容：
{
  "sentiment": "positive|neutral|negative|panic",
  "score": 0-100的恐慌分数(0=极度乐观, 100=极度恐慌),
  "summary": "50字以内的情绪总结",
  "keyPhrases": ["关键词1", "关键词2", "关键词3"]
}

评分标准：
- 0-25: 积极乐观（评论多为看好、利好、上涨预期）→ sentiment: "positive"
- 26-50: 中性观望（评论分歧较大，有看多有看空）→ sentiment: "neutral"
- 51-75: 消极悲观（评论多为看跌、利空、亏损）→ sentiment: "negative"
- 76-100: 恐慌绝望（评论多为割肉、崩盘、暴跌、绝望）→ sentiment: "panic"`;

  const userPrompt = `请分析以下关于"${stockName}"的全网评论数据，判断市场情绪：

${commentsText}

请严格按照JSON格式返回分析结果。`;

  try {
    const response = await client.invoke(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      { model: "doubao-seed-2-0-mini-260215", temperature: 0.3 }
    );

    const content = response.content.trim();
    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        sentiment: parsed.sentiment || "neutral",
        score: Math.min(100, Math.max(0, parsed.score || 50)),
        summary: parsed.summary || "情绪分析完成",
        keyPhrases: parsed.keyPhrases || [],
      };
    }

    return {
      sentiment: "neutral",
      score: 50,
      summary: "情绪分析结果解析失败",
      keyPhrases: [],
    };
  } catch (error) {
    console.error("Sentiment analysis error:", error);
    return {
      sentiment: "neutral",
      score: 50,
      summary: "情绪分析服务暂时不可用",
      keyPhrases: [],
    };
  }
}

function getRecommendation(panicScore: number): "buy" | "hold" | "sell" {
  if (panicScore >= 65) return "buy"; // 恐慌时买入（逆向投资）
  if (panicScore <= 35) return "sell"; // 乐观时卖出
  return "hold"; // 中性时持有
}

function getOverallSentimentLabel(panicScore: number): string {
  if (panicScore >= 76) return "极度恐慌";
  if (panicScore >= 51) return "消极悲观";
  if (panicScore >= 26) return "中性观望";
  return "积极乐观";
}

export async function analyzePanicIndex(
  stockName: string,
  stockCode?: string,
  market?: number,
  forwardHeaders?: Record<string, string>
): Promise<PanicIndexResult> {
  // Step 1: Search comments from all platforms in parallel
  const searchPromises = PLATFORMS.map((platform) =>
    searchPlatformComments(stockName, platform, forwardHeaders)
  );
  const platformResults = await Promise.all(searchPromises);

  // Step 2: Collect all comments
  const allComments: PlatformComment[] = [];
  const platformData = PLATFORMS.map((platform, index) => {
    const comments = platformResults[index];
    allComments.push(...comments);
    return {
      platform: platform.name,
      commentCount: comments.length,
      sentiment: "",
      hotComments: comments.slice(0, 8),
    };
  });

  // Step 3: Analyze sentiment using LLM
  const sentimentResult = await analyzeSentiment(
    stockName,
    allComments,
    forwardHeaders
  );

  // Step 4: Fetch market indicators if stock code is provided
  let marketIndicators: MarketIndicators = {
    marginBalance: { value: "暂无数据", change: "0%", trend: "stable" },
    volume: { value: "暂无数据", turnoverRate: "暂无数据", trend: "stable" },
    limitUpDown: { upCount: 0, downCount: 0, ratio: "暂无数据" },
    newAccounts: { value: "暂无数据", period: "近期", yoyChange: "0" },
    socialHeat: { score: 0, trend: "stable" },
  };

  if (stockCode && market !== undefined) {
    marketIndicators = await fetchMarketIndicators(
      stockName,
      stockCode,
      market,
      allComments.length,
      forwardHeaders
    );
  }

  // Step 5: Analyze institutional reports
  const institutionalAnalysis = await analyzeInstitutionalReports(
    stockName,
    stockCode,
    forwardHeaders
  );

  // Step 6: Calculate combined panic index (60% sentiment + 20% market + 20% institutional)
  const sentimentScore = sentimentResult.score;
  const marketScore = calculateMarketPanicScore(marketIndicators);
  const institutionalScore = institutionalAnalysis.institutionalSentimentScore;
  const panicIndex = Math.round(
    sentimentScore * 0.6 + marketScore * 0.2 + institutionalScore * 0.2
  );

  const recommendation = getRecommendation(panicIndex);

  // Step 6: Assign sentiment to each platform based on overall analysis
  platformData.forEach((pd) => {
    if (pd.commentCount === 0) {
      pd.sentiment = "暂无数据";
    } else {
      pd.sentiment = sentimentResult.summary;
    }
  });

  return {
    stockName,
    panicIndex,
    recommendation,
    overallSentiment: getOverallSentimentLabel(panicIndex),
    platformData,
    marketIndicators,
    institutionalAnalysis,
    analysisSummary: `${sentimentResult.summary} | 机构观点：${institutionalAnalysis.summary}`,
    analyzedAt: new Date().toISOString(),
  };
}
