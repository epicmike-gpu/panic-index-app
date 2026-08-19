import { View, Text, ScrollView, Pressable } from 'react-native';
import { Screen } from '@/components/Screen';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { FontAwesome6 } from '@expo/vector-icons';

export default function PrivacyPage() {
  const router = useSafeRouter();

  return (
    <Screen>
      <ScrollView className="flex-1 px-4 py-6">
        {/* Header */}
        <View className="flex-row items-center mb-6">
          <Pressable onPress={() => router.back()} className="mr-4">
            <FontAwesome6 name="arrow-left" size={20} color="#00F0FF" />
          </Pressable>
          <Text className="text-xl font-bold text-white">隐私政策</Text>
        </View>

        {/* Content */}
        <View className="space-y-6">
          <Section title="1. 信息收集">
            <Text style={styles.text}>
              本应用仅收集以下必要信息：
            </Text>
            <BulletPoint text="搜索历史：存储在本地设备，用于方便用户快速查询" />
            <BulletPoint text="设备信息：用于应用正常运行和统计分析" />
            <Text style={[styles.text, styles.highlight]}>
              我们不会收集您的个人身份信息、位置信息或通讯录。
            </Text>
          </Section>

          <Section title="2. 数据使用">
            <Text style={styles.text}>收集的数据仅用于：</Text>
            <BulletPoint text="提供股票恐慌指数分析服务" />
            <BulletPoint text="改善用户体验和应用性能" />
            <BulletPoint text="生成匿名的使用统计报告" />
          </Section>

          <Section title="3. 数据来源">
            <Text style={styles.text}>
              本应用分析的评论和数据来源于以下公开平台：
            </Text>
            <BulletPoint text="微博、雪球、东方财富、同花顺" />
            <BulletPoint text="新浪财经、腾讯自选股、财联社" />
            <BulletPoint text="华尔街见闻、证券时报、第一财经等" />
            <Text style={[styles.text, styles.highlight]}>
              所有数据均为公开信息，本应用不爬取或存储非公开数据。
            </Text>
          </Section>

          <Section title="4. 数据安全">
            <Text style={styles.text}>
              我们采取合理的安全措施保护您的数据：
            </Text>
            <BulletPoint text="搜索历史仅存储在本地设备" />
            <BulletPoint text="不向第三方共享个人数据" />
            <BulletPoint text="使用加密连接传输数据" />
          </Section>

          <Section title="5. 免责声明">
            <Text style={styles.text}>
              本应用提供的恐慌指数和分析结果仅供参考，不构成任何投资建议。投资有风险，入市需谨慎。
            </Text>
            <Text style={[styles.text, styles.highlight]}>
              本应用不对因使用本应用数据而导致的任何损失承担责任。
            </Text>
          </Section>

          <Section title="6. 政策更新">
            <Text style={styles.text}>
              我们可能会不时更新本隐私政策。更新后的政策将在应用内发布，继续使用本应用即表示您同意更新后的政策。
            </Text>
          </Section>

          <Section title="7. 联系我们">
            <Text style={styles.text}>
              如果您对本隐私政策有任何疑问，请通过应用内的反馈功能联系我们。
            </Text>
          </Section>
        </View>

        {/* Footer */}
        <View className="mt-8 mb-4">
          <Text className="text-center text-xs text-gray-600">
            最后更新：2026年8月
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mb-6">
      <Text className="text-base font-bold text-cyan-400 mb-3">{title}</Text>
      {children}
    </View>
  );
}

function BulletPoint({ text }: { text: string }) {
  return (
    <View className="flex-row items-start mb-2 ml-4">
      <View className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-2 mr-2" />
      <Text style={styles.text} className="flex-1">{text}</Text>
    </View>
  );
}

const styles = {
  text: {
    fontSize: 14,
    color: '#AAAAAA',
    lineHeight: 22,
    marginBottom: 8,
  },
  highlight: {
    color: '#FFB800',
    fontWeight: '600' as const,
  },
};
