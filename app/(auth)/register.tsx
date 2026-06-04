import { useRouter } from "expo-router";
import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { useState } from "react";
import { Text, TextInput, View } from "react-native";

import { AuthShell, FormHeading, PrimaryButton, useFieldStyles } from "@/components/auth-shell";
import { friendlyError } from "@/lib/errors";
import { auth, firestore, trackEvent } from "@/lib/firebase";

export default function RegisterScreen() {
  const router = useRouter();
  const fieldStyles = useFieldStyles();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setError(null);
    if (!firstName.trim() || !lastName.trim()) return setError("First and last name are required.");
    if (!email.trim()) return setError("Email is required.");
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    if (password !== confirmPassword) return setError("Passwords do not match.");

    setSubmitting(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);

      await setDoc(doc(firestore, "users", cred.user.uid), {
        email: email.trim(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        team_id: null,
        created_at: serverTimestamp(),
      });

      trackEvent("sign_up", { method: "email" });

      // Send a verification email — never block account creation if this fails.
      try {
        await sendEmailVerification(cred.user);
        trackEvent("verification_email_sent");
      } catch (verifyErr) {
        console.warn("Could not send verification email:", verifyErr);
      }

      router.replace("/dashboard" as any);
    } catch (e: any) {
      setError(friendlyError(e, "Registration failed. Please try again."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell>
      <FormHeading>Create your account to get started.</FormHeading>

      <View style={fieldStyles.group}>
        <Text style={fieldStyles.label}>First Name</Text>
        <TextInput
          style={fieldStyles.input}
          placeholder="Jane"
          placeholderTextColor="#6b6b6b"
          value={firstName}
          onChangeText={setFirstName}
        />
      </View>

      <View style={fieldStyles.group}>
        <Text style={fieldStyles.label}>Last Name</Text>
        <TextInput
          style={fieldStyles.input}
          placeholder="Doe"
          placeholderTextColor="#6b6b6b"
          value={lastName}
          onChangeText={setLastName}
        />
      </View>

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
          textContentType="newPassword"
          keyboardType="default"
        />
      </View>

      <View style={fieldStyles.group}>
        <Text style={fieldStyles.label}>Confirm Password</Text>
        <TextInput
          style={fieldStyles.input}
          placeholder="••••••"
          placeholderTextColor="#6b6b6b"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="off"
          textContentType="newPassword"
          keyboardType="default"
        />
      </View>

      {error && <Text style={fieldStyles.errorText}>{error}</Text>}

      <View style={{ marginTop: 8 }}>
        <PrimaryButton
          label={submitting ? "Creating…" : "Sign Up →"}
          onPress={submit}
          disabled={submitting}
        />
      </View>
    </AuthShell>
  );
}
