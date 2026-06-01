import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { COLORS } from "@/components/auth-shell";

const SECTIONS = [
  {
    title: "1. Acceptance of Terms",
    body: `By downloading, installing, or using the STEMM mobile application ("App"), you agree to be bound by these Terms and Conditions. If you do not agree, you must not use the App.`,
  },
  {
    title: "2. Description of Service",
    body: `STEMM is an educational mobile application designed for use in STEM-related classroom activities. It allows students to participate in guided experiments, record observations, and track team performance through a leaderboard.`,
  },
  {
    title: "3. User Accounts",
    body: `To use the App, you must create an account using a valid email address. You are responsible for maintaining the confidentiality of your credentials and for all activity under your account. You agree to notify us immediately of any unauthorised use.`,
  },
  {
    title: "4. Acceptable Use",
    body: `You agree to use the App only for lawful, educational purposes. You must not:\n• Attempt to gain unauthorised access to any part of the App\n• Upload harmful, offensive, or misleading content\n• Interfere with the App's operation or other users' experience\n• Use the App for any commercial purpose without prior consent`,
  },
  {
    title: "5. Intellectual Property",
    body: `All content, design elements, code, and materials within the App are the intellectual property of the STEMM development team. You may not reproduce, distribute, or create derivative works without written permission.`,
  },
  {
    title: "6. Data Collection and Storage",
    body: `The App collects and stores data necessary for its educational functions, including user profiles, team information, activity results, and device sensor readings. Data is stored using Firebase (cloud) and SQLite (local device). For more details, see our Privacy Policy.`,
  },
  {
    title: "7. Third-Party Services",
    body: `The App integrates with third-party services including Firebase (Authentication, Firestore), Google AdMob, and device APIs. These services are governed by their own terms and privacy policies.`,
  },
  {
    title: "8. Limitation of Liability",
    body: `The App is provided "as is" for educational purposes. We make no warranties regarding accuracy, reliability, or availability. We are not liable for any direct, indirect, or consequential damages arising from your use of the App.`,
  },
  {
    title: "9. Changes to Terms",
    body: `We reserve the right to modify these Terms at any time. Continued use of the App after changes constitutes acceptance of the new Terms. Users will be notified of significant changes through the App.`,
  },
  {
    title: "10. Contact",
    body: `For questions about these Terms, please contact the STEMM development team through the official project repository or your educational institution.`,
  },
];

export default function TermsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Text style={styles.backArrow}>‹</Text>
        </Pressable>
        <Text style={styles.title}>Terms and Conditions</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.lastUpdated}>Last updated: May 2026</Text>

        {SECTIONS.map((section) => (
          <View key={section.title} style={styles.card}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionBody}>{section.body}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  backArrow: { color: COLORS.primary, fontSize: 34, fontWeight: "700", lineHeight: 36 },
  title: { color: COLORS.primary, fontSize: 22, fontWeight: "800", marginLeft: 8, flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32 },
  lastUpdated: {
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 16,
    textAlign: "center",
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    boxShadow: "0px 1px 6px rgba(0, 0, 0, 0.05)",
  },
  sectionTitle: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
  },
  sectionBody: {
    color: COLORS.inputText,
    fontSize: 15,
    lineHeight: 23,
  },
});
