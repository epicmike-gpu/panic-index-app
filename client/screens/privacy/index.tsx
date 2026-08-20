import { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { Screen } from '@/components/Screen';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { FontAwesome6 } from '@expo/vector-icons';

type Lang = 'zh-CN' | 'en' | 'zh-TW';

const LANG_TABS: { key: Lang; label: string }[] = [
  { key: 'zh-CN', label: '简体中文' },
  { key: 'en', label: 'English' },
  { key: 'zh-TW', label: '繁體中文' },
];

type Section = { title: string; intro: string; bullets: string[]; highlight?: string };
type Content = { headerTitle: string; footerDate: string; sections: Section[] };

const CONTENT: Record<Lang, Content> = {
  'zh-CN': {
    headerTitle: '隐私政策',
    footerDate: '最后更新：2026年8月',
    sections: [
      {
        title: '1. 信息收集',
        intro: '本应用仅收集以下必要信息：',
        bullets: [
          '搜索历史：存储在本地设备，用于方便用户快速查询',
          '设备信息：用于应用正常运行和统计分析',
        ],
        highlight: '我们不会收集您的个人身份信息、位置信息或通讯录。',
      },
      {
        title: '2. 数据使用',
        intro: '收集的数据仅用于：',
        bullets: [
          '提供股票恐慌指数分析服务',
          '改善用户体验和应用性能',
          '生成匿名的使用统计报告',
        ],
      },
      {
        title: '3. 数据来源',
        intro: '本应用分析的评论和数据来源于以下公开平台：',
        bullets: [
          '微博、雪球、东方财富、同花顺',
          '新浪财经、腾讯自选股、财联社',
          '华尔街见闻、证券时报、第一财经等',
        ],
        highlight: '所有数据均为公开信息，本应用不爬取或存储非公开数据。',
      },
      {
        title: '4. 数据安全',
        intro: '我们采取合理的安全措施保护您的数据：',
        bullets: [
          '搜索历史仅存储在本地设备',
          '不向第三方共享个人数据',
          '使用加密连接传输数据',
        ],
      },
      {
        title: '5. 免责声明',
        intro:
          '本应用提供的恐慌指数和分析结果仅供参考，不构成任何投资建议。投资有风险，入市需谨慎。',
        bullets: [],
        highlight: '本应用不对因使用本应用数据而导致的任何损失承担责任。',
      },
      {
        title: '6. 政策更新',
        intro:
          '我们可能会不时更新本隐私政策。更新后的政策将在应用内发布，继续使用本应用即表示您同意更新后的政策。',
        bullets: [],
      },
      {
        title: '7. 联系我们',
        intro: '如果您对本隐私政策有任何疑问，请通过应用内的反馈功能联系我们。',
        bullets: [],
      },
    ],
  },
  en: {
    headerTitle: 'Privacy Policy',
    footerDate: 'Last updated: August 2026',
    sections: [
      {
        title: '1. Information Collection',
        intro: 'This application only collects the following necessary information:',
        bullets: [
          'Search history: stored locally on your device for quick re-queries',
          'Device information: used for app operation and statistical analysis',
        ],
        highlight:
          'We do not collect personally identifiable information, location data, or contacts.',
      },
      {
        title: '2. Data Usage',
        intro: 'The collected data is used only for:',
        bullets: [
          'Providing stock panic index analysis services',
          'Improving user experience and app performance',
          'Generating anonymous usage reports',
        ],
      },
      {
        title: '3. Data Sources',
        intro:
          'The comments and data analyzed by this application come from the following public platforms:',
        bullets: [
          'Weibo, Xueqiu, East Money, Tonghuashun',
          'Sina Finance, Tencent Stocks, CLS',
          'Wall Street CN, Securities Times, Yicai, etc.',
        ],
        highlight:
          'All data is publicly available. This app does not crawl or store non-public data.',
      },
      {
        title: '4. Data Security',
        intro: 'We take reasonable security measures to protect your data:',
        bullets: [
          'Search history is stored only on your local device',
          'Personal data is not shared with third parties',
          'Data transmission uses encrypted connections',
        ],
      },
      {
        title: '5. Disclaimer',
        intro:
          'The panic index and analysis results provided by this application are for reference only and do not constitute any investment advice. Investing involves risk; please proceed with caution.',
        bullets: [],
        highlight:
          'This application assumes no liability for any losses arising from the use of its data.',
      },
      {
        title: '6. Policy Updates',
        intro:
          'We may update this privacy policy from time to time. The updated policy will be posted within the application. Continued use of this application indicates your acceptance of the updated policy.',
        bullets: [],
      },
      {
        title: '7. Contact Us',
        intro:
          'If you have any questions about this privacy policy, please contact us through the in-app feedback feature.',
        bullets: [],
      },
    ],
  },
  'zh-TW': {
    headerTitle: '隱私政策',
    footerDate: '最後更新：2026 年 8 月',
    sections: [
      {
        title: '1. 資訊收集',
        intro: '本應用僅收集以下必要資訊：',
        bullets: [
          '搜尋紀錄：儲存於本機裝置，方便使用者快速查詢',
          '裝置資訊：用於應用正常運作與統計分析',
        ],
        highlight: '我們不會收集您的個人身分資訊、位置資訊或通訊錄。',
      },
      {
        title: '2. 資料使用',
        intro: '收集的資料僅用於：',
        bullets: [
          '提供股票恐慌指數分析服務',
          '改善使用者體驗與應用效能',
          '產生匿名使用統計報告',
        ],
      },
      {
        title: '3. 資料來源',
        intro: '本應用分析的留言與資料來自以下公開平台：',
        bullets: [
          '微博、雪球、東方財富、同花順',
          '新浪財經、騰訊自選股、財聯社',
          '華爾街見聞、證券時報、第一財經等',
        ],
        highlight: '所有資料皆為公開資訊，本應用不爬取或儲存非公開資料。',
      },
      {
        title: '4. 資料安全',
        intro: '我們採取合理的安全措施保護您的資料：',
        bullets: [
          '搜尋紀錄僅儲存於本機裝置',
          '不向第三方分享個人資料',
          '使用加密連線傳輸資料',
        ],
      },
      {
        title: '5. 免責聲明',
        intro:
          '本應用提供的恐慌指數與分析結果僅供參考，不構成任何投資建議。投資有風險，謹慎入市。',
        bullets: [],
        highlight: '本應用不對因使用本應用資料而導致的任何損失承擔責任。',
      },
      {
        title: '6. 政策更新',
        intro:
          '我們可能會不定期更新本隱私政策。更新後的政策將於應用內發布，繼續使用本應用即代表您同意更新後的政策。',
        bullets: [],
      },
      {
        title: '7. 聯絡我們',
        intro: '若您對本隱私政策有任何疑問，請透過應用內的意見回饋功能與我們聯繫。',
        bullets: [],
      },
    ],
  },
};

export default function PrivacyPage() {
  const router = useSafeRouter();
  const [lang, setLang] = useState<Lang>('zh-CN');
  const c = CONTENT[lang];

  return (
    <Screen>
      <ScrollView className="flex-1 px-4 py-6">
        {/* Header */}
        <View className="flex-row items-center mb-4">
          <Pressable onPress={() => router.back()} className="mr-4">
            <FontAwesome6 name="arrow-left" size={20} color="#00F0FF" />
          </Pressable>
          <Text className="text-xl font-bold text-white">{c.headerTitle}</Text>
        </View>

        {/* Language Switcher */}
        <View className="flex-row justify-center mb-6 gap-2">
          {LANG_TABS.map((t) => {
            const active = lang === t.key;
            return (
              <Pressable
                key={t.key}
                onPress={() => setLang(t.key)}
                className={`px-4 py-2 rounded-full border ${
                  active ? 'border-cyan-400 bg-cyan-400/10' : 'border-gray-700'
                }`}
              >
                <Text
                  className={
                    active ? 'text-cyan-400 font-semibold' : 'text-gray-400'
                  }
                >
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Content */}
        <View style={{ gap: 24 }}>
          {c.sections.map((s, i) => (
            <View key={i}>
              <Text className="text-base font-bold text-cyan-400 mb-3">
                {s.title}
              </Text>
              <Text style={styles.text}>{s.intro}</Text>
              {s.bullets.map((b, j) => (
                <View key={j} className="flex-row items-start mb-2 ml-4">
                  <View className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-2 mr-2" />
                  <Text style={styles.text} className="flex-1">
                    {b}
                  </Text>
                </View>
              ))}
              {s.highlight ? (
                <Text style={[styles.text, styles.highlight]}>{s.highlight}</Text>
              ) : null}
            </View>
          ))}
        </View>

        {/* Footer */}
        <View className="mt-8 mb-4">
          <Text className="text-center text-xs text-gray-600">
            {c.footerDate}
          </Text>
        </View>
      </ScrollView>
    </Screen>
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
