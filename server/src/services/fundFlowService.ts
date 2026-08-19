import { SearchClient, Config } from "coze-coding-dev-sdk";
import { LLMClient, Config as LLMConfig } from "coze-coding-dev-sdk";

const config = new Config();
const searchClient = new SearchClient(config);
const llmConfig = new LLMConfig();
const llmClient = new LLMClient(llmConfig);

export interface FundFlowData {
  platform: string;
  title: string;
  snippet: string;
  url: string;
  publishTime: string;
  fundFlow: "inflow" | "outflow" | "neutral";
  amount: string;
}

export interface FundFlowAnalysis {
  totalArticles: number;
  inflowCount: number;
  outflowCount: number;
  neutralCount: number;
  netFlow: "inflow" | "outflow" | "neutral";
  analysis: string;
  articles: FundFlowData[];
}

/**
 * 搜索主力资金流向资讯
 * 来源：腾讯自选股（智选洞察）、新浪财经、证券之星等
 */
export async function searchFundFlowArticles(
  stockName: string,
  stockCode?: string
): Promise<FundFlowData[]> {
  const searchQueries = [
    `${stockName} 主力资金 净流出 净流入`,
    `${stockName} 智选洞察 主力资金`,
    `${stockName} 资金流向 主力`,
  ];

  const allResults: FundFlowData[] = [];

  for (const query of searchQueries) {
    try {
      const response = await searchClient.advancedSearch(query, {
        count: 10,
        needSummary: false,
        timeRange: "1d",
      });

      if (response.web_items) {
        for (const item of response.web_items) {
          const url = item.url || "";
          const title = item.title || "";
          const snippet = item.snippet || "";

          // 过滤：只保留包含主力资金相关关键词的内容
          const keywords = [
            "主力资金",
            "主力净流入",
            "主力净流出",
            "主力净买入",
            "主力净卖出",
            "资金流向",
            "智选洞察",
          ];

          const hasKeyword = keywords.some(
            (kw) =>
              title.includes(kw) ||
              snippet.includes(kw) ||
              url.includes("zxzq.qq.com")
          );

          if (hasKeyword) {
            allResults.push({
              platform: url.includes("zxzq.qq.com")
                ? "腾讯自选股"
                : url.includes("sina")
                  ? "新浪财经"
                  : url.includes("stockstar")
                    ? "证券之星"
                    : "其他",
              title,
              snippet,
              url,
              publishTime: (item as any).publish_time || "",
              fundFlow: "neutral", // 稍后由 LLM 分析
              amount: "",
            });
          }
        }
      }
    } catch (error) {
      console.error(`搜索 "${query}" 失败:`, error);
    }
  }

  return allResults;
}

/**
 * 使用 LLM 分析每篇文章的资金流向
 */
async function analyzeArticleFundFlow(
  article: FundFlowData
): Promise<FundFlowData> {
  const prompt = `分析以下股票资讯中的主力资金流向：

标题：${article.title}
摘要：${article.snippet}

请判断主力资金是净流入还是净流出，并提取金额。

请严格按以下 JSON 格式返回（不要返回其他内容）：
{
  "fundFlow": "inflow" | "outflow" | "neutral",
  "amount": "金额描述，如"8735.5万"或"1403.29万""
}`;

  try {
    const response = await llmClient.invoke(
      [
        { role: "system", content: "你是一个专业的股票资金流向分析师。" },
        { role: "user", content: prompt },
      ],
      { model: "doubao-seed-2-0-mini-260215", temperature: 0.3 }
    );

    const content = response.content || "";

    // 解析 JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        ...article,
        fundFlow: parsed.fundFlow || "neutral",
        amount: parsed.amount || "",
      };
    }
  } catch (error) {
    console.error("分析文章资金流向失败:", error);
  }

  return article;
}

/**
 * 分析主力资金流向
 */
export async function analyzeFundFlow(
  stockName: string,
  stockCode?: string
): Promise<FundFlowAnalysis> {
  console.log(`\n🔍 搜索 ${stockName} 的主力资金流向资讯...`);

  // 1. 搜索相关文章
  const articles = await searchFundFlowArticles(stockName, stockCode);
  console.log(`找到 ${articles.length} 篇相关文章`);

  if (articles.length === 0) {
    return {
      totalArticles: 0,
      inflowCount: 0,
      outflowCount: 0,
      neutralCount: 0,
      netFlow: "neutral",
      analysis: "未找到主力资金流向相关资讯",
      articles: [],
    };
  }

  // 2. 使用 LLM 分析每篇文章的资金流向（限制最多分析 10 篇）
  const articlesToAnalyze = articles.slice(0, 10);
  console.log(`分析前 ${articlesToAnalyze.length} 篇文章的资金流向...`);

  const analyzedArticles = await Promise.all(
    articlesToAnalyze.map((article) => analyzeArticleFundFlow(article))
  );

  // 3. 统计资金流向
  const inflowCount = analyzedArticles.filter(
    (a) => a.fundFlow === "inflow"
  ).length;
  const outflowCount = analyzedArticles.filter(
    (a) => a.fundFlow === "outflow"
  ).length;
  const neutralCount = analyzedArticles.filter(
    (a) => a.fundFlow === "neutral"
  ).length;

  // 4. 判断整体资金流向
  let netFlow: "inflow" | "outflow" | "neutral" = "neutral";
  if (outflowCount > inflowCount * 1.5) {
    netFlow = "outflow";
  } else if (inflowCount > outflowCount * 1.5) {
    netFlow = "inflow";
  }

  // 5. 生成分析总结
  const analysisPrompt = `根据以下主力资金流向数据，生成简短的分析总结（50字以内）：

股票：${stockName}
总文章数：${analyzedArticles.length}
主力净流入文章：${inflowCount} 篇
主力净流出文章：${outflowCount} 篇
中性文章：${neutralCount} 篇
整体资金流向：${netFlow === "inflow" ? "净流入" : netFlow === "outflow" ? "净流出" : "中性"}

部分文章标题：
${analyzedArticles.slice(0, 3).map((a) => `- ${a.title}`).join("\n")}

请用一句话总结主力资金动向，例如：
- "主力资金持续净流出，短期承压"
- "主力资金小幅净流入，市场情绪稳定"
- "主力资金流向分化，观望情绪浓厚"`;

  let analysis = "";
  try {
    const response = await llmClient.invoke(
      [
        { role: "system", content: "你是一个专业的股票资金流向分析师。" },
        { role: "user", content: analysisPrompt },
      ],
      { model: "doubao-seed-2-0-mini-260215", temperature: 0.3 }
    );
    analysis = response.content || "主力资金流向分析完成";
  } catch (error) {
    analysis = "主力资金流向分析完成";
  }

  return {
    totalArticles: analyzedArticles.length,
    inflowCount,
    outflowCount,
    neutralCount,
    netFlow,
    analysis,
    articles: analyzedArticles,
  };
}
