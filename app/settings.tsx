import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Battery from "expo-battery";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { cancelAllNotifications, registerForPushNotifications } from "@/lib/notifications";
import { Palette, useTheme, useThemedStyles } from "@/lib/theme";

type BatteryIconName =
  | "battery"
  | "battery-charging"
  | "battery-outline"
  | "battery-low"
  | "battery-medium"
  | "battery-high";

function getBatteryIcon(level: number, state: Battery.BatteryState): BatteryIconName {
  if (state === Battery.BatteryState.CHARGING) return "battery-charging";
  if (level < 0) return "battery-outline";
  if (level < 0.2) return "battery-low";
  if (level < 0.5) return "battery-medium";
  if (level < 0.8) return "battery-high";
  return "battery";
}

function getBatteryStateLabel(state: Battery.BatteryState): string {
  switch (state) {
    case Battery.BatteryState.CHARGING:
      return "Charging";
    case Battery.BatteryState.FULL:
      return "Full";
    case Battery.BatteryState.UNPLUGGED:
      return "Unplugged";
    default:
      return "Unknown";
  }
}

function getBatteryColor(level: number, c: Palette): string {
  if (level < 0) return c.muted;
  if (level < 0.2) return c.error;
  if (level < 0.5) return "#D97706";
  return "#16A34A";
}

export default function SettingsScreen() {
  const router = useRouter();
  const { palette: c, isDark, setMode } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [batteryLevel, setBatteryLevel] = useState(-1);
  const [batteryState, setBatteryState] = useState(Battery.BatteryState.UNKNOWN);
  const [lowPowerMode, setLowPowerMode] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  useEffect(() => {
    Battery.getBatteryLevelAsync().then(setBatteryLevel).catch(() => setBatteryLevel(-1));
    Battery.getBatteryStateAsync()
      .then(setBatteryState)
      .catch(() => setBatteryState(Battery.BatteryState.UNKNOWN));
    Battery.isLowPowerModeEnabledAsync().then(setLowPowerMode).catch(() => setLowPowerMode(false));

    if (Platform.OS === "web") {
      return undefined;
    }

    const subscriptions: { remove: () => void }[] = [];
    const levelSub = Battery.addBatteryLevelListener(({ batteryLevel: lvl }) => {
      setBatteryLevel(lvl);
    });
    subscriptions.push(levelSub);

    const stateSub = Battery.addBatteryStateListener(({ batteryState: st }) => {
      setBatteryState(st);
    });
    subscriptions.push(stateSub);

    const lpSub = Battery.addLowPowerModeListener(({ lowPowerMode: lp }) => {
      setLowPowerMode(lp);
    });
    subscriptions.push(lpSub);

    return () => {
      subscriptions.forEach((sub) => sub.remove());
    };
  }, []);

  const handleNotificationToggle = async (value: boolean) => {
    setNotificationsEnabled(value);
    if (!value) {
      await cancelAllNotifications();
    } else {
      await registerForPushNotifications();
    }
  };

  const pct = batteryLevel < 0 ? "—" : `${Math.round(batteryLevel * 100)}%`;
  const iconName = getBatteryIcon(batteryLevel, batteryState);
  const iconColor = getBatteryColor(batteryLevel, c);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Text style={styles.backArrow}>‹</Text>
        </Pressable>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Battery */}
        <Text style={styles.sectionLabel}>Battery</Text>
        <View style={styles.card}>
          <View style={styles.batteryHero}>
            <MaterialCommunityIcons name={iconName} size={56} color={iconColor} />
            <Text style={[styles.batteryPct, { color: iconColor }]}>{pct}</Text>
          </View>

          <View style={styles.divider} />

          <SettingsRow label="Status" value={getBatteryStateLabel(batteryState)} />
          <SettingsRow
            label="Low Power Mode"
            value={lowPowerMode ? "On" : "Off"}
            valueColor={lowPowerMode ? "#D97706" : c.muted}
          />
        </View>

        {/* Appearance */}
        <Text style={styles.sectionLabel}>Appearance</Text>
        <View style={styles.card}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <MaterialCommunityIcons name="weather-night" size={22} color={c.primary} />
              <Text style={styles.toggleLabel}>Dark Mode</Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={(value) => setMode(value ? "dark" : "light")}
              trackColor={{ false: c.input, true: c.primary }}
              thumbColor={c.white}
            />
          </View>
        </View>

        {/* Notifications */}
        <Text style={styles.sectionLabel}>Notifications</Text>
        <View style={styles.card}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <MaterialCommunityIcons name="bell-outline" size={22} color={c.primary} />
              <Text style={styles.toggleLabel}>Push Notifications</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleNotificationToggle}
              trackColor={{ false: c.input, true: c.primary }}
              thumbColor={c.white}
            />
          </View>
        </View>

        {/* App Info */}
        <Text style={styles.sectionLabel}>App Info</Text>
        <View style={styles.card}>
          <SettingsRow label="App Name" value="STEMM" />
          <SettingsRow label="Version" value="1.0.0" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingsRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.settingsRow}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, valueColor ? { color: valueColor } : undefined]}>
        {value}
      </Text>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 12,
    },
    backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
    backArrow: { color: c.primary, fontSize: 34, fontWeight: "700", lineHeight: 36 },
    title: { color: c.primary, fontSize: 22, fontWeight: "800", marginLeft: 8, flex: 1 },

    scrollContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32 },

    sectionLabel: {
      color: c.muted,
      fontSize: 13,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.8,
      marginTop: 20,
      marginBottom: 8,
      marginLeft: 4,
    },

    card: {
      backgroundColor: c.white,
      borderRadius: 16,
      padding: 20,
      boxShadow: "0px 1px 6px rgba(0, 0, 0, 0.05)",
    },

    batteryHero: { alignItems: "center", paddingVertical: 12, gap: 8 },
    batteryPct: { fontSize: 36, fontWeight: "800", fontVariant: ["tabular-nums"] },

    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: c.input,
      marginVertical: 16,
    },

    settingsRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 10,
    },
    rowLabel: { color: c.inputText, fontSize: 16, fontWeight: "600" },
    rowValue: { color: c.muted, fontSize: 16, fontWeight: "500" },

    toggleRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 4,
    },
    toggleInfo: { flexDirection: "row", alignItems: "center", gap: 10 },
    toggleLabel: { color: c.inputText, fontSize: 16, fontWeight: "600" },
  });
