import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { COLORS } from "@/components/auth-shell";

const PILLARS = [
  { icon: "flask-outline" as const, label: "Science", desc: "Explore the world through observation and experiment." },
  { icon: "laptop" as const, label: "Technology", desc: "Use digital tools to measure, record, and analyse." },
  { icon: "cog-outline" as const, label: "Engineering", desc: "Design, build, and iterate real-world solutions." },
  { icon: "calculator-variant-outline" as const, label: "Mathematics", desc: "Apply number sense, measurement, and data skills." },
  { icon: "heart-pulse" as const, label: "Medical Sciences", desc: "Investigate the human body and health." },
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
          <View key={p.label} style={styles.pillarRow}>
            <View style={styles.pillarIcon}>
              <MaterialCommunityIcons name={p.icon} size={28} color={COLORS.primary} />
            </View>
            <View style={styles.pillarText}>
              <Text style={styles.pillarLabel}>{p.label}</Text>
              <Text style={styles.pillarDesc}>{p.desc}</Text>
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
    paddingTop: 12,
    paddingBottom: 28,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  logo: { color: COLORS.white, fontSize: 34, fontWeight: "900", letterSpacing: -1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 32 },
  pageTitle: {
    color: COLORS.primary,
    fontSize: 32,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 20,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  body: { color: COLORS.inputText, fontSize: 16, lineHeight: 25 },
  sectionTitle: {
    color: COLORS.inputText,
    fontSize: 17,
    fontWeight: "700",
    marginTop: 28,
    marginBottom: 14,
  },
  pillarRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  pillarIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  pillarText: { flex: 1 },
  pillarLabel: { color: COLORS.primary, fontSize: 16, fontWeight: "700" },
  pillarDesc: { color: COLORS.inputText, fontSize: 14, lineHeight: 20, marginTop: 2 },
  stepRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 10 },
  stepBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumber: { color: COLORS.white, fontSize: 14, fontWeight: "800" },
  stepText: { color: COLORS.inputText, fontSize: 15, lineHeight: 21, flex: 1 },
  versionBox: { alignItems: "center", marginTop: 32, paddingBottom: 8 },
  versionLabel: { color: COLORS.primary, fontSize: 18, fontWeight: "800" },
  versionValue: { color: COLORS.muted, fontSize: 14, marginTop: 4 },
});
