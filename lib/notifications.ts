import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.warn("Push notifications require a physical device");
    return null;
  }

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
): Promise<string> {
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
  await Notifications.cancelAllScheduledNotificationsAsync();
}
