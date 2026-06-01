import { Ionicons } from "@expo/vector-icons";
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import { useLocalSearchParams, useRouter } from "expo-router";
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

// Lavender accents that match the activity mockups. Kept local since they're
// specific to this screen and not part of the shared auth palette.
const ACCENT = {
  tabActive: "#DCDDF2",
  tableHeader: "#C9CCEC",
  softHeader: "#EFEDF8",
  border: "#E2E2EC",
};

const TABS = ["Instructions", "Prediction", "Recorder", "Write-Up", "Discussion"] as const;

// The four classroom actions the activity walks through. Shared by the Recorder
// (where each action's loudness is measured) and the Write-Up (where each is
// documented) so the two steps line up 1:1.
const TRIALS = [
  {
    id: "book",
    short: "Drop book",
    title: "Dropping a book",
    note: "Drop a book onto the table or floor.",
    instruction:
      "Hold the phone 30 cm from the noise. Start the meter, drop the book, then read the peak level.",
  },
  {
    id: "talking",
    short: "Talking",
    title: "Talking",
    note: "Normal classroom talking volume.",
    instruction: "Hold the phone 30 cm away and talk normally while the meter runs.",
  },
  {
    id: "walking",
    short: "Walking",
    title: "Walking",
    note: "Walking across the room.",
    instruction: "Start the meter, then walk past the phone at about 30 cm.",
  },
  {
    id: "stamping",
    short: "Stamping",
    title: "Stamping feet",
    note: "Stamping feet on the floor.",
    instruction: "Start the meter, then stamp your feet near the phone.",
  },
] as const;
type TrialId = (typeof TRIALS)[number]["id"];

export default function SoundScreen() {
  const router = useRouter();
  const { activityTitle } = useLocalSearchParams<{ activityTitle?: string }>();
  const [step, setStep] = useState(0);

  // Activity state lives here (not inside each step) so navigating between
  // steps doesn't unmount and discard what the user has entered.
  const [prediction, setPrediction] = useState<PredictionValue>({ choice: "", reason: "" });
  const [reflection, setReflection] = useState("");
  const [levels, setLevels] = useState<Record<TrialId, number>>(
    Object.fromEntries(TRIALS.map((t) => [t.id, 0])) as Record<TrialId, number>,
  );
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const current = TABS[step];
  const isFirst = step === 0;
  const isLast = step === TABS.length - 1;

  const goNext = () => {
    if (isLast) {
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
          <Text style={styles.title}>Sound Pollution Hunter</Text>
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
          {current === "Recorder" && <Recorder levels={levels} setLevels={setLevels} />}
          {current === "Write-Up" && (
            <WriteUp
              levels={levels}
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
        Students measure and compare sound levels in different classroom activities, then map out
        which areas are loud and which are quiet.
      </Text>

      <Text style={styles.blockTitle}>Equipment</Text>
      {["Mobile phone with STEMM Lab app", "Objects to drop (e.g. pens, books)"].map((item) => (
        <Bullet key={item}>{item}</Bullet>
      ))}

      <Text style={styles.blockTitle}>Instructions</Text>
      {[
        "Measure noise from different actions (dropping objects like pens and books, talking, walking, stamping your feet).",
        "Record sound levels and locations.",
        "Map the loud and quiet zones around the room.",
      ].map((item, i) => (
        <Numbered key={item} n={i + 1}>
          {item}
        </Numbered>
      ))}

      <Text style={styles.blockTitle}>Diagram</Text>
      {[
        "Drop object (e.g. book) on the table or floor.",
        "Position the phone 30 cm from the noise source.",
        "Note where each measurement is taken to map loud and quiet zones.",
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

// The four actions the user can predict between.
const ACTION_OPTIONS = TRIALS.map((t) => t.short);

function Prediction({
  value,
  onChange,
}: {
  value: PredictionValue;
  onChange: (v: PredictionValue) => void;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.promptTitle}>Predict which action will create the loudest sound.</Text>

      <Text style={styles.predictLead}>I predict that</Text>
      <View style={styles.choiceRow}>
        {ACTION_OPTIONS.map((opt) => {
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
      <Text style={styles.predictLead}>will be the loudest because…</Text>
      <TextInput
        style={styles.textArea}
        placeholder="I think dropping the book.."
        placeholderTextColor={COLORS.muted}
        value={value.reason}
        onChangeText={(reason) => onChange({ ...value, reason })}
        multiline
        textAlignVertical="top"
      />
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Recorder                                                                   */
/* -------------------------------------------------------------------------- */

type LevelsProps = {
  levels: Record<TrialId, number>;
  setLevels: Dispatch<SetStateAction<Record<TrialId, number>>>;
};

// The phone mic is uncalibrated, so the raw value is in dBFS (≈ -160…0).
// Shift it into a friendly, classroom-sized relative scale for display.
function meteringToDb(metering: number | undefined | null) {
  if (metering == null || !Number.isFinite(metering)) return 0;
  return Math.max(0, Math.min(120, Math.round(metering + 100)));
}

function Recorder({ levels, setLevels }: LevelsProps) {
  const meteringSupported = Platform.OS !== "web";

  const [trial, setTrial] = useState<TrialId>(TRIALS[0].id);
  const [running, setRunning] = useState(false);
  // Live/last reading shown for the current trial; seeded with any saved level.
  const [display, setDisplay] = useState(levels[TRIALS[0].id]);
  const peakRef = useRef(0);
  const runningRef = useRef(false);

  const recorder = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true });
  const recorderState = useAudioRecorderState(recorder, 100);

  // Track the live reading and the peak while the meter runs.
  useEffect(() => {
    if (!running) return;
    const db = meteringToDb(recorderState.metering);
    setDisplay(db);
    if (db > peakRef.current) peakRef.current = db;
  }, [recorderState.metering, running]);

  // Release the mic if the user leaves the step mid-recording.
  useEffect(() => {
    return () => {
      if (runningRef.current) recorder.stop().catch(() => {});
    };
  }, [recorder]);

  function selectTrial(id: TrialId) {
    if (running) return; // don't switch mid-recording
    setTrial(id);
    setDisplay(levels[id]);
  }

  async function toggleMeter() {
    if (running) {
      runningRef.current = false;
      setRunning(false);
      try {
        await recorder.stop();
      } catch {
        // ignore — we still keep whatever peak we captured
      }
      setLevels((prev) => ({ ...prev, [trial]: peakRef.current }));
      setDisplay(peakRef.current);
      return;
    }

    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Microphone needed", "Allow microphone access to measure sound levels.");
      return;
    }
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    peakRef.current = 0;
    setDisplay(0);
    await recorder.prepareToRecordAsync();
    recorder.record();
    runningRef.current = true;
    setRunning(true);
  }

  const trialIndex = TRIALS.findIndex((t) => t.id === trial);
  const currentTrial = TRIALS[trialIndex];
  const nextTrial = TRIALS[trialIndex + 1];
  const recorded = !running && levels[trial] > 0;

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

      <View style={[styles.card, styles.timerCard]}>
        <Ionicons name="mic" size={40} color={COLORS.primary} style={styles.meterIcon} />
        <Text style={styles.timer}>{display > 0 ? `${display} dB` : "—"}</Text>
        <Pressable
          style={[
            styles.outlineBtn,
            running && styles.primaryBtn,
            !meteringSupported && styles.btnDisabled,
          ]}
          onPress={meteringSupported ? toggleMeter : undefined}
          disabled={!meteringSupported}
        >
          <Text style={[styles.outlineBtnText, running && styles.primaryBtnText]}>
            {running ? "Stop Decibel Meter" : "Start Decibel Meter"}
          </Text>
        </Pressable>
        {meteringSupported ? (
          <Text style={styles.meterCaption}>Relative level (uncalibrated)</Text>
        ) : (
          <Text style={styles.meterCaption}>
            Live metering isn&apos;t available on web — open the app on a phone.
          </Text>
        )}
      </View>

      {recorded &&
        (nextTrial ? (
          <Text style={styles.switchHint}>
            ✓ {currentTrial.short} level saved. Switch to {nextTrial.short} above to measure the next
            action.
          </Text>
        ) : (
          <Text style={styles.switchHint}>
            ✓ All actions measured. Continue to the Write-Up step when you&apos;re ready.
          </Text>
        ))}
    </>
  );
}

function formatDb(n: number) {
  return `${n} dB`;
}

/* -------------------------------------------------------------------------- */
/* Write-Up                                                                   */
/* -------------------------------------------------------------------------- */

// The 3 questions asked for every action (the mockup table's columns).
// The `auto` question is pre-filled from the level measured in the Recorder.
const WRITEUP_QUESTIONS = [
  { label: "Prediction (louder or softer than the others?)" },
  { label: "Outcome (dB)", auto: true },
  { label: "Were you right?" },
];

type WriteUpProps = {
  levels: Record<TrialId, number>;
  answers: Record<string, string>;
  setAnswers: Dispatch<SetStateAction<Record<string, string>>>;
  reflection: string;
  setReflection: (v: string) => void;
};

function WriteUp({ levels, answers, setAnswers, reflection, setReflection }: WriteUpProps) {
  return (
    <View style={styles.stack}>
      {TRIALS.map((trial) => (
        <View key={trial.id} style={styles.actionCard}>
          <Text style={styles.actionTitle}>{trial.title}</Text>
          {!!trial.note && <Text style={styles.actionNote}>{trial.note}</Text>}

          {WRITEUP_QUESTIONS.map((q, c) => {
            const key = `${trial.id}-${c}`;
            const measured = levels[trial.id];
            // Auto-fill the dB question from the Recorder until the user edits it.
            const override = answers[key];
            const showMeasured = q.auto && override === undefined && measured > 0;
            const value = override ?? (q.auto && measured > 0 ? formatDb(measured) : "");
            return (
              <View key={key} style={styles.field}>
                <Text style={styles.fieldLabel}>{q.label}</Text>
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
              </View>
            );
          })}
        </View>
      ))}

      <View style={styles.card}>
        <Text style={styles.promptTitle}>
          Were your predictions correct? Which action was the loudest, and which parts of the
          classroom were the noisiest?
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

const DB_LEVELS: { level: string; sounds: string; risk: string; tint?: string }[] = [
  { level: "0–30 dB", sounds: "Whisper, quiet library", risk: "No risk" },
  { level: "30–60 dB", sounds: "Normal conversation, classroom noise", risk: "Safe for long periods" },
  { level: "60–85 dB", sounds: "Busy traffic, vacuum cleaner", risk: "Long exposure can cause fatigue" },
  {
    level: "85–90 dB",
    sounds: "Lawn mower, loud classroom, heavy traffic",
    risk: "Hearing damage possible after long exposure",
  },
  {
    level: "90–100 dB",
    sounds: "Motorbike, power tools, loud music",
    risk: "Hearing damage likely after short exposure",
  },
  {
    level: "100–110 dB",
    sounds: "Nightclub, rock concert, chainsaw",
    risk: "Serious hearing damage in minutes",
  },
  {
    level: "110–120 dB",
    sounds: "Siren close by, car horn at 1 m",
    risk: "Painful; immediate damage possible",
    tint: "#FBF3B0",
  },
  {
    level: "120–130 dB",
    sounds: "Jet engine at close range",
    risk: "Immediate and severe hearing damage",
    tint: "#F8C89B",
  },
  {
    level: "140+ dB",
    sounds: "Explosion, gunshot",
    risk: "Instant, permanent hearing damage",
    tint: "#F4998E",
  },
];

function Discussion() {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionHeading}>So why does this happen?</Text>

      <View style={styles.forceTable}>
        <View style={[styles.forceRow, styles.forceHeaderRow]}>
          <Text style={[styles.forceCell, styles.forceHeaderText]}>Sound Level (dB)</Text>
          <Text style={[styles.forceCell, styles.forceHeaderText]}>Example Sounds</Text>
          <Text style={[styles.forceCell, styles.forceHeaderText]}>Risk to Hearing</Text>
        </View>
        {DB_LEVELS.map((row, i) => (
          <View
            key={row.level}
            style={[
              styles.forceRow,
              i === DB_LEVELS.length - 1 && styles.forceRowLast,
              !!row.tint && { backgroundColor: row.tint },
            ]}
          >
            <Text style={styles.forceCell}>{row.level}</Text>
            <Text style={styles.forceCell}>{row.sounds}</Text>
            <Text style={styles.forceCell}>{row.risk}</Text>
          </View>
        ))}
      </View>

      <Text style={[styles.sectionHeading, styles.spacedTop]}>Why it matters:</Text>
      <Text style={styles.formulaCentered}>Every +10 dB ≈ twice as loud</Text>

      <Text style={[styles.body, styles.spacedTop]}>
        Sound is measured in decibels (dB) on a logarithmic scale, so every extra 10 dB sounds
        roughly twice as loud and carries far more energy. Louder sounds, and longer exposure to
        them, do more damage to the tiny hair cells in your ears — and those cells don&apos;t grow
        back. Measuring and reducing noise pollution helps protect your hearing.
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
  timerCard: { marginTop: 20, alignItems: "center" },
  meterIcon: { marginBottom: 12 },
  timer: { color: COLORS.inputText, fontSize: 56, fontWeight: "800", marginBottom: 20 },
  meterCaption: { color: COLORS.muted, fontSize: 13, marginTop: 14, textAlign: "center" },

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
  btnDisabled: { opacity: 0.5 },

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
