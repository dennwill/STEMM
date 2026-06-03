import { useEffect } from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { DURATIONS } from "@/constants/motion";

type Props = {
  /** Progress from 0 to 1. */
  progress: number;
  color?: string;
  trackColor?: string;
  height?: number;
  style?: ViewStyle;
};

/**
 * A progress bar whose fill animates to the target width with timing.
 * Matches the existing dashboard progress-bar look (rounded, 8px).
 */
export function AnimatedProgressBar({
  progress,
  color = "#10B981",
  trackColor = "#E2E8F0",
  height = 8,
  style,
}: Props) {
  const width = useSharedValue(0);

  useEffect(() => {
    const clamped = Math.max(0, Math.min(1, progress));
    width.value = withTiming(clamped, { duration: DURATIONS.slow });
  }, [progress, width]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${width.value * 100}%`,
  }));

  return (
    <View
      style={[
        styles.track,
        { height, borderRadius: height / 2, backgroundColor: trackColor },
        style,
      ]}
    >
      <Animated.View
        style={[styles.fill, { borderRadius: height / 2, backgroundColor: color }, fillStyle]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flex: 1, overflow: "hidden" },
  fill: { height: "100%" },
});
