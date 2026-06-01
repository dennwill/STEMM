import {
  scheduleActivityReminder,
  cancelAllNotifications,
  registerForPushNotifications,
} from "@/lib/notifications";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";

jest.mock("expo-notifications", () => ({
  scheduleNotificationAsync: jest.fn().mockResolvedValue("mock-notification-id"),
  cancelAllScheduledNotificationsAsync: jest.fn().mockResolvedValue(undefined),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  setNotificationHandler: jest.fn(),
  SchedulableTriggerInputTypes: {
    TIME_INTERVAL: "timeInterval",
  },
}));

jest.mock("expo-device", () => ({
  isDevice: true,
}));

jest.mock("expo-constants", () => ({
  __esModule: true,
  default: {
    expoConfig: {
      extra: {
        eas: {
          projectId: "mock-project-id",
        },
      },
    },
  },
}));

describe("Notifications Module", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("scheduleActivityReminder", () => {
    it("schedules a notification with the correct parameters", async () => {
      const activityName = "Breathing Pace Trainer";
      const delayMinutes = 5;

      const id = await scheduleActivityReminder(activityName, delayMinutes);

      expect(id).toBe("mock-notification-id");
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith({
        content: {
          title: "STEMM Reminder",
          body: "Don't forget to complete your Breathing Pace Trainer activity!",
        },
        trigger: {
          type: "timeInterval",
          seconds: delayMinutes * 60,
        },
      });
    });
  });

  describe("cancelAllNotifications", () => {
    it("cancels all scheduled notifications", async () => {
      await cancelAllNotifications();
      expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);
    });
  });

  describe("registerForPushNotifications", () => {
    it("returns null if the app is running on a simulator", async () => {
      const isDevice = jest.replaceProperty(Device, "isDevice", false);
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: "denied" });
      (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({ status: "denied" });

      const token = await registerForPushNotifications();
      expect(token).toBeNull();

      isDevice.restore();
    });

    it("requests and returns push token when permissions are granted", async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: "granted" });
      (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValue({ data: "mock-push-token" });

      const token = await registerForPushNotifications();

      expect(token).toBe("mock-push-token");
      expect(Notifications.getPermissionsAsync).toHaveBeenCalledTimes(1);
      expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalledWith({
        projectId: "mock-project-id",
      });
    });

    it("requests permissions if not already granted and returns token if accepted", async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: "undetermined" });
      (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({ status: "granted" });
      (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValue({ data: "mock-push-token" });

      const token = await registerForPushNotifications();

      expect(token).toBe("mock-push-token");
      expect(Notifications.getPermissionsAsync).toHaveBeenCalledTimes(1);
      expect(Notifications.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    });

    it("returns null if permissions are denied", async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: "undetermined" });
      (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({ status: "denied" });

      const token = await registerForPushNotifications();

      expect(token).toBeNull();
      expect(Notifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
    });
  });
});
