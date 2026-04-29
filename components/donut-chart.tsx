import Svg, { Circle, G } from 'react-native-svg';
import { View, Text, StyleSheet } from 'react-native';
import { neutral } from '@/constants/colors';
import { typography } from '@/constants/theme';

export type ChartSegment = { color: string; value: number };

type DonutChartProps = {
  segments: ChartSegment[];
  size?: number;
  thickness?: number;
  centerLabel: string;
  centerSub: string;
};

export function DonutChart({ segments, size = 90, thickness = 10, centerLabel, centerSub }: DonutChartProps) {
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const cx = size / 2;
  const cy = size / 2;

  const segData: { color: string; segLength: number; rotation: number }[] = [];
  let startAngle = -90;
  for (const seg of segments) {
    const segAngle = (seg.value / total) * 360;
    const segLength = (seg.value / total) * circumference;
    segData.push({ color: seg.color, segLength, rotation: startAngle });
    startAngle += segAngle;
  }

  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFillObject}>
        {total === 0 ? (
          <Circle cx={cx} cy={cy} r={radius} fill="none" stroke={neutral.divider} strokeWidth={thickness} />
        ) : (
          <>
            {segData.map(({ color, segLength, rotation }, i) => (
              <G key={i} rotation={rotation} origin={`${cx},${cy}`}>
                <Circle
                  cx={cx} cy={cy} r={radius}
                  fill="none"
                  stroke={color}
                  strokeWidth={thickness}
                  strokeDasharray={`${segLength} ${circumference}`}
                />
              </G>
            ))}
            {segData.length > 1 && segData.map(({ rotation }, i) => (
              <G key={`sep-${i}`} rotation={rotation} origin={`${cx},${cy}`}>
                <Circle
                  cx={cx} cy={cy} r={radius}
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.85)"
                  strokeWidth={thickness}
                  strokeDasharray={`2 ${circumference}`}
                />
              </G>
            ))}
          </>
        )}
      </Svg>
      <View style={styles.center}>
        <Text style={styles.label}>{centerLabel}</Text>
        <Text style={styles.sub}>{centerSub}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center' },
  label: { fontSize: 16, fontFamily: typography.displaySemiBold, color: neutral.text.primary },
  sub: { fontSize: 9, color: neutral.text.mid, marginTop: 1, fontFamily: typography.display },
});
