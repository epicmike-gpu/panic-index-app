/**
 * 热门股票服务
 * 通过新浪财经API获取当日换手率最高的股票
 */

export interface HotStock {
  code: string;
  name: string;
  turnoverRate: number; // 换手率百分比
}

/**
 * 获取当日换手率最高的股票
 * 使用新浪财经API获取全市场A股数据，按换手率降序排序
 */
export async function getTopTurnoverStocks(count: number = 9): Promise<HotStock[]> {
  try {
    // 新浪财经API：获取全市场A股数据，按换手率降序排序
    // node=hs_a 表示沪深A股
    // sort=turnoverratio 按换手率排序
    // asc=0 降序
    const url = `https://vip.stock.finance.sina.com.cn/quotes_service/api/json_v2.php/Market_Center.getHQNodeData?page=1&num=${count}&sort=turnoverratio&asc=0&node=hs_a`;

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: "https://finance.sina.com.cn/",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      console.log("新浪财经API未返回数据，使用默认热门股票");
      return getDefaultHotStocks();
    }

    // 解析数据并转换为HotStock格式
    const stocks: HotStock[] = data.map((item: any) => ({
      code: item.code,
      name: item.name,
      turnoverRate: parseFloat(item.turnoverratio) || 0,
    }));

    return stocks;
  } catch (error) {
    console.error("获取换手率排行失败:", error);
    return getDefaultHotStocks();
  }
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
