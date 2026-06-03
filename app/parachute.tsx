import { FontAwesome5 } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { COLORS } from "@/components/auth-shell";
import {
  createChallengeSession,
  createDataPoint,
} from "@/lib/crud";
import { LOCAL_ACTIVITY_IDS, LOCAL_TEAM_ID } from "@/lib/db";
import { awardActivityCompletionPoints, formatAwardPointsMessage } from "@/lib/points";

// Lavender accents that match the activity mockups. Kept local since they're
// specific to this screen and not part of the shared auth palette.
const ACCENT = {
  tabActive: "#DCDDF2",
  tableHeader: "#C9CCEC",
  softHeader: "#EFEDF8",
  border: "#E2E2EC",
};

const TABS = ["Instructions", "Prediction", "Recorder", "Write-Up", "Discussion"] as const;

// The four drops the activity walks through. Shared by the Recorder (where each
// drop is timed) and the Write-Up (where each drop is documented) so the two
// steps line up 1:1.
const TRIALS = [
  {
    id: "baseline",
    short: "Baseline",
    title: "No parachute (baseline)",
    note: "Drop the toy with no parachute first.",
    instruction:
      "Drop the toy with no parachute. Start the timer as you release it and stop it the moment it lands.",
  },
  {
    id: "design1",
    short: "Design 1",
    title: "Design 1",
    note: "e.g. plastic with four corners tied to the toy",
    instruction:
      "Attach your first parachute design and drop from the same height. Time the fall the same way.",
  },
  {
    id: "design2",
    short: "Design 2",
    title: "Design 2",
    note: "",
    instruction: "Swap to your second design and drop from the same height. Time the fall.",
  },
  {
    id: "design3",
    short: "Design 3",
    title: "Design 3",
    note: "",
    instruction: "Test your third and final design from the same height. Time the fall.",
  },
] as const;
type TrialId = (typeof TRIALS)[number]["id"];

export default function ParachuteScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const [step, setStep] = useState(0);

  // Activity state lives here (not inside each step) so navigating between
  // steps doesn't unmount and discard what the user has entered.
  const [prediction, setPrediction] = useState<PredictionValue>({ choice: "", reason: "" });
  const [reflection, setReflection] = useState("");
  const [times, setTimes] = useState<Record<TrialId, number>>(
    Object.fromEntries(TRIALS.map((t) => [t.id, 0])) as Record<TrialId, number>,
  );
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const current = TABS[step];
  const isFirst = step === 0;
  const isLast = step === TABS.length - 1;

  const goNext = async () => {
    if (isLast) {
      // Persist the activity session and data points to SQLite
      let localSaveMessage = "Activity data was saved locally.";
      try {
        const sessionId = await createChallengeSession(db, {
          team_id: LOCAL_TEAM_ID,
          activity_id: LOCAL_ACTIVITY_IDS.parachute,
          prediction_text: prediction.choice
            ? `${prediction.choice}: ${prediction.reason}`
            : null,
          discussion_reflection: reflection || null,
        });

        // Save each trial as a data point
        for (const trial of TRIALS) {
          const trialTime = times[trial.id];
          await createDataPoint(db, {
            session_id: sessionId,
            attempt_number: TRIALS.indexOf(trial) + 1,
            action_or_design: trial.title,
            prediction_value: prediction.choice === trial.short ? "predicted fastest" : null,
            outcome_value: trialTime > 0 ? formatTime(trialTime) : null,
            prediction_correct: prediction.choice === trial.short && trialTime > 0 ? true : null,
            media_file_path: null,
          });
        }

      } catch (err) {
        console.warn("Failed to save activity data:", err);
        localSaveMessage = "Local activity data could not be saved.";
      }
      const award = await awardActivityCompletionPoints("parachute", "Parachute Drop Challenge");
      Alert.alert("Activity complete", `${localSaveMessage} ${formatAwardPointsMessage(award)}`);
      router.back();
      return;
    }
    setStep((s) => Math.min(s + 1, TABS.length - 1));
  };
  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
            <Text style={styles.backArrow}>‹</Text>
          </Pressable>
          <Text style={styles.title}>Parachute Drop Challenge</Text>
        </View>

        <View style={styles.stepHeader}>
          <View style={styles.progressTrack}>
            {TABS.map((t, i) => (
              <View
                key={t}
                style={[styles.progressSeg, i <= step && styles.progressSegActive]}
              />
            ))}
          </View>
          <Text style={styles.stepCount}>
            Step {step + 1} of {TABS.length}
          </Text>
          <Text style={styles.stepName}>{current}</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {current === "Instructions" && <Instructions />}
          {current === "Prediction" && (
            <Prediction value={prediction} onChange={setPrediction} />
          )}
          {current === "Recorder" && <Recorder times={times} setTimes={setTimes} />}
          {current === "Write-Up" && (
            <WriteUp
              times={times}
              answers={answers}
              setAnswers={setAnswers}
              reflection={reflection}
              setReflection={setReflection}
            />
          )}
          {current === "Discussion" && <Discussion />}
        </ScrollView>

        <View style={styles.footer}>
          {isFirst ? (
            <View style={styles.footerSpacer} />
          ) : (
            <Pressable style={styles.footerBack} onPress={goBack}>
              <Text style={styles.footerBackText}>Back</Text>
            </Pressable>
          )}
          <Pressable style={styles.footerNext} onPress={goNext}>
            <Text style={styles.primaryBtnText}>{isLast ? "Finish" : "Next"}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* -------------------------------------------------------------------------- */
/* Instructions                                                               */
/* -------------------------------------------------------------------------- */

function Instructions() {
  return (
    <View style={styles.card}>
      <Text style={styles.blockTitle}>Overview</Text>
      <Text style={styles.body}>
        Students design, build, and test a parachute for a small toy to reduce its landing speed
        and impact force. Teams iterate their designs under time and material constraints, aiming
        to achieve the slowest and safest landing within a target area.
      </Text>

      <Text style={styles.blockTitle}>Equipment</Text>
      {[
        "Mobile phone with STEMM Lab app",
        "Small toy (e.g. army toy soldier)",
        "Table or elevated surface",
        "Paper or plastic",
        "String",
        "Scissors",
        "Tape",
      ].map((item) => (
        <Bullet key={item}>{item}</Bullet>
      ))}

      <Text style={styles.blockTitle}>Instructions</Text>
      {[
        "Drop the toy without a parachute and record the fall (baseline test).",
        "Build a parachute using provided materials.",
        "Drop the toy from the same height and record the fall.",
        "Review speed and landing accuracy results in the app.",
        "Redesign and test up to three prototypes within 20 minutes.",
        "Upload videos, results, and team reflections.",
      ].map((item, i) => (
        <Numbered key={item} n={i + 1}>
          {item}
        </Numbered>
      ))}

      <Text style={styles.blockTitle}>Diagram</Text>
      {[
        "Toy attached to parachute",
        "Drop height marked",
        "Target landing zone shown on floor",
      ].map((item) => (
        <Bullet key={item}>{item}</Bullet>
      ))}
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Prediction                                                                 */
/* -------------------------------------------------------------------------- */

type PredictionValue = { choice: string; reason: string };

// The three parachute designs the user can predict between (baseline excluded).
const DESIGN_OPTIONS = TRIALS.filter((t) => t.id !== "baseline").map((t) => t.short);

function Prediction({
  value,
  onChange,
}: {
  value: PredictionValue;
  onChange: (v: PredictionValue) => void;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.promptTitle}>
        Predict which parachute design was the fastest before testing.
      </Text>

      <Text style={styles.predictLead}>I predict the parachute with</Text>
      <View style={styles.choiceRow}>
        {DESIGN_OPTIONS.map((opt) => {
          const active = value.choice === opt;
          return (
            <Pressable
              key={opt}
              style={[styles.choiceChip, active && styles.choiceChipActive]}
              onPress={() => onChange({ ...value, choice: active ? "" : opt })}
            >
              <Text style={[styles.choiceChipText, active && styles.choiceChipTextActive]}>
                {opt}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.predictLead}>will be the fastest because…</Text>
      <TextInput
        style={styles.textArea}
        placeholder="Type your reason here.."
        placeholderTextColor={COLORS.muted}
        value={value.reason}
        onChangeText={(reason) => onChange({ ...value, reason })}
        multiline
        textAlignVertical="top"
      />

      <Text style={[styles.promptTitle, styles.spacedTop]}>Sketch each of the designs on paper.</Text>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Recorder                                                                   */
/* -------------------------------------------------------------------------- */

type TimesProps = {
  times: Record<TrialId, number>;
  setTimes: Dispatch<SetStateAction<Record<TrialId, number>>>;
};

function Recorder({ times, setTimes }: TimesProps) {
  const [trial, setTrial] = useState<TrialId>(TRIALS[0].id);
  const [running, setRunning] = useState(false);
  // Show the saved time for the current trial when the step (re)mounts.
  const [elapsed, setElapsed] = useState(times[TRIALS[0].id]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef(0);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  function selectTrial(id: TrialId) {
    if (running) return; // don't switch mid-recording
    setTrial(id);
    setElapsed(times[id]);
  }

  function toggleTimer() {
    if (running) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      setRunning(false);
      setTimes((prev) => ({ ...prev, [trial]: elapsed }));
      return;
    }
    startRef.current = Date.now() - elapsed;
    intervalRef.current = setInterval(() => {
      setElapsed(Date.now() - startRef.current);
    }, 30);
    setRunning(true);
  }

  const trialIndex = TRIALS.findIndex((t) => t.id === trial);
  const currentTrial = TRIALS[trialIndex];
  const nextTrial = TRIALS[trialIndex + 1];
  const recorded = !running && times[trial] > 0;

  return (
    <>
      <View style={styles.subTabBar}>
        {TRIALS.map((t) => (
          <Pressable
            key={t.id}
            style={[styles.subTab, trial === t.id && styles.subTabActive]}
            onPress={() => selectTrial(t.id)}
          >
            <Text style={[styles.subTabLabel, trial === t.id && styles.subTabLabelActive]}>
              {t.short}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.instructionBox}>
        <Text style={styles.instructionTitle}>{currentTrial.title}</Text>
        <Text style={styles.instructionText}>{currentTrial.instruction}</Text>
      </View>

      <Pressable
        style={styles.uploadRow}
        onPress={() => Alert.alert("Upload Video", "Video upload is coming soon.")}
      >
        <FontAwesome5 name="film" size={16} color={COLORS.primary} />
        <Text style={styles.uploadRowText}>Upload video</Text>
      </Pressable>

      <View style={[styles.card, styles.timerCard]}>
        <Text style={styles.timer}>{formatTime(elapsed)}</Text>
        <Pressable
          style={[styles.outlineBtn, running && styles.primaryBtn]}
          onPress={toggleTimer}
        >
          <Text style={[styles.outlineBtnText, running && styles.primaryBtnText]}>
            {running ? "Stop Timer" : "Start Timer"}
          </Text>
        </Pressable>
      </View>

      {recorded &&
        (nextTrial ? (
          <Text style={styles.switchHint}>
            ✓ {currentTrial.short} time saved. Switch to {nextTrial.short} above to record the next
            drop.
          </Text>
        ) : (
          <Text style={styles.switchHint}>
            ✓ All drops recorded. Continue to the Write-Up step when you&apos;re ready.
          </Text>
        ))}
    </>
  );
}

function formatTime(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const hundredths = Math.floor((ms % 1000) / 10);
  return `${pad(totalSeconds)}.${pad(hundredths)}s`;
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

/* -------------------------------------------------------------------------- */
/* Write-Up                                                                   */
/* -------------------------------------------------------------------------- */

// The 4 questions asked for every trial (was the table's column headers).
// The `auto` question is pre-filled from the time measured in the Recorder.
const WRITEUP_QUESTIONS = [
  { label: "How will it take to hit the ground?" },
  { label: "Time to hit the ground", auto: true },
  { label: "Were you right?", options: ["Yes", "No"] },
  { label: "Time (time from first hitting the ground and stop moving) — need slow motion." },
];

type WriteUpProps = {
  times: Record<TrialId, number>;
  answers: Record<string, string>;
  setAnswers: Dispatch<SetStateAction<Record<string, string>>>;
  reflection: string;
  setReflection: (v: string) => void;
};

function WriteUp({ times, answers, setAnswers, reflection, setReflection }: WriteUpProps) {
  return (
    <View style={styles.stack}>
      {TRIALS.map((trial) => (
        <View key={trial.id} style={styles.actionCard}>
          <Text style={styles.actionTitle}>{trial.title}</Text>
          {!!trial.note && <Text style={styles.actionNote}>{trial.note}</Text>}

          {WRITEUP_QUESTIONS.map((q, c) => {
            const key = `${trial.id}-${c}`;
            const measured = times[trial.id];
            // Auto-fill the time question from the Recorder until the user edits it.
            const override = answers[key];
            const showMeasured = q.auto && override === undefined && measured > 0;
            const value = override ?? (q.auto && measured > 0 ? formatTime(measured) : "");
            return (
              <View key={key} style={styles.field}>
                <Text style={styles.fieldLabel}>{q.label}</Text>
                {q.options ? (
                  <View style={styles.choiceRow}>
                    {q.options.map((opt) => {
                      const active = answers[key] === opt;
                      return (
                        <Pressable
                          key={opt}
                          style={[styles.choiceChip, active && styles.choiceChipActive]}
                          onPress={() =>
                            setAnswers((prev) => ({ ...prev, [key]: active ? "" : opt }))
                          }
                        >
                          <Text
                            style={[styles.choiceChipText, active && styles.choiceChipTextActive]}
                          >
                            {opt}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : (
                  <>
                    <TextInput
                      style={styles.fieldInput}
                      value={value}
                      onChangeText={(v) => setAnswers((prev) => ({ ...prev, [key]: v }))}
                      multiline
                      textAlignVertical="top"
                    />
                    {showMeasured && (
                      <Text style={styles.fieldHint}>Measured in the Recorder — edit if needed.</Text>
                    )}
                  </>
                )}
              </View>
            );
          })}
        </View>
      ))}

      <View style={styles.card}>
        <Text style={styles.promptTitle}>
          Were you correct in the timings? What design was easiest to make?
        </Text>
        <TextInput
          style={styles.textArea}
          placeholder="Type your reflection here.."
          placeholderTextColor={COLORS.muted}
          value={reflection}
          onChangeText={setReflection}
          multiline
          textAlignVertical="top"
        />
      </View>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Discussion                                                                 */
/* -------------------------------------------------------------------------- */

const FORCES = [
  { force: "Downward (weight)", formula: "Weight = mass x g" },
  { force: "Upward (drag)", formula: "Drag force from the parachute" },
  { force: "Net (total) force", formula: "Net force = Weight - Drag Force" },
];

function Discussion() {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionHeading}>So why does this happen?</Text>

        <View style={styles.forceTable}>
          <View style={[styles.forceRow, styles.forceHeaderRow]}>
            <Text style={[styles.forceCell, styles.forceHeaderText]}>Force</Text>
            <Text style={[styles.forceCell, styles.forceHeaderText]}>Formula</Text>
          </View>
          {FORCES.map((f, i) => (
            <View
              key={f.force}
              style={[styles.forceRow, i === FORCES.length - 1 && styles.forceRowLast]}
            >
              <Text style={styles.forceCell}>{f.force}</Text>
              <Text style={styles.forceCell}>{f.formula}</Text>
            </View>
          ))}
        </View>

        <Text style={[styles.sectionHeading, styles.spacedTop]}>Newton’s Second Law:</Text>
        <Text style={styles.formulaCentered}>Net force = mass x acceleration</Text>

        <Text style={[styles.body, styles.spacedTop]}>
          Gravity pulls objects downward, causing them to speed up as they fall. A parachute
          increases air resistance (also called drag). Drag acts upward, opposing the motion and
          slowing the fall. A slower fall reduces the force when the toy hits the ground, making
          the landing safer. Engineers improve parachute designs through repeated testing and
          redesign.
        </Text>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Shared list primitives                                                     */
/* -------------------------------------------------------------------------- */

function Bullet({ children }: { children: string }) {
  return (
    <View style={styles.listItem}>
      <Text style={styles.listMarker}>•</Text>
      <Text style={styles.listText}>{children}</Text>
    </View>
  );
}

function Numbered({ n, children }: { n: number; children: string }) {
  return (
    <View style={styles.listItem}>
      <Text style={styles.listMarker}>{n}.</Text>
      <Text style={styles.listText}>{children}</Text>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Styles                                                                     */
/* -------------------------------------------------------------------------- */

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  backArrow: { color: COLORS.primary, fontSize: 34, fontWeight: "700", lineHeight: 36 },
  title: { color: COLORS.primary, fontSize: 22, fontWeight: "800", marginLeft: 8 },

  // Step wizard header
  stepHeader: { paddingHorizontal: 16, paddingBottom: 4 },
  progressTrack: { flexDirection: "row", gap: 6 },
  progressSeg: {
    flex: 1,
    height: 6,
    borderRadius: 999,
    backgroundColor: ACCENT.tabActive,
  },
  progressSegActive: { backgroundColor: COLORS.primary },
  stepCount: { color: COLORS.muted, fontSize: 13, fontWeight: "600", marginTop: 10 },
  stepName: { color: COLORS.primary, fontSize: 20, fontWeight: "800", marginTop: 2 },

  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24 },

  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    boxShadow: "0px 1px 6px rgba(0, 0, 0, 0.05)",
  },

  blockTitle: {
    color: COLORS.inputText,
    fontSize: 18,
    fontWeight: "800",
    marginTop: 18,
    marginBottom: 6,
  },
  body: { color: COLORS.inputText, fontSize: 16, lineHeight: 25 },

  listItem: { flexDirection: "row", marginTop: 7, paddingRight: 8 },
  listMarker: { color: COLORS.inputText, fontSize: 16, lineHeight: 24, width: 26, paddingLeft: 4 },
  listText: { color: COLORS.inputText, fontSize: 16, lineHeight: 24, flex: 1 },

  // Prediction
  promptTitle: { color: COLORS.inputText, fontSize: 17, fontWeight: "700", marginBottom: 14 },
  predictLead: { color: COLORS.inputText, fontSize: 16, lineHeight: 24, marginBottom: 10 },
  choiceRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 14 },
  choiceChip: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: ACCENT.border,
    backgroundColor: COLORS.white,
  },
  choiceChipActive: { backgroundColor: ACCENT.tabActive, borderColor: COLORS.primary },
  choiceChipText: { color: COLORS.inputText, fontSize: 15, fontWeight: "600" },
  choiceChipTextActive: { color: COLORS.primary, fontWeight: "700" },
  spacedTop: { marginTop: 24 },
  textArea: {
    borderWidth: 1,
    borderColor: ACCENT.border,
    borderRadius: 10,
    minHeight: 150,
    padding: 16,
    color: COLORS.inputText,
    fontSize: 16,
    lineHeight: 23,
  },

  // Recorder
  subTabBar: {
    flexDirection: "row",
    backgroundColor: COLORS.white,
    borderRadius: 999,
    padding: 4,
    marginBottom: 20,
    boxShadow: "0px 1px 4px rgba(0, 0, 0, 0.06)",
  },
  subTab: {
    flex: 1,
    paddingVertical: 11,
    paddingHorizontal: 4,
    borderRadius: 999,
    alignItems: "center",
  },
  subTabActive: { backgroundColor: ACCENT.tabActive },
  subTabLabel: { color: COLORS.inputText, fontSize: 13, fontWeight: "600" },
  subTabLabelActive: { color: COLORS.primary, fontWeight: "700" },
  instructionBox: {
    backgroundColor: ACCENT.softHeader,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  instructionTitle: { color: COLORS.primary, fontSize: 15, fontWeight: "800", marginBottom: 4 },
  instructionText: { color: COLORS.inputText, fontSize: 14, lineHeight: 20 },
  switchHint: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 16,
    lineHeight: 20,
  },
  uploadRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: ACCENT.border,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  uploadRowText: { color: COLORS.primary, fontSize: 15, fontWeight: "600" },
  timerCard: { marginTop: 20, alignItems: "center" },
  timer: { color: COLORS.inputText, fontSize: 56, fontWeight: "800", marginBottom: 20 },

  primaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 36,
    alignItems: "center",
    alignSelf: "center",
  },
  primaryBtnText: { color: COLORS.white, fontSize: 17, fontWeight: "700" },
  outlineBtn: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: ACCENT.border,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 36,
    alignItems: "center",
    alignSelf: "center",
  },
  outlineBtnText: { color: COLORS.inputText, fontSize: 17, fontWeight: "700" },

  // Write-Up (stacked action cards)
  stack: { gap: 16 },
  actionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    boxShadow: "0px 1px 6px rgba(0, 0, 0, 0.05)",
  },
  actionTitle: { color: COLORS.primary, fontSize: 18, fontWeight: "800" },
  actionNote: { color: COLORS.muted, fontSize: 14, marginTop: 4, lineHeight: 20 },
  field: { marginTop: 16 },
  fieldLabel: { color: COLORS.inputText, fontSize: 15, fontWeight: "600", marginBottom: 8, lineHeight: 21 },
  fieldInput: {
    borderWidth: 1,
    borderColor: ACCENT.border,
    borderRadius: 10,
    minHeight: 52,
    padding: 14,
    color: COLORS.inputText,
    fontSize: 16,
    lineHeight: 22,
  },
  fieldHint: { color: COLORS.muted, fontSize: 13, fontStyle: "italic", marginTop: 6 },

  // Discussion
  sectionHeading: { color: COLORS.primary, fontSize: 23, fontWeight: "800", marginBottom: 18 },
  forceTable: { borderWidth: 1, borderColor: ACCENT.border, borderRadius: 8, overflow: "hidden" },
  forceRow: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: ACCENT.border,
  },
  forceRowLast: { borderBottomWidth: 0 },
  forceHeaderRow: { backgroundColor: ACCENT.softHeader },
  forceCell: { flex: 1, padding: 14, color: COLORS.inputText, fontSize: 15, lineHeight: 21 },
  forceHeaderText: { fontWeight: "800" },
  formulaCentered: { color: COLORS.inputText, fontSize: 17, textAlign: "center", paddingVertical: 6 },

  // Wizard footer
  footer: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: ACCENT.border,
    backgroundColor: COLORS.bg,
  },
  footerSpacer: { flex: 1 },
  footerBack: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: ACCENT.border,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  footerBackText: { color: COLORS.primary, fontSize: 17, fontWeight: "700" },
  footerNext: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
});
