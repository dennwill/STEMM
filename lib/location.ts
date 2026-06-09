import * as Location from "expo-location";

/**
 * Best-effort GPS tag for an activity session. Requests foreground location
 * permission and reads the current coordinates. Returns `null` (never throws)
 * if permission is denied, the platform has no location, or the read fails —
 * so a session can always be finished even without a location fix.
 *
 * Permissions are already declared in app.json (expo-location plugin +
 * ACCESS_FINE/COARSE_LOCATION on Android, auto NSLocation keys on iOS).
 */
export async function captureSessionLocation(): Promise<{ lat: number; lng: number } | null> {
  try {
    const { granted } = await Location.requestForegroundPermissionsAsync();
    if (!granted) return null;

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const { latitude, longitude } = position.coords;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    return { lat: latitude, lng: longitude };
  } catch {
    return null;
  }
}
