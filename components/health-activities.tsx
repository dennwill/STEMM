import { FontAwesome5 } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Dispatch, ReactElement, SetStateAction, useEffect, useRef, useState } from "react";
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

const ACCENT = {
  tabActive: "#DCDDF2",
  tableHeader: "#C9CCEC",
  softHeader: "#EFEDF8",
  border: "#E2E2EC",
};

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
};

type MeasurementProps<TrialId extends string, Measurement> = {
  trials: readonly (Trial & { id: TrialId })[];
  measurements: Record<TrialId, Measurement>;
  setMeasurements: Dispatch<SetStateAction<Record<TrialId, Measurement>>>;
  setRecorderBusy: Dispatch<SetStateAction<boolean>>;
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
}: ActivityShellProps<TrialId, Measurement>) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [prediction, setPrediction] = useState<PredictionValue>({ choice: "", reason: "" });
  const [reflection, setReflection] = useState("");
  const [measurements, setMeasurements] = useState<Record<TrialId, Measurement>>(
    createInitialMeasurements,
  );
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [recorderBusy, setRecorderBusy] = useState(false);

  const current = TABS[step];
  const isFirst = step === 0;
  const isLast = step === TABS.length - 1;

  const goNext = () => {
    if (current === "Recorder" && recorderBusy) {
      Alert.alert("Recorder running", "Stop the current recorder before continuing.");
      return;
    }
    if (current === "Recorder" && canContinueFromRecorder && !canContinueFromRecorder(measurements)) {
      Alert.alert("Recorder incomplete", recorderIncompleteMessage);
      return;
    }
    if (isLast) {
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
            renderRecorder({ trials, measurements, setMeasurements, setRecorderBusy })}
          {current === "Write-Up" &&
            renderWriteUp({
              trials,
              measurements,
              setMeasurements,
              setRecorderBusy,
              answers,
              setAnswers,
              reflection,
              setReflection,
            })}
          {current === "Discussion" && renderDiscussion()}
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

function UploadEvidenceRow({ label = "Upload video" }: { label?: string }) {
  return (
    <Pressable
      style={styles.uploadRow}
      onPress={() => Alert.alert(label, "Upload is coming soon.")}
    >
      <FontAwesome5 name="film" size={16} color={COLORS.primary} />
      <Text style={styles.uploadRowText}>{label}</Text>
    </Pressable>
  );
}

function InstructionsContent({
  overview,
  equipment,
  instructions,
  diagram,
}: {
  overview: string;
  equipment: string[];
  instructions: string[];
  diagram: string[];
}) {
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

      <Text style={styles.blockTitle}>Diagram</Text>
      {diagram.map((item) => (
        <Bullet key={item}>{item}</Bullet>
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
        placeholderTextColor={COLORS.muted}
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

function DiscussionContent({
  heading,
  headers,
  rows,
  formulaTitle,
  formula,
  explanation,
}: {
  heading: string;
  headers: string[];
  rows: string[][];
  formulaTitle: string;
  formula: string;
  explanation: string;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionHeading}>{heading}</Text>

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

      <Text style={[styles.sectionHeading, styles.spacedTop]}>{formulaTitle}</Text>
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
    id: "resting",
    short: "Resting",
    title: "Resting pulse",
    note: "Sit still for one minute before measuring.",
    instruction: "Sit quietly, find your pulse, then time a 15-second count.",
  },
  {
    id: "jumping",
    short: "Jumping",
    title: "After 30 seconds of jumping jacks",
    note: "Exercise safely in an open space.",
    instruction: "Do jumping jacks for 30 seconds, then immediately time a 15-second pulse count.",
  },
  {
    id: "recovery1",
    short: "1 min",
    title: "One-minute recovery",
    note: "Wait one minute after exercise.",
    instruction: "Rest for one minute, then time another 15-second pulse count.",
  },
  {
    id: "recovery2",
    short: "2 min",
    title: "Two-minute recovery",
    note: "Wait two minutes after exercise.",
    instruction: "Rest for another minute, then time a final 15-second pulse count.",
  },
] as const;
type PerformanceTrialId = (typeof PERFORMANCE_TRIALS)[number]["id"];
type PerformanceMeasurement = { elapsed: number; beats: number };

export function HumanPerformanceLabScreen() {
  return (
    <ActivityShell<PerformanceTrialId, PerformanceMeasurement>
      title="Human Performance Lab"
      trials={PERFORMANCE_TRIALS}
      predictionPrompt="Predict when your pulse rate will be highest."
      predictionLead="I predict my pulse will be highest during"
      predictionTail="because..."
      predictionOptions={PERFORMANCE_TRIALS.map((t) => t.short)}
      canContinueFromRecorder={(measurements) =>
        PERFORMANCE_TRIALS.every((t) => measurements[t.id].elapsed >= 15000 && measurements[t.id].beats > 0)
      }
      recorderIncompleteMessage="Record a full 15-second pulse count and at least one beat for every trial before continuing."
      createInitialMeasurements={() =>
        Object.fromEntries(PERFORMANCE_TRIALS.map((t) => [t.id, { elapsed: 0, beats: 0 }])) as Record<
          PerformanceTrialId,
          PerformanceMeasurement
        >
      }
      renderInstructions={() => (
        <InstructionsContent
          overview="Students measure pulse before exercise, immediately after exercise, and during recovery. The aim is to see how the body responds to activity and how quickly it returns toward baseline."
          equipment={[
            "Mobile phone with STEMM Lab app",
            "Chair or safe standing space",
            "Clear space for light exercise",
            "Notebook or worksheet for pulse counts",
          ]}
          instructions={[
            "Sit still and find your pulse at your wrist or neck.",
            "Use the timer to count pulse beats for 15 seconds while resting.",
            "Complete 30 seconds of safe light exercise such as jumping jacks.",
            "Measure pulse again immediately after exercise.",
            "Rest and repeat the 15-second pulse count after one minute and two minutes.",
            "Calculate pulse rate in beats per minute and compare the results.",
          ]}
          diagram={[
            "Phone timer starts the 15-second pulse-count window.",
            "Student counts pulse beats during each trial.",
            "Pulse should rise after exercise and move back toward resting during recovery.",
          ]}
        />
      )}
      renderRecorder={(props) => <PerformanceRecorder {...props} />}
      renderWriteUp={(props) => (
        <StandardWriteUp
          {...props}
          questions={[
            { label: "Predicted pulse level before measuring" },
            { label: "Measured pulse result", auto: true },
            { label: "How did this compare with your prediction?" },
            { label: "What might have affected this result?" },
            { label: "Were you right?" },
          ]}
          reflectionPrompt="How did your pulse change after exercise and during recovery? What does that suggest about fitness, oxygen demand, and recovery?"
          formatMeasurement={formatPerformanceMeasurement}
        />
      )}
      renderDiscussion={() => (
        <DiscussionContent
          heading="So why does this happen?"
          headers={["Measurement", "What it shows"]}
          rows={[
            ["Resting pulse", "Heart supplies oxygen for normal activity"],
            ["Exercise pulse", "Muscles need more oxygen and glucose"],
            ["Recovery pulse", "Heart rate gradually returns toward resting"],
            ["Faster recovery", "Often suggests better cardiovascular efficiency"],
          ]}
          formulaTitle="Pulse rate:"
          formula="Pulse rate (bpm) = beats counted in 15 seconds x 4"
          explanation="Exercise increases muscle oxygen demand, so breathing and heart rate rise. During recovery, demand drops and the cardiovascular system returns toward baseline. Comparing resting, exercise, and recovery pulse shows how the body responds to workload."
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
}: MeasurementProps<PerformanceTrialId, PerformanceMeasurement>) {
  const [trial, setTrial] = useState<PerformanceTrialId>(trials[0].id);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(measurements[trials[0].id].elapsed);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef(0);
  const maxMs = 15000;

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

  function save(nextElapsed: number, beats?: number) {
    setMeasurements((prev) => ({
      ...prev,
      [trial]: { elapsed: nextElapsed, beats: beats ?? prev[trial].beats },
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
    }, 30);
    setRunning(true);
  }

  function changeBeats(delta: number) {
    setMeasurements((prev) => {
      const current = prev[trial];
      const beats = Math.max(0, current.beats + delta);
      return { ...prev, [trial]: { ...current, beats } };
    });
  }

  const trialIndex = trials.findIndex((t) => t.id === trial);
  const currentTrial = trials[trialIndex];
  const nextTrial = trials[trialIndex + 1];
  const current = measurements[trial];
  const recorded = !running && current.elapsed >= maxMs && current.beats > 0;

  return (
    <>
      <TrialTabs trials={trials} active={trial} onSelect={selectTrial} />

      <View style={styles.instructionBox}>
        <Text style={styles.instructionTitle}>{currentTrial.title}</Text>
        <Text style={styles.instructionText}>{currentTrial.instruction}</Text>
      </View>

      <UploadEvidenceRow />

      <View style={[styles.card, styles.timerCard]}>
        <Text style={styles.timer}>{formatTime(elapsed)}</Text>
        <Text style={styles.resultLine}>Count pulse beats for exactly 15 seconds.</Text>

        <View style={styles.counterRow}>
          <Pressable style={styles.counterBtn} onPress={() => changeBeats(-1)}>
            <Text style={styles.counterBtnText}>-</Text>
          </Pressable>
          <View style={styles.counterReadout}>
            <Text style={styles.counterNumber}>{current.beats}</Text>
            <Text style={styles.counterLabel}>beats</Text>
          </View>
          <Pressable style={styles.counterBtn} onPress={() => changeBeats(1)}>
            <Text style={styles.counterBtnText}>+</Text>
          </Pressable>
        </View>

        <Text style={styles.resultLine}>
          {current.beats > 0 && elapsed >= maxMs
            ? `Pulse rate: ${current.beats * 4} bpm`
            : "Pulse rate appears after a full 15-second count."}
        </Text>

        <Pressable
          style={[styles.outlineBtn, running && styles.primaryBtn]}
          onPress={toggleTimer}
        >
          <Text style={[styles.outlineBtnText, running && styles.primaryBtnText]}>
            {running ? "Stop Count" : elapsed >= maxMs ? "Restart 15s Count" : "Start 15s Count"}
          </Text>
        </Pressable>
      </View>

      {recorded &&
        (nextTrial ? (
          <Text style={styles.switchHint}>
            Saved {currentTrial.short}. Switch to {nextTrial.short} above to record the next
            pulse count.
          </Text>
        ) : (
          <Text style={styles.switchHint}>
            All pulse results recorded. Continue to the Write-Up step when you are ready.
          </Text>
        ))}
    </>
  );
}

function formatPerformanceMeasurement(measurement: PerformanceMeasurement) {
  if (measurement.elapsed < 15000 || measurement.beats <= 0) return "";
  return `${measurement.beats} beats in ${formatTime(measurement.elapsed)} = ${
    measurement.beats * 4
  } bpm`;
}

/* -------------------------------------------------------------------------- */
/* Reaction Board Challenge                                                   */
/* -------------------------------------------------------------------------- */

const REACTION_TRIALS = [
  {
    id: "dominant",
    short: "Dominant",
    title: "Dominant hand",
    note: "Use the hand you write with.",
    instruction: "Keep your finger ready, wait for the target to change, then tap as fast as you can.",
  },
  {
    id: "nonDominant",
    short: "Other",
    title: "Non-dominant hand",
    note: "Use your other hand.",
    instruction: "Repeat the same test using your non-dominant hand.",
  },
  {
    id: "distraction",
    short: "Counting",
    title: "Counting backwards",
    note: "Count backwards by threes while waiting.",
    instruction: "Start counting backwards, then tap when the target says Tap.",
  },
  {
    id: "exercise",
    short: "Activity",
    title: "After light activity",
    note: "Complete 20 seconds of safe movement first.",
    instruction: "Do light activity, return to the phone, then complete the reaction rounds.",
  },
] as const;
type ReactionTrialId = (typeof REACTION_TRIALS)[number]["id"];
type ReactionMeasurement = { rounds: number[] };

export function ReactionBoardChallengeScreen() {
  return (
    <ActivityShell<ReactionTrialId, ReactionMeasurement>
      title="Reaction Board Challenge"
      trials={REACTION_TRIALS}
      predictionPrompt="Predict which condition will have the fastest reaction time."
      predictionLead="I predict that"
      predictionTail="will be fastest because..."
      predictionOptions={REACTION_TRIALS.map((t) => t.short)}
      canContinueFromRecorder={(measurements) =>
        REACTION_TRIALS.every((t) => measurements[t.id].rounds.length === 5)
      }
      recorderIncompleteMessage="Complete five reaction rounds for every trial before continuing."
      createInitialMeasurements={() =>
        Object.fromEntries(REACTION_TRIALS.map((t) => [t.id, { rounds: [] }])) as unknown as Record<
          ReactionTrialId,
          ReactionMeasurement
        >
      }
      renderInstructions={() => (
        <InstructionsContent
          overview="Students test how attention, hand choice, and activity can change reaction time. Each trial records several tap responses and compares the average result."
          equipment={[
            "Mobile phone with STEMM Lab app",
            "Flat table or stable surface",
            "Clear space for light activity",
          ]}
          instructions={[
            "Choose the first reaction condition.",
            "Press Start Round and wait without tapping early.",
            "Tap the target as soon as it changes to Tap.",
            "Complete five rounds for each condition.",
            "Compare the average reaction time across all trials.",
          ]}
          diagram={[
            "Wait state appears first.",
            "Target changes to Tap after a random delay.",
            "App records the time between cue and tap.",
          ]}
        />
      )}
      renderRecorder={(props) => <ReactionRecorder {...props} />}
      renderWriteUp={(props) => (
        <StandardWriteUp
          {...props}
          questions={[
            { label: "Prediction for this condition" },
            { label: "Average reaction time", auto: true },
            { label: "Was this faster or slower than expected?" },
            { label: "What might have affected your result?" },
          ]}
          reflectionPrompt="Which condition gave the fastest reaction time? What pattern did you notice across the four tests?"
          formatMeasurement={formatReactionMeasurement}
        />
      )}
      renderDiscussion={() => (
        <DiscussionContent
          heading="So why does this happen?"
          headers={["Factor", "Effect on reaction time"]}
          rows={[
            ["Sensory input", "Eyes detect the target change"],
            ["Nervous system", "Brain processes the signal and chooses a response"],
            ["Motor response", "Muscles move the finger to tap"],
            ["Distraction or fatigue", "Divides attention or slows processing"],
          ]}
          formulaTitle="Reaction time:"
          formula="Reaction time = response tap time - visual cue time"
          explanation="Reaction time measures the delay between seeing a stimulus and producing a movement. Faster times usually mean attention, signal processing, and motor response were more efficient. Distraction and tiredness can slow the pathway; light activity may improve alertness for some students but fatigue can make it worse."
        />
      )}
    />
  );
}

function ReactionRecorder({
  trials,
  measurements,
  setMeasurements,
  setRecorderBusy,
}: MeasurementProps<ReactionTrialId, ReactionMeasurement>) {
  const [trial, setTrial] = useState<ReactionTrialId>(trials[0].id);
  const [status, setStatus] = useState<"idle" | "waiting" | "ready">("idle");
  const [message, setMessage] = useState("Press Start Round when you are ready.");
  const [activeCell, setActiveCell] = useState<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cueRef = useRef(0);
  const acceptingTapRef = useRef(false);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  useEffect(() => {
    setRecorderBusy(status !== "idle");
    return () => setRecorderBusy(false);
  }, [setRecorderBusy, status]);

  function selectTrial(id: ReactionTrialId) {
    if (status !== "idle") return;
    setTrial(id);
    setActiveCell(null);
    setMessage("Press Start Round when you are ready.");
  }

  function startRound() {
    if (status !== "idle") return;
    if (measurements[trial].rounds.length >= 5) {
      setMessage("This trial already has five rounds. Switch to the next trial.");
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
      const nextRounds = [...prev[trial].rounds, reactionMs].slice(0, 5);
      return { ...prev, [trial]: { rounds: nextRounds } };
    });
    setActiveCell(null);
    setStatus("idle");
    setMessage(`Saved ${reactionMs} ms. Start another round.`);
  }

  const trialIndex = trials.findIndex((t) => t.id === trial);
  const currentTrial = trials[trialIndex];
  const nextTrial = trials[trialIndex + 1];
  const rounds = measurements[trial].rounds;
  const average = averageReaction(rounds);
  const complete = rounds.length >= 5;

  return (
    <>
      <TrialTabs trials={trials} active={trial} onSelect={selectTrial} />

      <View style={styles.instructionBox}>
        <Text style={styles.instructionTitle}>{currentTrial.title}</Text>
        <Text style={styles.instructionText}>{currentTrial.instruction}</Text>
      </View>

      <UploadEvidenceRow />

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
            {rounds.length >= 5 ? "Trial Complete" : "Start Round"}
          </Text>
        </Pressable>
      </View>

      {complete &&
        (nextTrial ? (
          <Text style={styles.switchHint}>
            Average saved for {currentTrial.short}. Switch to {nextTrial.short} above.
          </Text>
        ) : (
          <Text style={styles.switchHint}>
            All reaction trials recorded. Continue to the Write-Up step when you are ready.
          </Text>
        ))}
    </>
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
  const average = averageReaction(measurement.rounds);
  return average > 0 ? `${average} ms` : "";
}

/* -------------------------------------------------------------------------- */
/* Breathing Pace Trainer                                                     */
/* -------------------------------------------------------------------------- */

type BreathPhase = { label: "Inhale" | "Hold" | "Exhale" | "Breathe"; seconds: number };
type BreathingTrial = Trial & { id: BreathingTrialId; phases: readonly BreathPhase[] };
type BreathingMeasurement = { elapsed: number; cycles: number; breaths: number };

const BREATHING_TRIALS = [
  {
    id: "natural",
    short: "Natural",
    title: "Natural breathing",
    note: "Breathe normally for 30 seconds.",
    instruction: "Breathe normally and notice your natural rhythm before trying the paced patterns.",
    phases: [{ label: "Breathe", seconds: 30 }],
  },
  {
    id: "balanced",
    short: "4-4",
    title: "Balanced 4-4 breathing",
    note: "Inhale 4 seconds, exhale 4 seconds.",
    instruction: "Follow the guide: inhale for 4 seconds, then exhale for 4 seconds.",
    phases: [
      { label: "Inhale", seconds: 4 },
      { label: "Exhale", seconds: 4 },
    ],
  },
  {
    id: "box",
    short: "Box",
    title: "Box breathing",
    note: "Inhale, hold, exhale, hold.",
    instruction: "Follow the guide through inhale, hold, exhale, and hold phases.",
    phases: [
      { label: "Inhale", seconds: 4 },
      { label: "Hold", seconds: 4 },
      { label: "Exhale", seconds: 4 },
      { label: "Hold", seconds: 4 },
    ],
  },
  {
    id: "extended",
    short: "4-6",
    title: "Extended exhale",
    note: "Inhale 4 seconds, exhale 6 seconds.",
    instruction: "Follow the guide: inhale for 4 seconds, then use a longer 6-second exhale.",
    phases: [
      { label: "Inhale", seconds: 4 },
      { label: "Exhale", seconds: 6 },
    ],
  },
] as const;
type BreathingTrialId = (typeof BREATHING_TRIALS)[number]["id"];

function isBreathingMeasurementComplete(trial: BreathingTrial, measurement: BreathingMeasurement) {
  if (trial.id === "natural") {
    return measurement.elapsed >= 30000 && measurement.breaths > 0;
  }

  return measurement.cycles > 0 && measurement.breaths > 0;
}

export function BreathingPaceTrainerScreen() {
  return (
    <ActivityShell<BreathingTrialId, BreathingMeasurement>
      title="Breathing Pace Trainer"
      trials={BREATHING_TRIALS}
      predictionPrompt="Predict which breathing pattern will make your breathing feel slowest and calmest."
      predictionLead="I predict that"
      predictionTail="will feel the calmest because..."
      predictionOptions={BREATHING_TRIALS.map((t) => t.short)}
      canContinueFromRecorder={(measurements) =>
        BREATHING_TRIALS.every((t) => isBreathingMeasurementComplete(t, measurements[t.id]))
      }
      recorderIncompleteMessage="Record the full 30-second natural trial and at least one full cycle for every paced pattern before continuing."
      createInitialMeasurements={() =>
        Object.fromEntries(BREATHING_TRIALS.map((t) => [t.id, { elapsed: 0, cycles: 0, breaths: 0 }])) as Record<
          BreathingTrialId,
          BreathingMeasurement
        >
      }
      renderInstructions={() => (
        <InstructionsContent
          overview="Students compare normal breathing with paced breathing patterns. The trainer guides each phase so students can observe which rhythm feels most controlled."
          equipment={[
            "Mobile phone with STEMM Lab app",
            "Chair or quiet standing space",
            "Timer/trainer screen",
            "Optional notebook for calmness rating",
          ]}
          instructions={[
            "Sit or stand safely in a quiet space.",
            "Record natural breathing first.",
            "Follow each paced breathing guide.",
            "Stop if you feel dizzy or uncomfortable.",
            "Compare which pattern felt easiest and calmest.",
            "Complete the write-up and discussion.",
          ]}
          diagram={[
            "Phone shows the current breathing phase.",
            "Circle expands during inhale.",
            "Circle contracts during exhale.",
            "Student records time, cycles, and reflection.",
          ]}
        />
      )}
      renderRecorder={(props) => <BreathingRecorder {...props} />}
      renderWriteUp={(props) => (
        <StandardWriteUp
          {...props}
          questions={[
            { label: "Prediction: how calm or difficult did you expect this pattern to feel?" },
            { label: "Measured breathing result", auto: true },
            { label: "How did your breathing rate feel compared with normal breathing?" },
            { label: "Were you right? What changed?" },
          ]}
          reflectionPrompt="Which breathing pace felt most controlled? When could this technique help someone?"
          formatMeasurement={formatBreathingMeasurement}
        />
      )}
      renderDiscussion={() => (
        <DiscussionContent
          heading="So why does this happen?"
          headers={["Pattern", "Effect"]}
          rows={[
            ["Natural", "Baseline breathing rate and normal oxygen-carbon dioxide exchange"],
            ["4-4", "Longer breaths can create a steadier rhythm"],
            ["Box", "Inhale, hold, exhale, hold supports attention and control"],
            ["4-6", "A longer exhale can support the relaxation response"],
          ]}
          formulaTitle="Breathing rate:"
          formula="Breathing rate = breaths per minute"
          explanation="Slow paced breathing can reduce breathing rate and encourage a steadier rhythm. Longer exhales are linked with the body's relaxation response, which can lower perceived stress and help the body settle after activity."
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
}: MeasurementProps<BreathingTrialId, BreathingMeasurement>) {
  const breathingTrials = trials as readonly BreathingTrial[];
  const [trial, setTrial] = useState<BreathingTrialId>(breathingTrials[0].id);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(measurements[breathingTrials[0].id].elapsed);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef(0);

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
    const current = breathingTrials.find((t) => t.id === trial) ?? breathingTrials[0];
    setMeasurements((prev) => ({
      ...prev,
      [trial]: {
        elapsed: nextElapsed,
        cycles: countBreathingCycles(nextElapsed, current.phases),
        breaths: breaths ?? prev[trial].breaths,
      },
    }));
  }

  function toggleTrainer() {
    if (running) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      const finalElapsed = Date.now() - startRef.current;
      setElapsed(finalElapsed);
      save(finalElapsed);
      setRunning(false);
      return;
    }

    const base = currentTrial.id === "natural" && elapsed >= 30000 ? 0 : elapsed;
    startRef.current = Date.now() - base;
    setElapsed(base);
    intervalRef.current = setInterval(() => {
      const next = Date.now() - startRef.current;
      const capped = currentTrial.id === "natural" ? Math.min(next, 30000) : next;
      setElapsed(capped);
      if (currentTrial.id === "natural" && capped >= 30000) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = null;
        save(30000);
        setRunning(false);
      }
    }, 250);
    setRunning(true);
  }

  function changeBreaths(delta: number) {
    setMeasurements((prev) => {
      const current = prev[trial];
      const breaths = Math.max(0, current.breaths + delta);
      return { ...prev, [trial]: { ...current, breaths } };
    });
  }

  const trialIndex = breathingTrials.findIndex((t) => t.id === trial);
  const currentTrial = breathingTrials[trialIndex];
  const nextTrial = breathingTrials[trialIndex + 1];
  const phase = getBreathingPhase(elapsed, currentTrial.phases);
  const current = measurements[trial];
  const recorded = !running && isBreathingMeasurementComplete(currentTrial, current);

  return (
    <>
      <TrialTabs trials={breathingTrials} active={trial} onSelect={selectTrial} />

      <View style={styles.instructionBox}>
        <Text style={styles.instructionTitle}>{currentTrial.title}</Text>
        <Text style={styles.instructionText}>{currentTrial.instruction}</Text>
      </View>

      <UploadEvidenceRow />

      <View style={[styles.card, styles.timerCard]}>
        <View style={[styles.breathCircle, getBreathCircleStyle(phase.label)]}>
          <Text style={styles.breathPhase}>{phase.label}</Text>
          <Text style={styles.breathCountdown}>{phase.remaining}s</Text>
        </View>
        <Text style={styles.resultLine}>
          Total: {formatTime(elapsed)} / Cycles: {countBreathingCycles(elapsed, currentTrial.phases)}
        </Text>

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
          {current.breaths > 0 && elapsed > 0
            ? `Breathing rate: ${breathsPerMinute(current.breaths, elapsed)} breaths/min`
            : "Tap + each time you complete a breath."}
        </Text>

        <Pressable
          style={[styles.outlineBtn, running && styles.primaryBtn]}
          onPress={toggleTrainer}
        >
          <Text style={[styles.outlineBtnText, running && styles.primaryBtnText]}>
            {running ? "Stop Trainer" : "Start Trainer"}
          </Text>
        </Pressable>
      </View>

      {recorded &&
        (nextTrial ? (
          <Text style={styles.switchHint}>
            Saved {currentTrial.short}. Switch to {nextTrial.short} above to record the next
            pattern.
          </Text>
        ) : (
          <Text style={styles.switchHint}>
            All breathing patterns recorded. Continue to the Write-Up step when you are ready.
          </Text>
        ))}
    </>
  );
}

function getBreathingPhase(elapsedMs: number, phases: readonly BreathPhase[]) {
  const elapsedSeconds = Math.floor(elapsedMs / 1000);
  const cycleSeconds = phases.reduce((sum, p) => sum + p.seconds, 0);
  let position = cycleSeconds === 0 ? 0 : elapsedSeconds % cycleSeconds;

  for (const phase of phases) {
    if (position < phase.seconds) {
      return { label: phase.label, remaining: phase.seconds - position };
    }
    position -= phase.seconds;
  }
  return { label: phases[0].label, remaining: phases[0].seconds };
}

function countBreathingCycles(elapsedMs: number, phases: readonly BreathPhase[]) {
  const cycleSeconds = phases.reduce((sum, p) => sum + p.seconds, 0);
  if (!cycleSeconds) return 0;
  return Math.floor(elapsedMs / 1000 / cycleSeconds);
}

function breathsPerMinute(breaths: number, elapsedMs: number) {
  if (elapsedMs <= 0) return 0;
  return Math.round((breaths * 60000) / elapsedMs);
}

function getBreathCircleStyle(label: BreathPhase["label"]) {
  if (label === "Inhale") return styles.breathCircleInhale;
  if (label === "Exhale") return styles.breathCircleExhale;
  return styles.breathCircleHold;
}

function formatBreathingMeasurement(measurement: BreathingMeasurement) {
  if (measurement.elapsed <= 0 || measurement.breaths <= 0) return "";
  const rate = measurement.breaths > 0 ? ` / ${breathsPerMinute(measurement.breaths, measurement.elapsed)} breaths/min` : "";
  return `${formatTime(measurement.elapsed)} / ${measurement.cycles} cycles / ${measurement.breaths} breaths${rate}`;
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
  title: { color: COLORS.primary, fontSize: 22, fontWeight: "800", marginLeft: 8, flex: 1 },
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
  timerCard: { marginTop: 20, alignItems: "center", gap: 16 },
  timer: { color: COLORS.inputText, fontSize: 56, fontWeight: "800", marginBottom: 4 },
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
  disabledBtn: { opacity: 0.55 },
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
  fieldLabel: {
    color: COLORS.inputText,
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
    color: COLORS.inputText,
    fontSize: 16,
    lineHeight: 22,
  },
  fieldHint: { color: COLORS.muted, fontSize: 13, fontStyle: "italic", marginTop: 6 },
  sectionHeading: { color: COLORS.primary, fontSize: 23, fontWeight: "800", marginBottom: 18 },
  forceTable: { borderWidth: 1, borderColor: ACCENT.border, borderRadius: 8, overflow: "hidden" },
  forceRow: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: ACCENT.border,
  },
  forceRowLast: { borderBottomWidth: 0 },
  forceHeaderRow: { backgroundColor: ACCENT.softHeader },
  forceCell: { flex: 1, padding: 12, color: COLORS.inputText, fontSize: 14, lineHeight: 20 },
  forceHeaderText: { fontWeight: "800" },
  formulaCentered: { color: COLORS.inputText, fontSize: 17, textAlign: "center", paddingVertical: 6 },
  reactionMeta: { color: COLORS.primary, fontSize: 15, fontWeight: "800" },
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
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
  },
  reactionWaiting: { backgroundColor: "#F3F4F8" },
  reactionReady: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  reactionCellText: { color: COLORS.inputText, fontSize: 16, fontWeight: "900" },
  reactionCellTextReady: { color: COLORS.white },
  resultLine: { color: COLORS.inputText, fontSize: 15, fontWeight: "600", textAlign: "center" },
  counterRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 14 },
  counterBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ACCENT.border,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
  },
  counterBtnText: { color: COLORS.primary, fontSize: 28, fontWeight: "900", lineHeight: 32 },
  counterReadout: { minWidth: 92, alignItems: "center" },
  counterNumber: { color: COLORS.inputText, fontSize: 32, fontWeight: "900" },
  counterLabel: { color: COLORS.muted, fontSize: 13, fontWeight: "700", marginTop: 2 },
  breathCircle: {
    borderRadius: 999,
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ACCENT.softHeader,
  },
  breathCircleInhale: { width: 154, height: 154 },
  breathCircleHold: { width: 128, height: 128 },
  breathCircleExhale: { width: 96, height: 96 },
  breathPhase: { color: COLORS.primary, fontSize: 22, fontWeight: "900" },
  breathCountdown: { color: COLORS.inputText, fontSize: 18, fontWeight: "800", marginTop: 4 },
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
