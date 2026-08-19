/**
 * 股票代码查询服务
 * 通过腾讯财经 API 获取股票名称
 */
import iconv from 'iconv-lite';

/**
 * 通过腾讯财经 API 获取股票名称
 */
export async function getStockNameByCode(
  stockCode: string,
  market: number
): Promise<string | null> {
  try {
    // 腾讯财经 API
    const prefix = market === 1 ? 'sh' : 'sz';
    const url = `https://qt.gtimg.cn/q=${prefix}${stockCode}`;

    const response = await globalThis.fetch(url);
    const buffer = await (response as globalThis.Response).arrayBuffer();
    // 腾讯 API 返回 GBK 编码，需要转换
    const text = iconv.decode(Buffer.from(buffer), 'gbk');

    // 解析返回数据
    // 格式：v_sh600519="1~贵州茅台~600519~1550.00~..."
    const match = text.match(/"([^"]+)"/);
    if (match) {
      const parts = match[1].split('~');
      if (parts.length >= 2) {
        return parts[1]; // 股票名称
      }
    }

    return null;
  } catch (error) {
    console.error('获取股票名称失败:', error);
    return null;
  }
}

/**
 * 判断输入是否为股票代码（6 位数字）
 */
export function isStockCode(input: string): boolean {
  return /^\d{6}$/.test(input);
}
