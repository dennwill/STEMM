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

export const COLORS = {
  bg: "#EEF0F8",
  primary: "#074C5C",
  input: "#C8C8C8",
  inputText: "#3D3D3D",
  muted: "#5A5A5A",
  white: "#FFFFFF",
  error: "#B91C1C",
  errorBg: "#FEF2F2",
  errorBorder: "#FECACA",
};

type Props = {
  children: ReactNode;
  showLoginLink?: boolean;
  onBack?: () => void;
};

export function AuthShell({ children, showLoginLink = true, onBack }: Props) {
  const router = useRouter();

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
  return <Text style={styles.heading}>{children}</Text>;
}

export const fieldStyles = StyleSheet.create({
  label: {
    color: COLORS.primary,
    fontSize: 15,
    marginBottom: 6,
  },
  input: {
    backgroundColor: COLORS.input,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: COLORS.inputText,
    fontSize: 16,
  },
  group: {
    marginBottom: 14,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 14,
    marginBottom: 8,
  },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
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
  backArrow: { color: COLORS.primary, fontSize: 28, fontWeight: "700", lineHeight: 32 },
  logoWrap: { alignItems: "center", paddingTop: 24, paddingBottom: 24 },
  logo: {
    color: COLORS.primary,
    fontSize: 56,
    fontWeight: "900",
    letterSpacing: -1,
  },
  body: { flex: 1 },
  footer: { alignItems: "center", paddingTop: 24 },
  footerText: { color: COLORS.muted, fontSize: 13 },
  footerLink: { color: COLORS.primary, fontWeight: "600", textDecorationLine: "underline" },
  heading: {
    color: COLORS.primary,
    fontSize: 17,
    textAlign: "center",
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  primaryBtnText: { color: COLORS.white, fontSize: 16, fontWeight: "700" },
  btnDisabled: { opacity: 0.5 },
});
