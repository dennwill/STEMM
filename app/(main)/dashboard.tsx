import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { doc, getDoc } from "firebase/firestore";

import AdBanner from "@/components/ad-banner";
import { COLORS } from "@/components/auth-shell";
import { auth, firestore, trackEvent } from "@/lib/firebase";
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

type ActivityTheme = {
  bg: string;
  accent: string;
  iconBg: string;
  textColor: string;
};

const ACTIVITY_THEMES: Record<string, ActivityTheme> = {
  parachute: {
    bg: "#F0F9FF",       // Sky 50
    accent: "#0284C7",   // Sky 600
    iconBg: "#E0F2FE",   // Sky 100
    textColor: "#0369A1" // Sky 700
  },
  sound: {
    bg: "#FAF5FF",       // Purple 50
    accent: "#8B5CF6",   // Purple 500
    iconBg: "#F3E8FF",   // Purple 100
    textColor: "#6D28D9" // Purple 700
  },
  fan: {
    bg: "#FFFBEB",       // Amber 50
    accent: "#D97706",   // Amber 600
    iconBg: "#FEF3C7",   // Amber 100
    textColor: "#B45309" // Amber 700
  },
  earthquake: {
    bg: "#FFF1F2",       // Rose 50
    accent: "#E11D48",   // Rose 600
    iconBg: "#FFE4E6",   // Rose 100
    textColor: "#BE123C" // Rose 700
  },
  performance: {
    bg: "#ECFDF5",       // Emerald 50
    accent: "#10B981",   // Emerald 500
    iconBg: "#D1FAE5",   // Emerald 100
    textColor: "#047857" // Emerald 700
  },
  reaction: {
    bg: "#EEF2FF",       // Indigo 50
    accent: "#6366F1",   // Indigo 500
    iconBg: "#E0E7FF",   // Indigo 100
    textColor: "#4338CA" // Indigo 700
  },
  breathing: {
    bg: "#F0FDFA",       // Teal 50
    accent: "#14B8A6",   // Teal 500
    iconBg: "#CCFBF1",   // Teal 100
    textColor: "#0F766E" // Teal 700
  },
  map: {
    bg: "#EFF6FF",       // Blue 50
    accent: "#3B82F6",   // Blue 500
    iconBg: "#DBEAFE",   // Blue 100
    textColor: "#1D4ED8" // Blue 700
  }
};

function ActivityGlyph({ icon, size, color }: { icon: ActivityIcon; size: number; color: string }) {
  if (icon.lib === "ion") {
    return <Ionicons name={icon.name} size={size} color={color} />;
  }
  return <MaterialCommunityIcons name={icon.name} size={size} color={color} />;
}

export default function DashboardScreen() {
  const router = useRouter();
  const user = auth.currentUser;

  const [userName, setUserName] = useState<string>("");
  const [teamName, setTeamName] = useState<string>("");

  useEffect(() => {
    if (!user) {
      router.replace("/(auth)/login" as any);
      return;
    }

    // Register push notification token on mount
    registerForPushNotifications().catch((err) => {
      console.warn("Could not register push notifications:", err);
    });

    // Fetch user profile and team details
    const fetchProfile = async () => {
      try {
        const userSnap = await getDoc(doc(firestore, "users", user.uid));
        if (userSnap.exists()) {
          const userData = userSnap.data() as { first_name?: string; team_id?: string };
          if (userData.first_name) {
            setUserName(userData.first_name);
          }
          if (userData.team_id) {
            const teamSnap = await getDoc(doc(firestore, "teams", userData.team_id));
            if (teamSnap.exists()) {
              const teamData = teamSnap.data() as { team_name?: string };
              if (teamData.team_name) {
                setTeamName(teamData.team_name);
              }
            }
          }
        }
      } catch {
        console.log("Could not fetch user/team details for greeting banner (using default style).");
      }
    };
    
    fetchProfile();
  }, [router, user]);

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
      router.push({ pathname: route as any, params: { activityTitle: activity.title } });
      trackEvent("activity_opened", { activity_id: activity.id, activity_title: activity.title });
      scheduleActivityReminder(activity.title, 5).catch((err) => {
        console.warn("Could not schedule activity reminder:", err);
      });
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.logo}>STEMM</Text>
          <Pressable 
            style={styles.avatarBtn} 
            onPress={() => router.push("/team" as any)}
          >
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitials}>
                {userName ? userName.charAt(0).toUpperCase() : "M"}
              </Text>
            </View>
          </Pressable>
        </View>
        <View style={styles.welcomeContainer}>
          <Text style={styles.welcomeText}>
            Hello, <Text style={styles.userName}>{userName || "Student"}</Text> 👋
          </Text>
          <Text style={styles.subWelcomeText}>
            {teamName ? `🚀 Team: ${teamName}` : "🏆 Join or create a team in the Team tab"}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Progress Metrics Bar */}
        <View style={styles.metricsCard}>
          <View style={styles.metricsHeader}>
            <Text style={styles.metricsTitle}>STEMM Sprint Goal</Text>
            <Text style={styles.metricsBadge}>Sprint 3</Text>
          </View>
          <Text style={styles.metricsSub}>
            Explore and complete activity challenges to sync team data
          </Text>
          <View style={styles.progressContainer}>
            <View style={styles.progressBarBg}>
              <View style={styles.progressBarFill} />
            </View>
            <Text style={styles.progressText}>85% Sprint Progress</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Engineering Challenges</Text>
        <View style={styles.grid}>
          {ENGINEERING.map((activity) => {
            const theme = ACTIVITY_THEMES[activity.id] || ACTIVITY_THEMES.parachute;
            return (
              <Pressable
                key={activity.id}
                style={[styles.gridCard, { backgroundColor: theme.bg }]}
                onPress={() => openActivity(activity)}
              >
                <View style={[styles.gridIconContainer, { backgroundColor: theme.iconBg }]}>
                  <ActivityGlyph icon={activity.icon} size={28} color={theme.accent} />
                </View>
                <View style={styles.gridInfo}>
                  <Text style={[styles.gridLabel, { color: theme.textColor }]} numberOfLines={2}>
                    {activity.title}
                  </Text>
                  <View style={styles.cardFooter}>
                    <Text style={[styles.cardLinkText, { color: theme.accent }]}>Start</Text>
                    <Ionicons name="arrow-forward-sharp" size={14} color={theme.accent} />
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>Health and Medical Sciences</Text>
        <View style={styles.list}>
          {HEALTH.map((activity) => {
            const theme = ACTIVITY_THEMES[activity.id] || ACTIVITY_THEMES.performance;
            return (
              <Pressable
                key={activity.id}
                style={[styles.listRow, { backgroundColor: theme.bg }]}
                onPress={() => openActivity(activity)}
              >
                <View style={[styles.listIconContainer, { backgroundColor: theme.iconBg }]}>
                  <ActivityGlyph icon={activity.icon} size={24} color={theme.accent} />
                </View>
                <View style={styles.listContent}>
                  <Text style={[styles.listLabel, { color: theme.textColor }]}>{activity.title}</Text>
                  <Text style={styles.listSubLabel}>Measure and log bio-data metrics</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.accent} />
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>Tools</Text>
        <View style={styles.list}>
          <Pressable 
            style={[styles.listRow, { backgroundColor: ACTIVITY_THEMES.map.bg }]} 
            onPress={() => router.push("/map" as any)}
          >
            <View style={[styles.listIconContainer, { backgroundColor: ACTIVITY_THEMES.map.iconBg }]}>
              <Ionicons name="map" size={24} color={ACTIVITY_THEMES.map.accent} />
            </View>
            <View style={styles.listContent}>
              <Text style={[styles.listLabel, { color: ACTIVITY_THEMES.map.textColor }]}>
                Interactive Activity Map
              </Text>
              <Text style={styles.listSubLabel}>Track and discover STEMM challenges around campus</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={ACTIVITY_THEMES.map.accent} />
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
    paddingTop: 16,
    paddingBottom: 28,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    boxShadow: "0px 6px 16px rgba(7, 76, 92, 0.15)",
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logo: { color: COLORS.white, fontSize: 36, fontWeight: "900", letterSpacing: -1 },
  avatarBtn: {
    padding: 2,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: COLORS.white,
  },
  avatarInitials: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "700",
  },
  welcomeContainer: {
    marginTop: 18,
  },
  welcomeText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 16,
    fontWeight: "500",
  },
  userName: {
    color: COLORS.white,
    fontWeight: "800",
    fontSize: 20,
  },
  subWelcomeText: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 4,
  },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 32 },
  metricsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 18,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.03)",
    boxShadow: "0px 8px 24px rgba(0, 0, 0, 0.05)",
  },
  metricsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metricsTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.primary,
  },
  metricsBadge: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.primary,
    backgroundColor: "rgba(7, 76, 92, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    overflow: "hidden",
  },
  metricsSub: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 4,
    marginBottom: 16,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  progressBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: "#E2E8F0",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    width: "85%",
    height: "100%",
    backgroundColor: "#10B981", // Beautiful green progress
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F766E",
  },
  sectionTitle: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 14,
    marginTop: 12,
    letterSpacing: -0.2,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 16,
    marginBottom: 16,
  },
  gridCard: {
    width: "48%",
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 14,
    alignItems: "center",
    gap: 14,
    borderWidth: 1.5,
    borderColor: "rgba(0, 0, 0, 0.02)",
    boxShadow: "0px 6px 16px rgba(0, 0, 0, 0.03)",
  },
  gridIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.04)",
  },
  gridInfo: {
    alignItems: "center",
    gap: 10,
    width: "100%",
  },
  gridLabel: {
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 18,
    height: 36, // Keep aligned height
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  cardLinkText: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  list: { gap: 14, marginBottom: 16 },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: "rgba(0, 0, 0, 0.02)",
    boxShadow: "0px 6px 16px rgba(0, 0, 0, 0.03)",
  },
  listIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4,
  },
  listContent: {
    flex: 1,
    paddingRight: 8,
  },
  listLabel: {
    fontSize: 15,
    fontWeight: "700",
  },
  listSubLabel: {
    fontSize: 12,
    color: "rgba(0, 0, 0, 0.4)",
    marginTop: 2,
    fontWeight: "500",
  },
  adBanner: { marginTop: 12, marginBottom: 12 },
});
