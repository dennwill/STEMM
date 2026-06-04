import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Palette, useThemedStyles } from "@/lib/theme";

const SECTIONS = [
  {
    title: "Information We Collect",
    body: `When you use STEMM, we collect the following information:\n\n• Account information: email address, first name, and last name provided during registration.\n• Team data: team name, grade level, and membership.\n• Activity data: experiment predictions, observations, and results stored locally on your device.\n• Device data: sensor readings (accelerometer, microphone levels) used during activities — this data is processed locally and not transmitted to external servers.\n• Usage data: basic interaction patterns to improve app performance.`,
  },
  {
    title: "How We Use Your Information",
    body: `We use collected information to:\n\n• Authenticate your identity and manage your account.\n• Enable team collaboration and leaderboard features.\n• Store and display your experiment results.\n• Improve the App's educational content and user experience.\n• Send activity reminders and notifications (with your permission).`,
  },
  {
    title: "Data Storage",
    body: `Your data is stored in two ways:\n\n• Cloud storage: Account and team information is stored securely using Google Firebase (Firestore and Authentication), hosted on Google Cloud infrastructure.\n• Local storage: Activity data, challenge sessions, and experiment results are stored on your device using SQLite. This data remains on your device unless you explicitly share it.`,
  },
  {
    title: "Third-Party Services",
    body: `STEMM integrates with the following third-party services:\n\n• Firebase Authentication — for secure sign-in.\n• Cloud Firestore — for cloud data storage.\n• Google AdMob — for displaying advertisements. AdMob may collect device identifiers for ad personalisation. You can opt out via your device's ad settings.\n• Expo Push Notifications — for delivering activity reminders.`,
  },
  {
    title: "Device Permissions",
    body: `The App may request access to:\n\n• Microphone — to measure sound levels in the Sound Pollution Hunter activity.\n• Photo Library — to attach experiment media.\n• Location — to display maps and tag activity locations.\n• Notifications — to send activity reminders.\n\nYou can revoke these permissions at any time through your device settings.`,
  },
  {
    title: "Data Sharing",
    body: `We do not sell your personal information. Data may be shared only:\n\n• With your team members (team name, scores, and leaderboard rankings).\n• With third-party service providers (Firebase, AdMob) as necessary for App functionality.\n• When required by law or to protect our legal rights.`,
  },
  {
    title: "Data Retention",
    body: `Account data is retained while your account is active. Local activity data persists on your device until you uninstall the App or clear its data. You may request deletion of your cloud data by contacting the development team.`,
  },
  {
    title: "Children's Privacy",
    body: `STEMM is designed for educational use under teacher supervision. We do not knowingly collect personal information from children under 13 without parental or guardian consent. If you believe a child has provided personal information without consent, please contact us.`,
  },
  {
    title: "Your Rights",
    body: `You have the right to:\n\n• Access the personal data we hold about you.\n• Request correction of inaccurate data.\n• Request deletion of your data.\n• Withdraw consent for data processing.\n• Export your data in a portable format.\n\nTo exercise these rights, contact the STEMM development team.`,
  },
  {
    title: "Changes to This Policy",
    body: `We may update this Privacy Policy from time to time. We will notify you of significant changes through the App. Your continued use after changes constitutes acceptance of the updated policy.`,
  },
];

export default function PrivacyScreen() {
  const router = useRouter();
  const styles = useThemedStyles(makeStyles);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Text style={styles.backArrow}>‹</Text>
        </Pressable>
        <Text style={styles.title}>Privacy Policy</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.lastUpdated}>Last updated: May 2026</Text>
        <Text style={styles.intro}>
          STEMM (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;) is committed to protecting your privacy. This policy explains
          how we collect, use, and safeguard your information when you use our mobile application.
        </Text>

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
  lastUpdated: {
    color: c.muted,
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 12,
    textAlign: "center",
  },
  intro: {
    color: c.inputText,
    fontSize: 15,
    lineHeight: 23,
    marginBottom: 16,
  },
  card: {
    backgroundColor: c.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    boxShadow: "0px 1px 6px rgba(0, 0, 0, 0.05)",
  },
  sectionTitle: {
    color: c.primary,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
  },
  sectionBody: {
    color: c.inputText,
    fontSize: 15,
    lineHeight: 23,
  },
  });
