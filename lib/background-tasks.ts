import * as TaskManager from "expo-task-manager";
import * as BackgroundTask from "expo-background-task";
import Constants from "expo-constants";
import { collection, getDocs } from "firebase/firestore";
import { firestore } from "./firebase";

const LEADERBOARD_SYNC_TASK = "leaderboard-sync-task";

// Background tasks require a development/production build — they are not
// available in Expo Go. Detect Expo Go so registration is skipped there and
// the "not available in Expo Go" runtime notice never fires.
const isExpoGo = Constants.executionEnvironment === "storeClient";

TaskManager.defineTask(LEADERBOARD_SYNC_TASK, async () => {
  try {
    // Fetch the latest leaderboard data from Firestore in the background
    const snapshot = await getDocs(collection(firestore, "teams"));
    console.log(`Background sync: fetched ${snapshot.size} teams from Firestore`);
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch (error) {
    console.error("Background sync failed:", error);
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

export async function registerBackgroundSync(): Promise<void> {
  if (isExpoGo) {
    return;
  }

  // minimumInterval is expressed in minutes for expo-background-task.
  await BackgroundTask.registerTaskAsync(LEADERBOARD_SYNC_TASK, {
    minimumInterval: 15,
  });
}

export async function unregisterBackgroundSync(): Promise<void> {
  await BackgroundTask.unregisterTaskAsync(LEADERBOARD_SYNC_TASK);
}

export async function checkBackgroundSyncStatus(): Promise<boolean> {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(
    LEADERBOARD_SYNC_TASK
  );
  return isRegistered;
}
