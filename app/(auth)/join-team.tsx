import { useRouter } from "expo-router";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { AuthShell, FormHeading, PrimaryButton, useFieldStyles } from "@/components/auth-shell";
import { refreshEmailVerified } from "@/lib/auth";
import { friendlyError } from "@/lib/errors";
import { auth, firestore } from "@/lib/firebase";
import { Palette, useThemedStyles } from "@/lib/theme";

export default function JoinTeamScreen() {
  const router = useRouter();
  const styles = useThemedStyles(makeStyles);
  const fieldStyles = useFieldStyles();

  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!auth.currentUser) router.replace("/(auth)/login" as any);
  }, [router]);

  async function joinTeam() {
    const user = auth.currentUser;
    if (!user) {
      router.replace("/(auth)/login" as any);
      return;
    }

    setError(null);
    const normalized = code.trim().toUpperCase();
    if (!normalized) return setError("Team code is required.");

    setSubmitting(true);
    try {
      if (!(await refreshEmailVerified())) {
        setError("Please verify your email before joining a team.");
        return;
      }

      const teamSnap = await getDoc(doc(firestore, "teams", normalized));
      if (!teamSnap.exists()) {
        setError("No team found with that code.");
        return;
      }

      await updateDoc(doc(firestore, "users", user.uid), { team_id: normalized });

      router.replace("/dashboard" as any);
    } catch (e: any) {
      setError(friendlyError(e, "Failed to join team. Please try again."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell showLoginLink={false} onBack={() => router.replace("/dashboard" as any)}>
      <FormHeading>Enter your team code to join.</FormHeading>

      <TextInput
        style={[fieldStyles.input, styles.codeInput]}
        placeholder="ABC123"
        placeholderTextColor="#8a8a8a"
        value={code}
        onChangeText={(v) => setCode(v.toUpperCase())}
        autoCapitalize="characters"
        autoFocus
        maxLength={6}
      />

      {error && <Text style={fieldStyles.errorText}>{error}</Text>}

      <View style={styles.actions}>
        <PrimaryButton
          label={submitting ? "Joining…" : "Join Team →"}
          onPress={joinTeam}
          disabled={submitting}
        />

        <Pressable onPress={() => router.replace("/dashboard" as any)} disabled={submitting}>
          <Text style={styles.cancelLink}>Cancel</Text>
        </Pressable>
      </View>
    </AuthShell>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    codeInput: {
      fontSize: 28,
      fontWeight: "700",
      letterSpacing: 8,
      textAlign: "center",
      paddingVertical: 18,
      marginBottom: 16,
    },
    actions: { marginTop: 8, gap: 14 },
    cancelLink: { textAlign: "center", color: c.muted, fontSize: 13 },
  });
