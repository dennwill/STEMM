import React from "react";
import { View, ViewStyle, StyleSheet, StyleProp, Text } from "react-native";

interface AdBannerProps {
  style?: StyleProp<ViewStyle>;
}

function AdBanner({ style }: AdBannerProps) {
  return (
    <View style={[styles.container, styles.webPlaceholder, style]}>
      <Text style={styles.webText}>Test ad banner</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    width: "100%",
  },
  webPlaceholder: {
    backgroundColor: "#EEF2F4",
    borderRadius: 12,
    paddingVertical: 12,
  },
  webText: {
    color: "#60717A",
    fontSize: 13,
    fontWeight: "700",
  },
});

export default AdBanner;
