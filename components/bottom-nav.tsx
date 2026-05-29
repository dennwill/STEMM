import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { COLORS } from "@/components/auth-shell";

export type NavTab = "leaderboard" | "dashboard" | "team";

export function BottomNav({ state, navigation, insets }: BottomTabBarProps) {
  const active = state.routes[state.index]?.name as NavTab;

  const go = (tab: NavTab) => {
    if (tab !== active) navigation.navigate(tab);
  };

  return (
    <View style={[styles.wrap, { paddingBottom: insets.bottom }]}>
      <View style={styles.bar}>
        <Pressable style={styles.sideItem} onPress={() => go("leaderboard")} hitSlop={8}>
          <Ionicons
            name={active === "leaderboard" ? "trophy" : "trophy-outline"}
            size={26}
            color={active === "leaderboard" ? COLORS.primary : COLORS.muted}
          />
          <Text style={[styles.sideLabel, active === "leaderboard" && styles.activeLabel]}>
            Leaderboard
          </Text>
        </Pressable>

        <View style={styles.centerSlot} />

        <Pressable style={styles.sideItem} onPress={() => go("team")} hitSlop={8}>
          <Ionicons
            name={active === "team" ? "people" : "people-outline"}
            size={26}
            color={active === "team" ? COLORS.primary : COLORS.muted}
          />
          <Text style={[styles.sideLabel, active === "team" && styles.activeLabel]}>Team</Text>
        </Pressable>
      </View>

      <View style={styles.centerButton} pointerEvents="box-none">
        <Pressable onPress={() => go("dashboard")} hitSlop={8} style={styles.centerPressable}>
          <View style={[styles.centerCircle, active === "dashboard" && styles.centerCircleActive]}>
            <Ionicons
              name="grid-outline"
              size={26}
              color={active === "dashboard" ? COLORS.primary : COLORS.muted}
            />
          </View>
          <Text style={[styles.centerLabel, active === "dashboard" && styles.activeLabel]}>
            Dashboard
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: COLORS.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.input,
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
  sideLabel: { fontSize: 12, color: COLORS.muted },
  activeLabel: { color: COLORS.primary, fontWeight: "700" },
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
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.input,
    // boxShadow clips to borderRadius (round shadow) on every platform,
    // unlike legacy elevation which can render a square shadow on Android.
    boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.15)",
  },
  centerCircleActive: { borderWidth: 2, borderColor: COLORS.primary },
  centerLabel: { fontSize: 12, color: COLORS.muted },
});
