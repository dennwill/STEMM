import { useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { Dispatch, SetStateAction, useState } from "react";
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

import { createChallengeSession, createDataPoint } from "@/lib/crud";
import { LOCAL_ACTIVITY_IDS, LOCAL_TEAM_ID } from "@/lib/db";
import { awardActivityCompletionPoints, formatAwardPointsMessage } from "@/lib/points";
import { VideoEvidence } from "@/components/VideoEvidence";
import { FanDiagram } from "@/components/ActivityDiagrams";
import { Palette, useTheme, useWizardStyles, WizardAccent } from "@/lib/theme";

const TABS = ["Instructions", "Prediction", "Recorder", "Write-Up", "Discussion"] as const;

// The four fan designs the activity walks through. Shared by the Recorder (where
// each design's video is captured) and the Write-Up (where each is documented) so
// the two steps line up 1:1.
const TRIALS = [
  {
    id: "design1",
    short: "Design 1",
    title: "Design 1",
    note: "e.g. 1 cm back-and-forward folds",
    instruction:
      "Make your first fan design, then wave it at the upright paper from 15, 30 and 45 cm. Try it against both paper and cardboard. Upload a video of the paper moving.",
  },
  {
    id: "design2",
    short: "Design 2",
    title: "Design 2",
    note: "e.g. no folds",
    instruction:
      "Make your second design and wave it from the same distances (15, 30, 45 cm), against paper and cardboard. Upload a video.",
  },
  {
    id: "design3",
    short: "Design 3",
    title: "Design 3",
    note: "",
    instruction:
      "Test your third design from the same distances (15, 30, 45 cm), against paper and cardboard. Upload a video.",
  },
] as const;
type TrialId = (typeof TRIALS)[number]["id"];

export default function FanScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const styles = useWizardStyles(makeStyles);
  const [step, setStep] = useState(0);

  // Activity state lives here (not inside each step) so navigating between
  // steps doesn't unmount and discard what the user has entered.
  const [prediction, setPrediction] = useState<PredictionValue>({ choice: "", reason: "" });
  const [reflection, setReflection] = useState("");
  const [videos, setVideos] = useState<Record<TrialId, string>>(
    Object.fromEntries(TRIALS.map((t) => [t.id, ""])) as Record<TrialId, string>,
  );
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const current = TABS[step];
  const isFirst = step === 0;
  const isLast = step === TABS.length - 1;

  const goNext = async () => {
    if (current === "Recorder" && !allFanVideosAttached(videos)) {
      Alert.alert("Recorder incomplete", "Upload one video for every fan design before continuing.");
      return;
    }

    if (isLast) {
      // Persist the activity session and data points to SQLite
      let localSaveMessage = "Activity data was saved locally.";
      try {
        const sessionId = await createChallengeSession(db, {
          team_id: LOCAL_TEAM_ID,
          activity_id: LOCAL_ACTIVITY_IDS.fan,
          prediction_text: prediction.choice
            ? `${prediction.choice}: ${prediction.reason}`
            : null,
          discussion_reflection: reflection || null,
        });

        // Save each fan design as a data point, keeping its uploaded video.
        for (const trial of TRIALS) {
          const video = videos[trial.id];
          await createDataPoint(db, {
            session_id: sessionId,
            attempt_number: TRIALS.indexOf(trial) + 1,
            action_or_design: trial.title,
            prediction_value: prediction.choice === trial.short ? "predicted strongest" : null,
            outcome_value: video ? "video uploaded" : null,
            prediction_correct: prediction.choice === trial.short && video ? true : null,
            media_file_path: video || null,
          });
        }
      } catch (err) {
        console.warn("Failed to save activity data:", err);
        localSaveMessage = "Local activity data could not be saved.";
      }
      const award = await awardActivityCompletionPoints("fan", "Hand Fan Challenge");
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
          <Text style={styles.title}>Hand Fan Challenge</Text>
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
          {current === "Recorder" && <Recorder videos={videos} setVideos={setVideos} />}
          {current === "Write-Up" && (
            <WriteUp
              videos={videos}
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

function allFanVideosAttached(videos: Record<TrialId, string>) {
  return TRIALS.every((trial) => videos[trial.id] !== "");
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
        Students test how air movement affects flexible materials by fanning paper and cardboard
        targets and comparing how much they move.
      </Text>

      <Text style={styles.blockTitle}>Equipment</Text>
      {["Paper and cardboard", "Scissors", "Mobile phone", "Sticky tape", "STEMM Mobile App"].map(
        (item) => (
          <Bullet key={item}>{item}</Bullet>
        ),
      )}

      <Text style={styles.blockTitle}>Instructions</Text>
      {[
        "Stand a paper upright on a table.",
        "Fan air towards it from 30 cm away.",
        "Observe and record the movement.",
        "Repeat with different fan designs and distances (15 cm, 30 cm, 45 cm).",
        "Repeat with cardboard instead of a vertical paper.",
      ].map((item, i) => (
        <Numbered key={item} n={i + 1}>
          {item}
        </Numbered>
      ))}

      <Text style={styles.blockTitle}>Reference table</Text>
      <StiffnessReferenceTable />
      <Text style={styles.tableNote}>
        These are rough classroom values — the point is to see the relative differences between
        materials.
      </Text>

      <Text style={styles.blockTitle}>Diagram</Text>
      <FanDiagram />
      {[
        "Cut paper 1 cm × 10 cm and fold it into a fan.",
        "Tape the target paper upright to the table.",
        "Wave the fan for about 20 seconds from the set distance.",
        "Position the phone to capture the wave and the vertical paper movement.",
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

// The four fan designs the user can predict between.
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
      <Text style={styles.promptTitle}>Predict which fan design makes the paper move the most.</Text>

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
      <Text style={styles.predictLead}>will move the paper the most because…</Text>
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

type VideosProps = {
  videos: Record<TrialId, string>;
  setVideos: Dispatch<SetStateAction<Record<TrialId, string>>>;
};

function Recorder({ videos, setVideos }: VideosProps) {
  const styles = useWizardStyles(makeStyles);
  const [trial, setTrial] = useState<TrialId>(TRIALS[0].id);

  const trialIndex = TRIALS.findIndex((t) => t.id === trial);
  const currentTrial = TRIALS[trialIndex];
  const nextTrial = TRIALS[trialIndex + 1];
  const attached = videos[trial] !== "";

  return (
    <>
      <View style={styles.subTabBar}>
        {TRIALS.map((t) => (
          <Pressable
            key={t.id}
            style={[styles.subTab, trial === t.id && styles.subTabActive]}
            onPress={() => setTrial(t.id)}
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
        label="Upload Video"
      />

      {attached &&
        (nextTrial ? (
          <Text style={styles.switchHint}>
            ✓ {currentTrial.short} video added. Switch to {nextTrial.short} above to record the next
            design.
          </Text>
        ) : (
          <Text style={styles.switchHint}>
            ✓ All designs recorded. Continue to the Write-Up step when you&apos;re ready.
          </Text>
        ))}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Write-Up                                                                   */
/* -------------------------------------------------------------------------- */

// The 3 questions asked for every design (the spec table's columns). The first
// two capture the bend angle in degrees; the third is free-text observation notes.
const WRITEUP_QUESTIONS = [
  { label: "Predicted bend (degrees)", numeric: true, placeholder: "e.g. 30" },
  { label: "Outcome — measured bend (degrees)", numeric: true, placeholder: "e.g. 25" },
  { label: "Observation notes — were you right?" },
];

type WriteUpProps = {
  videos: Record<TrialId, string>;
  answers: Record<string, string>;
  setAnswers: Dispatch<SetStateAction<Record<string, string>>>;
  reflection: string;
  setReflection: (v: string) => void;
};

function WriteUp({ videos, answers, setAnswers, reflection, setReflection }: WriteUpProps) {
  const { palette: c } = useTheme();
  const styles = useWizardStyles(makeStyles);
  return (
    <View style={styles.stack}>
      {TRIALS.map((trial) => (
        <View key={trial.id} style={styles.actionCard}>
          <Text style={styles.actionTitle}>{trial.title}</Text>
          {!!trial.note && <Text style={styles.actionNote}>{trial.note}</Text>}
          {videos[trial.id] !== "" && <Text style={styles.attachedHint}>📹 Video attached</Text>}

          {WRITEUP_QUESTIONS.map((q, i) => {
            const key = `${trial.id}-${i}`;
            const numeric = "numeric" in q && q.numeric;
            return (
              <View key={key} style={styles.field}>
                <Text style={styles.fieldLabel}>{q.label}</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={answers[key] ?? ""}
                  onChangeText={(v) => setAnswers((prev) => ({ ...prev, [key]: v }))}
                  placeholder={"placeholder" in q ? q.placeholder : undefined}
                  placeholderTextColor={c.muted}
                  keyboardType={numeric ? "numeric" : "default"}
                  multiline={!numeric}
                  textAlignVertical="top"
                />
              </View>
            );
          })}
        </View>
      ))}

      <View style={styles.card}>
        <Text style={styles.promptTitle}>
          What did you notice? Which design worked best, and why?
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

// Rough classroom stiffness values (N/rad) for the Optional Challenge. The point
// is to show relative differences between materials, not exact figures.
const K_VALUES: { material: string; thickness: string; k: string; notes: string }[] = [
  { material: "Thin printer paper", thickness: "0.1", k: "0.05", notes: "Bends very easily" },
  { material: "Standard card stock", thickness: "0.25", k: "0.2", notes: "Moderate bend" },
  { material: "Thin cardboard", thickness: "0.5", k: "0.5", notes: "Much harder to bend" },
  { material: "Corrugated cardboard", thickness: "3", k: "2–3", notes: "Very stiff, almost no bend" },
];

function Discussion() {
  const styles = useWizardStyles(makeStyles);
  return (
    <View style={styles.card}>
      <Text style={styles.sectionHeading}>So why does this happen?</Text>

      <Text style={styles.body}>
        Moving air applies force to objects. Paper bends because it is flexible (plasticity), and
        repeated bending can weaken it over time.
      </Text>

      <Text style={styles.formulaCentered}>F = k × θ</Text>

      <Text style={[styles.body, styles.spacedTop]}>
        <Text style={styles.tipLead}>Tip: </Text>
        approximate the force with the formula above, or simply rank your designs by stiffness and
        bend angle — exact units aren&apos;t needed.
      </Text>

      <Text style={[styles.sectionHeading, styles.spacedTop]}>Optional challenge</Text>
      <Text style={styles.body}>
        Estimate a stiffness coefficient <Text style={styles.tipLead}>k</Text> for each material by
        measuring its bend angle under the same fan speed. In F ≈ k × θ, F is the force (N), θ is the
        bend angle (radians) and k is how strongly the material resists bending.
      </Text>

      <Text style={[styles.body, styles.spacedTop]}>
        <Text style={styles.tipLead}>Worked example: </Text>
        thin paper (k = 0.05) bent 30° ≈ 0.524 rad gives F ≈ 0.05 × 0.524 ≈ 0.026 N. Thin cardboard
        (k = 0.5) at the same angle gives F ≈ 0.5 × 0.524 ≈ 0.26 N — so the force needed rises
        strongly with stiffness.
      </Text>
    </View>
  );
}

function StiffnessReferenceTable() {
  const styles = useWizardStyles(makeStyles);
  return (
    <View style={[styles.forceTable, styles.spacedTop]}>
      <View style={[styles.forceRow, styles.forceHeaderRow]}>
        <Text style={[styles.forceCell, styles.forceHeaderText]}>Material</Text>
        <Text style={[styles.forceCell, styles.forceHeaderText]}>Thickness (mm)</Text>
        <Text style={[styles.forceCell, styles.forceHeaderText]}>k (N/rad)</Text>
        <Text style={[styles.forceCell, styles.forceHeaderText]}>Notes</Text>
      </View>
      {K_VALUES.map((row, i) => (
        <View
          key={row.material}
          style={[styles.forceRow, i === K_VALUES.length - 1 && styles.forceRowLast]}
        >
          <Text style={styles.forceCell}>{row.material}</Text>
          <Text style={styles.forceCell}>{row.thickness}</Text>
          <Text style={styles.forceCell}>{row.k}</Text>
          <Text style={styles.forceCell}>{row.notes}</Text>
        </View>
      ))}
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
  primaryBtn: {
    backgroundColor: c.primary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 36,
    alignItems: "center",
    alignSelf: "center",
  },
  primaryBtnText: { color: c.white, fontSize: 17, fontWeight: "700" },

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
  attachedHint: { color: c.primary, fontSize: 13, fontWeight: "600", marginTop: 10 },
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
  formulaCentered: {
    color: c.inputText,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    paddingVertical: 10,
    marginTop: 8,
  },
  tipLead: { fontWeight: "800", color: c.primary },
  forceTable: { borderWidth: 1, borderColor: ACCENT.border, borderRadius: 8, overflow: "hidden" },
  forceRow: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: ACCENT.border,
  },
  forceRowLast: { borderBottomWidth: 0 },
  forceHeaderRow: { backgroundColor: ACCENT.softHeader },
  forceCell: { flex: 1, padding: 14, color: c.inputText, fontSize: 15, lineHeight: 21 },
  forceHeaderText: { fontWeight: "800" },
  tableNote: { color: c.muted, fontSize: 13, fontStyle: "italic", marginTop: 12, lineHeight: 19 },

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
