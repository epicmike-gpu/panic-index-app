/**
 * 并发控制与限流重试工具
 * 用于避免触发搜索 API 的 ErrTooManyRequests 限流
 */

/**
 * 并发限制器：最多同时运行 concurrency 个任务
 */
export async function pLimit<T>(
  tasks: (() => Promise<T>)[],
  concurrency: number
): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let index = 0;

  async function worker() {
    while (index < tasks.length) {
      const current = index++;
      results[current] = await tasks[current]();
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, tasks.length) },
    () => worker()
  );
  await Promise.all(workers);
  return results;
}

/**
 * 判断是否为限流错误
 */
export function isRateLimitError(error: any): boolean {
  const msg = String(error?.message || "") + String(error?.response?.Code || "");
  return (
    msg.includes("ErrTooManyRequests") ||
    msg.includes("TooManyRequests") ||
    msg.includes("限流") ||
    error?.response?.Code === "ErrTooManyRequests"
  );
}

/**
 * 限流重试：遇到限流错误时指数退避重试
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 2,
  baseDelay = 1500
): Promise<T> {
  let lastError: any;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      // 只有限流错误才重试，且未超过最大次数
      if (isRateLimitError(error) && attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}
