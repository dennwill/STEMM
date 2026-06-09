import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  Vibration,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { VideoEvidence } from "@/components/VideoEvidence";
import { EarthquakeDiagram } from "@/components/ActivityDiagrams";
import { RatingCard } from "@/components/RatingCard";
import { createChallengeSession, createDataPoint } from "@/lib/crud";
import { LOCAL_ACTIVITY_IDS, LOCAL_TEAM_ID } from "@/lib/db";
import { captureSessionLocation } from "@/lib/location";
import { awardActivityCompletionPoints, formatAwardPointsMessage } from "@/lib/points";
import { Palette, useTheme, useWizardStyles, WizardAccent } from "@/lib/theme";
import { useMotionMeter } from "@/lib/useMotionMeter";

const TABS = ["Instructions", "Prediction", "Recorder", "Write-Up", "Discussion"] as const;

// The four fold designs the activity compares. Shared by the Prediction chips,
// the per-design Recorder (each design runs its own vibration test) and the
// Write-Up cards so the three steps line up 1:1.
const TRIALS = [
  {
    id: "design1",
    short: "Design 1",
    title: "Design 1",
    note: "e.g. 4 folds + 4 pillars",
    instruction:
      "Build this design, place the phone in the centre, then start the vibration test and watch how much it shakes. Upload a clip of the test.",
  },
  {
    id: "design2",
    short: "Design 2",
    title: "Design 2",
    note: "e.g. 10 folds + 4 pillars",
    instruction:
      "Rebuild with more folds, re-centre the phone, run the vibration test again and upload a clip.",
  },
  {
    id: "design3",
    short: "Design 3",
    title: "Design 3",
    note: "e.g. 3 folds and 6 pillars",
    instruction:
      "Try a different pillar layout, re-centre the phone, run the test and upload a clip.",
  },
  {
    id: "design4",
    short: "Design 4",
    title: "Design 4",
    note: "",
    instruction: "Test your final design from the same setup, run the test and upload a clip.",
  },
] as const;
type TrialId = (typeof TRIALS)[number]["id"];

type Measure = { score: number };

export default function EarthquakeScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const styles = useWizardStyles(makeStyles);
  const [step, setStep] = useState(0);

  // Activity state lives here (not inside each step) so navigating between
  // steps doesn't unmount and discard what the user has entered.
  const [prediction, setPrediction] = useState<PredictionValue>({ choice: "", reason: "" });
  const [reflection, setReflection] = useState("");
  const [rating, setRating] = useState(0);
  // Each design runs its own vibration test, so videos and the measured movement
  // score are per-trial maps (matching the other engineering activities).
  const [videos, setVideos] = useState<Record<TrialId, string>>(
    Object.fromEntries(TRIALS.map((t) => [t.id, ""])) as Record<TrialId, string>,
  );
  const [measures, setMeasures] = useState<Record<TrialId, Measure>>(
    Object.fromEntries(TRIALS.map((t) => [t.id, { score: 0 }])) as Record<TrialId, Measure>,
  );
  const [recorderBusy, setRecorderBusy] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const current = TABS[step];
  const isFirst = step === 0;
  const isLast = step === TABS.length - 1;

  const goNext = async () => {
    if (current === "Recorder" && recorderBusy) {
      Alert.alert("Recorder running", "Stop the vibration test before continuing.");
      return;
    }
    if (current === "Recorder" && !allDesignsTested(measures, videos)) {
      Alert.alert(
        "Recorder incomplete",
        "Run the vibration test and upload a clip for every design before continuing.",
      );
      return;
    }

    if (isLast) {
      // Persist the activity session and per-design data points to SQLite.
      let localSaveMessage = "Activity data was saved locally.";
      try {
        const loc = await captureSessionLocation();
        const sessionId = await createChallengeSession(db, {
          team_id: LOCAL_TEAM_ID,
          activity_id: LOCAL_ACTIVITY_IDS.earthquake,
          prediction_text: prediction.choice
            ? `${prediction.choice}: ${prediction.reason}`
            : null,
          discussion_reflection: reflection || null,
          rating: rating || null,
          gps_lat: loc?.lat ?? null,
          gps_lng: loc?.lng ?? null,
        });

        // The steadiest design is the one with the lowest movement score.
        const bestShort = steadiestDesign(measures);
        for (const trial of TRIALS) {
          const score = measures[trial.id].score;
          const isPredicted = prediction.choice === trial.short;
          await createDataPoint(db, {
            session_id: sessionId,
            attempt_number: TRIALS.indexOf(trial) + 1,
            action_or_design: trial.title,
            prediction_value: isPredicted ? "predicted most stable" : null,
            outcome_value: score > 0 ? formatScore(score) : null,
            prediction_correct: isPredicted && bestShort ? prediction.choice === bestShort : null,
            media_file_path: videos[trial.id] || null,
          });
        }
      } catch (err) {
        console.warn("Failed to save activity data:", err);
        localSaveMessage = "Local activity data could not be saved.";
      }
      const award = await awardActivityCompletionPoints(
        "earthquake",
        "Earthquake-Resistant Structure",
      );
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
          <Text style={styles.title}>Earthquake-Resistant Structure</Text>
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
          {current === "Recorder" && (
            <Recorder
              videos={videos}
              setVideos={setVideos}
              measures={measures}
              setMeasures={setMeasures}
              setRecorderBusy={setRecorderBusy}
            />
          )}
          {current === "Write-Up" && (
            <WriteUp
              measures={measures}
              answers={answers}
              setAnswers={setAnswers}
              reflection={reflection}
              setReflection={setReflection}
            />
          )}
          {current === "Discussion" && <Discussion />}
          {current === "Discussion" && <RatingCard value={rating} onChange={setRating} />}
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
  const styles = useWizardStyles(makeStyles);
  return (
    <View style={styles.card}>
      <Text style={styles.blockTitle}>Overview</Text>
      <Text style={styles.body}>
        Students design structures that withstand vibration, simulating earthquakes, then iterate
        their design to reduce how much the structure moves.
      </Text>

      <Text style={styles.blockTitle}>Equipment</Text>
      {["Cardboard, paper, scissors, sticky tape, plastic/paper cups", "Mobile phone with vibration sensor"].map(
        (item) => (
          <Bullet key={item}>{item}</Bullet>
        ),
      )}

      <Text style={styles.blockTitle}>Instructions</Text>
      {[
        "Build an anti-vibration layer by folding paper or cardboard.",
        "Place a flat cardboard platform on top.",
        "Place the phone in the centre and activate vibration mode on the STEMM App.",
        "Modify the structure to reduce movement (e.g. more pillars, more folds).",
      ].map((item, i) => (
        <Numbered key={item} n={i + 1}>
          {item}
        </Numbered>
      ))}

      <Text style={styles.blockTitle}>Diagram</Text>
      <EarthquakeDiagram />
      {[
        "Fold paper or cardboard into an anti-vibration base.",
        "Add cup pillars and a flat cardboard platform on top.",
        "Place the phone in the centre of the platform.",
        "Start the vibration and watch how much the structure moves.",
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

// The four fold designs the user can predict between.
const DESIGN_OPTIONS = TRIALS.map((t) => t.short);

function Prediction({
  value,
  onChange,
}: {
  value: PredictionValue;
  onChange: (v: PredictionValue) => void;
}) {
  const { palette: c } = useTheme();
  const styles = useWizardStyles(makeStyles);
  return (
    <View style={styles.card}>
      <Text style={styles.promptTitle}>Predict which fold design makes the phone move the least.</Text>

      <Text style={styles.predictLead}>I predict that</Text>
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
      <Text style={styles.predictLead}>will move the least because…</Text>
      <TextInput
        style={styles.textArea}
        placeholder="Enter prediction here.."
        placeholderTextColor={c.muted}
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

function allDesignsTested(measures: Record<TrialId, Measure>, videos: Record<TrialId, string>) {
  return TRIALS.every((t) => measures[t.id].score > 0 && videos[t.id] !== "");
}

// The steadiest design is the one that shook the least (lowest movement score).
function steadiestDesign(measures: Record<TrialId, Measure>): string | null {
  const tested = TRIALS.filter((t) => measures[t.id].score > 0);
  if (!tested.length) return null;
  return tested.reduce((best, t) => (measures[t.id].score < measures[best.id].score ? t : best))
    .short;
}

function formatScore(score: number) {
  return `movement ${score.toFixed(3)} g (lower = steadier)`;
}

type RecorderProps = {
  videos: Record<TrialId, string>;
  setVideos: Dispatch<SetStateAction<Record<TrialId, string>>>;
  measures: Record<TrialId, Measure>;
  setMeasures: Dispatch<SetStateAction<Record<TrialId, Measure>>>;
  setRecorderBusy: Dispatch<SetStateAction<boolean>>;
};

function Recorder({ videos, setVideos, measures, setMeasures, setRecorderBusy }: RecorderProps) {
  const { palette: c } = useTheme();
  const styles = useWizardStyles(makeStyles);
  const [trial, setTrial] = useState<TrialId>(TRIALS[0].id);
  const { running, live, peak, start, stop, reset, getRms } = useMotionMeter(100);

  useEffect(() => {
    setRecorderBusy(running);
  }, [running, setRecorderBusy]);

  // Stop buzzing + release the sensor if the user leaves the step mid-test.
  useEffect(() => {
    return () => {
      Vibration.cancel();
      stop();
      setRecorderBusy(false);
    };
  }, [stop, setRecorderBusy]);

  function selectTrial(id: TrialId) {
    if (running) return; // don't switch designs mid-test
    setTrial(id);
  }

  function toggle() {
    if (running) {
      Vibration.cancel();
      stop();
      // Save the RMS deviation as this design's movement score (lower = steadier).
      setMeasures((prev) => ({ ...prev, [trial]: { score: getRms() } }));
      return;
    }
    reset();
    Vibration.vibrate([0, 600, 400], true);
    start();
  }

  const trialIndex = TRIALS.findIndex((t) => t.id === trial);
  const currentTrial = TRIALS[trialIndex];
  const nextTrial = TRIALS[trialIndex + 1];
  const score = measures[trial].score;
  const recorded = !running && score > 0 && videos[trial] !== "";

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
        <MaterialCommunityIcons
          name="vibrate"
          size={44}
          color={c.primary}
          style={styles.mediaIcon}
        />
        <Text style={styles.meterValue}>{(running ? live : score).toFixed(3)} g</Text>
        <Text style={styles.meterCaption}>
          {running
            ? `Shaking… peak so far ${peak.toFixed(3)} g`
            : score > 0
              ? "Saved movement score (lower = steadier)"
              : "Movement (g) — lower means steadier"}
        </Text>
        <Pressable style={[styles.primaryBtn, running && styles.outlineBtn]} onPress={toggle}>
          <Text style={[styles.primaryBtnText, running && styles.outlineBtnText]}>
            {running ? "Stop Vibration Test" : "Start Vibration Test"}
          </Text>
        </Pressable>
      </View>

      <VideoEvidence
        value={videos[trial]}
        onChange={(uri) => setVideos((prev) => ({ ...prev, [trial]: uri }))}
      />

      {recorded &&
        (nextTrial ? (
          <Text style={styles.switchHint}>
            ✓ {currentTrial.short} tested. Switch to {nextTrial.short} above to test the next design.
          </Text>
        ) : (
          <Text style={styles.switchHint}>
            ✓ All designs tested. Continue to the Write-Up step when you&apos;re ready.
          </Text>
        ))}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Write-Up                                                                   */
/* -------------------------------------------------------------------------- */

// The 3 questions asked for every design (the mockup table's columns). The
// movement question is auto-filled from the score measured in the Recorder.
const WRITEUP_QUESTIONS = [
  { label: "Phone moves (yes / no)?", options: ["Yes", "No"] },
  { label: "Outcome — movement score", auto: true },
  { label: "Were you right?", options: ["Yes", "No"] },
];

type WriteUpProps = {
  measures: Record<TrialId, Measure>;
  answers: Record<string, string>;
  setAnswers: Dispatch<SetStateAction<Record<string, string>>>;
  reflection: string;
  setReflection: (v: string) => void;
};

function WriteUp({ measures, answers, setAnswers, reflection, setReflection }: WriteUpProps) {
  const { palette: c } = useTheme();
  const styles = useWizardStyles(makeStyles);
  return (
    <View style={styles.stack}>
      {TRIALS.map((trial) => (
        <View key={trial.id} style={styles.actionCard}>
          <Text style={styles.actionTitle}>{trial.title}</Text>
          {!!trial.note && <Text style={styles.actionNote}>{trial.note}</Text>}

          {WRITEUP_QUESTIONS.map((q, qi) => {
            const key = `${trial.id}-${qi}`;
            const measured = measures[trial.id].score;
            // Auto-fill the movement question from the Recorder until the user edits it.
            const override = answers[key];
            const showMeasured = q.auto && override === undefined && measured > 0;
            const value = override ?? (q.auto && measured > 0 ? formatScore(measured) : "");
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
          What did you notice? Which design was the most stable, and why?
        </Text>
        <TextInput
          style={styles.textArea}
          placeholder="It's also important to note that.."
          placeholderTextColor={c.muted}
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

function Discussion() {
  const styles = useWizardStyles(makeStyles);
  return (
    <View style={styles.card}>
      <Text style={styles.sectionHeading}>So why does this happen?</Text>
      <Text style={styles.body}>
        Earthquakes cause ground vibrations that can collapse poorly designed structures. Engineers
        design buildings to absorb and distribute that energy safely — using flexible joints, broad
        bases, and bracing to keep the movement small.
      </Text>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Shared list primitives                                                     */
/* -------------------------------------------------------------------------- */

function Bullet({ children }: { children: string }) {
  const styles = useWizardStyles(makeStyles);
  return (
    <View style={styles.listItem}>
      <Text style={styles.listMarker}>•</Text>
      <Text style={styles.listText}>{children}</Text>
    </View>
  );
}

function Numbered({ n, children }: { n: number; children: string }) {
  const styles = useWizardStyles(makeStyles);
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

const makeStyles = (c: Palette, ACCENT: WizardAccent) =>
  StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.bg },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  backArrow: { color: c.primary, fontSize: 34, fontWeight: "700", lineHeight: 36 },
  title: { color: c.primary, fontSize: 22, fontWeight: "800", marginLeft: 8, flex: 1 },

  // Step wizard header
  stepHeader: { paddingHorizontal: 16, paddingBottom: 4 },
  progressTrack: { flexDirection: "row", gap: 6 },
  progressSeg: {
    flex: 1,
    height: 6,
    borderRadius: 999,
    backgroundColor: ACCENT.tabActive,
  },
  progressSegActive: { backgroundColor: c.primary },
  stepCount: { color: c.muted, fontSize: 13, fontWeight: "600", marginTop: 10 },
  stepName: { color: c.primary, fontSize: 20, fontWeight: "800", marginTop: 2 },

  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24 },

  card: {
    backgroundColor: c.white,
    borderRadius: 16,
    padding: 20,
    boxShadow: "0px 1px 6px rgba(0, 0, 0, 0.05)",
  },

  blockTitle: {
    color: c.inputText,
    fontSize: 18,
    fontWeight: "800",
    marginTop: 18,
    marginBottom: 6,
  },
  body: { color: c.inputText, fontSize: 16, lineHeight: 25 },

  listItem: { flexDirection: "row", marginTop: 7, paddingRight: 8 },
  listMarker: { color: c.inputText, fontSize: 16, lineHeight: 24, width: 26, paddingLeft: 4 },
  listText: { color: c.inputText, fontSize: 16, lineHeight: 24, flex: 1 },

  // Prediction
  promptTitle: { color: c.inputText, fontSize: 17, fontWeight: "700", marginBottom: 14 },
  predictLead: { color: c.inputText, fontSize: 16, lineHeight: 24, marginBottom: 10 },
  choiceRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 14 },
  choiceChip: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: ACCENT.border,
    backgroundColor: c.white,
  },
  choiceChipActive: { backgroundColor: ACCENT.tabActive, borderColor: c.primary },
  choiceChipText: { color: c.inputText, fontSize: 15, fontWeight: "600" },
  choiceChipTextActive: { color: c.primary, fontWeight: "700" },
  textArea: {
    borderWidth: 1,
    borderColor: ACCENT.border,
    borderRadius: 10,
    minHeight: 150,
    padding: 16,
    color: c.inputText,
    fontSize: 16,
    lineHeight: 23,
  },

  // Recorder (per-design vibration test)
  mediaIcon: { marginBottom: 16 },
  subTabBar: {
    flexDirection: "row",
    backgroundColor: c.white,
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
  subTabLabel: { color: c.inputText, fontSize: 13, fontWeight: "600" },
  subTabLabelActive: { color: c.primary, fontWeight: "700" },
  instructionBox: {
    backgroundColor: ACCENT.softHeader,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  instructionTitle: { color: c.primary, fontSize: 15, fontWeight: "800", marginBottom: 4 },
  instructionText: { color: c.inputText, fontSize: 14, lineHeight: 20 },
  timerCard: { marginBottom: 20, alignItems: "center" },
  meterValue: {
    color: c.inputText,
    fontSize: 44,
    fontWeight: "800",
    marginBottom: 6,
    fontVariant: ["tabular-nums"],
  },
  meterCaption: { color: c.muted, fontSize: 13, textAlign: "center", marginBottom: 18 },
  switchHint: {
    color: c.primary,
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 16,
    lineHeight: 20,
  },

  primaryBtn: {
    backgroundColor: c.primary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 36,
    alignItems: "center",
    alignSelf: "center",
  },
  primaryBtnText: { color: c.white, fontSize: 17, fontWeight: "700" },
  outlineBtn: {
    backgroundColor: c.white,
    borderWidth: 1,
    borderColor: ACCENT.border,
  },
  outlineBtnText: { color: c.inputText },

  // Write-Up (stacked design cards)
  stack: { gap: 16 },
  actionCard: {
    backgroundColor: c.white,
    borderRadius: 16,
    padding: 20,
    boxShadow: "0px 1px 6px rgba(0, 0, 0, 0.05)",
  },
  actionTitle: { color: c.primary, fontSize: 18, fontWeight: "800" },
  actionNote: { color: c.muted, fontSize: 14, marginTop: 4, lineHeight: 20 },
  field: { marginTop: 16 },
  fieldLabel: { color: c.inputText, fontSize: 15, fontWeight: "600", marginBottom: 8, lineHeight: 21 },
  fieldInput: {
    borderWidth: 1,
    borderColor: ACCENT.border,
    borderRadius: 10,
    minHeight: 52,
    padding: 14,
    color: c.inputText,
    fontSize: 16,
    lineHeight: 22,
  },
  fieldHint: { color: c.muted, fontSize: 13, fontStyle: "italic", marginTop: 6 },

  // Discussion
  sectionHeading: { color: c.primary, fontSize: 23, fontWeight: "800", marginBottom: 18 },

  // Wizard footer
  footer: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: ACCENT.border,
    backgroundColor: c.bg,
  },
  footerSpacer: { flex: 1 },
  footerBack: {
    flex: 1,
    backgroundColor: c.white,
    borderWidth: 1,
    borderColor: ACCENT.border,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  footerBackText: { color: c.primary, fontSize: 17, fontWeight: "700" },
  footerNext: {
    flex: 1,
    backgroundColor: c.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  });
