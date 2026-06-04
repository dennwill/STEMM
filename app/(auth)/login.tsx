import { useRouter } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { AuthShell, FormHeading, PrimaryButton, useFieldStyles } from "@/components/auth-shell";
import { friendlyError } from "@/lib/errors";
import { auth, trackEvent } from "@/lib/firebase";
import { Palette, useThemedStyles } from "@/lib/theme";

export default function LoginScreen() {
  const router = useRouter();
  const styles = useThemedStyles(makeStyles);
  const fieldStyles = useFieldStyles();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function login() {
    setError(null);
    if (!email.trim() || !password) {
      setError("Email and password are required.");
      return;
    }
    setSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      trackEvent("login", { method: "email" });
      router.replace("/dashboard" as any);
    } catch (e: any) {
      setError(friendlyError(e, "Login failed. Please try again."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell showLoginLink={false}>
      <FormHeading>Welcome back. Sign in to continue.</FormHeading>

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

      <View style={fieldStyles.group}>
        <Text style={fieldStyles.label}>Password</Text>
        <TextInput
          style={fieldStyles.input}
          placeholder="••••••"
          placeholderTextColor="#6b6b6b"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="off"
          textContentType="password"
          keyboardType="default"
        />
      </View>

      <Pressable
        style={styles.forgotWrap}
        onPress={() => router.push("/(auth)/forgot-password" as any)}
      >
        <Text style={styles.forgotLink}>Forgot password?</Text>
      </Pressable>

      {error && <Text style={fieldStyles.errorText}>{error}</Text>}

      <View style={styles.actions}>
        <PrimaryButton
          label={submitting ? "Signing in…" : "Log In →"}
          onPress={login}
          disabled={submitting}
        />

        <Pressable onPress={() => router.replace("/(auth)/register" as any)}>
          <Text style={styles.altLink}>
            Don&apos;t have an account? <Text style={styles.altLinkAccent}>Sign up</Text>
          </Text>
        </Pressable>
      </View>
    </AuthShell>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    actions: { marginTop: 8, gap: 14 },
    forgotWrap: { alignSelf: "flex-end", marginTop: -4, marginBottom: 8 },
    forgotLink: { color: c.primary, fontSize: 13, fontWeight: "600" },
    altLink: { textAlign: "center", color: c.muted, fontSize: 13 },
    altLinkAccent: { color: c.primary, fontWeight: "600", textDecorationLine: "underline" },
  });
