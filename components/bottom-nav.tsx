import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { PressableScale } from "@/components/pressable-scale";
import { SPRINGS } from "@/constants/motion";
import { Palette, useTheme, useThemedStyles } from "@/lib/theme";

export type NavTab = "leaderboard" | "dashboard" | "team";

/** A side tab whose icon springs up slightly when it becomes active. */
function NavItem({
  active,
  onPress,
  activeIcon,
  inactiveIcon,
  label,
}: {
  active: boolean;
  onPress: () => void;
  activeIcon: keyof typeof Ionicons.glyphMap;
  inactiveIcon: keyof typeof Ionicons.glyphMap;
  label: string;
}) {
  const { palette: c } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const scale = useSharedValue(active ? 1.15 : 1);

  useEffect(() => {
    scale.value = withSpring(active ? 1.15 : 1, SPRINGS.bouncy);
  }, [active, scale]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <PressableScale style={styles.sideItem} onPress={onPress} hitSlop={8} haptic={!active}>
      <Animated.View style={iconStyle}>
        <Ionicons
          name={active ? activeIcon : inactiveIcon}
          size={26}
          color={active ? c.primary : c.muted}
        />
      </Animated.View>
      <Text style={[styles.sideLabel, active && styles.activeLabel]}>{label}</Text>
    </PressableScale>
  );
}

export function BottomNav({ state, navigation, insets }: BottomTabBarProps) {
  const { palette: c } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const active = state.routes[state.index]?.name as NavTab;

  const go = (tab: NavTab) => {
    if (tab !== active) navigation.navigate(tab);
  };

  const dashActive = active === "dashboard";
  const circleScale = useSharedValue(dashActive ? 1 : 1);

  useEffect(() => {
    // A little pop when Dashboard becomes the active tab.
    circleScale.value = withSpring(dashActive ? 1.08 : 1, SPRINGS.bouncy);
  }, [dashActive, circleScale]);

  const circleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: circleScale.value }],
  }));

  return (
    <View style={[styles.wrap, { paddingBottom: insets.bottom }]}>
      <View style={styles.bar}>
        <NavItem
          active={active === "leaderboard"}
          onPress={() => go("leaderboard")}
          activeIcon="trophy"
          inactiveIcon="trophy-outline"
          label="Leaderboard"
        />

        <View style={styles.centerSlot} />

        <NavItem
          active={active === "team"}
          onPress={() => go("team")}
          activeIcon="people"
          inactiveIcon="people-outline"
          label="Team"
        />
      </View>

      <View style={styles.centerButton} pointerEvents="box-none">
        <PressableScale onPress={() => go("dashboard")} hitSlop={8} style={styles.centerPressable}>
          <Animated.View
            style={[styles.centerCircle, dashActive && styles.centerCircleActive, circleStyle]}
          >
            <Ionicons
              name="grid-outline"
              size={26}
              color={dashActive ? c.primary : c.muted}
            />
          </Animated.View>
          <Text style={[styles.centerLabel, dashActive && styles.activeLabel]}>Games</Text>
        </PressableScale>
      </View>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    wrap: {
      backgroundColor: c.white,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.input,
    },
    bar: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      paddingTop: 10,
      paddingBottom: 8,
      paddingHorizontal: 16,
    },
    sideItem: { alignItems: "center", gap: 4, width: 96, paddingTop: 6 },
    sideLabel: { fontSize: 12, color: c.muted },
    activeLabel: { color: c.primary, fontWeight: "700" },
    centerSlot: { width: 96 },
    centerButton: {
      position: "absolute",
      left: 0,
      right: 0,
      top: -28,
      alignItems: "center",
    },
    centerPressable: { alignItems: "center", gap: 4 },
    centerCircle: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: c.white,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.input,
      // boxShadow clips to borderRadius (round shadow) on every platform,
      // unlike legacy elevation which can render a square shadow on Android.
      boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.15)",
    },
    centerCircleActive: { borderWidth: 2, borderColor: c.primary },
    centerLabel: { fontSize: 12, color: c.muted },
  });
