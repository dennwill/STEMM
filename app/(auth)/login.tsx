import { useRouter } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { AuthShell, COLORS, FormHeading, PrimaryButton, fieldStyles } from "@/components/auth-shell";
import { friendlyError } from "@/lib/errors";
import { auth, trackEvent } from "@/lib/firebase";

export default function LoginScreen() {
  const router = useRouter();
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

const styles = StyleSheet.create({
  actions: { marginTop: 8, gap: 14 },
  altLink: { textAlign: "center", color: COLORS.muted, fontSize: 13 },
  altLinkAccent: { color: COLORS.primary, fontWeight: "600", textDecorationLine: "underline" },
});
