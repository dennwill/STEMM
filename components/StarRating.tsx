import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";

import { useTheme } from "@/lib/theme";

type StarRatingProps = {
  /** Current rating 0..max. 0 means "not rated yet". */
  value: number;
  onChange: (value: number) => void;
  max?: number;
  size?: number;
};

/** A simple controlled row of tappable stars. Tapping the active star clears it. */
export function StarRating({ value, onChange, max = 5, size = 36 }: StarRatingProps) {
  const { palette: c } = useTheme();
  return (
    <View style={styles.row}>
      {Array.from({ length: max }).map((_, i) => {
        const position = i + 1;
        const filled = position <= value;
        return (
          <Pressable
            key={position}
            hitSlop={6}
            onPress={() => onChange(value === position ? 0 : position)}
            accessibilityRole="button"
            accessibilityLabel={`Rate ${position} of ${max}`}
          >
            <Ionicons
              name={filled ? "star" : "star-outline"}
              size={size}
              color={filled ? c.primary : c.muted}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 10 },
});
