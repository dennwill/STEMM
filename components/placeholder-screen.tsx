import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { AuthShell, COLORS, FormHeading } from "@/components/auth-shell";

// Lightweight stand-in for screens that aren't built out yet. Each real route
// (Settings, Terms, Privacy) renders this with its own title for now.
export function PlaceholderScreen({ title }: { title: string }) {
  const router = useRouter();
  return (
    <AuthShell showLoginLink={false} onBack={() => router.back()}>
      <FormHeading>{title}</FormHeading>
      <View style={styles.body}>
        <Text style={styles.text}>This screen is coming soon.</Text>
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  body: { paddingTop: 32, alignItems: "center" },
  text: { color: COLORS.muted, fontSize: 15 },
});
