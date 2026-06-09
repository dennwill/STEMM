import { Ionicons } from "@expo/vector-icons";
import { useEventListener } from "expo";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { pickVideoFromLibrary } from "@/lib/pickVideo";
import { Palette, useTheme, useWizardStyles, WizardAccent } from "@/lib/theme";

type VideoEvidenceProps = {
  /** Current video URI for this slot. "" means no video attached yet. */
  value: string;
  /** Called with a new URI to attach/replace, or "" to clear. */
  onChange: (uri: string) => void;
  /** Button label shown in the empty state. */
  label?: string;
};

/**
 * Lets a student attach a video from their gallery as activity evidence, watch
 * it back inline, replace it if it's the wrong clip, or clear it. Controlled:
 * the parent owns the URI string (typically one per trial), this component owns
 * the pick / watch / replace / clear UX. Local-device only — no upload.
 */
export function VideoEvidence({ value, onChange, label = "Upload video" }: VideoEvidenceProps) {
  const styles = useWizardStyles(makeStyles);
  const { palette: c } = useTheme();
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // expo-video creates the player once; keep its source in sync when the parent
  // swaps or clears the video for this slot.
  const player = useVideoPlayer(value || null, (p) => {
    p.loop = false;
    p.timeUpdateEventInterval = 0.1;
  });

  useEventListener(player, "timeUpdate", ({ currentTime }) => {
    setCurrentTime(Number.isFinite(currentTime) ? currentTime : 0);
  });

  useEventListener(player, "playingChange", ({ isPlaying }) => {
    setIsPlaying(isPlaying);
  });

  useEventListener(player, "sourceLoad", ({ duration }) => {
    setDuration(Number.isFinite(duration) ? duration : 0);
  });

  useEventListener(player, "playToEnd", () => {
    setIsPlaying(false);
  });

  useEffect(() => {
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
    // replaceAsync loads the asset off the main thread (replace() is synchronous
    // on iOS and is being deprecated). Swallow rejections — an unreadable URI or
    // a player released on unmount just leaves the player empty.
    player.replaceAsync(value || null).catch(() => {});
  }, [value, player]);

  async function handlePick() {
    const uri = await pickVideoFromLibrary();
    if (uri) onChange(uri);
  }

  function handleClear() {
    Alert.alert("Remove video?", "This will clear the attached video for this trial.", [
      { text: "Cancel", style: "cancel" },
      { text: "Clear", style: "destructive", onPress: () => onChange("") },
    ]);
  }

  function handleResetStopwatch() {
    player.pause();
    player.currentTime = 0;
    setCurrentTime(0);
    setIsPlaying(false);
  }

  if (!value) {
    return (
      <Pressable style={styles.uploadRow} onPress={handlePick}>
        <Ionicons name="videocam" size={18} color={c.primary} />
        <Text style={styles.uploadRowText}>{label}</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.card}>
      <VideoView
        player={player}
        style={styles.video}
        contentFit="contain"
        nativeControls
        allowsFullscreen
      />
      <View style={styles.stopwatchRow}>
        <View style={styles.timePill}>
          <Ionicons name="stopwatch-outline" size={16} color={c.primary} />
          <Text style={styles.timeText}>{formatVideoTime(currentTime)}</Text>
          <Text style={styles.durationText}>/ {formatVideoTime(duration)}</Text>
          <View style={[styles.playStateDot, isPlaying && styles.playStateDotActive]} />
        </View>
        <Pressable style={styles.resetBtn} onPress={handleResetStopwatch}>
          <Ionicons name="refresh" size={16} color={c.primary} />
          <Text style={styles.resetText}>Reset</Text>
        </Pressable>
      </View>
      <View style={styles.actions}>
        <Pressable style={styles.actionBtn} onPress={handlePick}>
          <Ionicons name="swap-horizontal" size={16} color={c.primary} />
          <Text style={styles.actionText}>Replace</Text>
        </Pressable>
        <Pressable style={styles.actionBtn} onPress={handleClear}>
          <Ionicons name="trash-outline" size={16} color={c.error} />
          <Text style={[styles.actionText, styles.clearText]}>Clear</Text>
        </Pressable>
      </View>
    </View>
  );
}

function formatVideoTime(totalSeconds: number) {
  const safeSeconds = Number.isFinite(totalSeconds) ? Math.max(0, totalSeconds) : 0;
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = Math.floor(safeSeconds % 60);
  const tenths = Math.floor((safeSeconds % 1) * 10);
  return `${minutes}:${seconds.toString().padStart(2, "0")}.${tenths}`;
}

const makeStyles = (c: Palette, accent: WizardAccent) =>
  StyleSheet.create({
    uploadRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: c.white,
      borderWidth: 1,
      borderColor: accent.border,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 16,
      marginBottom: 20,
    },
    uploadRowText: { color: c.primary, fontSize: 15, fontWeight: "600" },
    card: {
      backgroundColor: c.white,
      borderWidth: 1,
      borderColor: accent.border,
      borderRadius: 12,
      padding: 12,
      marginBottom: 20,
      gap: 12,
    },
    video: {
      width: "100%",
      aspectRatio: 16 / 9,
      borderRadius: 8,
      backgroundColor: "#000",
    },
    stopwatchRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
    },
    timePill: {
      flex: 1,
      minHeight: 40,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      borderWidth: 1,
      borderColor: accent.border,
      borderRadius: 10,
      paddingHorizontal: 12,
    },
    timeText: { color: c.primary, fontSize: 16, fontWeight: "800", fontVariant: ["tabular-nums"] },
    durationText: { color: c.muted, fontSize: 13, fontWeight: "700", fontVariant: ["tabular-nums"] },
    playStateDot: {
      width: 7,
      height: 7,
      borderRadius: 999,
      backgroundColor: accent.border,
      marginLeft: "auto",
    },
    playStateDotActive: { backgroundColor: c.primary },
    resetBtn: {
      minHeight: 40,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      borderWidth: 1,
      borderColor: accent.border,
      borderRadius: 10,
      paddingHorizontal: 12,
    },
    resetText: { color: c.primary, fontSize: 14, fontWeight: "700" },
    actions: { flexDirection: "row", gap: 12 },
    actionBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      borderWidth: 1,
      borderColor: accent.border,
      borderRadius: 10,
      paddingVertical: 12,
    },
    actionText: { color: c.primary, fontSize: 15, fontWeight: "600" },
    clearText: { color: c.error },
  });
