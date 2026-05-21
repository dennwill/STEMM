import { useRouter } from "expo-router";
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { AuthShell, COLORS, FormHeading, PrimaryButton, fieldStyles } from "@/components/auth-shell";
import { generateDiscriminant } from "@/lib/discriminant";
import { friendlyError } from "@/lib/errors";
import { auth, firestore } from "@/lib/firebase";

const GRADE_LEVELS = [
  "Kindergarten",
  "1st Grade",
  "2nd Grade",
  "3rd Grade",
  "4th Grade",
  "5th Grade",
  "6th Grade",
  "7th Grade",
  "8th Grade",
  "9th Grade",
  "10th Grade",
  "11th Grade",
  "12th Grade",
];

type Step = 1 | 2 | 3;

export default function CreateTeamScreen() {
  const router = useRouter();

  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [teamName, setTeamName] = useState("");
  const [gradeLevel, setGradeLevel] = useState<string | null>(null);
  const [showGradeList, setShowGradeList] = useState(false);
  const [discriminant, setDiscriminant] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.currentUser) router.replace("/(auth)/login" as any);
  }, []);

  function next() {
    setError(null);
    if (step === 1) {
      if (!teamName.trim()) return setError("Team name is required.");
      setStep(2);
    } else if (step === 2) {
      if (!gradeLevel) return setError("Please select a grade level.");
      submit();
    }
  }

  async function findUniqueDiscriminant(): Promise<string> {
    for (let i = 0; i < 8; i++) {
      const code = generateDiscriminant();
      const existing = await getDoc(doc(firestore, "teams", code));
      if (!existing.exists()) return code;
    }
    throw new Error("Could not generate a unique team code. Please try again.");
  }

  async function submit() {
    const user = auth.currentUser;
    if (!user) {
      router.replace("/(auth)/login" as any);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const code = await findUniqueDiscriminant();

      await setDoc(doc(firestore, "teams", code), {
        team_name: teamName.trim(),
        grade_level: gradeLevel,
        created_by_uid: user.uid,
        created_at: serverTimestamp(),
      });

      await updateDoc(doc(firestore, "users", user.uid), { team_id: code });

      setDiscriminant(code);
      setStep(3);
    } catch (e: any) {
      setError(friendlyError(e, "Failed to create team. Please try again."));
    } finally {
      setSubmitting(false);
    }
  }

  const onBack =
    step === 1
      ? () => router.replace("/dashboard" as any)
      : step === 2
      ? () => setStep(1)
      : undefined;

  return (
    <AuthShell showLoginLink={false} onBack={onBack}>
      {step === 1 && (
        <>
          <FormHeading>What do you want your team name to be?</FormHeading>
          <TextInput
            style={[fieldStyles.input, { marginBottom: 24 }]}
            placeholder="Team Name"
            placeholderTextColor="#6b6b6b"
            value={teamName}
            onChangeText={setTeamName}
            autoFocus
          />
          {error && <Text style={fieldStyles.errorText}>{error}</Text>}
          <PrimaryButton label="Next →" onPress={next} disabled={submitting} />
        </>
      )}

      {step === 2 && (
        <>
          <FormHeading>What is your grade level?</FormHeading>
          <Pressable onPress={() => setShowGradeList((v) => !v)} style={styles.dropdownTrigger}>
            <Text style={gradeLevel ? styles.dropdownValue : styles.dropdownPlaceholder}>
              {gradeLevel ?? "Grade Level"}
            </Text>
            <Text style={styles.dropdownCaret}>{showGradeList ? "▴" : "▾"}</Text>
          </Pressable>

          {showGradeList && (
            <View style={styles.dropdownList}>
              {GRADE_LEVELS.map((g) => (
                <Pressable
                  key={g}
                  onPress={() => {
                    setGradeLevel(g);
                    setShowGradeList(false);
                  }}
                  style={[styles.dropdownItem, gradeLevel === g && styles.dropdownItemSelected]}
                >
                  <Text
                    style={[
                      styles.dropdownItemText,
                      gradeLevel === g && styles.dropdownItemTextSelected,
                    ]}
                  >
                    {g}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          {error && <Text style={[fieldStyles.errorText, { marginTop: 8 }]}>{error}</Text>}
          <View style={{ marginTop: 24 }}>
            <PrimaryButton
              label={submitting ? "Creating…" : "Next →"}
              onPress={next}
              disabled={submitting}
            />
          </View>
        </>
      )}

      {step === 3 && discriminant && (
        <>
          <View style={styles.idIntro}>
            <Text style={styles.idIntroText}>
              This is your <Text style={styles.idIntroBold}>Team ID.</Text>
            </Text>
            <Text style={styles.idIntroText}>This ID will be used on the leaderboard.</Text>
          </View>

          <View style={styles.idBox}>
            <Text style={styles.idText}>{discriminant}</Text>
          </View>

          <PrimaryButton
            label="Continue to Lab →"
            onPress={() => router.replace("/dashboard" as any)}
          />
        </>
      )}
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  dropdownTrigger: {
    backgroundColor: COLORS.input,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  dropdownValue: { color: COLORS.inputText, fontSize: 16 },
  dropdownPlaceholder: { color: COLORS.muted, fontSize: 16 },
  dropdownCaret: { color: COLORS.muted, fontSize: 16 },
  dropdownList: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.input,
    overflow: "hidden",
    marginBottom: 8,
  },
  dropdownItem: { paddingHorizontal: 16, paddingVertical: 12 },
  dropdownItemSelected: { backgroundColor: COLORS.bg },
  dropdownItemText: { color: COLORS.inputText, fontSize: 16 },
  dropdownItemTextSelected: { color: COLORS.primary, fontWeight: "600" },
  idIntro: { alignItems: "center", marginBottom: 16 },
  idIntroText: { color: COLORS.primary, fontSize: 16, textAlign: "center" },
  idIntroBold: { fontWeight: "700" },
  idBox: {
    backgroundColor: COLORS.input,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
    marginBottom: 16,
  },
  idText: { color: COLORS.inputText, fontSize: 22, fontWeight: "700", letterSpacing: 4 },
});
