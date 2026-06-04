import { useRouter } from "expo-router";
import { sendPasswordResetEmail } from "firebase/auth";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { AuthShell, FormHeading, PrimaryButton, useFieldStyles } from "@/components/auth-shell";
import { friendlyError } from "@/lib/errors";
import { auth, trackEvent } from "@/lib/firebase";
import { Palette, useThemedStyles } from "@/lib/theme";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const styles = useThemedStyles(makeStyles);
  const fieldStyles = useFieldStyles();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit() {
    setError(null);
    if (!email.trim()) {
      setError("Please enter your email.");
      return;
    }
    setSubmitting(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      trackEvent("password_reset_requested", { method: "email" });
      setSent(true);
    } catch (e: any) {
      // Don't leak which emails exist — treat "no account" as success.
      if (e?.code === "auth/user-not-found") {
        trackEvent("password_reset_requested", { method: "email" });
        setSent(true);
      } else {
        setError(friendlyError(e, "Couldn't send the reset email. Please try again."));
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <AuthShell showLoginLink={false} onBack={() => router.replace("/(auth)/login" as any)}>
        <FormHeading>Check your inbox.</FormHeading>

        <Text style={styles.successText}>
          If an account exists for that email, we&apos;ve sent a link to reset your password.
          Follow it to choose a new password.
        </Text>

        <View style={styles.actions}>
          <PrimaryButton
            label="Back to Log In"
            onPress={() => router.replace("/(auth)/login" as any)}
          />

          <Pressable onPress={() => setSent(false)}>
            <Text style={styles.altLink}>
              Didn&apos;t get it? <Text style={styles.altLinkAccent}>Try again</Text>
            </Text>
          </Pressable>
        </View>
      </AuthShell>
    );
  }

  return (
    <AuthShell showLoginLink={false} onBack={() => router.replace("/(auth)/login" as any)}>
      <FormHeading>Forgot your password? Enter your email to reset it.</FormHeading>

      <View style={fieldStyles.group}>
        <Text style={fieldStyles.label}>Email</Text>
        <TextInput
          style={fieldStyles.input}
          placeholder="johndoe@example.com"
          placeholderTextColor="#6b6b6b"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
      </View>

      {error && <Text style={fieldStyles.errorText}>{error}</Text>}

      <View style={styles.actions}>
        <PrimaryButton
          label={submitting ? "Sending…" : "Send Reset Link →"}
          onPress={submit}
          disabled={submitting}
        />

        <Pressable onPress={() => router.replace("/(auth)/login" as any)}>
          <Text style={styles.altLink}>
            Remembered it? <Text style={styles.altLinkAccent}>Log in</Text>
          </Text>
        </Pressable>
      </View>
    </AuthShell>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    actions: { marginTop: 8, gap: 14 },
    altLink: { textAlign: "center", color: c.muted, fontSize: 13 },
    altLinkAccent: { color: c.primary, fontWeight: "600", textDecorationLine: "underline" },
    successText: {
      color: c.muted,
      fontSize: 15,
      lineHeight: 22,
      textAlign: "center",
      marginBottom: 24,
    },
  });
