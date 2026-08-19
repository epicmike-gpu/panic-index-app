import { SearchClient, Config as SearchConfig } from "coze-coding-dev-sdk";
import { LLMClient, Config as LLMConfig } from "coze-coding-dev-sdk";

export interface MarketIndicators {
  marginBalance: {
    value: string;
    change: string;
    trend: "up" | "down" | "stable";
  };
  volume: {
    value: string;
    turnoverRate: string;
    trend: "up" | "down" | "stable";
  };
  limitUpDown: {
    upCount: number;
    downCount: number;
    ratio: string;
  };
  newAccounts: {
    value: string;
    period: string;
    yoyChange: string;
  };
  socialHeat: {
    score: number;
    trend: "up" | "down" | "stable";
  };
}

// 东方财富公开 API - 获取个股融资融券数据
async function fetchMarginData(stockCode: string): Promise<MarketIndicators["marginBalance"]> {
  try {
    // 东方财富融资融券 API
    const url = `https://datacenter-web.eastmoney.com/api/data/v1/get?reportName=RPTA_WEB_RZRQ_GGMX&columns=ALL&filter=(SCODE=%22${stockCode}%22)&pageSize=5&sortColumns=DATE&sortTypes=-1`;
    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    const data: any = await response.json();

    if (data.result && data.result.data && data.result.data.length > 0) {
      const latest = data.result.data[0];
      const prev = data.result.data[1];

      const balance = latest.RZYE ? `${(latest.RZYE / 100000000).toFixed(2)}亿` : "暂无数据";
      const change = prev && latest.RZYE && prev.RZYE
        ? `${(((latest.RZYE - prev.RZYE) / prev.RZYE) * 100).toFixed(1)}%`
        : "0%";
      const trend = prev && latest.RZYE && prev.RZYE
        ? latest.RZYE > prev.RZYE ? "up" : latest.RZYE < prev.RZYE ? "down" : "stable"
        : "stable";

      return { value: balance, change, trend };
    }
  } catch (error) {
    console.error("Margin data fetch error:", error);
  }

  return { value: "暂无数据", change: "0%", trend: "stable" };
}

// 腾讯财经 API - 获取个股行情（成交量/换手率）
async function fetchVolumeData(stockCode: string, market: number): Promise<MarketIndicators["volume"]> {
  try {
    // market: 0=深圳，1=上海
    const prefix = market === 1 ? "sh" : "sz";
    const url = `https://qt.gtimg.cn/q=${prefix}${stockCode}`;
    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    const text = await response.text();

    // 解析腾讯股票数据格式
    // 格式：v_sh600519="1~股票名~代码~当前价~昨收~开盘~成交量 (手)~..."
    const match = text.match(/="([^"]+)"/);
    if (match && match[1]) {
      const fields = match[1].split("~");
      // 字段索引：6=成交量 (手), 38=换手率
      const volume = fields[6] ? `${(parseInt(fields[6]) / 10000).toFixed(0)}万手` : "暂无数据";
      const turnoverRate = fields[38] ? `${fields[38]}%` : "暂无数据";

      return { value: volume, turnoverRate, trend: "stable" };
    }
  } catch (error) {
    console.error("Volume data fetch error:", error);
  }

  return { value: "暂无数据", turnoverRate: "暂无数据", trend: "stable" };
}

// 搜索获取涨跌停比例
async function fetchLimitUpDown(customHeaders?: Record<string, string>): Promise<MarketIndicators["limitUpDown"]> {
  try {
    const config = new SearchConfig();
    const client = new SearchClient(config, customHeaders);

    const response = await client.advancedSearch("今日 A 股涨停跌停数量", {
      count: 5,
      timeRange: "7d",
      needSummary: false,
    });

    if (response.web_items && response.web_items.length > 0) {
      const text = response.web_items.map((item) => `${item.title} ${item.snippet}`).join(" ");

      // 尝试从文本中提取涨跌停数据
      const upMatch = text.match(/涨停 [：:]*\s*(\d+)/);
      const downMatch = text.match(/跌停 [：:]*\s*(\d+)/);

      const upCount = upMatch ? parseInt(upMatch[1]) : 0;
      const downCount = downMatch ? parseInt(downMatch[1]) : 0;
      const total = upCount + downCount;
      const ratio = total > 0 ? `${upCount}:${downCount}` : "暂无数据";

      return { upCount, downCount, ratio };
    }
  } catch (error) {
    console.error("Limit up/down fetch error:", error);
  }

  return { upCount: 0, downCount: 0, ratio: "暂无数据" };
}

// 搜索获取新股民开户数据（上交所月度数据）
async function fetchNewAccounts(customHeaders?: Record<string, string>): Promise<MarketIndicators["newAccounts"]> {
  try {
    const config = new SearchConfig();
    const client = new SearchClient(config, customHeaders);

    // 搜索上交所最新月度开户数据
    const response = await client.advancedSearch("上交所 月度 新开户 投资者 账户", {
      count: 8,
      timeRange: "3m",
      needSummary: false,
    });

    if (response.web_items && response.web_items.length > 0) {
      const text = response.web_items.map((item) => `${item.title} ${item.snippet}`).join(" ");

      // 尝试提取开户数（多种格式匹配）
      // 匹配格式：123.45 万、123 万、123.45 万户
      const accountMatch = text.match(/(\d+\.?\d*)\s*(万|万户|万人)/);
      // 匹配日期格式：2024 年 10 月、10 月
      const periodMatch = text.match(/(\d{4}年\d{1,2}月|\d{1,2}月)/);
      // 匹配同比增长
      const yoyMatch = text.match(/同比 [增长下降]*[：:]*\s*([+-]?\d+\.?\d*)%?/);

      const value = accountMatch ? `${accountMatch[1]}${accountMatch[2]}` : "暂无数据";
      const period = periodMatch ? periodMatch[1] : "近期";
      const yoyChange = yoyMatch ? yoyMatch[1] : "0";

      return {
        value,
        period,
        yoyChange,
      };
    }
  } catch (error) {
    console.error("New accounts fetch error:", error);
  }

  return { value: "暂无数据", period: "近期", yoyChange: "0" };
}

// 社交媒体热度评分（基于已有评论数量）
function calculateSocialHeat(totalComments: number): { score: number; trend: "up" | "down" | "stable" } {
  // 评论数越多，热度越高
  let score = 0;
  if (totalComments >= 100) score = 90;
  else if (totalComments >= 60) score = 75;
  else if (totalComments >= 30) score = 60;
  else if (totalComments >= 15) score = 45;
  else if (totalComments >= 5) score = 30;
  else score = 15;

  // 趋势暂时标记为 stable（需要历史数据对比）
  return { score, trend: "stable" };
}

export async function fetchMarketIndicators(
  stockName: string,
  stockCode: string,
  market: number,
  totalComments: number,
  customHeaders?: Record<string, string>
): Promise<MarketIndicators> {
  // 并行获取各项指标
  const [marginBalance, volume, limitUpDown, newAccounts] = await Promise.all([
    fetchMarginData(stockCode),
    fetchVolumeData(stockCode, market),
    fetchLimitUpDown(customHeaders),
    fetchNewAccounts(customHeaders),
  ]);

  const socialHeat = calculateSocialHeat(totalComments);

  return {
    marginBalance,
    volume,
    limitUpDown,
    newAccounts,
    socialHeat,
  };
}

// 根据市场指标计算综合恐慌分数
// 权重分配：融资余额 20% + 成交量 15% + 涨跌停 20% + 新股民开户 15% + 社交热度 30% = 100%
export function calculateMarketPanicScore(indicators: MarketIndicators): number {
  let score = 0;
  let weight = 0;

  // 融资余额变化（权重 20%）- 融资余额下降=恐慌
  if (indicators.marginBalance.value !== "暂无数据") {
    const change = parseFloat(indicators.marginBalance.change);
    if (!isNaN(change)) {
      // 融资余额下降越多，恐慌分越高
      score += Math.min(100, Math.max(0, 50 - change * 5)) * 0.2;
      weight += 0.2;
    }
  }

  // 成交量/换手率（权重 15%）- 放量下跌=恐慌
  if (indicators.volume.trend === "up") {
    score += 60 * 0.15; // 放量可能意味着恐慌性抛售
    weight += 0.15;
  } else if (indicators.volume.trend === "down") {
    score += 30 * 0.15; // 缩量可能是观望
    weight += 0.15;
  }

  // 涨跌停比例（权重 20%）- 跌停多=恐慌
  if (indicators.limitUpDown.upCount > 0 || indicators.limitUpDown.downCount > 0) {
    const total = indicators.limitUpDown.upCount + indicators.limitUpDown.downCount;
    if (total > 0) {
      const downRatio = indicators.limitUpDown.downCount / total;
      score += downRatio * 100 * 0.2;
      weight += 0.2;
    }
  }

  // 新股民开户数（权重 15%）- 开户数暴增=过热，减少=恐慌（逆向指标）
  if (indicators.newAccounts.value !== "暂无数据") {
    const yoyChange = parseFloat(indicators.newAccounts.yoyChange);
    if (!isNaN(yoyChange)) {
      // 同比增长越高，市场越热，恐慌分越低（逆向指标）
      // 同比增长 100%+ = 过热 (恐慌分 20)
      // 同比增长 50% = 偏热 (恐慌分 35)
      // 同比增长 0% = 中性 (恐慌分 50)
      // 同比下降 50% = 偏冷 (恐慌分 70)
      // 同比下降 100% = 过冷 (恐慌分 85)
      const accountScore = Math.min(85, Math.max(20, 50 - yoyChange * 0.3));
      score += accountScore * 0.15;
      weight += 0.15;
    } else {
      score += 50 * 0.15; // 默认中性
      weight += 0.15;
    }
  }

  // 社交媒体热度（权重 30%）- 热度极高可能是过热或恐慌
  score += indicators.socialHeat.score * 0.3;
  weight += 0.3;

  return weight > 0 ? Math.round(score / weight) : 50;
}
