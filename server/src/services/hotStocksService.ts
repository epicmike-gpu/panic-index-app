/**
 * 热门股票服务
 * 通过 Web Search 获取当日换手率最高的股票
 */
import { SearchClient, Config as SearchConfig } from "coze-coding-dev-sdk";

export interface HotStock {
  code: string;
  name: string;
  turnoverRate: number; // 换手率百分比
}

/**
 * 获取当日换手率最高的股票
 */
export async function getTopTurnoverStocks(count: number = 9): Promise<HotStock[]> {
  try {
    const config = new SearchConfig();
    const client = new SearchClient(config);

    const today = new Date().toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    const response = await client.advancedSearch(`${today} A股 换手率最高 排行榜 前10`, {
      count: 10,
      needSummary: false,
      timeRange: "1d",
    });

    const webItems = response.web_items;
    if (!webItems || webItems.length === 0) {
      console.log("Web Search 未返回结果，使用默认热门股票");
      return getDefaultHotStocks();
    }

    // 从搜索结果中提取股票数据
    const stocks = extractStocksFromSearchResults(webItems);

    if (stocks.length >= 3) {
      return stocks.slice(0, count);
    }

    // 如果提取的数据不足，补充默认数据
    const defaultStocks = getDefaultHotStocks();
    const existingCodes = new Set(stocks.map((s) => s.code));
    for (const stock of defaultStocks) {
      if (!existingCodes.has(stock.code) && stocks.length < count) {
        stocks.push(stock);
      }
    }

    return stocks.slice(0, count);
  } catch (error) {
    console.error("获取换手率排行失败:", error);
    return getDefaultHotStocks();
  }
}

/**
 * 从搜索结果中提取股票数据
 */
function extractStocksFromSearchResults(
  webItems: Array<{ title?: string; snippet?: string; url?: string }>
): HotStock[] {
  const stocks: HotStock[] = [];
  const seenCodes = new Set<string>();

  for (const item of webItems) {
    const text = `${item.title || ""} ${item.snippet || ""}`;

    // 匹配格式: 股票名称(代码) 换手率XX%
    // 或: 代码 股票名称 换手率
    const patterns = [
      /([^\s(（]{2,8})[（(](\d{6})[)）][^%]*?换手率[^\d]*?([\d.]+)%/g,
      /(\d{6})\s+([^\s]{2,8})\s+[^%]*?换手率[^\d]*?([\d.]+)%/g,
      /([^\s]{2,8})\s+(\d{6})\s+[^%]*?换手率[^\d]*?([\d.]+)%/g,
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        let name: string;
        let code: string;
        let rate: number;

        if (/^\d{6}$/.test(match[2])) {
          // 格式: 名称(代码) 换手率
          name = match[1];
          code = match[2];
          rate = parseFloat(match[3]);
        } else if (/^\d{6}$/.test(match[1])) {
          // 格式: 代码 名称 换手率
          name = match[2];
          code = match[1];
          rate = parseFloat(match[3]);
        } else {
          // 格式: 名称 代码 换手率
          name = match[1];
          code = match[2];
          rate = parseFloat(match[3]);
        }

        // 验证名称是否有效（只包含中文、字母，长度2-8）
        const isValidName = /^[\u4e00-\u9fa5a-zA-Z]{2,8}$/.test(name);

        if (
          code &&
          !seenCodes.has(code) &&
          rate > 0 &&
          rate < 100 &&
          isValidName
        ) {
          seenCodes.add(code);
          stocks.push({ code, name, turnoverRate: rate });
        }
      }
    }
  }

  // 按换手率降序排序
  stocks.sort((a, b) => b.turnoverRate - a.turnoverRate);
  return stocks;
}

/**
 * 默认热门股票（当无法获取实时数据时使用）
 */
function getDefaultHotStocks(): HotStock[] {
  return [
    { code: "600519", name: "贵州茅台", turnoverRate: 3.2 },
    { code: "000001", name: "平安银行", turnoverRate: 2.8 },
    { code: "601318", name: "中国平安", turnoverRate: 2.5 },
    { code: "000858", name: "五粮液", turnoverRate: 2.3 },
    { code: "600036", name: "招商银行", turnoverRate: 2.1 },
    { code: "002594", name: "比亚迪", turnoverRate: 1.9 },
    { code: "601012", name: "隆基绿能", turnoverRate: 1.8 },
    { code: "300750", name: "宁德时代", turnoverRate: 1.7 },
    { code: "600276", name: "恒瑞医药", turnoverRate: 1.6 },
  ];
}
