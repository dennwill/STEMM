import React from "react";
import { View, ViewStyle, StyleSheet, StyleProp, Text, NativeModules } from "react-native";

import { COLORS } from "./auth-shell";

// Check if the native Google Mobile Ads module is present in the current native binary
const hasAdsModule = !!NativeModules.RNGoogleMobileAdsModule || !!NativeModules.RNGoogleMobileAdsInitProvider;

let BannerAd: any = null;
let BannerAdSize: any = null;
let TestIds: any = null;

if (hasAdsModule) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ads = require("react-native-google-mobile-ads");
    BannerAd = ads.BannerAd;
    BannerAdSize = ads.BannerAdSize;
    TestIds = ads.TestIds;
  } catch (err) {
    console.log("Could not load react-native-google-mobile-ads:", err);
  }
}

interface AdBannerProps {
  style?: StyleProp<ViewStyle>;
}

function AdBanner({ style }: AdBannerProps) {
  if (hasAdsModule && BannerAd && TestIds && BannerAdSize) {
    return (
      <View style={[styles.container, style]}>
        <BannerAd
          unitId={TestIds.BANNER}
          size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
          onAdFailedToLoad={(error: any) => {
            console.error("Ad failed to load:", error.message);
          }}
        />
      </View>
    );
  }

  // Beautiful Mockup Banner Ad (fallback for Expo Go)
  return (
    <View style={[styles.container, styles.mockContainer, style]}>
      <Text style={styles.mockBadge}>SPONSOR</Text>
      <View style={styles.mockContent}>
        <Text style={styles.mockTitle}>Support STEMM Education Labs 🌟</Text>
        <Text style={styles.mockSubtext}>Tap to learn more about our partner science programs</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    width: "100%",
  },
  mockContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1.5,
    borderColor: "rgba(7, 76, 92, 0.08)",
    boxShadow: "0px 4px 12px rgba(7, 76, 92, 0.04)",
  },
  mockBadge: {
    fontSize: 10,
    fontWeight: "800",
    color: COLORS.primary,
    backgroundColor: "rgba(7, 76, 92, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    overflow: "hidden",
  },
  mockContent: {
    flex: 1,
  },
  mockTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.primary,
  },
  mockSubtext: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 2,
    fontWeight: "500",
  },
});

export default AdBanner;
