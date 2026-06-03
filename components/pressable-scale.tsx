import * as Haptics from "expo-haptics";
import { forwardRef } from "react";
import { Pressable, PressableProps } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { PRESS_SCALE, SPRINGS } from "@/constants/motion";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = PressableProps & {
  /** Fire a light haptic tick on press-in. Defaults to true. */
  haptic?: boolean;
  /** How far to scale down on press. Defaults to PRESS_SCALE (0.96). */
  pressScale?: number;
};

/**
 * A drop-in replacement for Pressable that springs down on press and gives a
 * light haptic tick — the shared press-feedback primitive used across the app.
 */
export const PressableScale = forwardRef<typeof AnimatedPressable, Props>(
  function PressableScale(
    { haptic = true, pressScale = PRESS_SCALE, disabled, onPressIn, onPressOut, style, ...rest },
    ref
  ) {
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));

    return (
      <AnimatedPressable
        ref={ref as any}
        disabled={disabled}
        onPressIn={(e) => {
          if (!disabled) {
            scale.value = withSpring(pressScale, SPRINGS.press);
            if (haptic) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            }
          }
          onPressIn?.(e);
        }}
        onPressOut={(e) => {
          scale.value = withSpring(1, SPRINGS.press);
          onPressOut?.(e);
        }}
        style={[animatedStyle, style as any]}
        {...rest}
      />
    );
  }
);
