import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  Dimensions,
} from 'react-native';
import { Screen } from '@/components/Screen';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const HOT_STOCKS = [
  { name: '贵州茅台', code: '600519' },
  { name: '宁德时代', code: '300750' },
  { name: '比亚迪', code: '002594' },
  { name: '中国平安', code: '601318' },
  { name: '腾讯控股', code: '00700' },
  { name: '招商银行', code: '600036' },
  { name: '隆基绿能', code: '601012' },
  { name: '药明康德', code: '603259' },
];

export default function HomePage() {
  const [searchText, setSearchText] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const router = useSafeRouter();
  const insets = useSafeAreaInsets();

  const handleSearch = useCallback(async () => {
    const name = searchText.trim();
    if (!name) return;

    setIsSearching(true);
    try {
      router.push('/result', { stockName: name });
    } finally {
      setIsSearching(false);
    }
  }, [searchText, router]);

  const handleHotStock = useCallback(
    (name: string, code: string) => {
      setSearchText(name);
      // Determine market: 0=深圳, 1=上海
      const market = code.startsWith('6') || code.startsWith('9') ? 1 : 0;
      router.push('/result', { stockName: name, stockCode: code, market });
    },
    [router]
  );

  return (
    <Screen
      safeAreaEdges={['left', 'right', 'bottom']}
      backgroundColor="#0A0A0F"
      statusBarStyle="light"
    >
      <View style={[styles.container, { paddingTop: insets.top + 20 }]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.statusDot} />
            <Text style={styles.headerLabel}>PANIC INDEX MONITOR</Text>
          </View>
          <Text style={styles.headerTitle}>恐慌指数</Text>
          <Text style={styles.headerSubtitle}>
            全网舆情分析 · 逆向投资决策
          </Text>
          <View style={styles.neonLine} />
        </View>

        {/* Search Section */}
        <View style={styles.searchSection}>
          <View style={styles.searchBox}>
            <Text style={styles.searchIcon}>⌕</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="输入股票名称，如：贵州茅台"
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

        {/* Hot Stocks */}
        <View style={styles.hotStocksSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>HOT STOCKS</Text>
            <Text style={styles.sectionTitle}>热门股票</Text>
          </View>
          <FlatList
            data={HOT_STOCKS}
            keyExtractor={(item) => item.code}
            numColumns={2}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <Pressable
                style={({ pressed }) => [
                  styles.stockCard,
                  pressed && styles.stockCardPressed,
                ]}
                onPress={() => handleHotStock(item.name, item.code)}
              >
                <Text style={styles.stockName}>{item.name}</Text>
                <Text style={styles.stockCode}>{item.code}</Text>
              </Pressable>
            )}
          />
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <View style={styles.infoCard}>
            <Text style={styles.infoIcon}>↑</Text>
            <View style={styles.infoText}>
              <Text style={styles.infoTitle}>恐慌时买入</Text>
              <Text style={styles.infoDesc}>
                评论消极绝望时，市场可能过度反应
              </Text>
            </View>
          </View>
          <View style={styles.infoCard}>
            <Text style={[styles.infoIcon, { color: '#FF003C' }]}>↓</Text>
            <View style={styles.infoText}>
              <Text style={styles.infoTitle}>乐观时卖出</Text>
              <Text style={styles.infoDesc}>
                评论积极看好时，注意市场过热风险
              </Text>
            </View>
          </View>
        </View>
      </View>
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
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  headerLabel: {
    fontSize: 11,
    letterSpacing: 3,
    color: '#555570',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#EAEAEA',
    letterSpacing: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#555570',
    marginTop: 6,
    letterSpacing: 1,
  },
  neonLine: {
    height: 2,
    width: 60,
    marginTop: 16,
    backgroundColor: '#00F0FF',
    borderRadius: 1,
    shadowColor: '#00F0FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
  },
  searchSection: {
    marginBottom: 32,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#12121A',
    borderWidth: 1,
    borderColor: 'rgba(0,240,255,0.15)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
  },
  searchIcon: {
    fontSize: 20,
    color: '#555570',
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#EAEAEA',
    padding: 0,
  },
  searchButton: {
    backgroundColor: '#12121A',
    borderWidth: 1,
    borderColor: '#00F0FF',
    borderRadius: 6,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#00F0FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  searchButtonPressed: {
    opacity: 0.7,
  },
  searchButtonText: {
    color: '#00F0FF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  hotStocksSection: {
    marginBottom: 32,
  },
  sectionHeader: {
    marginBottom: 16,
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
  },
  stockCard: {
    flex: 1,
    backgroundColor: '#12121A',
    borderWidth: 1,
    borderColor: 'rgba(0,240,255,0.08)',
    borderRadius: 8,
    padding: 16,
    marginHorizontal: 4,
    marginBottom: 8,
  },
  stockCardPressed: {
    borderColor: 'rgba(0,240,255,0.3)',
    backgroundColor: '#1A1A24',
  },
  stockName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#EAEAEA',
    marginBottom: 4,
  },
  stockCode: {
    fontSize: 12,
    color: '#555570',
    fontFamily: 'monospace',
  },
  infoSection: {
    gap: 12,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#12121A',
    borderWidth: 1,
    borderColor: 'rgba(0,240,255,0.06)',
    borderRadius: 8,
    padding: 16,
  },
  infoIcon: {
    fontSize: 24,
    color: '#00FF88',
    fontWeight: '700',
    marginRight: 14,
    width: 40,
    height: 40,
    textAlign: 'center',
    lineHeight: 40,
    backgroundColor: 'rgba(0,255,136,0.08)',
    borderRadius: 8,
  },
  infoText: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EAEAEA',
    marginBottom: 4,
  },
  infoDesc: {
    fontSize: 12,
    color: '#555570',
    lineHeight: 18,
  },
});
