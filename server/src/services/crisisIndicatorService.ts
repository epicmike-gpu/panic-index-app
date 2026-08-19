import { SearchClient, Config, LLMClient } from "coze-coding-dev-sdk";

export interface CrisisIndicator {
  totalArticles: number;
  suicideCases: number;
  crisisLevel: "low" | "medium" | "high" | "extreme";
  analysis: string;
  articles: CrisisArticle[];
}

export interface CrisisArticle {
  title: string;
  url: string;
  snippet: string;
}

const llmClient = new LLMClient();

/**
 * 搜索因金融/股票导致的极端事件（自杀、轻生等）
 */
export async function searchCrisisIndicators(
  stockName: string
): Promise<CrisisIndicator> {
  const config = new Config();
  const client = new SearchClient(config);

  const queries = [
    `${stockName} 股民 自杀 跳楼`,
    `${stockName} 炒股 亏损 轻生`,
    `${stockName} 股市 暴跌 绝望`,
  ];

  const allArticles: CrisisArticle[] = [];

  for (const query of queries) {
    try {
      const response = await client.advancedSearch(query, {
        count: 10,
        needSummary: false,
        timeRange: "7d",
      });

      if (response.web_items) {
        for (const item of response.web_items) {
          const title = item.title || "";
          const url = item.url || "";
          const snippet = item.snippet || "";

          // 检查是否包含极端事件关键词
          const crisisKeywords = [
            "自杀",
            "跳楼",
            "轻生",
            "寻短见",
            "欲轻生",
            "欲自杀",
          ];
          const hasCrisisKeyword = crisisKeywords.some((keyword) =>
            title.includes(keyword) || snippet.includes(keyword)
          );

          if (hasCrisisKeyword) {
            allArticles.push({
              title,
              url,
              snippet,
            });
          }
        }
      }
    } catch (error) {
      // 忽略单个查询的错误
    }
  }

  // 使用 LLM 分析危机程度
  let crisisLevel: "low" | "medium" | "high" | "extreme" = "low";
  let analysis = "未检测到极端恐慌信号";

  if (allArticles.length > 0) {
    // 根据文章数量判断危机程度
    if (allArticles.length >= 10) {
      crisisLevel = "extreme";
    } else if (allArticles.length >= 5) {
      crisisLevel = "high";
    } else if (allArticles.length >= 2) {
      crisisLevel = "medium";
    }

    // 使用 LLM 生成分析
    try {
      const config = new Config();
      const llmClient = new LLMClient(config);
      const prompt = `根据以下关于"${stockName}"的极端事件报道，分析市场恐慌程度：

${allArticles.slice(0, 5).map((a) => `- ${a.title}`).join("\n")}

请用一句话总结恐慌程度（20 字以内）：`;

      const response = await llmClient.invoke(
        [
          { role: "system", content: "你是一个专业的市场分析师。" },
          { role: "user", content: prompt },
        ],
        { model: "doubao-seed-2-0-mini", temperature: 0.3 }
      );
      if (response.content) {
        analysis = response.content;
      }
    } catch (error) {
      analysis = `检测到 ${allArticles.length} 起极端恐慌事件`;
    }
  }

  return {
    totalArticles: allArticles.length,
    suicideCases: allArticles.length,
    crisisLevel,
    analysis,
    articles: allArticles.slice(0, 5),
  };
}
