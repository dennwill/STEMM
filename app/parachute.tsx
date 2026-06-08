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

import {
  createChallengeSession,
  createDataPoint,
} from "@/lib/crud";
import { VideoEvidence } from "@/components/VideoEvidence";
import { ParachuteDiagram } from "@/components/ActivityDiagrams";
import { LOCAL_ACTIVITY_IDS, LOCAL_TEAM_ID } from "@/lib/db";
import { SchoolLevel as Level, useSchoolLevel } from "@/lib/gradeLevel";
import { awardActivityCompletionPoints, formatAwardPointsMessage } from "@/lib/points";
import { Palette, useTheme, useWizardStyles, WizardAccent } from "@/lib/theme";

const TABS = [
  "Instructions",
  "Prediction",
  "Recorder",
  "Results",
  "Write-Up",
  "Discussion",
] as const;

// `Level` ("primary" | "high") is imported from lib/gradeLevel — the spec's
// "Student Focus" split. Primary measures time and final speed only; High School
// unlocks the full force / g-force chain.

// The four drops the activity walks through. Shared by the Recorder (where each
// drop is timed), the Results (where the physics is computed) and the Write-Up
// (where each drop is documented) so the steps line up 1:1.
const TRIALS = [
  {
    id: "baseline",
    short: "Baseline",
    title: "No parachute (baseline)",
    note: "Drop the toy with no parachute first.",
    instruction:
      "Drop the toy with no parachute. Start the fall timer as you release it and stop it the moment it lands.",
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

type Measure = { fallMs: number; contactMs: number };
type Setup = { heightM: string; massKg: string };

const G = 9.8; // gravitational field strength (m/s^2)

export default function ParachuteScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const styles = useWizardStyles(makeStyles);
  const [step, setStep] = useState(0);

  // Level is auto-detected from the team's grade when the student is on a team;
  // otherwise they pick it manually in the Instructions step.
  const { level, setLevel, autoDetected, gradeLabel } = useSchoolLevel();

  // Activity state lives here (not inside each step) so navigating between
  // steps doesn't unmount and discard what the user has entered.
  const [prediction, setPrediction] = useState<PredictionValue>({ choice: "", reason: "" });
  const [reflection, setReflection] = useState("");
  const [setup, setSetup] = useState<Setup>({ heightM: "", massKg: "" });
  const [measures, setMeasures] = useState<Record<TrialId, Measure>>(
    Object.fromEntries(TRIALS.map((t) => [t.id, { fallMs: 0, contactMs: 0 }])) as Record<
      TrialId,
      Measure
    >,
  );
  const [videos, setVideos] = useState<Record<TrialId, string>>(
    Object.fromEntries(TRIALS.map((t) => [t.id, ""])) as Record<TrialId, string>,
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

        const heightM = num(setup.heightM);
        const massKg = num(setup.massKg);

        // Save each trial as a data point with a self-describing summary.
        for (const trial of TRIALS) {
          const m = measures[trial.id];
          await createDataPoint(db, {
            session_id: sessionId,
            attempt_number: TRIALS.indexOf(trial) + 1,
            action_or_design: trial.title,
            prediction_value: prediction.choice === trial.short ? "predicted best" : null,
            outcome_value: summarize(level, heightM, massKg, m),
            prediction_correct: null,
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
          {current === "Instructions" && (
            <Instructions
              level={level}
              setLevel={setLevel}
              autoDetected={autoDetected}
              gradeLabel={gradeLabel}
            />
          )}
          {current === "Prediction" && (
            <Prediction value={prediction} onChange={setPrediction} />
          )}
          {current === "Recorder" && (
            <Recorder
              level={level}
              setup={setup}
              setSetup={setSetup}
              measures={measures}
              setMeasures={setMeasures}
              videos={videos}
              setVideos={setVideos}
            />
          )}
          {current === "Results" && (
            <Results level={level} setup={setup} measures={measures} />
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
          {current === "Discussion" && <Discussion level={level} />}
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
/* Physics helpers                                                            */
/* -------------------------------------------------------------------------- */

// Parse a free-text numeric field, returning NaN for empty / invalid input so
// downstream calculations can show "—" until the value is provided.
function num(s: string) {
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : NaN;
}

type Metrics = {
  finalVelocity: number; // m/s
  acceleration: number; // m/s^2
  weight: number; // N
  netForce: number; // N
  dragForce: number; // N
  gForce: number; // multiples of g
};

function computeMetrics(
  heightM: number,
  massKg: number,
  fallMs: number,
  contactMs: number,
): Metrics {
  const fallS = fallMs / 1000;
  const contactS = contactMs / 1000;
  const finalVelocity = heightM > 0 && fallS > 0 ? heightM / fallS : NaN;
  const acceleration = fallS > 0 && Number.isFinite(finalVelocity) ? finalVelocity / fallS : NaN;
  const weight = massKg > 0 ? massKg * G : NaN;
  const netForce = massKg > 0 && Number.isFinite(acceleration) ? massKg * acceleration : NaN;
  const dragForce =
    Number.isFinite(weight) && Number.isFinite(netForce) ? weight - netForce : NaN;
  const gForce =
    Number.isFinite(finalVelocity) && contactS > 0 ? finalVelocity / contactS / G : NaN;
  return { finalVelocity, acceleration, weight, netForce, dragForce, gForce };
}

function fmt(n: number, unit = "", dp = 2) {
  if (!Number.isFinite(n)) return "—";
  return unit ? `${n.toFixed(dp)} ${unit}` : n.toFixed(dp);
}

function fmtSeconds(ms: number) {
  return ms > 0 ? `${(ms / 1000).toFixed(2)} s` : "—";
}

// Concise, self-describing summary stored against each drop's data point.
function summarize(level: Level, heightM: number, massKg: number, m: Measure): string | null {
  if (m.fallMs <= 0) return null;
  const metrics = computeMetrics(heightM, massKg, m.fallMs, m.contactMs);
  const parts = [`fall ${(m.fallMs / 1000).toFixed(2)}s`];
  if (Number.isFinite(metrics.finalVelocity))
    parts.push(`v=${metrics.finalVelocity.toFixed(2)} m/s`);
  if (level === "high" && Number.isFinite(metrics.gForce))
    parts.push(`g=${metrics.gForce.toFixed(1)}`);
  return parts.join(" · ");
}

/* -------------------------------------------------------------------------- */
/* Instructions                                                               */
/* -------------------------------------------------------------------------- */

function Instructions({
  level,
  setLevel,
  autoDetected,
  gradeLabel,
}: {
  level: Level;
  setLevel: (l: Level) => void;
  autoDetected: boolean;
  gradeLabel: string | null;
}) {
  const styles = useWizardStyles(makeStyles);
  const levelName = level === "primary" ? "Primary School" : "High School";
  return (
    <View style={styles.card}>
      <Text style={styles.blockTitle}>Student level</Text>
      {autoDetected ? (
        <>
          <View style={styles.instructionBox}>
            <Text style={styles.instructionTitle}>{levelName}</Text>
            <Text style={styles.instructionText}>
              Set automatically from your team&apos;s grade
              {gradeLabel ? ` (${gradeLabel})` : ""}.
            </Text>
          </View>
          <Text style={styles.levelHint}>
            {level === "primary"
              ? "Primary: measure the fall time and work out the final speed."
              : "High School: also work out acceleration, net force, drag force and impact g-force."}
          </Text>
        </>
      ) : (
        <>
          <View style={styles.subTabBar}>
            {(
              [
                { id: "primary", label: "Primary School" },
                { id: "high", label: "High School" },
              ] as const
            ).map((opt) => (
              <Pressable
                key={opt.id}
                style={[styles.subTab, level === opt.id && styles.subTabActive]}
                onPress={() => setLevel(opt.id)}
              >
                <Text style={[styles.subTabLabel, level === opt.id && styles.subTabLabelActive]}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.levelHint}>
            {level === "primary"
              ? "Primary: measure the fall time and work out the final speed."
              : "High School: also work out acceleration, net force, drag force and impact g-force."}
          </Text>
        </>
      )}

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
        "Measure the drop height and the toy's mass, and enter them in the Recorder.",
        "Drop the toy without a parachute and time the fall (baseline test).",
        "Build a parachute, then drop from the same height and time the fall.",
        "Use slow-motion video to time how long the toy takes to stop on landing.",
        "Redesign and test up to three prototypes within 20 minutes.",
        "Review your results, then upload videos and team reflections.",
      ].map((item, i) => (
        <Numbered key={item} n={i + 1}>
          {item}
        </Numbered>
      ))}

      <Text style={styles.blockTitle}>Diagram</Text>
      <ParachuteDiagram />
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
  const { palette: c } = useTheme();
  const styles = useWizardStyles(makeStyles);
  return (
    <View style={styles.card}>
      <Text style={styles.promptTitle}>
        Predict which parachute design will have the best (slowest, safest) landing.
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
      <Text style={styles.predictLead}>will be the best because…</Text>
      <TextInput
        style={styles.textArea}
        placeholder="Type your reason here.."
        placeholderTextColor={c.muted}
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

type RecorderProps = {
  level: Level;
  setup: Setup;
  setSetup: Dispatch<SetStateAction<Setup>>;
  measures: Record<TrialId, Measure>;
  setMeasures: Dispatch<SetStateAction<Record<TrialId, Measure>>>;
  videos: Record<TrialId, string>;
  setVideos: Dispatch<SetStateAction<Record<TrialId, string>>>;
};

function Recorder({
  level,
  setup,
  setSetup,
  measures,
  setMeasures,
  videos,
  setVideos,
}: RecorderProps) {
  const { palette: c } = useTheme();
  const styles = useWizardStyles(makeStyles);
  const [trial, setTrial] = useState<TrialId>(TRIALS[0].id);
  // Which timer (if any) is currently running. Only one may run at a time.
  const [timing, setTiming] = useState<null | "fall" | "contact">(null);
  const [fallElapsed, setFallElapsed] = useState(measures[TRIALS[0].id].fallMs);
  const [contactElapsed, setContactElapsed] = useState(measures[TRIALS[0].id].contactMs);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef(0);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  function selectTrial(id: TrialId) {
    if (timing) return; // don't switch mid-recording
    setTrial(id);
    setFallElapsed(measures[id].fallMs);
    setContactElapsed(measures[id].contactMs);
  }

  function toggle(field: "fall" | "contact") {
    if (timing === field) {
      // Stop the running timer and save its value.
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      setTiming(null);
      const val = field === "fall" ? fallElapsed : contactElapsed;
      const key = field === "fall" ? "fallMs" : "contactMs";
      setMeasures((prev) => ({ ...prev, [trial]: { ...prev[trial], [key]: val } }));
      return;
    }
    if (timing) return; // another timer is already running
    const base = field === "fall" ? fallElapsed : contactElapsed;
    startRef.current = Date.now() - base;
    intervalRef.current = setInterval(() => {
      const e = Date.now() - startRef.current;
      if (field === "fall") setFallElapsed(e);
      else setContactElapsed(e);
    }, 30);
    setTiming(field);
  }

  const trialIndex = TRIALS.findIndex((t) => t.id === trial);
  const currentTrial = TRIALS[trialIndex];
  const nextTrial = TRIALS[trialIndex + 1];
  const recorded = !timing && measures[trial].fallMs > 0;

  return (
    <>
      <View style={styles.card}>
        <Text style={styles.blockTitle}>Setup</Text>
        <Text style={styles.body}>
          Measure these once — they&apos;re the same for every drop.
        </Text>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Drop height (m)</Text>
          <TextInput
            style={styles.fieldInput}
            value={setup.heightM}
            onChangeText={(heightM) => setSetup((prev) => ({ ...prev, heightM }))}
            placeholder="e.g. 1.0"
            placeholderTextColor={c.muted}
            keyboardType="decimal-pad"
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Toy mass (kg)</Text>
          <TextInput
            style={styles.fieldInput}
            value={setup.massKg}
            onChangeText={(massKg) => setSetup((prev) => ({ ...prev, massKg }))}
            placeholder="e.g. 0.20"
            placeholderTextColor={c.muted}
            keyboardType="decimal-pad"
          />
        </View>
      </View>

      <View style={[styles.subTabBar, styles.spacedTop]}>
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

      <VideoEvidence
        value={videos[trial]}
        onChange={(uri) => setVideos((prev) => ({ ...prev, [trial]: uri }))}
      />

      <TimerCard
        styles={styles}
        label="Fall time — release to first landing"
        elapsed={fallElapsed}
        running={timing === "fall"}
        disabled={timing === "contact"}
        onToggle={() => toggle("fall")}
      />

      {level === "high" && (
        <TimerCard
          styles={styles}
          label="Contact time — landing to fully stopped (slow motion)"
          elapsed={contactElapsed}
          running={timing === "contact"}
          disabled={timing === "fall"}
          onToggle={() => toggle("contact")}
        />
      )}

      {recorded &&
        (nextTrial ? (
          <Text style={styles.switchHint}>
            ✓ {currentTrial.short} saved. Switch to {nextTrial.short} above to record the next
            drop.
          </Text>
        ) : (
          <Text style={styles.switchHint}>
            ✓ All drops recorded. Continue to the Results step when you&apos;re ready.
          </Text>
        ))}
    </>
  );
}

function TimerCard({
  styles,
  label,
  elapsed,
  running,
  disabled,
  onToggle,
}: {
  styles: ReturnType<typeof makeStyles>;
  label: string;
  elapsed: number;
  running: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <View style={[styles.card, styles.timerCard]}>
      <Text style={styles.timerLabel}>{label}</Text>
      <Text style={styles.timer}>{formatTime(elapsed)}</Text>
      <Pressable
        style={[
          styles.outlineBtn,
          running && styles.primaryBtn,
          disabled && styles.btnDisabled,
        ]}
        onPress={onToggle}
        disabled={disabled}
      >
        <Text style={[styles.outlineBtnText, running && styles.primaryBtnText]}>
          {running ? "Stop Timer" : "Start Timer"}
        </Text>
      </Pressable>
    </View>
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
/* Results                                                                    */
/* -------------------------------------------------------------------------- */

function Results({
  level,
  setup,
  measures,
}: {
  level: Level;
  setup: Setup;
  measures: Record<TrialId, Measure>;
}) {
  const styles = useWizardStyles(makeStyles);
  const heightM = num(setup.heightM);
  const massKg = num(setup.massKg);

  return (
    <View style={styles.stack}>
      <View style={styles.card}>
        <Text style={styles.promptTitle}>Your results</Text>
        <Text style={styles.body}>
          Calculated from your drop height ({fmt(heightM, "m")}), toy mass ({fmt(massKg, "kg")})
          and the times you recorded. Fill in the Setup and timers in the Recorder to see every
          value.
        </Text>
      </View>

      {TRIALS.map((trial) => {
        const m = measures[trial.id];
        const metrics = computeMetrics(heightM, massKg, m.fallMs, m.contactMs);
        const rows: [string, string][] =
          level === "primary"
            ? [
                ["Fall time", fmtSeconds(m.fallMs)],
                ["Final speed", fmt(metrics.finalVelocity, "m/s")],
              ]
            : [
                ["Fall time", fmtSeconds(m.fallMs)],
                ["Final speed", fmt(metrics.finalVelocity, "m/s")],
                ["Acceleration", fmt(metrics.acceleration, "m/s²")],
                ["Weight", fmt(metrics.weight, "N")],
                ["Net force", fmt(metrics.netForce, "N")],
                ["Drag force", fmt(metrics.dragForce, "N")],
                ["Contact time", fmtSeconds(m.contactMs)],
                ["Impact g-force", fmt(metrics.gForce, "g", 1)],
              ];
        return (
          <View key={trial.id} style={styles.actionCard}>
            <Text style={styles.actionTitle}>{trial.title}</Text>
            <View style={[styles.forceTable, styles.spacedTopSm]}>
              {rows.map(([label, val], i) => (
                <View
                  key={label}
                  style={[styles.forceRow, i === rows.length - 1 && styles.forceRowLast]}
                >
                  <Text style={styles.forceCell}>{label}</Text>
                  <Text style={[styles.forceCell, styles.forceValueCell]}>{val}</Text>
                </View>
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Write-Up                                                                   */
/* -------------------------------------------------------------------------- */

// Asked for every drop. The `auto` question is pre-filled from the fall time
// measured in the Recorder until the user edits it.
const WRITEUP_QUESTIONS = [
  { label: "Time to hit the ground", auto: true },
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
            const measured = measures[trial.id].fallMs;
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
          Were you correct in the timings? Which design was easiest to make?
        </Text>
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

/* -------------------------------------------------------------------------- */
/* Discussion                                                                 */
/* -------------------------------------------------------------------------- */

const FORCES = [
  { force: "Downward (weight)", formula: "Weight = mass × g" },
  { force: "Upward (drag)", formula: "Drag force from the parachute" },
  { force: "Net (total) force", formula: "Net force = Weight − Drag Force" },
];

const GFORCE_RANGES = [
  { range: "1–5 g", effect: "No injury" },
  { range: "5–10 g", effect: "Possible bruising or strains" },
  { range: "10–30 g", effect: "Serious injuries possible (broken bones, concussions)" },
  { range: "30–50 g", effect: "High risk of severe injury" },
  { range: "50+ g", effect: "Life-threatening injuries likely" },
];

function Discussion({ level }: { level: Level }) {
  const styles = useWizardStyles(makeStyles);
  return (
    <View style={styles.card}>
      <Text style={styles.sectionHeading}>So why does this happen?</Text>

      <Text style={styles.body}>
        Gravity pulls objects downward, causing them to speed up as they fall. A parachute
        increases air resistance (also called drag). Drag acts upward, opposing the motion and
        slowing the fall. A slower fall reduces the force when the toy hits the ground, making the
        landing safer. Engineers improve parachute designs through repeated testing and redesign.
      </Text>

      {level === "high" && (
        <>
          <Text style={[styles.blockTitle, styles.spacedTop]}>Forces acting on the toy</Text>
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

          <Text style={[styles.sectionHeading, styles.spacedTop]}>Newton’s Second Law</Text>
          <Text style={styles.formulaCentered}>Net force = mass × acceleration</Text>

          <Text style={[styles.blockTitle, styles.spacedTop]}>
            Typical g-force ranges and injury risk
          </Text>
          <View style={styles.forceTable}>
            <View style={[styles.forceRow, styles.forceHeaderRow]}>
              <Text style={[styles.forceCell, styles.forceHeaderText]}>G-force</Text>
              <Text style={[styles.forceCell, styles.forceHeaderText, styles.forceCellWide]}>
                Likely effects
              </Text>
            </View>
            {GFORCE_RANGES.map((row, i) => (
              <View
                key={row.range}
                style={[styles.forceRow, i === GFORCE_RANGES.length - 1 && styles.forceRowLast]}
              >
                <Text style={styles.forceCell}>{row.range}</Text>
                <Text style={[styles.forceCell, styles.forceCellWide]}>{row.effect}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.fieldHint}>
            Duration matters: a brief spike can be survivable, while sustained g-forces are more
            dangerous.
          </Text>

          <Text style={[styles.blockTitle, styles.spacedTop]}>Tips for slow-motion video</Text>
          {[
            "Use a ruler in frame for scale.",
            "Identify the first contact to start the contact time.",
            "Film in slow motion so the moment the toy stops is easy to see.",
          ].map((tip) => (
            <Bullet key={tip}>{tip}</Bullet>
          ))}
        </>
      )}
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
  title: { color: c.primary, fontSize: 22, fontWeight: "800", marginLeft: 8 },

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
  levelHint: { color: c.muted, fontSize: 14, lineHeight: 20, marginTop: 10 },

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
  spacedTop: { marginTop: 24 },
  spacedTopSm: { marginTop: 12 },
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

  // Recorder
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
  timerCard: { marginTop: 16, alignItems: "center" },
  timerLabel: {
    color: c.muted,
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 8,
  },
  timer: { color: c.inputText, fontSize: 56, fontWeight: "800", marginBottom: 20 },

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
  btnDisabled: { opacity: 0.4 },

  // Write-Up / Results (stacked cards)
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

  // Discussion / Results tables
  sectionHeading: { color: c.primary, fontSize: 23, fontWeight: "800", marginBottom: 18 },
  forceTable: { borderWidth: 1, borderColor: ACCENT.border, borderRadius: 8, overflow: "hidden" },
  forceRow: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: ACCENT.border,
  },
  forceRowLast: { borderBottomWidth: 0 },
  forceHeaderRow: { backgroundColor: ACCENT.softHeader },
  forceCell: { flex: 1, padding: 14, color: c.inputText, fontSize: 15, lineHeight: 21 },
  forceCellWide: { flex: 1.6 },
  forceValueCell: { fontWeight: "700", textAlign: "right" },
  forceHeaderText: { fontWeight: "800" },
  formulaCentered: { color: c.inputText, fontSize: 17, textAlign: "center", paddingVertical: 6 },

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
