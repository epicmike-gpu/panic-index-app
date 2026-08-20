import { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  Dimensions,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Screen } from '@/components/Screen';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

// Vercel 部署时前后端同域名，使用相对路径；本地开发时使用环境变量
const EXPO_PUBLIC_BACKEND_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL || '';

interface HotStock {
  code: string;
  name: string;
  turnoverRate: number;
}

const STORAGE_KEY = 'search_history';
const MAX_HISTORY = 10;

interface SearchHistoryItem {
  name: string;
  code?: string;
  market?: number;
  timestamp: number;
}

export default function HomePage() {
  const [searchText, setSearchText] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [hotStocks, setHotStocks] = useState<HotStock[]>([]);
  const [isLoadingHotStocks, setIsLoadingHotStocks] = useState(true);
  const router = useSafeRouter();
  const insets = useSafeAreaInsets();

  // Load search history and hot stocks on mount
  useEffect(() => {
    loadSearchHistory();
    loadHotStocks();
  }, []);

  const loadHotStocks = async () => {
    try {
      setIsLoadingHotStocks(true);
      /**
       * 服务端文件：server/src/routes/panicIndex.ts
       * 接口：GET /api/v1/panic-index/hot-stocks
       * Query 参数：count?: number (默认9)
       */
      const response = await fetch(
        `${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/panic-index/hot-stocks?count=9`
      );
      const data = await response.json();
      if (data.success && data.data) {
        setHotStocks(data.data);
      }
    } catch (error) {
      console.error('Failed to load hot stocks:', error);
    } finally {
      setIsLoadingHotStocks(false);
    }
  };

  const loadSearchHistory = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSearchHistory(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load search history:', error);
    }
  };

  const saveSearchHistory = async (item: SearchHistoryItem) => {
    try {
      const updated = [
        item,
        ...searchHistory.filter((h) => h.name !== item.name),
      ].slice(0, MAX_HISTORY);
      setSearchHistory(updated);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to save search history:', error);
    }
  };

  const clearSearchHistory = async () => {
    try {
      setSearchHistory([]);
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear search history:', error);
    }
  };

  const handleSearch = useCallback(async () => {
    const name = searchText.trim();
    if (!name) return;

    setIsSearching(true);
    try {
      // Save to history
      await saveSearchHistory({
        name,
        timestamp: Date.now(),
      });
      router.push('/result', { stockName: name });
    } finally {
      setIsSearching(false);
    }
  }, [searchText, router, searchHistory]);

  const handleHotStock = useCallback(
    async (name: string, code: string) => {
      setSearchText(name);
      // Determine market: 0=深圳，1=上海
      const market = code.startsWith('6') || code.startsWith('9') ? 1 : 0;
      // Save to history
      await saveSearchHistory({
        name,
        code,
        market,
        timestamp: Date.now(),
      });
      router.push('/result', { stockName: name, stockCode: code, market });
    },
    [router, searchHistory]
  );

  const handleHistoryPress = useCallback(
    (item: SearchHistoryItem) => {
      setSearchText(item.name);
      if (item.code && item.market !== undefined) {
        router.push('/result', {
          stockName: item.name,
          stockCode: item.code,
          market: item.market,
        });
      } else {
        router.push('/result', { stockName: item.name });
      }
    },
    [router]
  );

  return (
    <Screen
      safeAreaEdges={['left', 'right', 'bottom']}
      backgroundColor="#0A0A0F"
      statusBarStyle="light"
    >
      <ScrollView
        style={[styles.container, { paddingTop: insets.top + 20 }]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.statusDot} />
            <Text style={styles.headerLabel}>PANIC INDEX MONITOR</Text>
          </View>
          <Text style={styles.headerTitle}>恐慌指数</Text>
          <Text style={styles.headerSubtitle}>
            全网舆情情绪观察 · 仅供参考
          </Text>
          <View style={styles.neonLine} />
        </View>

        {/* Search Section */}
        <View style={styles.searchSection}>
          <View style={styles.searchBox}>
            <Text style={styles.searchIcon}>⌕</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="输入股票名称或代码，如：贵州茅台 / 600519"
              placeholderTextColor="#555570"
              value={searchText}
              onChangeText={setSearchText}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
              autoCorrect={false}
              autoCapitalize="none"
            />
            {isSearching && (
              <ActivityIndicator color="#00F0FF" size="small" />
            )}
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.searchButton,
              pressed && styles.searchButtonPressed,
            ]}
            onPress={handleSearch}
            disabled={!searchText.trim() || isSearching}
          >
            <Text style={styles.searchButtonText}>开始分析</Text>
          </Pressable>
        </View>

        {/* Search History */}
        {searchHistory.length > 0 && (
          <View style={styles.historySection}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <Text style={styles.sectionLabel}>HISTORY</Text>
                <Text style={styles.sectionTitle}>搜索历史</Text>
              </View>
              <Pressable onPress={clearSearchHistory}>
                <Text style={styles.clearButton}>清除</Text>
              </Pressable>
            </View>
            <FlatList
              data={searchHistory}
              keyExtractor={(item) => `${item.name}-${item.timestamp}`}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.historyList}
              renderItem={({ item }) => (
                <Pressable
                  style={({ pressed }) => [
                    styles.historyChip,
                    pressed && styles.historyChipPressed,
                  ]}
                  onPress={() => handleHistoryPress(item)}
                >
                  <Text style={styles.historyChipText}>{item.name}</Text>
                </Pressable>
              )}
            />
          </View>
        )}

        {/* Hot Stocks */}
        <View style={styles.hotStocksSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <Text style={styles.sectionLabel}>HOT STOCKS</Text>
              <Text style={styles.sectionTitle}>最热榜</Text>
            </View>
            <Pressable onPress={loadHotStocks} disabled={isLoadingHotStocks}>
              <Text style={styles.refreshBtn}>
                {isLoadingHotStocks ? '...' : '刷新'}
              </Text>
            </Pressable>
          </View>
          {isLoadingHotStocks && hotStocks.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="#00F0FF" />
              <Text style={styles.loadingText}>获取最热榜...</Text>
            </View>
          ) : (
            <FlatList
              data={hotStocks}
              keyExtractor={(item) => item.code}
              numColumns={3}
              scrollEnabled={false}
              renderItem={({ item, index }) => (
                <Pressable
                  style={({ pressed }) => [
                    styles.stockCard,
                    pressed && styles.stockCardPressed,
                  ]}
                  onPress={() => handleHotStock(item.name, item.code)}
                >
                  <View style={styles.stockRankBadge}>
                    <Text style={styles.stockRankText}>#{index + 1}</Text>
                  </View>
                  <Text style={styles.stockName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.stockCode}>{item.code}</Text>
                  <Text style={styles.turnoverRate}>
                    换手 {item.turnoverRate.toFixed(1)}%
                  </Text>
                </Pressable>
              )}
            />
          )}
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <View style={styles.infoCard}>
            <Text style={styles.infoIcon}>↑</Text>
            <View style={styles.infoText}>
              <Text style={styles.infoTitle}>悲观情绪</Text>
              <Text style={styles.infoDesc}>
                评论消极时，指数偏高，反映市场悲观
              </Text>
            </View>
          </View>
          <View style={styles.infoCard}>
            <Text style={[styles.infoIcon, { color: '#FF003C' }]}>↓</Text>
            <View style={styles.infoText}>
              <Text style={styles.infoTitle}>乐观情绪</Text>
              <Text style={styles.infoDesc}>
                评论积极时，指数偏低，反映市场乐观
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    marginBottom: 32,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00F0FF',
    marginRight: 8,
    shadowColor: '#00F0FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 4,
  },
  headerLabel: {
    fontSize: 11,
    color: '#00F0FF',
    letterSpacing: 2,
    fontFamily: 'monospace',
  },
  headerTitle: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#8888AA',
    marginBottom: 16,
  },
  neonLine: {
    height: 1,
    backgroundColor: '#00F0FF',
    shadowColor: '#00F0FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  searchSection: {
    marginBottom: 24,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#2A2A4A',
    marginBottom: 12,
  },
  searchIcon: {
    fontSize: 20,
    color: '#00F0FF',
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
  },
  searchButton: {
    backgroundColor: '#00F0FF',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#00F0FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  searchButtonPressed: {
    opacity: 0.8,
  },
  searchButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0A0A0F',
  },
  historySection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  clearButton: {
    fontSize: 13,
    color: '#FF003C',
  },
  sectionLabel: {
    fontSize: 11,
    color: '#6666AA',
    letterSpacing: 1.5,
    fontFamily: 'monospace',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  historyList: {
    gap: 8,
  },
  historyChip: {
    backgroundColor: '#1A1A2E',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#2A2A4A',
    marginRight: 8,
  },
  historyChipPressed: {
    borderColor: '#00F0FF',
  },
  historyChipText: {
    fontSize: 14,
    color: '#CCCCCC',
  },
  hotStocksSection: {
    marginBottom: 24,
  },
  stockCard: {
    flex: 1,
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    padding: 12,
    margin: 4,
    borderWidth: 1,
    borderColor: '#2A2A4A',
    alignItems: 'center',
  },
  stockCardPressed: {
    borderColor: '#00F0FF',
  },
  stockRankBadge: {
    backgroundColor: '#00F0FF20',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 6,
  },
  stockRankText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#00F0FF',
    fontFamily: 'monospace',
  },
  stockName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
    textAlign: 'center',
  },
  stockCode: {
    fontSize: 11,
    color: '#6666AA',
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  turnoverRate: {
    fontSize: 11,
    color: '#FF6B00',
    fontWeight: 'bold',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  loadingText: {
    fontSize: 12,
    color: '#6666AA',
  },
  refreshBtn: {
    fontSize: 12,
    color: '#00F0FF',
    fontWeight: 'bold',
  },
  infoSection: {
    gap: 12,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A2A4A',
  },
  infoIcon: {
    fontSize: 24,
    color: '#00F0FF',
    marginRight: 16,
  },
  infoText: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  infoDesc: {
    fontSize: 13,
    color: '#8888AA',
  },
});
