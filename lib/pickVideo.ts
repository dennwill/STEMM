import * as ImagePicker from "expo-image-picker";
import { Alert } from "react-native";

/**
 * Opens the device gallery so the student can attach a video as evidence.
 * Requests media-library permission first, then launches the picker limited to
 * videos. Returns the picked asset's local URI, or `null` if permission was
 * denied or the picker was cancelled.
 *
 * Shared by the `VideoEvidence` component and any screen that needs the same
 * "pick a video" behavior, so the permission + picker config stays in one place.
 */
export async function pickVideoFromLibrary(): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    Alert.alert("Photos access needed", "Allow access to your photos to attach a video.");
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["videos"],
    quality: 1,
  });
  if (result.canceled || result.assets.length === 0) {
    return null;
  }
  return result.assets[0].uri;
}
