import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

type Props = {
  color?: string;
  iconSize?: number;
};

export function Logo({ color = '#ffffff', iconSize = 26 }: Props) {
  const w = iconSize * 0.7;
  const h = iconSize;
  return (
    <View style={styles.row}>
      <Svg width={w} height={h} viewBox="0 0 14 20">
        {/* 左の葉 */}
        <Path
          d="M7 13 C7 13 2 9 2 4 C2 4 7 6 7 13Z"
          fill={color}
        />
        {/* 右の葉（やや透過）*/}
        <Path
          d="M7 13 C7 13 12 9 12 4 C12 4 7 6 7 13Z"
          fill={color}
          opacity={0.55}
        />
        {/* 茎 */}
        <Path
          d="M7 13 L7 20"
          stroke={color}
          strokeWidth={1.8}
          strokeLinecap="round"
          fill="none"
        />
      </Svg>
      <Text style={[styles.wordmark, { color, fontSize: iconSize * 0.62 }]}>
        ツカイドキ
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  wordmark: { fontWeight: '800', letterSpacing: 0.5 },
});
