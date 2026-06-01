import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { COLORS } from "@/components/auth-shell";

const PILLARS = [
  { 
    icon: "flask-outline" as const, 
    label: "Science", 
    desc: "Explore the world through observation and experiment.",
    bg: "#F0F9FF",
    accent: "#0284C7",
    iconBg: "#E0F2FE",
    textColor: "#0369A1"
  },
  { 
    icon: "laptop" as const, 
    label: "Technology", 
    desc: "Use digital tools to measure, record, and analyse.",
    bg: "#FAF5FF",
    accent: "#8B5CF6",
    iconBg: "#F3E8FF",
    textColor: "#6D28D9"
  },
  { 
    icon: "cog-outline" as const, 
    label: "Engineering", 
    desc: "Design, build, and iterate real-world solutions.",
    bg: "#FFFBEB",
    accent: "#D97706",
    iconBg: "#FEF3C7",
    textColor: "#B45309"
  },
  { 
    icon: "calculator-variant-outline" as const, 
    label: "Mathematics", 
    desc: "Apply number sense, measurement, and data skills.",
    bg: "#FFF1F2",
    accent: "#E11D48",
    iconBg: "#FFE4E6",
    textColor: "#BE123C"
  },
  { 
    icon: "heart-pulse" as const, 
    label: "Medical Sciences", 
    desc: "Investigate the human body and health.",
    bg: "#ECFDF5",
    accent: "#10B981",
    iconBg: "#D1FAE5",
    textColor: "#047857"
  },
];

export default function AboutScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.logo}>STEMM</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>About STEMM</Text>

        <View style={styles.card}>
          <Text style={styles.body}>
            STEMM Lab is a hands-on learning app that guides students through
            interactive Science, Technology, Engineering, Mathematics, and
            Medical-Science activities. Each challenge follows a structured
            workflow — predict, experiment, record, and reflect — so students
            build scientific reasoning skills while having fun.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>The Five Pillars</Text>
        {PILLARS.map((p) => (
          <View key={p.label} style={[styles.pillarRow, { backgroundColor: p.bg }]}>
            <View style={[styles.pillarIcon, { backgroundColor: p.iconBg }]}>
              <MaterialCommunityIcons name={p.icon} size={26} color={p.accent} />
            </View>
            <View style={styles.pillarText}>
              <Text style={[styles.pillarLabel, { color: p.textColor }]}>{p.label}</Text>
              <Text style={[styles.pillarDesc, { color: p.textColor }]}>{p.desc}</Text>
            </View>
          </View>
        ))}

        <Text style={styles.sectionTitle}>How It Works</Text>
        <View style={styles.card}>
          {[
            "Choose an activity from the Dashboard.",
            "Read the Instructions and make a Prediction.",
            "Use the Recorder with real device sensors.",
            "Complete the Write-Up and Discussion steps.",
            "Compare results on the Leaderboard!",
          ].map((step, i) => (
            <View key={step} style={styles.stepRow}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepNumber}>{i + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>

        <View style={styles.versionBox}>
          <Text style={styles.versionLabel}>STEMM Lab</Text>
          <Text style={styles.versionValue}>Version 1.0.0</Text>
        </View>
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
  logo: { color: COLORS.white, fontSize: 36, fontWeight: "900", letterSpacing: -1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 32 },
  pageTitle: {
    color: COLORS.primary,
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 20,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.03)",
    boxShadow: "0px 6px 20px rgba(0, 0, 0, 0.04)",
  },
  body: { color: COLORS.inputText, fontSize: 15, lineHeight: 24, fontWeight: "500" },
  sectionTitle: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: "800",
    marginTop: 28,
    marginBottom: 14,
    letterSpacing: -0.2,
  },
  pillarRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 14,
    borderWidth: 1.5,
    borderColor: "rgba(0, 0, 0, 0.02)",
    boxShadow: "0px 6px 16px rgba(0, 0, 0, 0.03)",
  },
  pillarIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.04)",
  },
  pillarText: { flex: 1 },
  pillarLabel: { fontSize: 16, fontWeight: "800" },
  pillarDesc: { fontSize: 13, lineHeight: 18, marginTop: 4, fontWeight: "500", opacity: 0.8 },
  stepRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 10 },
  stepBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0px 3px 8px rgba(7, 76, 92, 0.2)",
  },
  stepNumber: { color: COLORS.white, fontSize: 14, fontWeight: "800" },
  stepText: { color: COLORS.inputText, fontSize: 15, lineHeight: 21, flex: 1, fontWeight: "500" },
  versionBox: { alignItems: "center", marginTop: 36, paddingBottom: 8 },
  versionLabel: { color: COLORS.primary, fontSize: 18, fontWeight: "800" },
  versionValue: { color: COLORS.muted, fontSize: 13, marginTop: 4, fontWeight: "600" },
});
