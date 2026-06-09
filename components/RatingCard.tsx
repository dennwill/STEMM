import { StyleSheet, Text, View } from "react-native";

import { StarRating } from "@/components/StarRating";
import { Palette, useWizardStyles, WizardAccent } from "@/lib/theme";

type RatingCardProps = {
  value: number;
  onChange: (value: number) => void;
};

/**
 * The "rate this activity" card shown on every activity's final (Discussion)
 * step. Also reminds students their location is GPS-tagged on finish. Self-
 * contained so it drops into both the engineering wizards and the shared
 * health ActivityShell.
 */
export function RatingCard({ value, onChange }: RatingCardProps) {
  const styles = useWizardStyles(makeStyles);
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Rate this activity</Text>
      <Text style={styles.subtitle}>How much did your team enjoy this challenge?</Text>
      <View style={styles.starsRow}>
        <StarRating value={value} onChange={onChange} />
      </View>
      <Text style={styles.note}>📍 Your location is tagged when you finish.</Text>
    </View>
  );
}

const makeStyles = (c: Palette, ACCENT: WizardAccent) =>
  StyleSheet.create({
    card: {
      backgroundColor: c.white,
      borderRadius: 16,
      padding: 20,
      marginTop: 16,
      boxShadow: "0px 1px 6px rgba(0, 0, 0, 0.05)",
    },
    title: { color: c.primary, fontSize: 18, fontWeight: "800", marginBottom: 4 },
    subtitle: { color: c.inputText, fontSize: 15, lineHeight: 22 },
    starsRow: { marginTop: 14, alignItems: "center" },
    note: {
      color: c.muted,
      fontSize: 13,
      marginTop: 16,
      textAlign: "center",
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: ACCENT.border,
      paddingTop: 14,
    },
  });
