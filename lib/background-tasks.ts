import * as TaskManager from "expo-task-manager";
import * as BackgroundFetch from "expo-background-fetch";

const LEADERBOARD_SYNC_TASK = "leaderboard-sync-task";

TaskManager.defineTask(LEADERBOARD_SYNC_TASK, async () => {
  console.log("Background leaderboard sync executed");
  return BackgroundFetch.BackgroundFetchResult.NewData;
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
