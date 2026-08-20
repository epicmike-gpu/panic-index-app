import { View, Text, ScrollView, Pressable, Linking } from 'react-native';
import { Screen } from '@/components/Screen';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { FontAwesome6 } from '@expo/vector-icons';

// 支持邮箱
const SUPPORT_EMAIL = '13928261366@163.com';

export default function SupportPage() {
  const router = useSafeRouter();

  const openEmail = () => {
    Linking.openURL(`mailto:${SUPPORT_EMAIL}`);
  };

  return (
    <Screen>
      <ScrollView className="flex-1 px-4 py-6">
        {/* Header */}
        <View className="flex-row items-center mb-6">
          <Pressable onPress={() => router.back()} className="mr-4">
            <FontAwesome6 name="arrow-left" size={20} color="#00F0FF" />
          </Pressable>
          <Text className="text-xl font-bold text-white">帮助与支持</Text>
        </View>

        <View className="space-y-6">
          <Section title="联系我们">
            <Text style={styles.text}>
              如有任何问题、建议或故障反馈，欢迎通过以下方式联系我们：
            </Text>
            <Pressable
              onPress={openEmail}
              className="flex-row items-center bg-cyan-950 rounded-xl px-4 py-3 mt-2"
            >
              <FontAwesome6 name="envelope" size={16} color="#00F0FF" />
              <Text className="ml-3 text-cyan-400 font-semibold">{SUPPORT_EMAIL}</Text>
            </Pressable>
            <Text style={styles.text}>
              我们会在 1-3 个工作日内回复。
            </Text>
          </Section>

          <Section title="常见问题">
            <Faq q="恐慌指数是什么？" a="恐慌指数（0-100）是基于公开网络讨论统计的市场情绪指标，数值越高表示情绪越悲观。它仅反映情绪，不构成任何投资建议。" />
            <Faq q="数据来源是什么？" a="数据来自微博、雪球、东方财富等公开平台的公开信息，我们不爬取或存储非公开数据。" />
            <Faq q="这是投资建议吗？" a="不是。本应用仅提供信息参考，不构成任何投资建议、要约或劝诱。市场有风险，投资需谨慎。" />
            <Faq q="搜索历史会上传吗？" a="不会。搜索历史仅保存在你的设备本地，不会上传到服务器。" />
          </Section>

          <Section title="相关链接">
            <Pressable onPress={() => router.push('/privacy')} className="flex-row items-center mt-2">
              <FontAwesome6 name="shield-halved" size={14} color="#00F0FF" />
              <Text className="ml-2 text-cyan-400">隐私政策</Text>
            </Pressable>
          </Section>

          <Text className="text-center text-xs text-gray-600">
            Market Sentiment Watch · Support
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <View className="mb-4">
      <Text className="text-sm font-semibold text-white mb-1">{q}</Text>
      <Text style={styles.text}>{a}</Text>
    </View>
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

const styles = {
  text: {
    fontSize: 14,
    color: '#AAAAAA',
    lineHeight: 22,
    marginBottom: 8,
  },
};
