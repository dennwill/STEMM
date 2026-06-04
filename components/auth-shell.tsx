import { useRouter } from "expo-router";
import { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PressableScale } from "@/components/pressable-scale";
import { Palette, useThemedStyles } from "@/lib/theme";

// Re-export the field-style hook so auth screens can import it from here.
export { useFieldStyles } from "@/lib/theme";

type Props = {
  children: ReactNode;
  showLoginLink?: boolean;
  onBack?: () => void;
};

export function AuthShell({ children, showLoginLink = true, onBack }: Props) {
  const router = useRouter();
  const styles = useThemedStyles(makeStyles);

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            {onBack ? (
              <PressableScale onPress={onBack} hitSlop={12} style={styles.backBtn}>
                <Text style={styles.backArrow}>←</Text>
              </PressableScale>
            ) : (
              <View style={styles.backBtn} />
            )}
            <Text style={styles.logo}>STEMM</Text>
            <View style={styles.backBtn} />
          </View>

          <View style={styles.body}>{children}</View>

          {showLoginLink && (
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Already have an account?{" "}
                <Text
                  style={styles.footerLink}
                  onPress={() => router.replace("/(auth)/login" as any)}
                >
                  Log In
                </Text>
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      style={[styles.primaryBtn, disabled && styles.btnDisabled]}
    >
      <Text style={styles.primaryBtnText}>{label}</Text>
    </PressableScale>
  );
}

export function FormHeading({ children }: { children: ReactNode }) {
  const styles = useThemedStyles(makeStyles);
  return <Text style={styles.heading}>{children}</Text>;
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    flex: { flex: 1 },
    scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 32 },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingTop: 16,
      paddingBottom: 24,
    },
    backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
    backArrow: { color: c.primary, fontSize: 28, fontWeight: "700", lineHeight: 32 },
    logoWrap: { alignItems: "center", paddingTop: 24, paddingBottom: 24 },
    logo: {
      color: c.primary,
      fontSize: 56,
      fontWeight: "900",
      letterSpacing: -1,
    },
    body: { flex: 1 },
    footer: { alignItems: "center", paddingTop: 24 },
    footerText: { color: c.muted, fontSize: 13 },
    footerLink: { color: c.primary, fontWeight: "600", textDecorationLine: "underline" },
    heading: {
      color: c.primary,
      fontSize: 17,
      textAlign: "center",
      paddingHorizontal: 16,
      marginBottom: 24,
    },
    primaryBtn: {
      backgroundColor: c.primary,
      borderRadius: 16,
      paddingVertical: 16,
      alignItems: "center",
    },
    primaryBtnText: { color: c.onPrimary, fontSize: 16, fontWeight: "700" },
    btnDisabled: { opacity: 0.5 },
  });
