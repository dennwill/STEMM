import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { AuthShell, COLORS, FormHeading, PrimaryButton, fieldStyles } from "@/components/auth-shell";
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

export default function EditTeamScreen() {
  const router = useRouter();
  const { teamId } = useLocalSearchParams<{ teamId?: string }>();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [teamName, setTeamName] = useState("");
  const [gradeLevel, setGradeLevel] = useState<string | null>(null);
  const [showGradeList, setShowGradeList] = useState(false);

  useEffect(() => {
    if (!auth.currentUser) {
      router.replace("/(auth)/login" as any);
      return;
    }
    if (!teamId) {
      setError("No team to edit.");
      setLoading(false);
      return;
    }
    loadTeam(teamId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  async function loadTeam(id: string) {
    setLoading(true);
    setError(null);
    try {
      const snap = await getDoc(doc(firestore, "teams", id));
      if (!snap.exists()) {
        setError("This team no longer exists.");
        return;
      }
      const data = snap.data() as { team_name?: string; grade_level?: string };
      setTeamName(data.team_name ?? "");
      setGradeLevel(data.grade_level ?? null);
    } catch (e: any) {
      setError(friendlyError(e, "Failed to load the team. Please try again."));
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    if (!teamId) return;
    setError(null);
    const name = teamName.trim();
    if (!name) return setError("Team name is required.");
    if (!gradeLevel) return setError("Please select a grade level.");

    setSubmitting(true);
    try {
      await updateDoc(doc(firestore, "teams", teamId), {
        team_name: name,
        grade_level: gradeLevel,
      });
      router.back();
    } catch (e: any) {
      setError(friendlyError(e, "Failed to save changes. Please try again."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell showLoginLink={false} onBack={() => router.back()}>
      <FormHeading>Edit your team details.</FormHeading>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      ) : (
        <>
          <View style={fieldStyles.group}>
            <Text style={fieldStyles.label}>Team Name</Text>
            <TextInput
              style={fieldStyles.input}
              placeholder="Team Name"
              placeholderTextColor="#6b6b6b"
              value={teamName}
              onChangeText={setTeamName}
            />
          </View>

          <View style={fieldStyles.group}>
            <Text style={fieldStyles.label}>Grade Level</Text>
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
          </View>

          {error && <Text style={[fieldStyles.errorText, { marginTop: 8 }]}>{error}</Text>}

          <View style={styles.actions}>
            <PrimaryButton
              label={submitting ? "Saving…" : "Save Changes"}
              onPress={save}
              disabled={submitting}
            />
            <Pressable onPress={() => router.back()} disabled={submitting}>
              <Text style={styles.cancelLink}>Cancel</Text>
            </Pressable>
          </View>
        </>
      )}
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  loadingWrap: { paddingTop: 48, alignItems: "center" },
  dropdownTrigger: {
    backgroundColor: COLORS.input,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
    marginTop: 8,
  },
  dropdownItem: { paddingHorizontal: 16, paddingVertical: 12 },
  dropdownItemSelected: { backgroundColor: COLORS.bg },
  dropdownItemText: { color: COLORS.inputText, fontSize: 16 },
  dropdownItemTextSelected: { color: COLORS.primary, fontWeight: "600" },
  actions: { marginTop: 16, gap: 14 },
  cancelLink: { textAlign: "center", color: COLORS.muted, fontSize: 13 },
});
