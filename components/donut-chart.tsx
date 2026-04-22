import Svg, { Circle, G } from 'react-native-svg';
import { View, Text, StyleSheet } from 'react-native';

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

  let startAngle = -90;

  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFillObject}>
        {total === 0 ? (
          <Circle cx={cx} cy={cy} r={radius} fill="none" stroke="rgba(0,197,163,0.15)" strokeWidth={thickness} />
        ) : (
          segments.map((seg, i) => {
            const segAngle = (seg.value / total) * 360;
            const segLength = (seg.value / total) * circumference;
            const rotation = startAngle;
            startAngle += segAngle;
            return (
              <G key={i} rotation={rotation} origin={`${cx},${cy}`}>
                <Circle
                  cx={cx}
                  cy={cy}
                  r={radius}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={thickness}
                  strokeDasharray={`${Math.max(0, segLength - 1.5)} ${circumference}`}
                />
              </G>
            );
          })
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
  label: { fontSize: 12, fontWeight: '700', color: '#161C1E' },
  sub: { fontSize: 8, color: '#ABA8A2', marginTop: 1 },
});
