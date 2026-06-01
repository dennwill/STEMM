import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import AdBanner from "@/components/ad-banner";
import { COLORS } from "@/components/auth-shell";
import { auth } from "@/lib/firebase";
import { registerForPushNotifications, scheduleActivityReminder } from "@/lib/notifications";

type ActivityIcon =
  | { lib: "mc"; name: keyof typeof MaterialCommunityIcons.glyphMap }
  | { lib: "ion"; name: keyof typeof Ionicons.glyphMap };

type Activity = { id: string; title: string; icon: ActivityIcon };

const ENGINEERING: Activity[] = [
  { id: "parachute", title: "Parachute Drop Challenge", icon: { lib: "mc", name: "parachute" } },
  { id: "sound", title: "Sound Pollution Hunter", icon: { lib: "ion", name: "volume-high" } },
  { id: "fan", title: "Hand Fan Challenge", icon: { lib: "mc", name: "fan" } },
  {
    id: "earthquake",
    title: "Earthquake-Resistant Structure",
    icon: { lib: "mc", name: "city-variant" },
  },
];

const HEALTH: Activity[] = [
  { id: "performance", title: "Human Performance Lab", icon: { lib: "mc", name: "human-handsup" } },
  { id: "reaction", title: "Reaction Board Challenge", icon: { lib: "mc", name: "timer-outline" } },
  { id: "breathing", title: "Breathing Pace Trainer", icon: { lib: "mc", name: "face-man-profile" } },
];

function ActivityGlyph({ icon, size }: { icon: ActivityIcon; size: number }) {
  if (icon.lib === "ion") {
    return <Ionicons name={icon.name} size={size} color={COLORS.primary} />;
  }
  return <MaterialCommunityIcons name={icon.name} size={size} color={COLORS.primary} />;
}

export default function DashboardScreen() {
  const router = useRouter();
  const user = auth.currentUser;

  useEffect(() => {
    if (!user) {
      router.replace("/(auth)/login" as any);
      return;
    }

    // Register push notification token on mount
    registerForPushNotifications().catch((err) => {
      console.warn("Could not register push notifications:", err);
    });
  }, [router, user]);

  // Activities with a built screen route here; the rest stay inert until built.
  const ROUTES: Record<string, string> = {
    parachute: "/parachute",
    sound: "/sound",
    fan: "/fan",
    earthquake: "/earthquake",
    performance: "/performance",
    reaction: "/reaction",
    breathing: "/breathing",
  };

  const openActivity = (activity: Activity) => {
    const route = ROUTES[activity.id];
    if (route) {
      router.push(route as any);
      // Schedule a reminder when user starts an activity
      scheduleActivityReminder(activity.title, 5).catch((err) => {
        console.warn("Could not schedule activity reminder:", err);
      });
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.logo}>STEMM</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>Activities</Text>

        <Text style={styles.sectionTitle}>Engineering Challenges</Text>
        <View style={styles.grid}>
          {ENGINEERING.map((activity) => (
            <Pressable
              key={activity.id}
              style={styles.gridCard}
              onPress={() => openActivity(activity)}
            >
              <View style={styles.gridIcon}>
                <ActivityGlyph icon={activity.icon} size={40} />
              </View>
              <Text style={styles.gridLabel}>{activity.title}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Health and Medical Sciences</Text>
        <View style={styles.list}>
          {HEALTH.map((activity) => (
            <Pressable
              key={activity.id}
              style={styles.listRow}
              onPress={() => openActivity(activity)}
            >
              <Text style={styles.listLabel}>{activity.title}</Text>
              <ActivityGlyph icon={activity.icon} size={30} />
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Tools</Text>
        <View style={styles.grid}>
          <Pressable style={styles.gridCard} onPress={() => router.push("/map" as any)}>
            <View style={styles.gridIcon}>
              <Ionicons name="map-outline" size={40} color={COLORS.primary} />
            </View>
            <Text style={styles.gridLabel}>Activity Map</Text>
          </Pressable>
        </View>

        <AdBanner style={styles.adBanner} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 28,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  logo: { color: COLORS.white, fontSize: 34, fontWeight: "900", letterSpacing: -1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 24 },
  pageTitle: {
    color: COLORS.primary,
    fontSize: 32,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 24,
  },
  sectionTitle: {
    color: COLORS.inputText,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 14,
    marginTop: 8,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 16,
    marginBottom: 12,
  },
  gridCard: {
    width: "48%",
    backgroundColor: COLORS.white,
    borderRadius: 14,
    paddingVertical: 22,
    paddingHorizontal: 12,
    alignItems: "center",
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  gridIcon: { height: 44, alignItems: "center", justifyContent: "center" },
  gridLabel: {
    color: COLORS.inputText,
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  list: { gap: 14 },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.white,
    borderRadius: 14,
    paddingVertical: 22,
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  listLabel: { color: COLORS.inputText, fontSize: 15, fontWeight: "600", flex: 1, paddingRight: 12 },
  adBanner: { marginTop: 24, marginBottom: 12 },
});
