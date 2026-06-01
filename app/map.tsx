import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type * as ReactNativeMaps from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";

import { COLORS } from "@/components/auth-shell";

type LocationData = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
};

const NativeMaps =
  Platform.OS === "web"
    ? null
    : (eval("require")("react-native-maps") as typeof ReactNativeMaps);

export default function MapScreen() {
  const router = useRouter();

  const [location, setLocation] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);

  useEffect(() => {
    fetchLocation();
  }, []);

  async function fetchLocation() {
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setPermissionDenied(true);
        setLoading(false);
        return;
      }

      setPermissionDenied(false);
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setLocation({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      });
    } catch {
      setPermissionDenied(false);
      setLocation(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={26} color={COLORS.white} />
        </Pressable>
        <Text style={styles.logo}>STEMM</Text>
        <View style={{ width: 26 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={COLORS.primary} size="large" />
          <Text style={styles.loadingText}>Getting your location…</Text>
        </View>
      ) : permissionDenied ? (
        <View style={styles.centered}>
          <Ionicons name="location" size={64} color={COLORS.muted} />
          <Text style={styles.deniedTitle}>Location Access Denied</Text>
          <Text style={styles.deniedBody}>
            Please enable location permissions in your device settings to use
            the Activity Map.
          </Text>
        </View>
      ) : location && NativeMaps ? (
        <View style={styles.mapContainer}>
          <NativeMaps.default
            style={styles.map}
            initialRegion={{
              latitude: location.latitude,
              longitude: location.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
            showsUserLocation
          >
            <NativeMaps.Marker
              coordinate={{
                latitude: location.latitude,
                longitude: location.longitude,
              }}
              title="You are here"
            />
          </NativeMaps.default>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Current Location</Text>

            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>Latitude</Text>
              <Text style={styles.cardValue}>
                {location.latitude.toFixed(6)}
              </Text>
            </View>

            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>Longitude</Text>
              <Text style={styles.cardValue}>
                {location.longitude.toFixed(6)}
              </Text>
            </View>

            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>Accuracy</Text>
              <Text style={styles.cardValue}>
                {location.accuracy != null
                  ? `± ${location.accuracy.toFixed(1)} m`
                  : "N/A"}
              </Text>
            </View>

            <Pressable style={styles.refreshBtn} onPress={fetchLocation}>
              <Ionicons name="refresh" size={20} color={COLORS.white} />
              <Text style={styles.refreshText}>Refresh Location</Text>
            </Pressable>
          </View>
        </View>
      ) : location ? (
        <View style={styles.mapContainer}>
          <View style={styles.webMap}>
            <Ionicons name="map" size={56} color={COLORS.primary} />
            <Text style={styles.cardTitle}>Activity Map</Text>
            <Text style={styles.deniedBody}>
              Native map rendering is available on iOS and Android. Web preview shows location
              values for testing.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Current Location</Text>
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>Latitude</Text>
              <Text style={styles.cardValue}>{location.latitude.toFixed(6)}</Text>
            </View>
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>Longitude</Text>
              <Text style={styles.cardValue}>{location.longitude.toFixed(6)}</Text>
            </View>
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>Accuracy</Text>
              <Text style={styles.cardValue}>
                {location.accuracy != null ? `± ${location.accuracy.toFixed(1)} m` : "N/A"}
              </Text>
            </View>

            <Pressable style={styles.refreshBtn} onPress={fetchLocation}>
              <Ionicons name="refresh" size={20} color={COLORS.white} />
              <Text style={styles.refreshText}>Refresh Location</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={styles.centered}>
          <Text style={styles.deniedBody}>
            Unable to determine your location. Please try again.
          </Text>
          <Pressable style={styles.refreshBtn} onPress={fetchLocation}>
            <Ionicons name="refresh" size={20} color={COLORS.white} />
            <Text style={styles.refreshText}>Retry</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 28,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logo: {
    color: COLORS.white,
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: -1,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 12,
  },
  loadingText: { color: COLORS.muted, fontSize: 15, marginTop: 8 },
  deniedTitle: {
    color: COLORS.inputText,
    fontSize: 20,
    fontWeight: "700",
    marginTop: 8,
  },
  deniedBody: {
    color: COLORS.muted,
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
  mapContainer: { flex: 1 },
  map: { flex: 1 },
  webMap: {
    flex: 1,
    minHeight: 280,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 10,
  },
  card: {
    position: "absolute",
    bottom: 24,
    left: 20,
    right: 20,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
    gap: 10,
  },
  cardTitle: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 4,
  },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardLabel: { color: COLORS.muted, fontSize: 14 },
  cardValue: { color: COLORS.inputText, fontSize: 14, fontWeight: "600" },
  refreshBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 6,
  },
  refreshText: { color: COLORS.white, fontSize: 16, fontWeight: "700" },
});
