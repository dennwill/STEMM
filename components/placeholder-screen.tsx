import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { AuthShell, FormHeading } from "@/components/auth-shell";
import { Palette, useThemedStyles } from "@/lib/theme";

// Lightweight stand-in for screens that aren't built out yet. Each real route
// (Settings, Terms, Privacy) renders this with its own title for now.
export function PlaceholderScreen({ title }: { title: string }) {
  const router = useRouter();
  const styles = useThemedStyles(makeStyles);
  return (
    <AuthShell showLoginLink={false} onBack={() => router.back()}>
      <FormHeading>{title}</FormHeading>
      <View style={styles.body}>
        <Text style={styles.text}>This screen is coming soon.</Text>
      </View>
    </AuthShell>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    body: { paddingTop: 32, alignItems: "center" },
    text: { color: c.muted, fontSize: 15 },
  });
