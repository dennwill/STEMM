import { useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { Dispatch, ReactElement, ReactNode, SetStateAction, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  GestureResponderEvent,
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
import Svg, { Circle, Path } from "react-native-svg";

import { VideoEvidence } from "@/components/VideoEvidence";
import { BreathingDiagram, PerformanceDiagram, ReactionDiagram } from "@/components/ActivityDiagrams";
import { RatingCard } from "@/components/RatingCard";
import { createChallengeSession, createDataPoint } from "@/lib/crud";
import { captureSessionLocation } from "@/lib/location";
import { LOCAL_ACTIVITY_IDS, LOCAL_TEAM_ID } from "@/lib/db";
import { awardActivityCompletionPoints, formatAwardPointsMessage } from "@/lib/points";
import { Palette, useTheme } from "@/lib/theme";
import { useMotionMeter } from "@/lib/useMotionMeter";

type Accent = {
  tabActive: string;
  tableHeader: string;
  softHeader: string;
  border: string;
};

const LIGHT_ACCENT: Accent = {
  tabActive: "#DCDDF2",
  tableHeader: "#C9CCEC",
  softHeader: "#EFEDF8",
  border: "#E2E2EC",
};

const DARK_ACCENT: Accent = {
  tabActive: "#2E3550",
  tableHeader: "#3A4060",
  softHeader: "#222A3D",
  border: "#333A4A",
};

/** Theme-reactive styles for the activity shell + recorders. */
function useActivityStyles() {
  const { palette, isDark } = useTheme();
  return useMemo(
    () => makeStyles(palette, isDark ? DARK_ACCENT : LIGHT_ACCENT),
    [palette, isDark],
  );
}

const TABS = ["Instructions", "Prediction", "Recorder", "Write-Up", "Discussion"] as const;

type PredictionValue = { choice: string; reason: string };

type Trial = {
  id: string;
  short: string;
  title: string;
  note?: string;
  instruction: string;
};

type ActivityShellProps<TrialId extends string, Measurement> = {
  activityId: keyof typeof LOCAL_ACTIVITY_IDS;
  title: string;
  trials: readonly (Trial & { id: TrialId })[];
  predictionPrompt: string;
  predictionLead: string;
  predictionTail: string;
  predictionOptions: string[];
  createInitialMeasurements: () => Record<TrialId, Measurement>;
  renderInstructions: () => ReactElement;
  renderRecorder: (props: MeasurementProps<TrialId, Measurement>) => ReactElement;
  renderWriteUp: (props: WriteUpStateProps<TrialId, Measurement>) => ReactElement;
  renderDiscussion: () => ReactElement;
  canContinueFromRecorder?: (measurements: Record<TrialId, Measurement>) => boolean;
  recorderIncompleteMessage?: string;
  // Serializes a trial's measurement into a human-readable outcome for the
  // local data point ("" when incomplete). Each screen already passes the same
  // formatter to its Write-Up.
  formatMeasurement?: (measurement: Measurement) => string;
};

type MeasurementProps<TrialId extends string, Measurement> = {
  trials: readonly (Trial & { id: TrialId })[];
  measurements: Record<TrialId, Measurement>;
  setMeasurements: Dispatch<SetStateAction<Record<TrialId, Measurement>>>;
  setRecorderBusy: Dispatch<SetStateAction<boolean>>;
  // Per-trial evidence video URIs ("" when none attached for that trial).
  videos: Record<TrialId, string>;
  setVideos: Dispatch<SetStateAction<Record<TrialId, string>>>;
};

type WriteUpStateProps<TrialId extends string, Measurement> = MeasurementProps<
  TrialId,
  Measurement
> & {
  answers: Record<string, string>;
  setAnswers: Dispatch<SetStateAction<Record<string, string>>>;
  reflection: string;
  setReflection: (v: string) => void;
};

function ActivityShell<TrialId extends string, Measurement>({
  activityId,
  title,
  trials,
  predictionPrompt,
  predictionLead,
  predictionTail,
  predictionOptions,
  createInitialMeasurements,
  renderInstructions,
  renderRecorder,
  renderWriteUp,
  renderDiscussion,
  canContinueFromRecorder,
  recorderIncompleteMessage = "Complete all recorder trials before continuing.",
  formatMeasurement,
}: ActivityShellProps<TrialId, Measurement>) {
  const router = useRouter();
  const db = useSQLiteContext();
  const styles = useActivityStyles();
  const [step, setStep] = useState(0);
  const [prediction, setPrediction] = useState<PredictionValue>({ choice: "", reason: "" });
  const [reflection, setReflection] = useState("");
  const [rating, setRating] = useState(0);
  const [measurements, setMeasurements] = useState<Record<TrialId, Measurement>>(
    createInitialMeasurements,
  );
  const [videos, setVideos] = useState<Record<TrialId, string>>(
    () => Object.fromEntries(trials.map((t) => [t.id, ""])) as Record<TrialId, string>,
  );
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [recorderBusy, setRecorderBusy] = useState(false);

  const current = TABS[step];
  const isFirst = step === 0;
  const isLast = step === TABS.length - 1;

  const goNext = async () => {
    if (current === "Recorder" && recorderBusy) {
      Alert.alert("Recorder running", "Stop the current recorder before continuing.");
      return;
    }
    if (current === "Recorder" && canContinueFromRecorder && !canContinueFromRecorder(measurements)) {
      Alert.alert("Recorder incomplete", recorderIncompleteMessage);
      return;
    }
    if (isLast) {
      // Persist the activity session and per-trial data points to SQLite.
      let localSaveMessage = "Activity data was saved locally.";
      try {
        const loc = await captureSessionLocation();
        const sessionId = await createChallengeSession(db, {
          team_id: LOCAL_TEAM_ID,
          activity_id: LOCAL_ACTIVITY_IDS[activityId],
          prediction_text: prediction.choice
            ? `${prediction.choice}: ${prediction.reason}`
            : null,
          discussion_reflection: reflection || null,
          rating: rating || null,
          gps_lat: loc?.lat ?? null,
          gps_lng: loc?.lng ?? null,
        });

        for (let i = 0; i < trials.length; i++) {
          const trial = trials[i];
          const outcome = formatMeasurement?.(measurements[trial.id]) || null;
          await createDataPoint(db, {
            session_id: sessionId,
            attempt_number: i + 1,
            action_or_design: trial.title,
            prediction_value: prediction.choice === trial.short ? "predicted" : null,
            outcome_value: outcome,
            prediction_correct: prediction.choice === trial.short && outcome ? true : null,
            media_file_path: videos[trial.id] || null,
          });
        }
      } catch (err) {
        console.warn("Failed to save activity data:", err);
        localSaveMessage = "Local activity data could not be saved.";
      }
      const award = await awardActivityCompletionPoints(activityId, title);
      Alert.alert("Activity complete", `${localSaveMessage} ${formatAwardPointsMessage(award)}`);
      router.back();
      return;
    }
    setStep((s) => Math.min(s + 1, TABS.length - 1));
  };
  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  useEffect(() => {
    if (current !== "Recorder" && recorderBusy) {
      setRecorderBusy(false);
    }
  }, [current, recorderBusy]);

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
          <Text style={styles.title}>{title}</Text>
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
          {current === "Instructions" && renderInstructions()}
          {current === "Prediction" && (
            <Prediction
              value={prediction}
              onChange={setPrediction}
              prompt={predictionPrompt}
              lead={predictionLead}
              tail={predictionTail}
              options={predictionOptions}
            />
          )}
          {current === "Recorder" &&
            renderRecorder({ trials, measurements, setMeasurements, setRecorderBusy, videos, setVideos })}
          {current === "Write-Up" &&
            renderWriteUp({
              trials,
              measurements,
              setMeasurements,
              setRecorderBusy,
              videos,
              setVideos,
              answers,
              setAnswers,
              reflection,
              setReflection,
            })}
          {current === "Discussion" && renderDiscussion()}
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

function InstructionsContent({
  overview,
  equipment,
  instructions,
  referenceHeaders,
  referenceRows,
  diagram,
  diagramArt,
}: {
  overview: string;
  equipment: string[];
  instructions: string[];
  referenceHeaders?: string[];
  referenceRows?: string[][];
  diagram: string[];
  diagramArt?: ReactNode;
}) {
  const styles = useActivityStyles();
  return (
    <View style={styles.card}>
      <Text style={styles.blockTitle}>Overview</Text>
      <Text style={styles.body}>{overview}</Text>

      <Text style={styles.blockTitle}>Equipment</Text>
      {equipment.map((item) => (
        <Bullet key={item}>{item}</Bullet>
      ))}

      <Text style={styles.blockTitle}>Instructions</Text>
      {instructions.map((item, i) => (
        <Numbered key={item} n={i + 1}>
          {item}
        </Numbered>
      ))}

      {referenceHeaders && referenceRows && (
        <>
          <Text style={styles.blockTitle}>Reference table</Text>
          <ConceptTable headers={referenceHeaders} rows={referenceRows} />
        </>
      )}

      <Text style={styles.blockTitle}>Diagram</Text>
      {diagramArt}
      {diagram.map((item) => (
        <Bullet key={item}>{item}</Bullet>
      ))}
    </View>
  );
}

function ConceptTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  const styles = useActivityStyles();
  return (
    <View style={styles.forceTable}>
      <View style={[styles.forceRow, styles.forceHeaderRow]}>
        {headers.map((header) => (
          <Text key={header} style={[styles.forceCell, styles.forceHeaderText]}>
            {header}
          </Text>
        ))}
      </View>
      {rows.map((row, i) => (
        <View key={row.join("-")} style={[styles.forceRow, i === rows.length - 1 && styles.forceRowLast]}>
          {row.map((cell) => (
            <Text key={cell} style={styles.forceCell}>
              {cell}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

function Prediction({
  value,
  onChange,
  prompt,
  lead,
  tail,
  options,
}: {
  value: PredictionValue;
  onChange: (v: PredictionValue) => void;
  prompt: string;
  lead: string;
  tail: string;
  options: string[];
}) {
  const { palette: c } = useTheme();
  const styles = useActivityStyles();
  return (
    <View style={styles.card}>
      <Text style={styles.promptTitle}>{prompt}</Text>

      <Text style={styles.predictLead}>{lead}</Text>
      <View style={styles.choiceRow}>
        {options.map((opt) => {
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
      <Text style={styles.predictLead}>{tail}</Text>
      <TextInput
        style={styles.textArea}
        placeholder="Type your reason here.."
        placeholderTextColor={c.muted}
        value={value.reason}
        onChangeText={(reason) => onChange({ ...value, reason })}
        multiline
        textAlignVertical="top"
      />
    </View>
  );
}

function TrialTabs<TrialId extends string>({
  trials,
  active,
  onSelect,
}: {
  trials: readonly (Trial & { id: TrialId })[];
  active: TrialId;
  onSelect: (id: TrialId) => void;
}) {
  const styles = useActivityStyles();
  return (
    <View style={styles.subTabBar}>
      {trials.map((t) => (
        <Pressable
          key={t.id}
          style={[styles.subTab, active === t.id && styles.subTabActive]}
          onPress={() => onSelect(t.id)}
        >
          <Text style={[styles.subTabLabel, active === t.id && styles.subTabLabelActive]}>
            {t.short}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

type WriteUpQuestion = { label: string; auto?: boolean };

function StandardWriteUp<TrialId extends string, Measurement>({
  trials,
  measurements,
  answers,
  setAnswers,
  reflection,
  setReflection,
  questions,
  reflectionPrompt,
  formatMeasurement,
}: WriteUpStateProps<TrialId, Measurement> & {
  questions: WriteUpQuestion[];
  reflectionPrompt: string;
  formatMeasurement: (m: Measurement) => string;
}) {
  const { palette: c } = useTheme();
  const styles = useActivityStyles();
  return (
    <View style={styles.stack}>
      {trials.map((trial) => (
        <View key={trial.id} style={styles.actionCard}>
          <Text style={styles.actionTitle}>{trial.title}</Text>
          {!!trial.note && <Text style={styles.actionNote}>{trial.note}</Text>}

          {questions.map((q, c) => {
            const key = `${trial.id}-${c}`;
            const measuredText = q.auto ? formatMeasurement(measurements[trial.id]) : "";
            const override = answers[key];
            const showMeasured = q.auto && override === undefined && measuredText.length > 0;
            const value = override ?? measuredText;
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
                  <Text style={styles.fieldHint}>Measured in the Recorder - edit if needed.</Text>
                )}
              </View>
            );
          })}
        </View>
      ))}

      <View style={styles.card}>
        <Text style={styles.promptTitle}>{reflectionPrompt}</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Type your reflection here.."
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

function DiscussionContent({
  heading,
  formulaTitle,
  formula,
  explanation,
}: {
  heading: string;
  formulaTitle: string;
  formula: string;
  explanation: string;
}) {
  const styles = useActivityStyles();
  return (
    <View style={styles.card}>
      <Text style={styles.sectionHeading}>{heading}</Text>

      <Text style={styles.sectionHeading}>{formulaTitle}</Text>
      <Text style={styles.formulaCentered}>{formula}</Text>

      <Text style={[styles.body, styles.spacedTop]}>{explanation}</Text>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Human Performance Lab                                                      */
/* -------------------------------------------------------------------------- */

const PERFORMANCE_TRIALS = [
  {
    id: "circle",
    short: "Circle",
    title: "Movement 1 — hand circle",
    note: "Rotate your hand in a smooth circle.",
    instruction:
      "Hold the phone firmly. Start the meter, then move your hand in a slow, smooth circle for the full window.",
  },
  {
    id: "figure8",
    short: "Figure-8",
    title: "Movement 2 — figure-8",
    note: "Trace a figure-8 in the air.",
    instruction: "Start the meter, then trace a smooth figure-8 with the phone for the full window.",
  },
  {
    id: "sideToSide",
    short: "Side-to-side",
    title: "Movement 3 — slow side-to-side",
    note: "Sweep the phone left and right.",
    instruction:
      "Start the meter, then sweep the phone slowly side to side, keeping the motion as smooth as you can.",
  },
] as const;
type PerformanceTrialId = (typeof PERFORMANCE_TRIALS)[number]["id"];
type PerformanceMeasurement = { elapsed: number; score: number };
const GRACE_WINDOW_MS = 15000;

export function HumanPerformanceLabScreen() {
  return (
    <ActivityShell<PerformanceTrialId, PerformanceMeasurement>
      activityId="performance"
      title="Human Performance Lab"
      formatMeasurement={formatPerformanceMeasurement}
      trials={PERFORMANCE_TRIALS}
      predictionPrompt="Predict which movement will be hardest to keep smooth."
      predictionLead="I predict the hardest movement to keep smooth will be"
      predictionTail="because..."
      predictionOptions={PERFORMANCE_TRIALS.map((t) => t.short)}
      canContinueFromRecorder={(measurements) =>
        PERFORMANCE_TRIALS.every(
          (t) => measurements[t.id].elapsed >= GRACE_WINDOW_MS && measurements[t.id].score > 0,
        )
      }
      recorderIncompleteMessage="Run the full 15-second smoothness window for every movement before continuing."
      createInitialMeasurements={() =>
        Object.fromEntries(PERFORMANCE_TRIALS.map((t) => [t.id, { elapsed: 0, score: 0 }])) as Record<
          PerformanceTrialId,
          PerformanceMeasurement
        >
      }
      renderInstructions={() => (
        <InstructionsContent
          overview="Students investigate how smoothly and gracefully the body moves. Holding the phone, they perform guided hand movements while the motion sensor measures how steady (low vibration) each movement is."
          equipment={[
            "Mobile phone with STEMM Lab app",
            "Open space to move safely",
          ]}
          instructions={[
            "Hold the phone firmly in one hand.",
            "Start the motion meter for the movement.",
            "Perform the guided movement slowly and smoothly for 15 seconds.",
            "Read the smoothness score — lower means steadier and more graceful.",
            "Repeat for each movement and compare which was hardest to keep smooth.",
          ]}
          referenceHeaders={["Idea", "What it shows"]}
          referenceRows={[
            ["Smoothness score", "How much the phone vibrated (lower = smoother)"],
            ["Faster movement", "Often harder to control, so vibration rises"],
            ["Coordination", "Smoother movement shows better muscle control"],
            ["Fatigue", "Tired muscles make movement shakier"],
          ]}
          diagram={[
            "Hold the phone and rotate your hand in a circle.",
            "Trace a figure-8 in the air.",
            "The motion sensor scores how smooth each movement is.",
          ]}
          diagramArt={<PerformanceDiagram />}
        />
      )}
      renderRecorder={(props) => <PerformanceRecorder {...props} />}
      renderWriteUp={(props) => (
        <StandardWriteUp
          {...props}
          questions={[
            { label: "Predicted smoothness before measuring" },
            { label: "Measured smoothness score", auto: true },
            { label: "How did this compare with your prediction?" },
            { label: "What might have affected this result?" },
            { label: "Were you right?" },
          ]}
          reflectionPrompt="Which movement was hardest to keep smooth, and why? What does that suggest about coordination, control, and fatigue?"
          formatMeasurement={formatPerformanceMeasurement}
        />
      )}
      renderDiscussion={() => (
        <DiscussionContent
          heading="So why does this happen?"
          formulaTitle="Smoothness score:"
          formula="Smoothness = average vibration while moving (lower = smoother)"
          explanation="Muscles and joints work together to create movement. Faster or less-controlled movements wobble more, so the phone's motion sensor reads higher vibration. Smoother movements show better coordination, and tired muscles make movement shakier — which is why athletes and dancers practise control."
        />
      )}
    />
  );
}

function PerformanceRecorder({
  trials,
  measurements,
  setMeasurements,
  setRecorderBusy,
  videos,
  setVideos,
}: MeasurementProps<PerformanceTrialId, PerformanceMeasurement>) {
  const styles = useActivityStyles();
  const [trial, setTrial] = useState<PerformanceTrialId>(trials[0].id);
  const [elapsed, setElapsed] = useState(measurements[trials[0].id].elapsed);
  const { running, live, peak, start, stop, reset, getRms } = useMotionMeter(100);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef(0);
  const maxMs = GRACE_WINDOW_MS;

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  useEffect(() => {
    setRecorderBusy(running);
    return () => setRecorderBusy(false);
  }, [running, setRecorderBusy]);

  function selectTrial(id: PerformanceTrialId) {
    if (running) return;
    setTrial(id);
    setElapsed(measurements[id].elapsed);
  }

  function finish(finalElapsed: number) {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    stop();
    setElapsed(finalElapsed);
    // Lower RMS deviation = smoother, more graceful movement.
    setMeasurements((prev) => ({ ...prev, [trial]: { elapsed: finalElapsed, score: getRms() } }));
  }

  function toggleMeter() {
    if (running) {
      finish(Math.min(Date.now() - startRef.current, maxMs));
      return;
    }
    reset();
    setElapsed(0);
    startRef.current = Date.now();
    start();
    intervalRef.current = setInterval(() => {
      const next = Math.min(Date.now() - startRef.current, maxMs);
      setElapsed(next);
      if (next >= maxMs) finish(maxMs);
    }, 50);
  }

  function clearMeter() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    stop();
    reset();
    setElapsed(0);
    setMeasurements((prev) => ({ ...prev, [trial]: { elapsed: 0, score: 0 } }));
  }

  const trialIndex = trials.findIndex((t) => t.id === trial);
  const currentTrial = trials[trialIndex];
  const nextTrial = trials[trialIndex + 1];
  const current = measurements[trial];
  const recorded = !running && current.elapsed >= maxMs && current.score > 0;

  return (
    <>
      <TrialTabs trials={trials} active={trial} onSelect={selectTrial} />

      <View style={styles.instructionBox}>
        <Text style={styles.instructionTitle}>{currentTrial.title}</Text>
        <Text style={styles.instructionText}>{currentTrial.instruction}</Text>
      </View>

      <VideoEvidence
        value={videos[trial]}
        onChange={(uri) => setVideos((p) => ({ ...p, [trial]: uri }))}
      />

      <View style={[styles.card, styles.timerCard]}>
        <Text style={styles.timer}>{formatTime(elapsed)}</Text>
        <Text style={styles.resultLine}>
          {running
            ? `Now: ${live.toFixed(3)} g · peak ${peak.toFixed(3)} g`
            : "Keep the movement slow and smooth for 15 seconds."}
        </Text>

        <Text style={styles.resultLine}>
          {current.score > 0 && current.elapsed >= maxMs
            ? `Smoothness score: ${current.score.toFixed(3)} (lower = smoother)`
            : "Smoothness score appears after a full 15-second window."}
        </Text>

        <Pressable style={[styles.outlineBtn, running && styles.primaryBtn]} onPress={toggleMeter}>
          <Text style={[styles.outlineBtnText, running && styles.primaryBtnText]}>
            {running ? "Stop" : current.elapsed >= maxMs ? "Redo Movement" : "Start Movement"}
          </Text>
        </Pressable>
        <Pressable style={styles.outlineBtn} onPress={clearMeter}>
          <Text style={styles.outlineBtnText}>Clear</Text>
        </Pressable>
      </View>

      {recorded &&
        (nextTrial ? (
          <Text style={styles.switchHint}>
            Saved {currentTrial.short}. Switch to {nextTrial.short} above to record the next
            movement.
          </Text>
        ) : (
          <Text style={styles.switchHint}>
            All movements recorded. Continue to the Write-Up step when you are ready.
          </Text>
        ))}
    </>
  );
}

function formatPerformanceMeasurement(measurement: PerformanceMeasurement) {
  if (measurement.elapsed < GRACE_WINDOW_MS || measurement.score <= 0) return "";
  return `score ${measurement.score.toFixed(3)} (lower = smoother), ${formatTime(
    measurement.elapsed,
  )}`;
}

/* -------------------------------------------------------------------------- */
/* Reaction Board Challenge                                                   */
/* -------------------------------------------------------------------------- */

const REACTION_TRIALS = [
  {
    id: "dominant",
    short: "Dominant",
    title: "Phase 1 — dominant hand",
    note: "Use the hand you write with.",
    instruction:
      "Keep your finger ready, wait for the target square to appear, then tap it as fast as you can. Five rounds.",
  },
  {
    id: "nonDominant",
    short: "Other hand",
    title: "Phase 2 — non-dominant hand",
    note: "Use your other hand.",
    instruction: "Repeat the five-round tap test using your non-dominant hand, then compare.",
  },
  {
    id: "tracing",
    short: "Tracing",
    title: "Phase 3 — tracing challenge",
    note: "Follow the moving dot with your finger.",
    instruction:
      "Press Start, then keep your fingertip on the moving dot as it traces a figure-8. The app scores how closely you follow it.",
  },
] as const;
type ReactionTrialId = (typeof REACTION_TRIALS)[number]["id"];
// Phases 1–2 record tap reaction times; Phase 3 records a tracing accuracy, so a
// trial's measurement is one of two shapes.
type TapMeasurement = { kind: "tap"; rounds: number[] };
type TraceMeasurement = { kind: "trace"; accuracyPct: number; done: boolean };
type ReactionMeasurement = TapMeasurement | TraceMeasurement;

export function ReactionBoardChallengeScreen() {
  return (
    <ActivityShell<ReactionTrialId, ReactionMeasurement>
      activityId="reaction"
      formatMeasurement={formatReactionMeasurement}
      title="Reaction Board Challenge"
      trials={REACTION_TRIALS}
      predictionPrompt="Predict which phase you will perform best in."
      predictionLead="I predict I will do best in"
      predictionTail="because..."
      predictionOptions={REACTION_TRIALS.map((t) => t.short)}
      canContinueFromRecorder={(measurements) =>
        REACTION_TRIALS.every((t) => {
          const m = measurements[t.id];
          return m.kind === "tap" ? m.rounds.length === 5 : m.done;
        })
      }
      recorderIncompleteMessage="Finish five tap rounds for each hand and complete the tracing challenge before continuing."
      createInitialMeasurements={() =>
        Object.fromEntries(
          REACTION_TRIALS.map((t) => [
            t.id,
            t.id === "tracing"
              ? { kind: "trace", accuracyPct: 0, done: false }
              : { kind: "tap", rounds: [] },
          ]),
        ) as Record<ReactionTrialId, ReactionMeasurement>
      }
      renderInstructions={() => (
        <InstructionsContent
          overview="Students test how the brain and body respond. Phases 1 and 2 measure tap reaction time with each hand; Phase 3 is a tracing challenge that scores how accurately you follow a moving target."
          equipment={[
            "Mobile phone with STEMM Lab app",
            "Flat table or stable surface",
            "Clear working space",
          ]}
          instructions={[
            "Phase 1: tap the target as soon as it appears, using your dominant hand (five rounds).",
            "Phase 2: repeat the tap test with your non-dominant hand and compare.",
            "Phase 3: keep your finger on the moving dot as it traces a shape.",
            "Review the accuracy and delay for each phase.",
            "Rotate through each team member.",
          ]}
          referenceHeaders={["Factor", "Effect on performance"]}
          referenceRows={[
            ["Sensory input", "Eyes detect the target appearing or moving"],
            ["Nervous system", "Brain processes the signal and chooses a response"],
            ["Motor response", "Muscles move the finger to tap or trace"],
            ["Hand dominance", "The practised hand is usually faster and steadier"],
          ]}
          diagram={[
            "Tap phases: a target square appears after a random delay.",
            "Tracing phase: a dot moves along a path to follow.",
            "App records reaction time and tracing accuracy.",
          ]}
          diagramArt={<ReactionDiagram />}
        />
      )}
      renderRecorder={(props) => <ReactionRecorder {...props} />}
      renderWriteUp={(props) => (
        <StandardWriteUp
          {...props}
          questions={[
            { label: "Prediction for this phase" },
            { label: "Your result", auto: true },
            { label: "Was this better or worse than expected?" },
            { label: "What might have affected your result?" },
          ]}
          reflectionPrompt="How did your dominant and non-dominant hands compare, and how accurately could you trace the moving target?"
          formatMeasurement={formatReactionMeasurement}
        />
      )}
      renderDiscussion={() => (
        <DiscussionContent
          heading="So why does this happen?"
          formulaTitle="Reaction time:"
          formula="Reaction time = response tap time - visual cue time"
          explanation="Reaction time measures the delay between seeing a stimulus and producing a movement, while tracing tests how well the brain coordinates continuous movement. Faster, more accurate responses mean the sense–brain–muscle pathway is working efficiently. The dominant hand is usually quicker and steadier because it is more practised."
        />
      )}
    />
  );
}

// Dispatches to the tap board (Phases 1–2) or the tracing canvas (Phase 3)
// based on the current trial's measurement kind, and owns the trial tabs.
function ReactionRecorder({
  trials,
  measurements,
  setMeasurements,
  setRecorderBusy,
  videos,
  setVideos,
}: MeasurementProps<ReactionTrialId, ReactionMeasurement>) {
  const styles = useActivityStyles();
  const [trial, setTrial] = useState<ReactionTrialId>(trials[0].id);

  const trialIndex = trials.findIndex((t) => t.id === trial);
  const currentTrial = trials[trialIndex];
  const nextTrial = trials[trialIndex + 1];
  const current = measurements[trial];
  const complete = current.kind === "tap" ? current.rounds.length >= 5 : current.done;

  return (
    <>
      <TrialTabs trials={trials} active={trial} onSelect={setTrial} />

      <View style={styles.instructionBox}>
        <Text style={styles.instructionTitle}>{currentTrial.title}</Text>
        <Text style={styles.instructionText}>{currentTrial.instruction}</Text>
      </View>

      <VideoEvidence
        value={videos[trial]}
        onChange={(uri) => setVideos((p) => ({ ...p, [trial]: uri }))}
      />

      {current.kind === "trace" ? (
        <TraceRecorder
          trial={trial}
          measurement={current}
          setMeasurements={setMeasurements}
          setRecorderBusy={setRecorderBusy}
        />
      ) : (
        <TapRecorder
          trial={trial}
          measurement={current}
          setMeasurements={setMeasurements}
          setRecorderBusy={setRecorderBusy}
        />
      )}

      {complete &&
        (nextTrial ? (
          <Text style={styles.switchHint}>
            Saved {currentTrial.short}. Switch to {nextTrial.short} above.
          </Text>
        ) : (
          <Text style={styles.switchHint}>
            All reaction phases recorded. Continue to the Write-Up step when you are ready.
          </Text>
        ))}
    </>
  );
}

type SubRecorderProps<M extends ReactionMeasurement> = {
  trial: ReactionTrialId;
  measurement: M;
  setMeasurements: Dispatch<SetStateAction<Record<ReactionTrialId, ReactionMeasurement>>>;
  setRecorderBusy: Dispatch<SetStateAction<boolean>>;
};

function TapRecorder({
  trial,
  measurement,
  setMeasurements,
  setRecorderBusy,
}: SubRecorderProps<TapMeasurement>) {
  const styles = useActivityStyles();
  const [status, setStatus] = useState<"idle" | "waiting" | "ready">("idle");
  const [message, setMessage] = useState("Press Start Round when you are ready.");
  const [activeCell, setActiveCell] = useState<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cueRef = useRef(0);
  const acceptingTapRef = useRef(false);
  const rounds = measurement.rounds;

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  useEffect(() => {
    setRecorderBusy(status !== "idle");
    return () => setRecorderBusy(false);
  }, [setRecorderBusy, status]);

  function startRound() {
    if (status !== "idle") return;
    if (rounds.length >= 5) {
      setMessage("This phase already has five rounds. Switch to the next phase.");
      return;
    }
    const delay = 1200 + Math.floor(Math.random() * 2300);
    setStatus("waiting");
    acceptingTapRef.current = false;
    setActiveCell(null);
    setMessage("Wait for the target...");
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      cueRef.current = now();
      acceptingTapRef.current = true;
      setActiveCell(Math.floor(Math.random() * 9));
      setStatus("ready");
      setMessage("Tap the highlighted square!");
    }, delay);
  }

  function tapTarget(cell: number) {
    if (status === "waiting") {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      acceptingTapRef.current = false;
      setActiveCell(null);
      setStatus("idle");
      setMessage("Too early. Start the round again.");
      return;
    }

    if (status !== "ready" || !acceptingTapRef.current) return;
    acceptingTapRef.current = false;
    if (cell !== activeCell) {
      setActiveCell(null);
      setStatus("idle");
      setMessage("Wrong square. Start the round again.");
      return;
    }

    const reactionMs = Math.round(now() - cueRef.current);
    setMeasurements((prev) => {
      const prevTrial = prev[trial];
      const prevRounds = prevTrial.kind === "tap" ? prevTrial.rounds : [];
      const nextRounds = [...prevRounds, reactionMs].slice(0, 5);
      return { ...prev, [trial]: { kind: "tap", rounds: nextRounds } };
    });
    setActiveCell(null);
    setStatus("idle");
    setMessage(`Saved ${reactionMs} ms. Start another round.`);
  }

  function clearRounds() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
    acceptingTapRef.current = false;
    setActiveCell(null);
    setStatus("idle");
    setMessage("Rounds cleared. Press Start Round when you are ready.");
    setMeasurements((prev) => ({ ...prev, [trial]: { kind: "tap", rounds: [] } }));
  }

  const average = averageReaction(rounds);

  return (
    <View style={[styles.card, styles.timerCard]}>
      <Text style={styles.reactionMeta}>Round {Math.min(rounds.length + 1, 5)} of 5</Text>
      <View style={styles.reactionBoard}>
        {Array.from({ length: 9 }).map((_, cell) => {
          const isTarget = status === "ready" && activeCell === cell;
          return (
            <Pressable
              key={cell}
              style={[
                styles.reactionCell,
                status === "waiting" && styles.reactionWaiting,
                isTarget && styles.reactionReady,
              ]}
              onPress={() => tapTarget(cell)}
            >
              <Text style={[styles.reactionCellText, isTarget && styles.reactionCellTextReady]}>
                {isTarget ? "Tap" : ""}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.instructionText}>{message}</Text>
      <Text style={styles.resultLine}>
        {rounds.length > 0
          ? `Average: ${average} ms (${rounds.length}/5 rounds)`
          : "No rounds recorded yet."}
      </Text>
      <Pressable
        style={[
          styles.outlineBtn,
          status === "idle" && rounds.length < 5 && styles.primaryBtn,
          rounds.length >= 5 && styles.disabledBtn,
        ]}
        onPress={startRound}
      >
        <Text
          style={[
            styles.outlineBtnText,
            status === "idle" && rounds.length < 5 && styles.primaryBtnText,
          ]}
        >
          {rounds.length >= 5 ? "Phase Complete" : "Start Round"}
        </Text>
      </Pressable>
      <Pressable style={styles.outlineBtn} onPress={clearRounds}>
        <Text style={styles.outlineBtnText}>Clear Rounds</Text>
      </Pressable>
    </View>
  );
}

const TRACE_SIZE = 240;
const TRACE_DURATION_MS = 9000;

// A Gerono lemniscate (figure-8) centred in the board, parameterised 0..1.
function tracePoint(progress: number) {
  const centre = TRACE_SIZE / 2;
  const amp = TRACE_SIZE * 0.36;
  const t = progress * Math.PI * 2;
  return { x: centre + amp * Math.sin(t), y: centre + amp * Math.sin(t) * Math.cos(t) };
}

// Pre-built faint guide path the target dot travels along.
const TRACE_PATH = (() => {
  const steps = 80;
  let d = "";
  for (let i = 0; i <= steps; i++) {
    const p = tracePoint(i / steps);
    d += `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)} `;
  }
  return d.trim();
})();

// Mean tracking error (px) at which accuracy hits 0%.
const TRACE_ERROR_FLOOR = TRACE_SIZE * 0.4;

function TraceRecorder({
  trial,
  measurement,
  setMeasurements,
  setRecorderBusy,
}: SubRecorderProps<TraceMeasurement>) {
  const { palette: c } = useTheme();
  const styles = useActivityStyles();
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [finger, setFinger] = useState<{ x: number; y: number } | null>(null);
  const fingerRef = useRef<{ x: number; y: number } | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef(0);
  const errSumRef = useRef(0);
  const errCountRef = useRef(0);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  useEffect(() => {
    setRecorderBusy(running);
    return () => setRecorderBusy(false);
  }, [running, setRecorderBusy]);

  function finishTrace() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    setRunning(false);
    const meanErr = errCountRef.current > 0 ? errSumRef.current / errCountRef.current : TRACE_ERROR_FLOOR;
    const accuracyPct = Math.max(0, Math.round(100 - (meanErr / TRACE_ERROR_FLOOR) * 100));
    setMeasurements((prev) => ({ ...prev, [trial]: { kind: "trace", accuracyPct, done: true } }));
  }

  function startTrace() {
    if (running) return;
    errSumRef.current = 0;
    errCountRef.current = 0;
    fingerRef.current = null;
    setFinger(null);
    setProgress(0);
    startRef.current = Date.now();
    setRunning(true);
    intervalRef.current = setInterval(() => {
      const t = Math.min((Date.now() - startRef.current) / TRACE_DURATION_MS, 1);
      setProgress(t);
      const target = tracePoint(t);
      const f = fingerRef.current;
      // A finger that is off the screen counts as a full-error sample, so you
      // have to actually follow the dot to score well.
      const dist = f ? Math.hypot(f.x - target.x, f.y - target.y) : TRACE_ERROR_FLOOR;
      errSumRef.current += dist;
      errCountRef.current += 1;
      if (t >= 1) finishTrace();
    }, 50);
  }

  function clearTrace() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    setRunning(false);
    setProgress(0);
    fingerRef.current = null;
    setFinger(null);
    errSumRef.current = 0;
    errCountRef.current = 0;
    setMeasurements((prev) => ({ ...prev, [trial]: { kind: "trace", accuracyPct: 0, done: false } }));
  }

  function onTouch(e: GestureResponderEvent) {
    const point = { x: e.nativeEvent.locationX, y: e.nativeEvent.locationY };
    fingerRef.current = point;
    setFinger(point);
  }

  const target = tracePoint(progress);

  return (
    <View style={[styles.card, styles.timerCard]}>
      <View
        style={styles.traceBoard}
        onStartShouldSetResponder={() => running}
        onMoveShouldSetResponder={() => running}
        onResponderGrant={onTouch}
        onResponderMove={onTouch}
      >
        <Svg width={TRACE_SIZE} height={TRACE_SIZE}>
          <Path d={TRACE_PATH} stroke={c.muted} strokeWidth={2} strokeDasharray="6 6" fill="none" />
          {finger && (
            <Circle cx={finger.x} cy={finger.y} r={11} stroke={c.primary} strokeWidth={2} fill="none" />
          )}
          <Circle cx={target.x} cy={target.y} r={13} fill={c.primary} />
        </Svg>
      </View>

      <Text style={styles.resultLine}>
        {running
          ? `Following the dot… ${Math.round(progress * 100)}%`
          : measurement.done
            ? `Accuracy: ${measurement.accuracyPct}%`
            : "Press Start, then keep your finger on the moving dot."}
      </Text>

      <Pressable style={[styles.outlineBtn, running && styles.primaryBtn]} onPress={startTrace}>
        <Text style={[styles.outlineBtnText, running && styles.primaryBtnText]}>
          {running ? "Tracing…" : measurement.done ? "Redo Trace" : "Start Trace"}
        </Text>
      </Pressable>
      <Pressable style={styles.outlineBtn} onPress={clearTrace}>
        <Text style={styles.outlineBtnText}>Clear</Text>
      </Pressable>
    </View>
  );
}

function averageReaction(rounds: number[]) {
  if (!rounds.length) return 0;
  return Math.round(rounds.reduce((sum, ms) => sum + ms, 0) / rounds.length);
}

function now() {
  return globalThis.performance?.now?.() ?? Date.now();
}

function formatReactionMeasurement(measurement: ReactionMeasurement) {
  if (measurement.kind === "tap") {
    const average = averageReaction(measurement.rounds);
    return average > 0 ? `${average} ms avg` : "";
  }
  return measurement.done ? `${measurement.accuracyPct}% accuracy` : "";
}

/* -------------------------------------------------------------------------- */
/* Breathing Pace Trainer                                                     */
/* -------------------------------------------------------------------------- */

type BreathingMeasurement = { elapsed: number; breaths: number };
const BREATHING_WINDOW_MS = 30000;

const BREATHING_TRIALS = [
  {
    id: "rest",
    short: "Rest",
    title: "Breathing at rest",
    note: "Sit or lie calmly before measuring.",
    instruction:
      "Rest the phone gently on your chest, stay still, then count each breath for 30 seconds.",
  },
  {
    id: "exercise1",
    short: "Jog",
    title: "After exercise 1 — jog on the spot",
    note: "Jog on the spot for one minute.",
    instruction:
      "Jog on the spot for one minute, then immediately rest the phone on your chest and count breaths for 30 seconds.",
  },
  {
    id: "exercise2",
    short: "Star jumps",
    title: "After exercise 2 — 100 star jumps",
    note: "Do 100 star jumps safely.",
    instruction:
      "Do 100 star jumps, then immediately rest the phone on your chest and count breaths for 30 seconds.",
  },
] as const;
type BreathingTrialId = (typeof BREATHING_TRIALS)[number]["id"];

export function BreathingPaceTrainerScreen() {
  return (
    <ActivityShell<BreathingTrialId, BreathingMeasurement>
      activityId="breathing"
      formatMeasurement={formatBreathingMeasurement}
      title="Breathing Pace Trainer"
      trials={BREATHING_TRIALS}
      predictionPrompt="Predict your breathing rate — when will you breathe fastest?"
      predictionLead="I predict breathing will be fastest"
      predictionTail="because..."
      predictionOptions={BREATHING_TRIALS.map((t) => t.short)}
      canContinueFromRecorder={(measurements) =>
        BREATHING_TRIALS.every(
          (t) => measurements[t.id].elapsed >= BREATHING_WINDOW_MS && measurements[t.id].breaths > 0,
        )
      }
      recorderIncompleteMessage="Count breaths for the full 30-second window in every trial before continuing."
      createInitialMeasurements={() =>
        Object.fromEntries(BREATHING_TRIALS.map((t) => [t.id, { elapsed: 0, breaths: 0 }])) as Record<
          BreathingTrialId,
          BreathingMeasurement
        >
      }
      renderInstructions={() => (
        <InstructionsContent
          overview="Students measure how their breathing rate changes with exercise. They count breaths at rest, then again after light exercise, using the phone on the chest to feel each breath."
          equipment={[
            "Mobile phone with STEMM Lab app",
            "Flat surface or mat",
            "Clear space for light exercise",
          ]}
          instructions={[
            "Place the phone gently on your chest.",
            "Count your breaths for 30 seconds at rest.",
            "Jog on the spot for one minute, then count breaths again.",
            "Do 100 star jumps, then count breaths a final time.",
            "Work out breaths per minute and compare rest with after exercise.",
          ]}
          referenceHeaders={["Measurement", "What it shows"]}
          referenceRows={[
            ["Resting breathing", "Baseline oxygen demand when calm"],
            ["After exercise", "Muscles need more oxygen, so breathing speeds up"],
            ["Breaths per minute", "Breaths counted in 30 seconds × 2"],
            ["Recovery", "Breathing slows back toward resting afterwards"],
          ]}
          diagram={[
            "Lie down and rest the phone on your chest.",
            "The chest rises and falls with each breath.",
            "Count breaths at rest, then again after exercise.",
          ]}
          diagramArt={<BreathingDiagram />}
        />
      )}
      renderRecorder={(props) => <BreathingRecorder {...props} />}
      renderWriteUp={(props) => (
        <StandardWriteUp
          {...props}
          questions={[
            { label: "Predicted breaths per minute" },
            { label: "Measured breathing rate", auto: true },
            { label: "How did this compare with resting breathing?" },
            { label: "Were you right? What changed?" },
          ]}
          reflectionPrompt="How did your breathing rate change after exercise? Why does the body breathe faster when you exercise?"
          formatMeasurement={formatBreathingMeasurement}
        />
      )}
      renderDiscussion={() => (
        <DiscussionContent
          heading="So why does this happen?"
          formulaTitle="Breathing rate:"
          formula="Breathing rate = breaths in 30 seconds × 2"
          explanation="During exercise the muscles need more oxygen and produce more carbon dioxide, so the breathing rate increases to supply oxygen and clear waste gas faster. The phone resting on the chest detects each rise and fall, helping students see how breathing responds to activity and recovers afterwards."
        />
      )}
    />
  );
}

function BreathingRecorder({
  trials,
  measurements,
  setMeasurements,
  setRecorderBusy,
  videos,
  setVideos,
}: MeasurementProps<BreathingTrialId, BreathingMeasurement>) {
  const styles = useActivityStyles();
  const [trial, setTrial] = useState<BreathingTrialId>(trials[0].id);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(measurements[trials[0].id].elapsed);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef(0);
  const maxMs = BREATHING_WINDOW_MS;

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  useEffect(() => {
    setRecorderBusy(running);
    return () => setRecorderBusy(false);
  }, [running, setRecorderBusy]);

  function selectTrial(id: BreathingTrialId) {
    if (running) return;
    setTrial(id);
    setElapsed(measurements[id].elapsed);
  }

  function save(nextElapsed: number, breaths?: number) {
    setMeasurements((prev) => ({
      ...prev,
      [trial]: { elapsed: nextElapsed, breaths: breaths ?? prev[trial].breaths },
    }));
  }

  function toggleTimer() {
    if (running) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      const finalElapsed = Math.min(Date.now() - startRef.current, maxMs);
      setElapsed(finalElapsed);
      save(finalElapsed);
      setRunning(false);
      return;
    }

    const base = elapsed >= maxMs ? 0 : elapsed;
    startRef.current = Date.now() - base;
    setElapsed(base);
    intervalRef.current = setInterval(() => {
      const next = Math.min(Date.now() - startRef.current, maxMs);
      setElapsed(next);
      if (next >= maxMs) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = null;
        save(maxMs);
        setRunning(false);
      }
    }, 50);
    setRunning(true);
  }

  function clearCount() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    setRunning(false);
    setElapsed(0);
    setMeasurements((prev) => ({ ...prev, [trial]: { elapsed: 0, breaths: 0 } }));
  }

  function changeBreaths(delta: number) {
    setMeasurements((prev) => {
      const current = prev[trial];
      const breaths = Math.max(0, current.breaths + delta);
      return { ...prev, [trial]: { ...current, breaths } };
    });
  }

  const trialIndex = trials.findIndex((t) => t.id === trial);
  const currentTrial = trials[trialIndex];
  const nextTrial = trials[trialIndex + 1];
  const current = measurements[trial];
  const recorded = !running && current.elapsed >= maxMs && current.breaths > 0;

  return (
    <>
      <TrialTabs trials={trials} active={trial} onSelect={selectTrial} />

      <View style={styles.instructionBox}>
        <Text style={styles.instructionTitle}>{currentTrial.title}</Text>
        <Text style={styles.instructionText}>{currentTrial.instruction}</Text>
      </View>

      <VideoEvidence
        value={videos[trial]}
        onChange={(uri) => setVideos((p) => ({ ...p, [trial]: uri }))}
      />

      <View style={[styles.card, styles.timerCard]}>
        <Text style={styles.timer}>{formatTime(elapsed)}</Text>
        <Text style={styles.resultLine}>Count each breath for 30 seconds.</Text>

        <View style={styles.counterRow}>
          <Pressable style={styles.counterBtn} onPress={() => changeBreaths(-1)}>
            <Text style={styles.counterBtnText}>-</Text>
          </Pressable>
          <View style={styles.counterReadout}>
            <Text style={styles.counterNumber}>{current.breaths}</Text>
            <Text style={styles.counterLabel}>breaths</Text>
          </View>
          <Pressable style={styles.counterBtn} onPress={() => changeBreaths(1)}>
            <Text style={styles.counterBtnText}>+</Text>
          </Pressable>
        </View>

        <Text style={styles.resultLine}>
          {current.breaths > 0 && elapsed >= maxMs
            ? `Breathing rate: ${breathsPerMinute(current.breaths, elapsed)} breaths/min`
            : "Tap + each time you complete a breath."}
        </Text>

        <Pressable style={[styles.outlineBtn, running && styles.primaryBtn]} onPress={toggleTimer}>
          <Text style={[styles.outlineBtnText, running && styles.primaryBtnText]}>
            {running ? "Stop Count" : elapsed >= maxMs ? "Restart 30s Count" : "Start 30s Count"}
          </Text>
        </Pressable>
        <Pressable style={styles.outlineBtn} onPress={clearCount}>
          <Text style={styles.outlineBtnText}>Clear Count</Text>
        </Pressable>
      </View>

      {recorded &&
        (nextTrial ? (
          <Text style={styles.switchHint}>
            Saved {currentTrial.short}. Switch to {nextTrial.short} above to record the next
            trial.
          </Text>
        ) : (
          <Text style={styles.switchHint}>
            All breathing results recorded. Continue to the Write-Up step when you are ready.
          </Text>
        ))}
    </>
  );
}

function breathsPerMinute(breaths: number, elapsedMs: number) {
  if (elapsedMs <= 0) return 0;
  return Math.round((breaths * 60000) / elapsedMs);
}

function formatBreathingMeasurement(measurement: BreathingMeasurement) {
  if (measurement.elapsed < BREATHING_WINDOW_MS || measurement.breaths <= 0) return "";
  return `${breathsPerMinute(measurement.breaths, measurement.elapsed)} breaths/min (${
    measurement.breaths
  } in ${formatTime(measurement.elapsed)})`;
}

/* -------------------------------------------------------------------------- */
/* Shared helpers                                                             */
/* -------------------------------------------------------------------------- */

function formatTime(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const hundredths = Math.floor((ms % 1000) / 10);
  return `${pad(totalSeconds)}.${pad(hundredths)}s`;
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function Bullet({ children }: { children: string }) {
  const styles = useActivityStyles();
  return (
    <View style={styles.listItem}>
      <Text style={styles.listMarker}>•</Text>
      <Text style={styles.listText}>{children}</Text>
    </View>
  );
}

function Numbered({ n, children }: { n: number; children: string }) {
  const styles = useActivityStyles();
  return (
    <View style={styles.listItem}>
      <Text style={styles.listMarker}>{n}.</Text>
      <Text style={styles.listText}>{children}</Text>
    </View>
  );
}

const makeStyles = (c: Palette, ACCENT: Accent) =>
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
  spacedTop: { marginTop: 24 },
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
  switchHint: {
    color: c.primary,
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
    backgroundColor: c.white,
    borderWidth: 1,
    borderColor: ACCENT.border,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  uploadRowText: { color: c.primary, fontSize: 15, fontWeight: "600" },
  timerCard: { marginTop: 20, alignItems: "center", gap: 16 },
  timer: { color: c.inputText, fontSize: 56, fontWeight: "800", marginBottom: 4 },
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
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 36,
    alignItems: "center",
    alignSelf: "center",
  },
  outlineBtnText: { color: c.inputText, fontSize: 17, fontWeight: "700" },
  disabledBtn: { opacity: 0.55 },
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
  fieldLabel: {
    color: c.inputText,
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 8,
    lineHeight: 21,
  },
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
  sectionHeading: { color: c.primary, fontSize: 23, fontWeight: "800", marginBottom: 18 },
  forceTable: { borderWidth: 1, borderColor: ACCENT.border, borderRadius: 8, overflow: "hidden" },
  forceRow: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: ACCENT.border,
  },
  forceRowLast: { borderBottomWidth: 0 },
  forceHeaderRow: { backgroundColor: ACCENT.softHeader },
  forceCell: { flex: 1, padding: 12, color: c.inputText, fontSize: 14, lineHeight: 20 },
  forceHeaderText: { fontWeight: "800" },
  formulaCentered: { color: c.inputText, fontSize: 17, textAlign: "center", paddingVertical: 6 },
  reactionMeta: { color: c.primary, fontSize: 15, fontWeight: "800" },
  reactionBoard: {
    width: 216,
    height: 216,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
  },
  reactionCell: {
    width: 64,
    height: 64,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ACCENT.border,
    backgroundColor: c.white,
    alignItems: "center",
    justifyContent: "center",
  },
  reactionWaiting: { backgroundColor: ACCENT.softHeader },
  reactionReady: { backgroundColor: c.primary, borderColor: c.primary },
  reactionCellText: { color: c.inputText, fontSize: 16, fontWeight: "900" },
  reactionCellTextReady: { color: c.white },
  traceBoard: {
    width: 240,
    height: 240,
    alignSelf: "center",
    borderRadius: 16,
    backgroundColor: ACCENT.softHeader,
    overflow: "hidden",
  },
  resultLine: { color: c.inputText, fontSize: 15, fontWeight: "600", textAlign: "center" },
  counterRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 14 },
  counterBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ACCENT.border,
    backgroundColor: c.white,
    alignItems: "center",
    justifyContent: "center",
  },
  counterBtnText: { color: c.primary, fontSize: 28, fontWeight: "900", lineHeight: 32 },
  counterReadout: { minWidth: 92, alignItems: "center" },
  counterNumber: { color: c.inputText, fontSize: 32, fontWeight: "900" },
  counterLabel: { color: c.muted, fontSize: 13, fontWeight: "700", marginTop: 2 },
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
