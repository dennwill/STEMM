import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { sendEmailVerification } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

import AdBanner from "@/components/ad-banner";
import { AnimatedProgressBar } from "@/components/animated-progress-bar";
import { PressableScale } from "@/components/pressable-scale";
import { auth, firestore, trackEvent } from "@/lib/firebase";
import { registerForPushNotifications, scheduleActivityReminder } from "@/lib/notifications";
import { Palette, useTheme, useThemedStyles } from "@/lib/theme";

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

function ActivityGlyph({ icon, size, color }: { icon: ActivityIcon; size: number; color: string }) {
  if (icon.lib === "ion") {
    return <Ionicons name={icon.name} size={size} color={color} />;
  }
  return <MaterialCommunityIcons name={icon.name} size={size} color={color} />;
}

export default function DashboardScreen() {
  const router = useRouter();
  const user = auth.currentUser;
  const { palette: c, activityThemes: ACTIVITY_THEMES } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const [userName, setUserName] = useState<string>("");
  const [teamName, setTeamName] = useState<string>("");
  const [emailVerified, setEmailVerified] = useState<boolean>(user?.emailVerified ?? true);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent">("idle");
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboard = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!user) return;
      if (opts?.silent) setRefreshing(true);

      // Refresh the cached verification flag so a just-verified user loses the banner.
      try {
        await user.reload();
      } catch {
        // Fall back to the cached flag if the reload fails.
      }
      setEmailVerified(user.emailVerified);

      // Fetch user profile and team details
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
      } finally {
        if (opts?.silent) setRefreshing(false);
      }
    },
    [user],
  );

  const handleRefresh = useCallback(() => loadDashboard({ silent: true }), [loadDashboard]);

  useEffect(() => {
    if (!user) {
      router.replace("/(auth)/login" as any);
      return;
    }

    // Register push notification token on mount
    registerForPushNotifications().catch((err) => {
      console.warn("Could not register push notifications:", err);
    });

    loadDashboard();
  }, [loadDashboard, router, user]);

  const ROUTES: Record<string, string> = {
    parachute: "/parachute",
    sound: "/sound",
    fan: "/fan",
    earthquake: "/earthquake",
    performance: "/performance",
    reaction: "/reaction",
    breathing: "/breathing",
  };

  const resendVerification = async () => {
    const current = auth.currentUser;
    if (!current || resendState === "sending") return;
    setResendState("sending");
    try {
      await sendEmailVerification(current);
      trackEvent("verification_email_sent", { source: "dashboard_banner" });
      setResendState("sent");
    } catch (err) {
      console.warn("Could not resend verification email:", err);
      setResendState("idle");
    }
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
          <PressableScale
            style={styles.avatarBtn}
            onPress={() => router.push("/team" as any)}
          >
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitials}>
                {userName ? userName.charAt(0).toUpperCase() : "M"}
              </Text>
            </View>
          </PressableScale>
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

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={c.primary}
            colors={[c.primary]}
          />
        }
      >
        {!emailVerified && !bannerDismissed && (
          <Animated.View entering={FadeInDown.duration(400).springify()} style={styles.verifyBanner}>
            <View style={styles.verifyIcon}>
              <Ionicons name="mail-unread-outline" size={20} color="#B45309" />
            </View>
            <View style={styles.verifyContent}>
              <Text style={styles.verifyTitle}>Verify your email</Text>
              <Text style={styles.verifyText}>
                Confirm your email address to secure your account.
              </Text>
              <PressableScale
                onPress={resendVerification}
                disabled={resendState !== "idle"}
                style={styles.verifyAction}
              >
                <Text style={styles.verifyActionText}>
                  {resendState === "sending"
                    ? "Sending…"
                    : resendState === "sent"
                      ? "✓ Email sent — check your inbox"
                      : "Resend verification email"}
                </Text>
              </PressableScale>
            </View>
            <PressableScale
              onPress={() => setBannerDismissed(true)}
              hitSlop={10}
              style={styles.verifyClose}
            >
              <Ionicons name="close" size={18} color="#92400E" />
            </PressableScale>
          </Animated.View>
        )}

        {/* Progress Metrics Bar */}
        <Animated.View entering={FadeInDown.duration(400).springify()} style={styles.metricsCard}>
          <View style={styles.metricsHeader}>
            <Text style={styles.metricsTitle}>STEMM Sprint Goal</Text>
            <Text style={styles.metricsBadge}>Sprint 3</Text>
          </View>
          <Text style={styles.metricsSub}>
            Explore and complete activity challenges to sync team data
          </Text>
          <View style={styles.progressContainer}>
            <AnimatedProgressBar progress={0.85} color="#10B981" trackColor="#E2E8F0" height={8} />
            <Text style={styles.progressText}>85% Sprint Progress</Text>
          </View>
        </Animated.View>

        <Text style={styles.sectionTitle}>Engineering Challenges</Text>
        <View style={styles.grid}>
          {ENGINEERING.map((activity, i) => {
            const theme = ACTIVITY_THEMES[activity.id] || ACTIVITY_THEMES.parachute;
            return (
              <Animated.View
                key={activity.id}
                entering={FadeInDown.delay(i * 60).springify()}
                style={styles.gridCardWrap}
              >
                <PressableScale
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
                </PressableScale>
              </Animated.View>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>Health and Medical Sciences</Text>
        <View style={styles.list}>
          {HEALTH.map((activity, i) => {
            const theme = ACTIVITY_THEMES[activity.id] || ACTIVITY_THEMES.performance;
            return (
              <Animated.View
                key={activity.id}
                entering={FadeInDown.delay(240 + i * 60).springify()}
              >
                <PressableScale
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
                </PressableScale>
              </Animated.View>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>Tools</Text>
        <View style={styles.list}>
          <Animated.View entering={FadeInDown.delay(420).springify()}>
            <PressableScale
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
            </PressableScale>
          </Animated.View>
        </View>

        <AdBanner style={styles.adBanner} />
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.bg },
  header: {
    backgroundColor: c.primary,
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
  logo: { color: c.white, fontSize: 36, fontWeight: "900", letterSpacing: -1 },
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
    borderColor: c.white,
  },
  avatarInitials: {
    color: c.white,
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
    color: c.white,
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
  verifyBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFFBEB", // Amber 50
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#FDE68A", // Amber 200
    gap: 12,
  },
  verifyIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FEF3C7", // Amber 100
    alignItems: "center",
    justifyContent: "center",
  },
  verifyContent: { flex: 1 },
  verifyTitle: { fontSize: 14, fontWeight: "800", color: "#92400E" },
  verifyText: { fontSize: 12, color: "#B45309", marginTop: 2, lineHeight: 17 },
  verifyAction: { marginTop: 8, alignSelf: "flex-start" },
  verifyActionText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#B45309",
    textDecorationLine: "underline",
  },
  verifyClose: { padding: 2 },
  metricsCard: {
    backgroundColor: c.white,
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
    color: c.primary,
  },
  metricsBadge: {
    fontSize: 11,
    fontWeight: "700",
    color: c.primary,
    backgroundColor: "rgba(7, 76, 92, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    overflow: "hidden",
  },
  metricsSub: {
    fontSize: 12,
    color: c.muted,
    marginTop: 4,
    marginBottom: 16,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  progressText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F766E",
  },
  sectionTitle: {
    color: c.primary,
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
  gridCardWrap: {
    width: "48%",
  },
  gridCard: {
    width: "100%",
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
    color: c.muted,
    marginTop: 2,
    fontWeight: "500",
  },
  adBanner: { marginTop: 12, marginBottom: 12 },
  });
