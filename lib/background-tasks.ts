import * as TaskManager from "expo-task-manager";
import * as BackgroundFetch from "expo-background-fetch";
import { collection, getDocs } from "firebase/firestore";
import { firestore } from "./firebase";

const LEADERBOARD_SYNC_TASK = "leaderboard-sync-task";

TaskManager.defineTask(LEADERBOARD_SYNC_TASK, async () => {
  try {
    // Fetch the latest leaderboard data from Firestore in the background
    const snapshot = await getDocs(collection(firestore, "teams"));
    console.log(`Background sync: fetched ${snapshot.size} teams from Firestore`);
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error("Background sync failed:", error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export async function registerBackgroundSync(): Promise<void> {
  await BackgroundFetch.registerTaskAsync(LEADERBOARD_SYNC_TASK, {
    minimumInterval: 15 * 60,
    stopOnTerminate: false,
    startOnBoot: true,
  });
}

export async function unregisterBackgroundSync(): Promise<void> {
  await TaskManager.unregisterTaskAsync(LEADERBOARD_SYNC_TASK);
}

export async function checkBackgroundSyncStatus(): Promise<boolean> {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(
    LEADERBOARD_SYNC_TASK
  );
  return isRegistered;
}
