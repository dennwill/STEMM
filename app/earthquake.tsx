import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Accelerometer, Gyroscope } from "expo-sensors";
import { useSQLiteContext } from "expo-sqlite";
import { Dispatch, SetStateAction, useCallback, useEffect, useRef, useState } from "react";
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
import { createChallengeSession, createDataPoint } from "@/lib/crud";
import { LOCAL_ACTIVITY_IDS, LOCAL_TEAM_ID } from "@/lib/db";
import { awardActivityCompletionPoints, formatAwardPointsMessage } from "@/lib/points";
import { Palette, useTheme, useWizardStyles, WizardAccent } from "@/lib/theme";

const TABS = ["Instructions", "Prediction", "Recorder", "Write-Up", "Discussion"] as const;

// The four fold designs the activity compares. Used by the Prediction chips and
// the Write-Up cards. The Recorder is a standalone vibration test, so it does not
// use this list.
const TRIALS = [
  { id: "design1", short: "Design 1", title: "Design 1", note: "e.g. 4 folds + 4 pillars" },
  { id: "design2", short: "Design 2", title: "Design 2", note: "e.g. 10 folds + 4 pillars" },
  { id: "design3", short: "Design 3", title: "Design 3", note: "e.g. 3 folds and 6 pillars" },
  { id: "design4", short: "Design 4", title: "Design 4", note: "" },
] as const;

export default function EarthquakeScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const styles = useWizardStyles(makeStyles);
  const [step, setStep] = useState(0);

  // Activity state lives here (not inside each step) so navigating between
  // steps doesn't unmount and discard what the user has entered.
  const [prediction, setPrediction] = useState<PredictionValue>({ choice: "", reason: "" });
  const [reflection, setReflection] = useState("");
  // The earthquake recorder is a single standalone vibration test (no trials),
  // so its evidence video is one slot rather than a per-trial map.
  const [video, setVideo] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const current = TABS[step];
  const isFirst = step === 0;
  const isLast = step === TABS.length - 1;

  const goNext = async () => {
    if (isLast) {
      // Persist the activity session and data points to SQLite. This activity
      // has no per-trial measurement (the Recorder is a standalone vibration
      // test), so each design row just records the predicted choice.
      let localSaveMessage = "Activity data was saved locally.";
      try {
        const sessionId = await createChallengeSession(db, {
          team_id: LOCAL_TEAM_ID,
          activity_id: LOCAL_ACTIVITY_IDS.earthquake,
          prediction_text: prediction.choice
            ? `${prediction.choice}: ${prediction.reason}`
            : null,
          discussion_reflection: reflection || null,
        });

        for (const trial of TRIALS) {
          await createDataPoint(db, {
            session_id: sessionId,
            attempt_number: TRIALS.indexOf(trial) + 1,
            action_or_design: trial.title,
            prediction_value: prediction.choice === trial.short ? "predicted most stable" : null,
            outcome_value: null,
            prediction_correct: null,
            media_file_path: null,
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
          {current === "Recorder" && <Recorder video={video} setVideo={setVideo} />}
          {current === "Write-Up" && (
            <WriteUp
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

function Recorder({
  video,
  setVideo,
}: {
  video: string;
  setVideo: Dispatch<SetStateAction<string>>;
}) {
  const { palette: c } = useTheme();
  const styles = useWizardStyles(makeStyles);
  const [vibrating, setVibrating] = useState(false);
  const [accelData, setAccelData] = useState({ x: 0, y: 0, z: 0 });
  const [gyroData, setGyroData] = useState({ x: 0, y: 0, z: 0 });
  const subscription = useRef<ReturnType<typeof Accelerometer.addListener> | null>(null);
  const gyroSub = useRef<ReturnType<typeof Gyroscope.addListener> | null>(null);

  const stopSensors = useCallback(() => {
    subscription.current?.remove();
    subscription.current = null;
    gyroSub.current?.remove();
    gyroSub.current = null;
  }, []);

  const startSensors = useCallback(() => {
    Accelerometer.setUpdateInterval(100);
    subscription.current = Accelerometer.addListener(setAccelData);
    Gyroscope.setUpdateInterval(100);
    gyroSub.current = Gyroscope.addListener(setGyroData);
  }, []);

  useEffect(() => {
    return () => {
      Vibration.cancel();
      stopSensors();
    };
  }, [stopSensors]);

  function toggle() {
    if (vibrating) {
      Vibration.cancel();
      stopSensors();
      setVibrating(false);
      return;
    }
    Vibration.vibrate([0, 600, 400], true);
    startSensors();
    setVibrating(true);
  }

  const magnitude = Math.sqrt(
    accelData.x ** 2 + accelData.y ** 2 + accelData.z ** 2,
  );

  return (
    <View style={styles.stack}>
      <View style={[styles.card, styles.mediaCard]}>
        <MaterialCommunityIcons
          name="vibrate"
          size={48}
          color={c.primary}
          style={styles.mediaIcon}
        />
        <Pressable style={[styles.primaryBtn, vibrating && styles.outlineBtn]} onPress={toggle}>
          <Text style={[styles.primaryBtnText, vibrating && styles.outlineBtnText]}>
            {vibrating ? "Stop Vibrating" : "Vibrate!"}
          </Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <View style={styles.accelHeader}>
          <MaterialCommunityIcons name="axis-arrow" size={24} color={c.primary} />
          <Text style={styles.accelTitle}>Accelerometer</Text>
        </View>

        <View style={styles.accelGrid}>
          {(["X", "Y", "Z"] as const).map((axis) => (
            <View key={axis} style={styles.accelCell}>
              <Text style={styles.accelAxisLabel}>{axis}</Text>
              <Text style={styles.accelValue}>
                {accelData[axis.toLowerCase() as "x" | "y" | "z"].toFixed(3)}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.magnitudeRow}>
          <Text style={styles.magnitudeLabel}>Magnitude</Text>
          <Text style={styles.magnitudeValue}>{magnitude.toFixed(3)}</Text>
        </View>

        {!vibrating && (
          <Text style={styles.accelHint}>
            Press Vibrate to start reading sensor data.
          </Text>
        )}
      </View>

      <View style={styles.card}>
        <View style={styles.accelHeader}>
          <MaterialCommunityIcons name="rotate-3d-variant" size={24} color={c.primary} />
          <Text style={styles.accelTitle}>Gyroscope</Text>
        </View>

        <View style={styles.accelGrid}>
          {(["X", "Y", "Z"] as const).map((axis) => (
            <View key={axis} style={styles.accelCell}>
              <Text style={styles.accelAxisLabel}>{axis}</Text>
              <Text style={styles.accelValue}>
                {gyroData[axis.toLowerCase() as "x" | "y" | "z"].toFixed(3)}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.magnitudeRow}>
          <Text style={styles.magnitudeLabel}>Rotation rate</Text>
          <Text style={styles.magnitudeValue}>
            {Math.sqrt(gyroData.x ** 2 + gyroData.y ** 2 + gyroData.z ** 2).toFixed(3)}
          </Text>
        </View>

        {!vibrating && (
          <Text style={styles.accelHint}>
            Press Vibrate to start reading sensor data.
          </Text>
        )}
      </View>

      <VideoEvidence value={video} onChange={setVideo} />
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Write-Up                                                                   */
/* -------------------------------------------------------------------------- */

// The 3 questions asked for every design (the mockup table's columns).
const WRITEUP_QUESTIONS = [
  { label: "Phone moves (yes / no)?", options: ["Yes", "No"] },
  { label: "Outcome (in degrees)" },
  { label: "Were you right?", options: ["Yes", "No"] },
];

type WriteUpProps = {
  answers: Record<string, string>;
  setAnswers: Dispatch<SetStateAction<Record<string, string>>>;
  reflection: string;
  setReflection: (v: string) => void;
};

function WriteUp({ answers, setAnswers, reflection, setReflection }: WriteUpProps) {
  const { palette: c } = useTheme();
  const styles = useWizardStyles(makeStyles);
  return (
    <View style={styles.stack}>
      {TRIALS.map((trial) => (
        <View key={trial.id} style={styles.actionCard}>
          <Text style={styles.actionTitle}>{trial.title}</Text>
          {!!trial.note && <Text style={styles.actionNote}>{trial.note}</Text>}

          {WRITEUP_QUESTIONS.map((q, c) => {
            const key = `${trial.id}-${c}`;
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
                  <TextInput
                    style={styles.fieldInput}
                    value={answers[key] ?? ""}
                    onChangeText={(v) => setAnswers((prev) => ({ ...prev, [key]: v }))}
                    multiline
                    textAlignVertical="top"
                  />
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

  // Recorder (vibration card)
  mediaCard: { alignItems: "center", paddingVertical: 40 },
  mediaIcon: { marginBottom: 22 },

  // Accelerometer
  accelHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 },
  accelTitle: { color: c.primary, fontSize: 18, fontWeight: "800" },
  accelGrid: { flexDirection: "row", gap: 12 },
  accelCell: {
    flex: 1,
    backgroundColor: c.bg,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  accelAxisLabel: { color: c.muted, fontSize: 13, fontWeight: "600", marginBottom: 4 },
  accelValue: { color: c.inputText, fontSize: 17, fontWeight: "700", fontVariant: ["tabular-nums"] },
  magnitudeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E2E2EC",
  },
  magnitudeLabel: { color: c.inputText, fontSize: 16, fontWeight: "700" },
  magnitudeValue: { color: c.primary, fontSize: 20, fontWeight: "800", fontVariant: ["tabular-nums"] },
  accelHint: { color: c.muted, fontSize: 14, textAlign: "center", marginTop: 14 },
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
