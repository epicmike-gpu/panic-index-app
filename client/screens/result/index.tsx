import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Screen } from '@/components/Screen';
import { useSafeSearchParams, useSafeRouter } from '@/hooks/useSafeRouter';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const EXPO_PUBLIC_BACKEND_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL;

interface PlatformData {
  platform: string;
  commentCount: number;
  sentiment: string;
  hotComments: {
    platform: string;
    title: string;
    snippet: string;
    url: string;
    publishTime: string;
  }[];
}

interface PanicIndexData {
  stockName: string;
  panicIndex: number;
  recommendation: 'buy' | 'hold' | 'sell';
  overallSentiment: string;
  platformData: PlatformData[];
  analysisSummary: string;
  analyzedAt: string;
}

function getPanicColor(score: number): string {
  if (score >= 76) return '#FF003C';
  if (score >= 51) return '#BF00FF';
  if (score >= 26) return '#FFB800';
  return '#00FF88';
}

function getRecommendationText(rec: string): string {
  switch (rec) {
    case 'buy':
      return '建议买入';
    case 'sell':
      return '建议卖出';
    default:
      return '建议持有';
  }
}

function getRecommendationColor(rec: string): string {
  switch (rec) {
    case 'buy':
      return '#00FF88';
    case 'sell':
      return '#FF003C';
    default:
      return '#FFB800';
  }
}

function getPlatformColor(platform: string): string {
  switch (platform) {
    case '微博':
      return '#FF6B35';
    case '小红书':
      return '#FF2442';
    case '雪球':
      return '#1E80FF';
    case '东方财富':
      return '#FF8C00';
    case '同花顺':
      return '#E63946';
    case '腾讯自选股':
      return '#00A4EF';
    default:
      return '#00F0FF';
  }
}

// Panic Gauge Component
function PanicGauge({ score, color }: { score: number; color: string }) {
  const angle = (score / 100) * 180;

  return (
    <View style={gaugeStyles.container}>
      <View style={gaugeStyles.gaugeOuter}>
        {/* Background arc segments */}
        {Array.from({ length: 18 }).map((_, i) => {
          const segAngle = i * 10;
          const isActive = segAngle <= angle;
          const segColor = isActive ? color : '#1A1A24';
          return (
            <View
              key={i}
              style={[
                gaugeStyles.gaugeSegment,
                {
                  transform: [{ rotate: `${segAngle - 90}deg` }],
                  backgroundColor: segColor,
                  opacity: isActive ? 0.9 : 0.3,
                },
              ]}
            />
          );
        })}
      </View>
      <View style={gaugeStyles.gaugeInner}>
        <Text style={[gaugeStyles.scoreText, { color }]}>{score}</Text>
        <Text style={gaugeStyles.scoreLabel}>PANIC</Text>
      </View>
    </View>
  );
}

const gaugeStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 200,
    width: 200,
  },
  gaugeOuter: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 8,
    borderColor: '#12121A',
    overflow: 'hidden',
  },
  gaugeSegment: {
    position: 'absolute',
    width: 6,
    height: 20,
    left: 97,
    top: 4,
    borderRadius: 3,
  },
  gaugeInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreText: {
    fontSize: 56,
    fontWeight: '800',
    fontFamily: 'monospace',
    letterSpacing: -2,
  },
  scoreLabel: {
    fontSize: 11,
    letterSpacing: 4,
    color: '#555570',
    fontWeight: '600',
    marginTop: -4,
  },
});

export default function ResultPage() {
  const { stockName } = useSafeSearchParams<{ stockName: string }>();
  const router = useSafeRouter();
  const insets = useSafeAreaInsets();

  const [data, setData] = useState<PanicIndexData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedPlatform, setExpandedPlatform] = useState<string | null>(null);

  const fetchAnalysis = useCallback(async () => {
    if (!stockName) return;

    setLoading(true);
    setError(null);

    try {
      /**
       * 服务端文件：server/src/routes/panicIndex.ts
       * 接口：POST /api/v1/panic-index/analyze
       * Body 参数：stockName: string
       */
      const response = await fetch(
        `${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/panic-index/analyze`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stockName }),
        }
      );

      if (!response.ok) {
        throw new Error('分析请求失败');
      }

      const result: PanicIndexData = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误');
    } finally {
      setLoading(false);
    }
  }, [stockName]);

  useEffect(() => {
    fetchAnalysis();
  }, [fetchAnalysis]);

  return (
    <Screen
      safeAreaEdges={['left', 'right', 'bottom']}
      backgroundColor="#0A0A0F"
      statusBarStyle="light"
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Text style={styles.backText}>← 返回</Text>
          </Pressable>
          <View style={styles.headerInfo}>
            <Text style={styles.headerLabel}>STOCK ANALYSIS</Text>
            <Text style={styles.stockName}>{stockName}</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color="#00F0FF" size="large" />
            <Text style={styles.loadingText}>正在扫描全网数据...</Text>
            <Text style={styles.loadingSubText}>
              微博 · 小红书 · 雪球 · 东方财富 · 同花顺 · 腾讯自选股
            </Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>分析失败: {error}</Text>
            <Pressable style={styles.retryButton} onPress={fetchAnalysis}>
              <Text style={styles.retryText}>重试</Text>
            </Pressable>
          </View>
        ) : data ? (
          <>
            {/* Panic Index Gauge */}
            <View style={styles.gaugeSection}>
              <PanicGauge
                score={data.panicIndex}
                color={getPanicColor(data.panicIndex)}
              />
              <Text
                style={[
                  styles.sentimentText,
                  { color: getPanicColor(data.panicIndex) },
                ]}
              >
                {data.overallSentiment}
              </Text>
              <Text style={styles.analysisSummary}>{data.analysisSummary}</Text>
            </View>

            {/* Recommendation */}
            <View style={styles.recommendationCard}>
              <View style={styles.recommendationHeader}>
                <Text style={styles.recommendationLabel}>
                  INVESTMENT SIGNAL
                </Text>
                <View
                  style={[
                    styles.recommendationBadge,
                    {
                      borderColor: getRecommendationColor(
                        data.recommendation
                      ),
                      shadowColor: getRecommendationColor(
                        data.recommendation
                      ),
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.recommendationText,
                      {
                        color: getRecommendationColor(data.recommendation),
                      },
                    ]}
                  >
                    {getRecommendationText(data.recommendation)}
                  </Text>
                </View>
              </View>
              <View style={styles.recommendationDesc}>
                <Text style={styles.recommendationDescText}>
                  {data.recommendation === 'buy'
                    ? '市场情绪极度恐慌，评论充满绝望与割肉声音。根据逆向投资理论，这可能是买入时机。'
                    : data.recommendation === 'sell'
                      ? '市场情绪过于乐观，评论一片看好。注意过热风险，考虑适时获利了结。'
                      : '市场情绪中性，多空分歧较大。建议继续观望，等待更明确的信号。'}
                </Text>
              </View>
            </View>

            {/* Platform Data */}
            <View style={styles.platformSection}>
              <Text style={styles.sectionLabel}>PLATFORM DATA</Text>
              <Text style={styles.sectionTitle}>平台数据</Text>

              {data.platformData.map((pd) => (
                <View key={pd.platform} style={styles.platformCard}>
                  <Pressable
                    style={styles.platformHeader}
                    onPress={() =>
                      setExpandedPlatform(
                        expandedPlatform === pd.platform
                          ? null
                          : pd.platform
                      )
                    }
                  >
                    <View style={styles.platformLeft}>
                      <View
                        style={[
                          styles.platformDot,
                          {
                            backgroundColor: getPlatformColor(pd.platform),
                            shadowColor: getPlatformColor(pd.platform),
                          },
                        ]}
                      />
                      <Text style={styles.platformName}>{pd.platform}</Text>
                    </View>
                    <View style={styles.platformRight}>
                      <Text style={styles.commentCount}>
                        {pd.commentCount} 条
                      </Text>
                      <Text style={styles.expandIcon}>
                        {expandedPlatform === pd.platform ? '▲' : '▼'}
                      </Text>
                    </View>
                  </Pressable>

                  {expandedPlatform === pd.platform && (
                    <View style={styles.commentsList}>
                      {pd.hotComments.map((comment, idx) => (
                        <View key={idx} style={styles.commentItem}>
                          <Text style={styles.commentTitle} numberOfLines={1}>
                            {comment.title}
                          </Text>
                          <Text
                            style={styles.commentSnippet}
                            numberOfLines={3}
                          >
                            {comment.snippet}
                          </Text>
                        </View>
                      ))}
                      {pd.hotComments.length === 0 && (
                        <Text style={styles.noComments}>暂无评论数据</Text>
                      )}
                    </View>
                  )}
                </View>
              ))}
            </View>

            {/* Analysis Time */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                分析时间: {new Date(data.analyzedAt).toLocaleString('zh-CN')}
              </Text>
              <Pressable style={styles.refreshButton} onPress={fetchAnalysis}>
                <Text style={styles.refreshText}>重新分析</Text>
              </Pressable>
            </View>
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
  },
  header: {
    marginBottom: 24,
  },
  backButton: {
    marginBottom: 16,
    paddingVertical: 8,
  },
  backText: {
    color: '#00F0FF',
    fontSize: 14,
    fontWeight: '600',
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerLabel: {
    fontSize: 11,
    letterSpacing: 2,
    color: '#555570',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  stockName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#EAEAEA',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  loadingText: {
    color: '#EAEAEA',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 20,
  },
  loadingSubText: {
    color: '#555570',
    fontSize: 13,
    marginTop: 8,
    letterSpacing: 1,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  errorText: {
    color: '#FF003C',
    fontSize: 14,
    marginBottom: 20,
  },
  retryButton: {
    borderWidth: 1,
    borderColor: '#00F0FF',
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  retryText: {
    color: '#00F0FF',
    fontSize: 13,
    fontWeight: '600',
  },
  gaugeSection: {
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: '#12121A',
    borderWidth: 1,
    borderColor: 'rgba(0,240,255,0.1)',
    borderRadius: 8,
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  sentimentText: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 8,
    letterSpacing: 2,
  },
  analysisSummary: {
    fontSize: 13,
    color: '#555570',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  recommendationCard: {
    backgroundColor: '#12121A',
    borderWidth: 1,
    borderColor: 'rgba(0,240,255,0.08)',
    borderRadius: 8,
    padding: 20,
    marginBottom: 24,
  },
  recommendationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  recommendationLabel: {
    fontSize: 11,
    letterSpacing: 2,
    color: '#555570',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  recommendationBadge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 14,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  recommendationText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
  },
  recommendationDesc: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,240,255,0.06)',
    paddingTop: 14,
  },
  recommendationDescText: {
    fontSize: 13,
    color: '#555570',
    lineHeight: 20,
  },
  platformSection: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 2,
    color: '#555570',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#EAEAEA',
    marginBottom: 16,
  },
  platformCard: {
    backgroundColor: '#12121A',
    borderWidth: 1,
    borderColor: 'rgba(0,240,255,0.08)',
    borderRadius: 8,
    marginBottom: 10,
    overflow: 'hidden',
  },
  platformHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  platformLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  platformDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
  },
  platformName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#EAEAEA',
  },
  platformRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  commentCount: {
    fontSize: 13,
    color: '#555570',
    fontFamily: 'monospace',
  },
  expandIcon: {
    fontSize: 10,
    color: '#555570',
  },
  commentsList: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,240,255,0.06)',
    padding: 12,
    gap: 10,
  },
  commentItem: {
    backgroundColor: 'rgba(0,240,255,0.03)',
    borderRadius: 6,
    padding: 12,
  },
  commentTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#EAEAEA',
    marginBottom: 6,
  },
  commentSnippet: {
    fontSize: 12,
    color: '#555570',
    lineHeight: 18,
  },
  noComments: {
    fontSize: 13,
    color: '#555570',
    textAlign: 'center',
    paddingVertical: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,240,255,0.06)',
  },
  footerText: {
    fontSize: 11,
    color: '#555570',
  },
  refreshButton: {
    borderWidth: 1,
    borderColor: 'rgba(0,240,255,0.3)',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  refreshText: {
    fontSize: 12,
    color: '#00F0FF',
    fontWeight: '600',
  },
});
