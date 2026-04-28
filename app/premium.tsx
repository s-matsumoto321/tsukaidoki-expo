import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useStore } from '@/store/useStore';

const C = {
  brand: '#5B8E7D',
  green: '#5B8E7D',
  amber: '#E8B86D',
  purple: '#B8AFD9',
  bg: '#FAF7F2',
  card: '#ffffff',
  textPrimary: '#2C3539',
  textSecondary: '#6B7378',
  border: '#EDE8DF',
};

const FEATURES = [
  { icon: '🔥', text: 'FIREプランの試算' },
  { icon: '💼', text: '転職時のプラン' },
  { icon: '🌴', text: '移住シミュレート' },
  { icon: '👶', text: '出産後のプラン' },
  { icon: '📊', text: 'シナリオを比較し放題' },
];

const MONTHLY_PRICE = 480;
const YEARLY_PRICE = 4800;

type Plan = 'monthly' | 'yearly';

export default function PremiumScreen() {
  const { isPremium, setPremium } = useStore();
  const [selectedPlan, setSelectedPlan] = useState<Plan>('yearly');
  const [purchased, setPurchased] = useState(false);

  const handlePurchase = () => {
    // 本番では RevenueCat / Expo IAP でここを実装
    setPremium(true);
    setPurchased(true);
  };

  const handleClose = () => router.back();

  if (purchased || isPremium) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.successWrap}>
          <Text style={s.successIcon}>🎉</Text>
          <Text style={s.successTitle}>プレミアム会員になりました！</Text>
          <Text style={s.successSub}>シナリオを無制限に作れます。{'\n'}さっそく試してみましょう。</Text>
          <Pressable style={s.successBtn} onPress={handleClose}>
            <Text style={s.successBtnTxt}>シナリオを作る →</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      {/* 閉じるボタン */}
      <Pressable style={s.closeRow} onPress={handleClose}>
        <Text style={s.closeTxt}>✕</Text>
      </Pressable>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* ヘッダー */}
        <View style={s.headerWrap}>
          <View style={s.badge}>
            <Text style={s.badgeTxt}>✨ プレミアム機能</Text>
          </View>
          <Text style={s.headline}>
            もう一つの人生プランを{'\n'}作りませんか？
          </Text>
          <Text style={s.subline}>
            いくつでもシナリオを作って、{'\n'}「もしも」を思いきり試算できます。
          </Text>
        </View>

        {/* 機能リスト */}
        <View style={s.featureCard}>
          <Text style={s.featureTitle}>こんなことができます</Text>
          {FEATURES.map(f => (
            <View key={f.text} style={s.featureRow}>
              <View style={s.featureCheck}>
                <Text style={s.featureCheckTxt}>✓</Text>
              </View>
              <Text style={s.featureIcon}>{f.icon}</Text>
              <Text style={s.featureTxt}>{f.text}</Text>
            </View>
          ))}
        </View>

        {/* プラン選択 */}
        <View style={s.planRow}>
          <Pressable
            style={[s.planCard, selectedPlan === 'monthly' && s.planCardActive]}
            onPress={() => setSelectedPlan('monthly')}
          >
            <View style={[s.planRadio, selectedPlan === 'monthly' && s.planRadioActive]}>
              {selectedPlan === 'monthly' && <View style={s.planRadioInner} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.planLabel, selectedPlan === 'monthly' && s.planLabelActive]}>月額プラン</Text>
              <Text style={s.planPrice}>¥{MONTHLY_PRICE.toLocaleString('ja-JP')}<Text style={s.planUnit}>/月</Text></Text>
            </View>
          </Pressable>

          <Pressable
            style={[s.planCard, selectedPlan === 'yearly' && s.planCardActive]}
            onPress={() => setSelectedPlan('yearly')}
          >
            <View style={[s.planRadio, selectedPlan === 'yearly' && s.planRadioActive]}>
              {selectedPlan === 'yearly' && <View style={s.planRadioInner} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.planLabel, selectedPlan === 'yearly' && s.planLabelActive]}>年額プラン</Text>
              <Text style={s.planPrice}>¥{YEARLY_PRICE.toLocaleString('ja-JP')}<Text style={s.planUnit}>/年</Text></Text>
              <View style={s.saveBadge}>
                <Text style={s.saveBadgeTxt}>2ヶ月お得</Text>
              </View>
            </View>
          </Pressable>
        </View>

        <Text style={s.priceNote}>
          {selectedPlan === 'yearly'
            ? `¥${Math.round(YEARLY_PRICE / 12).toLocaleString('ja-JP')}/月換算 · いつでも解約可能`
            : `¥${MONTHLY_PRICE.toLocaleString('ja-JP')}/月 · いつでも解約可能`}
        </Text>

        {/* 購入ボタン */}
        <Pressable style={s.buyBtn} onPress={handlePurchase}>
          <Text style={s.buyBtnTxt}>
            プレミアムにする —
            {selectedPlan === 'yearly'
              ? ` ¥${YEARLY_PRICE.toLocaleString('ja-JP')}/年`
              : ` ¥${MONTHLY_PRICE.toLocaleString('ja-JP')}/月`}
          </Text>
        </Pressable>

        <Pressable style={s.skipBtn} onPress={handleClose}>
          <Text style={s.skipBtnTxt}>今はやめておく</Text>
        </Pressable>

        <Text style={s.legal}>
          ご購入確定後は返金できません。定期課金は更新日の24時間前までにキャンセルしない限り自動更新されます。
        </Text>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  closeRow: {
    alignSelf: 'flex-end', margin: 16,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.07)',
    justifyContent: 'center', alignItems: 'center',
  },
  closeTxt: { fontSize: 13, color: C.textSecondary },

  content: { paddingHorizontal: 20, paddingBottom: 40 },

  headerWrap: { alignItems: 'center', marginBottom: 28 },
  badge: {
    backgroundColor: '#EEE8FF', paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, marginBottom: 16,
  },
  badgeTxt: { fontSize: 13, fontWeight: '700', color: C.purple },
  headline: {
    fontSize: 26, fontWeight: '800', color: C.textPrimary,
    textAlign: 'center', lineHeight: 34, marginBottom: 10,
  },
  subline: {
    fontSize: 14, color: C.textSecondary, textAlign: 'center', lineHeight: 21,
  },

  featureCard: {
    backgroundColor: C.card, borderRadius: 16,
    borderWidth: 0.5, borderColor: C.border,
    padding: 18, marginBottom: 20,
  },
  featureTitle: {
    fontSize: 13, fontWeight: '700', color: C.textSecondary,
    marginBottom: 14, letterSpacing: 0.5,
  },
  featureRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 7,
  },
  featureCheck: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: C.green,
    justifyContent: 'center', alignItems: 'center',
  },
  featureCheckTxt: { fontSize: 11, color: '#fff', fontWeight: '700' },
  featureIcon: { fontSize: 18, width: 24, textAlign: 'center' },
  featureTxt: { fontSize: 15, color: C.textPrimary, flex: 1 },

  planRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  planCard: {
    flex: 1, backgroundColor: C.card, borderRadius: 14,
    borderWidth: 1.5, borderColor: C.border,
    padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 10,
  },
  planCardActive: { borderColor: C.brand, backgroundColor: '#F0F5FC' },
  planRadio: {
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 2, borderColor: C.textSecondary,
    justifyContent: 'center', alignItems: 'center',
    marginTop: 2,
  },
  planRadioActive: { borderColor: C.brand },
  planRadioInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.brand },
  planLabel: { fontSize: 12, color: C.textSecondary, marginBottom: 4 },
  planLabelActive: { color: C.brand, fontWeight: '600' },
  planPrice: { fontSize: 20, fontWeight: '800', color: C.textPrimary },
  planUnit: { fontSize: 12, fontWeight: '400', color: C.textSecondary },
  saveBadge: {
    backgroundColor: '#FEF3E2', paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 6, alignSelf: 'flex-start', marginTop: 4,
  },
  saveBadgeTxt: { fontSize: 11, color: '#D46000', fontWeight: '600' },

  priceNote: { fontSize: 12, color: C.textSecondary, textAlign: 'center', marginBottom: 16 },

  buyBtn: {
    backgroundColor: C.brand, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginBottom: 12,
    shadowColor: C.brand, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  buyBtnTxt: { fontSize: 16, fontWeight: '700', color: '#fff' },

  skipBtn: { alignItems: 'center', paddingVertical: 12, marginBottom: 16 },
  skipBtnTxt: { fontSize: 14, color: C.textSecondary },

  legal: {
    fontSize: 10, color: C.textSecondary, textAlign: 'center',
    lineHeight: 15, opacity: 0.7,
  },

  // 購入後成功画面
  successWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  successIcon: { fontSize: 72, marginBottom: 20 },
  successTitle: { fontSize: 22, fontWeight: '800', color: C.textPrimary, textAlign: 'center', marginBottom: 10 },
  successSub: { fontSize: 15, color: C.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  successBtn: {
    backgroundColor: C.brand, borderRadius: 14,
    paddingVertical: 16, paddingHorizontal: 40, alignItems: 'center',
  },
  successBtnTxt: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
