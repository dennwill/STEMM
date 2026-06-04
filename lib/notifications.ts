import Constants from "expo-constants";
import * as Device from "expo-device";

// Remote (push) notifications were removed from Expo Go in SDK 53.
// Detect Expo Go so we can skip push registration there and avoid running
// expo-notifications' push auto-registration side-effects at app launch.
const isExpoGo = Constants.executionEnvironment === "storeClient";

// Lazy-load expo-notifications only when a notification API is actually used,
// so its side-effect modules don't execute (and warn) on app startup.
function getNotifications() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("expo-notifications") as typeof import("expo-notifications");
}

export async function registerForPushNotifications(): Promise<string | null> {
  if (isExpoGo) {
    // Expected in Expo Go — push notifications need a development build.
    // Return silently so the console stays clean; local reminders still work
    // in a dev/production build.
    return null;
  }

  if (!Device.isDevice) {
    console.warn("Push notifications require a physical device");
    return null;
  }

  const Notifications = getNotifications();

  const { status: existingStatus } =
    await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.warn("Notification permission not granted");
    return null;
  }

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId,
  });

  return tokenData.data;
}

export async function scheduleActivityReminder(
  activityName: string,
  delayMinutes: number
): Promise<string | null> {
  // Requiring expo-notifications in Expo Go runs its push auto-registration
  // side-effect module, which warns that remote notifications were removed in
  // SDK 53. Skip here so the warning never fires; local reminders still work in
  // a development/production build.
  if (isExpoGo) {
    return null;
  }

  const Notifications = getNotifications();
  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: "STEMM Reminder",
      body: `Don't forget to complete your ${activityName} activity!`,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: delayMinutes * 60,
    },
  });

  return identifier;
}

export async function cancelAllNotifications(): Promise<void> {
  if (isExpoGo) {
    return;
  }

  const Notifications = getNotifications();
  await Notifications.cancelAllScheduledNotificationsAsync();
}
