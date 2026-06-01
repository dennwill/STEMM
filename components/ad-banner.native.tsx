import React from "react";
import { View, ViewStyle, StyleSheet, StyleProp } from "react-native";
import { BannerAd, BannerAdSize, TestIds } from "react-native-google-mobile-ads";

interface AdBannerProps {
  style?: StyleProp<ViewStyle>;
}

function AdBanner({ style }: AdBannerProps) {
  return (
    <View style={[styles.container, style]}>
      <BannerAd
        unitId={TestIds.BANNER}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        onAdFailedToLoad={(error) => {
          console.error("Ad failed to load:", error.message);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    width: "100%",
  },
});

export default AdBanner;
