import { Ionicons } from "@expo/vector-icons";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEffect } from "react";
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

  // expo-video creates the player once; keep its source in sync when the parent
  // swaps or clears the video for this slot.
  const player = useVideoPlayer(value || null, (p) => {
    p.loop = false;
  });
  useEffect(() => {
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
