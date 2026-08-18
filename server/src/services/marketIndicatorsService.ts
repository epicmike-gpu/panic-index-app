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
  };
  socialHeat: {
    score: number;
    trend: "up" | "down" | "stable";
  };
}

// 东方财富公开API - 获取个股融资融券数据
async function fetchMarginData(stockCode: string): Promise<MarketIndicators["marginBalance"]> {
  try {
    // 东方财富融资融券API
    const url = `https://datacenter-web.eastmoney.com/api/data/v1/get?reportName=RPTA_WEB_RZRQ_GGMX&columns=ALL&filter=(SECURITY_CODE="${stockCode}")&pageSize=5&sortColumns=TRADE_DATE&sortTypes=-1`;
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

// 东方财富公开API - 获取个股行情（成交量/换手率）
async function fetchVolumeData(stockCode: string, market: number): Promise<MarketIndicators["volume"]> {
  try {
    // market: 0=深圳, 1=上海
    const secid = `${market}.${stockCode}`;
    const url = `https://push2his.eastmoney.com/api/qt/stock/kline/get?secid=${secid}&fields1=f1,f2,f3,f4,f5,f6&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61&klt=101&fqt=1&end=20500101&lmt=5`;
    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    const data: any = await response.json();

    if (data.data && data.data.klines && data.data.klines.length > 0) {
      const latest = data.data.klines[data.data.klines.length - 1].split(",");
      const prev = data.data.klines.length > 1
        ? data.data.klines[data.data.klines.length - 2].split(",")
        : null;

      // kline format: date,open,close,high,low,volume,amount,amplitude,change,changeAmount,turnover
      const volume = latest[5] ? `${(parseInt(latest[5]) / 10000).toFixed(0)}万手` : "暂无数据";
      const turnoverRate = latest[10] ? `${latest[10]}%` : "暂无数据";

      let trend: "up" | "down" | "stable" = "stable";
      if (prev && latest[5] && prev[5]) {
        const volNow = parseInt(latest[5]);
        const volPrev = parseInt(prev[5]);
        trend = volNow > volPrev ? "up" : volNow < volPrev ? "down" : "stable";
      }

      return { value: volume, turnoverRate, trend };
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

    const response = await client.advancedSearch("今日A股涨停跌停数量", {
      count: 5,
      timeRange: "1d",
      needSummary: false,
    });

    if (response.web_items && response.web_items.length > 0) {
      const text = response.web_items.map((item) => `${item.title} ${item.snippet}`).join(" ");

      // 尝试从文本中提取涨跌停数据
      const upMatch = text.match(/涨停[：:]*\s*(\d+)/);
      const downMatch = text.match(/跌停[：:]*\s*(\d+)/);

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

// 搜索获取新股民开户数据
async function fetchNewAccounts(customHeaders?: Record<string, string>): Promise<MarketIndicators["newAccounts"]> {
  try {
    const config = new SearchConfig();
    const client = new SearchClient(config, customHeaders);

    const response = await client.advancedSearch("新股民开户数 中登公司 最新", {
      count: 5,
      timeRange: "1m",
      needSummary: false,
    });

    if (response.web_items && response.web_items.length > 0) {
      const text = response.web_items.map((item) => `${item.title} ${item.snippet}`).join(" ");

      // 尝试提取开户数
      const accountMatch = text.match(/(\d+\.?\d*)\s*(万|万户|万人)/);
      const periodMatch = text.match(/(\d{4}年\d{1,2}月|\d{1,2}月)/);

      return {
        value: accountMatch ? `${accountMatch[1]}${accountMatch[2]}` : "暂无数据",
        period: periodMatch ? periodMatch[1] : "近期",
      };
    }
  } catch (error) {
    console.error("New accounts fetch error:", error);
  }

  return { value: "暂无数据", period: "近期" };
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
export function calculateMarketPanicScore(indicators: MarketIndicators): number {
  let score = 0;
  let weight = 0;

  // 融资余额变化（权重20%）- 融资余额下降=恐慌
  if (indicators.marginBalance.value !== "暂无数据") {
    const change = parseFloat(indicators.marginBalance.change);
    if (!isNaN(change)) {
      // 融资余额下降越多，恐慌分越高
      score += Math.min(100, Math.max(0, 50 - change * 5)) * 0.2;
      weight += 0.2;
    }
  }

  // 成交量/换手率（权重20%）- 放量下跌=恐慌
  if (indicators.volume.trend === "up") {
    score += 60 * 0.2; // 放量可能意味着恐慌性抛售
    weight += 0.2;
  } else if (indicators.volume.trend === "down") {
    score += 30 * 0.2; // 缩量可能是观望
    weight += 0.2;
  }

  // 涨跌停比例（权重25%）- 跌停多=恐慌
  if (indicators.limitUpDown.upCount > 0 || indicators.limitUpDown.downCount > 0) {
    const total = indicators.limitUpDown.upCount + indicators.limitUpDown.downCount;
    if (total > 0) {
      const downRatio = indicators.limitUpDown.downCount / total;
      score += downRatio * 100 * 0.25;
      weight += 0.25;
    }
  }

  // 新股民开户数（权重10%）- 开户数暴增=过热，减少=恐慌
  if (indicators.newAccounts.value !== "暂无数据") {
    score += 50 * 0.1; // 默认中性
    weight += 0.1;
  }

  // 社交媒体热度（权重25%）- 热度极高可能是过热或恐慌
  score += indicators.socialHeat.score * 0.25;
  weight += 0.25;

  return weight > 0 ? Math.round(score / weight) : 50;
}
