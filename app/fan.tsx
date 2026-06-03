import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
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

import { COLORS } from "@/components/auth-shell";
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
      "Make your first fan design, then wave it at the upright paper from 15, 30 and 45 cm. Upload a video of the paper moving.",
  },
  {
    id: "design2",
    short: "Design 2",
    title: "Design 2",
    note: "e.g. no folds",
    instruction: "Make your second design and wave it from the same distances. Upload a video.",
  },
  {
    id: "design3",
    short: "Design 3",
    title: "Design 3",
    note: "",
    instruction: "Test your third design from the same distances. Upload a video.",
  },
  {
    id: "design4",
    short: "Design 4",
    title: "Design 4",
    note: "",
    instruction: "Test your fourth design from the same distances. Upload a video.",
  },
] as const;
type TrialId = (typeof TRIALS)[number]["id"];

export default function FanScreen() {
  const router = useRouter();
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
    if (isLast) {
      const award = await awardActivityCompletionPoints("fan", "Hand Fan Challenge");
      Alert.alert("Activity complete", formatAwardPointsMessage(award));
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

/* -------------------------------------------------------------------------- */
/* Instructions                                                               */
/* -------------------------------------------------------------------------- */

function Instructions() {
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

      <Text style={styles.blockTitle}>Diagram</Text>
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

type VideosProps = {
  videos: Record<TrialId, string>;
  setVideos: Dispatch<SetStateAction<Record<TrialId, string>>>;
};

function Recorder({ videos, setVideos }: VideosProps) {
  const [trial, setTrial] = useState<TrialId>(TRIALS[0].id);
  const [names, setNames] = useState<Record<string, string>>({});

  async function pickVideo() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Photos access needed", "Allow access to your photos to attach a video.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["videos"],
      quality: 1,
    });
    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      setVideos((prev) => ({ ...prev, [trial]: asset.uri }));
      setNames((prev) => ({ ...prev, [trial]: asset.fileName ?? "" }));
    }
  }

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

      <View style={[styles.card, styles.mediaCard]}>
        <Ionicons name="videocam" size={42} color={COLORS.primary} style={styles.mediaIcon} />
        <Pressable style={styles.primaryBtn} onPress={pickVideo}>
          <Text style={styles.primaryBtnText}>{attached ? "Replace Video" : "Upload Video"}</Text>
        </Pressable>
        {attached && (
          <Text style={styles.videoName} numberOfLines={1}>
            {names[trial] || "Video attached"}
          </Text>
        )}
      </View>

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

// The 3 questions asked for every design (the mockup table's columns).
const WRITEUP_QUESTIONS = [
  { label: "Prediction (more or less movement than the others?)" },
  { label: "Outcome (how much did the paper move?)" },
  { label: "Were you right?" },
];

type WriteUpProps = {
  videos: Record<TrialId, string>;
  answers: Record<string, string>;
  setAnswers: Dispatch<SetStateAction<Record<string, string>>>;
  reflection: string;
  setReflection: (v: string) => void;
};

function WriteUp({ videos, answers, setAnswers, reflection, setReflection }: WriteUpProps) {
  return (
    <View style={styles.stack}>
      {TRIALS.map((trial) => (
        <View key={trial.id} style={styles.actionCard}>
          <Text style={styles.actionTitle}>{trial.title}</Text>
          {!!trial.note && <Text style={styles.actionNote}>{trial.note}</Text>}
          {videos[trial.id] !== "" && <Text style={styles.attachedHint}>📹 Video attached</Text>}

          {WRITEUP_QUESTIONS.map((q, c) => {
            const key = `${trial.id}-${c}`;
            return (
              <View key={key} style={styles.field}>
                <Text style={styles.fieldLabel}>{q.label}</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={answers[key] ?? ""}
                  onChangeText={(v) => setAnswers((prev) => ({ ...prev, [key]: v }))}
                  multiline
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

function Discussion() {
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
  mediaCard: { marginTop: 20, alignItems: "center", paddingVertical: 32 },
  mediaIcon: { marginBottom: 18 },
  videoName: { color: COLORS.muted, fontSize: 14, marginTop: 16, textAlign: "center", maxWidth: "100%" },

  primaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 36,
    alignItems: "center",
    alignSelf: "center",
  },
  primaryBtnText: { color: COLORS.white, fontSize: 17, fontWeight: "700" },

  // Write-Up (stacked design cards)
  stack: { gap: 16 },
  actionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    boxShadow: "0px 1px 6px rgba(0, 0, 0, 0.05)",
  },
  actionTitle: { color: COLORS.primary, fontSize: 18, fontWeight: "800" },
  actionNote: { color: COLORS.muted, fontSize: 14, marginTop: 4, lineHeight: 20 },
  attachedHint: { color: COLORS.primary, fontSize: 13, fontWeight: "600", marginTop: 10 },
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

  // Discussion
  sectionHeading: { color: COLORS.primary, fontSize: 23, fontWeight: "800", marginBottom: 18 },
  formulaCentered: {
    color: COLORS.inputText,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    paddingVertical: 10,
    marginTop: 8,
  },
  tipLead: { fontWeight: "800", color: COLORS.primary },

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
