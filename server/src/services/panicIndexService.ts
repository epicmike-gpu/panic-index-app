import { SearchClient, Config as SearchConfig, HeaderUtils as SearchHeaderUtils } from "coze-coding-dev-sdk";
import { LLMClient, Config as LLMConfig, HeaderUtils as LLMHeaderUtils } from "coze-coding-dev-sdk";
import { fetchMarketIndicators, calculateMarketPanicScore, type MarketIndicators } from "./marketIndicatorsService";
import { analyzeInstitutionalReports, type InstitutionalAnalysis } from "./institutionalAnalysisService";
import { analyzeFundFlow, type FundFlowAnalysis } from "./fundFlowService";
import { searchCrisisIndicators, type CrisisIndicator } from "./crisisIndicatorService";

export interface PlatformComment {
  platform: string;
  title: string;
  snippet: string;
  url: string;
  publishTime: string;
}

export interface SentimentResult {
  sentiment: "positive" | "neutral" | "negative" | "panic";
  score: number; // 0-100, higher = more panic (retail panic = buy signal)
  summary: string;
  keyPhrases: string[];
  retailSentiment?: string;
  institutionalSentiment?: string;
}

export interface PanicIndexResult {
  stockName: string;
  panicIndex: number; // 0-100
  recommendation: "buy" | "hold" | "sell";
  overallSentiment: string;
  retailSentiment?: string; // 散户情绪描述
  institutionalSentiment?: string; // 机构情绪描述
  fundFlowAnalysis?: FundFlowAnalysis; // 主力资金流向分析
  crisisIndicator?: CrisisIndicator; // 极端恐慌指标（自杀/轻生事件）
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
    queries: ["微博", "讨论 评价", "股票 观点"],
    // 不使用 sites 参数，改用关键词包含"微博"来搜索
    useWeiboKeyword: true,
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
    name: "新浪财经",
    queries: ["股票 讨论 评论", "分析 看法 观点"],
    sites: "sina.com.cn",
  },
  {
    name: "财联社",
    queries: ["股票 分析 评论", "快讯 资讯"],
    sites: "cls.cn",
  },
  {
    name: "华尔街见闻",
    queries: ["股票 分析 评论", "资讯 观点"],
    sites: "wallstreetcn.com",
  },
  {
    name: "证券时报",
    queries: ["股票 分析 评论", "资讯 报道"],
    sites: "stcn.com",
  },
  {
    name: "第一财经",
    queries: ["股票 分析 评论", "资讯 报道"],
    sites: "yicai.com",
  },
  {
    name: "凤凰财经",
    queries: ["股票 讨论 评论", "分析 观点"],
    sites: "finance.ifeng.com",
  },
  {
    name: "网易财经",
    queries: ["股票 讨论 评论", "分析 观点"],
    sites: "money.163.com",
  },
  {
    name: "万得 (Wind)",
    queries: ["股票 分析 评论", "资讯 数据"],
    sites: "wind.com.cn",
  },
  {
    name: "金融界",
    queries: ["股票 讨论 评论", "分析 观点"],
    sites: "jrj.com.cn",
  },
  {
    name: "搜狐财经",
    queries: ["股票 讨论 评论", "分析 观点"],
    sites: "business.sohu.com",
  },
  {
    name: "格隆汇",
    queries: ["股票 分析 评论", "资讯 观点"],
    sites: "gelonghui.com",
  },
  {
    name: "股吧",
    queries: ["讨论 评论 分析", "股票 看法 观点"],
    sites: "guba.eastmoney.com",
  },
];

// 检查日期是否在最近一周内
function isWithinLastWeek(snippet: string): boolean {
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  // 从 snippet 中提取日期
  const dateMatch = snippet.match(/(\d{4}-\d{2}-\d{2})/);
  if (!dateMatch) return true; // 如果没有日期，保留该结果
  
  const itemDate = new Date(dateMatch[1]);
  return itemDate >= oneWeekAgo;
}

async function searchPlatformComments(
  stockName: string,
  platform: typeof PLATFORMS[number],
  _customHeaders?: Record<string, string>
): Promise<PlatformComment[]> {
  const config = new SearchConfig();
  // 不传递 customHeaders，避免 headers 问题导致搜索失败
  const client = new SearchClient(config);

  const allComments: PlatformComment[] = [];
  const seenUrls = new Set<string>();

  try {
    // 对每个平台用不同关键词搜索，使用串行方式避免并发问题
    for (const querySuffix of platform.queries) {
      const query = `${stockName} ${querySuffix}`;
      const options: Parameters<typeof client.advancedSearch>[1] = {
        count: 15,
        needSummary: false,
        timeRange: "7d",
      };
      // 金融平台使用 sites 限定域名搜索
      if (platform.sites) {
        options.sites = platform.sites;
      }
      
      try {
        const response = await client.advancedSearch(query, options);
        
        if (!response.web_items || response.web_items.length === 0) continue;

        for (const item of response.web_items) {
          // 按 URL 去重
          if (item.url && seenUrls.has(item.url)) continue;
          if (item.url) seenUrls.add(item.url);

          // 过滤非最近一周的内容
          const snippet = item.snippet || "";
          if (!isWithinLastWeek(snippet)) continue;

          // 微博平台需要过滤非微博的结果
          if (platform.useWeiboKeyword) {
            const url = item.url || "";
            const title = item.title || "";
            const isWeibo =
              url.includes("weibo.com") ||
              url.includes("weibo.cn") ||
              title.includes("微博") ||
              snippet.includes("微博");
            if (!isWeibo) continue;
          }

          allComments.push({
            platform: platform.name,
            title: item.title || "",
            snippet: item.snippet || "",
            url: item.url || "",
            publishTime: item.publish_time || "",
          });
        }
      } catch (searchError) {
        console.error(`Search error for query "${query}":`, searchError);
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

  const systemPrompt = `你是一个专业的股票市场情绪分析师。你需要分析来自多个社交平台的股票评论，判断市场情绪。

**核心逻辑（逆向投资）：**
- 散户（普通用户）的消极、绝望、愤怒、骂人评论 → 恐慌信号 → 建议买入
- 机构/券商/专家的积极评论 → 过热信号 → 建议卖出

**评论来源分类：**
- 散户平台：微博、雪球、东方财富股吧、同花顺、腾讯自选股（这些平台的普通用户评论代表散户情绪）
- 机构来源：券商研报、金融机构报告、专家分析（这些代表机构观点）

请严格按以下JSON格式返回分析结果，不要包含其他内容：
{
  "sentiment": "positive|neutral|negative|panic",
  "score": 0-100的恐慌分数(0=机构极度乐观/散户狂热, 100=散户极度恐慌/绝望),
  "summary": "50字以内的情绪总结",
  "keyPhrases": ["关键词1", "关键词2", "关键词3"],
  "retailSentiment": "散户情绪描述",
  "institutionalSentiment": "机构情绪描述"
}

**评分标准（逆向投资逻辑）：**
- 0-25: 机构极度乐观 + 散户狂热追涨 → 市场过热 → sentiment: "positive" → 建议卖出
- 26-50: 机构看好 + 散户积极 → 市场偏热 → sentiment: "neutral" → 建议谨慎
- 51-75: 机构中性 + 散户消极 → 市场偏冷 → sentiment: "negative" → 观望
- 76-100: 机构谨慎 + 散户恐慌绝望骂人 → 市场超卖 → sentiment: "panic" → 建议买入`;

  const userPrompt = `请分析以下关于"${stockName}"的全网评论数据，判断市场情绪：

${commentsText}

请严格按照JSON格式返回分析结果，包含散户情绪和机构情绪的描述。`;

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
        retailSentiment: parsed.retailSentiment || "",
        institutionalSentiment: parsed.institutionalSentiment || "",
      };
    }

    return {
      sentiment: "neutral",
      score: 50,
      summary: "情绪分析结果解析失败",
      keyPhrases: [],
      retailSentiment: "",
      institutionalSentiment: "",
    };
  } catch (error) {
    console.error("Sentiment analysis error:", error);
    return {
      sentiment: "neutral",
      score: 50,
      summary: "情绪分析服务暂时不可用",
      keyPhrases: [],
      retailSentiment: "",
      institutionalSentiment: "",
    };
  }
}

function getRecommendation(panicScore: number): "buy" | "hold" | "sell" {
  // 逆向投资逻辑：
  // 散户恐慌绝望（高分）→ 买入信号
  // 机构乐观+散户狂热（低分）→ 卖出信号
  if (panicScore >= 70) return "buy"; // 散户极度恐慌 → 买入
  if (panicScore <= 30) return "sell"; // 机构乐观+散户狂热 → 卖出
  return "hold"; // 中性 → 持有
}

function getOverallSentimentLabel(panicScore: number): string {
  // 逆向投资逻辑标签
  if (panicScore >= 76) return "散户恐慌绝望（买入信号）";
  if (panicScore >= 51) return "散户消极悲观";
  if (panicScore >= 26) return "市场中性观望";
  return "机构乐观+散户狂热（卖出信号）";
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

  // Step 5.5: Analyze fund flow (主力动向)
  const fundFlowAnalysis = await analyzeFundFlow(stockName, stockCode);

  // Step 6: Calculate combined panic index (50% sentiment + 15% market + 15% institutional + 20% fund flow)
  const sentimentScore = sentimentResult.score;
  const marketScore = calculateMarketPanicScore(marketIndicators);
  const institutionalScore = institutionalAnalysis.institutionalSentimentScore;
  
  // 主力资金流向评分：主力流出 = 恐慌信号（高分），主力流入 = 过热信号（低分）
  let fundFlowScore = 50; // 默认中性
  if (fundFlowAnalysis.netFlow === "outflow") {
    // 主力流出 = 散户恐慌 = 买入信号 = 高恐慌指数
    fundFlowScore = 70 + Math.min(fundFlowAnalysis.outflowCount * 10, 30);
  } else if (fundFlowAnalysis.netFlow === "inflow") {
    // 主力流入 = 市场过热 = 卖出信号 = 低恐慌指数
    fundFlowScore = 30 - Math.min(fundFlowAnalysis.inflowCount * 10, 20);
  }

  // Step 5.5: Search crisis indicators (suicide/extreme panic events)
  const crisisIndicator = await searchCrisisIndicators(stockName);
  
  // Crisis indicator score: more crisis events = higher panic
  let crisisScore = 50; // 默认中性
  if (crisisIndicator.crisisLevel === "extreme") {
    crisisScore = 95;
  } else if (crisisIndicator.crisisLevel === "high") {
    crisisScore = 80;
  } else if (crisisIndicator.crisisLevel === "medium") {
    crisisScore = 65;
  } else {
    crisisScore = 30; // 低危机 = 市场正常
  }
  
  const panicIndex = Math.round(
    sentimentScore * 0.45 + marketScore * 0.15 + institutionalScore * 0.15 + fundFlowScore * 0.2 + crisisScore * 0.05
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
    retailSentiment: sentimentResult.retailSentiment || "",
    institutionalSentiment: sentimentResult.institutionalSentiment || "",
    fundFlowAnalysis,
    crisisIndicator,
    platformData,
    marketIndicators,
    institutionalAnalysis,
    analysisSummary: `${sentimentResult.summary} | 机构观点：${institutionalAnalysis.summary} | 主力动向：${fundFlowAnalysis.analysis}`,
    analyzedAt: new Date().toISOString(),
  };
}
