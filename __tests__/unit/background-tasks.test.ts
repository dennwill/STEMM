/**
 * Unit test for the background-tasks module.
 *
 * Verifies that the background sync task is properly defined with
 * expo-task-manager, that registration/unregistration work correctly,
 * and that the task handles Firestore fetch operations.
 */

// -- Firestore mocks --
const mockGetDocs = jest.fn();
const mockCollection = jest.fn().mockReturnValue("teams-ref");

jest.mock("firebase/firestore", () => ({
  getFirestore: jest.fn(() => ({})),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  collection: (...args: unknown[]) => mockCollection(...args),
}));

jest.mock("firebase/app", () => ({
  initializeApp: jest.fn(() => ({ name: "[DEFAULT]" })),
}));

jest.mock("firebase/auth", () => ({
  getAuth: jest.fn(() => ({ currentUser: null })),
}));

jest.mock("firebase/analytics", () => ({
  isSupported: jest.fn().mockResolvedValue(false),
  getAnalytics: jest.fn(),
  logEvent: jest.fn(),
}));

// -- Expo mocks --
jest.mock("expo-task-manager", () => {
  const tasks: Record<string, (...args: unknown[]) => unknown> = {};
  return {
    defineTask: jest.fn((name: string, fn: (...args: unknown[]) => unknown) => {
      tasks[name] = fn;
    }),
    unregisterTaskAsync: jest.fn().mockResolvedValue(undefined),
    isTaskRegisteredAsync: jest.fn().mockResolvedValue(false),
    // expose captured tasks for testing
    __tasks: tasks,
  };
});

jest.mock("expo-background-fetch", () => ({
  registerTaskAsync: jest.fn().mockResolvedValue(undefined),
  BackgroundFetchResult: {
    NewData: 1,
    NoData: 2,
    Failed: 3,
  },
}));

// Import AFTER mocks
import * as TaskManager from "expo-task-manager";
import * as BackgroundFetch from "expo-background-fetch";
import * as backgroundTasks from "@/lib/background-tasks";

// Access the captured task function
const tasks = (TaskManager as unknown as { __tasks: Record<string, (...args: unknown[]) => Promise<number>> }).__tasks;

describe("background-tasks module", () => {
  it("defines a task named 'leaderboard-sync-task'", () => {
    expect(TaskManager.defineTask).toHaveBeenCalledWith(
      "leaderboard-sync-task",
      expect.any(Function),
    );
    expect(tasks["leaderboard-sync-task"]).toBeDefined();
  });

  it("registerBackgroundSync calls registerTaskAsync with correct options", async () => {
    await backgroundTasks.registerBackgroundSync();

    expect(BackgroundFetch.registerTaskAsync).toHaveBeenCalledWith(
      "leaderboard-sync-task",
      expect.objectContaining({
        minimumInterval: 15 * 60,
        stopOnTerminate: false,
        startOnBoot: true,
      }),
    );
  });

  it("unregisterBackgroundSync calls unregisterTaskAsync", async () => {
    await backgroundTasks.unregisterBackgroundSync();

    expect(TaskManager.unregisterTaskAsync).toHaveBeenCalledWith("leaderboard-sync-task");
  });

  it("checkBackgroundSyncStatus returns true when task is registered", async () => {
    (TaskManager.isTaskRegisteredAsync as jest.Mock).mockResolvedValue(true);

    const result = await backgroundTasks.checkBackgroundSyncStatus();

    expect(result).toBe(true);
    expect(TaskManager.isTaskRegisteredAsync).toHaveBeenCalledWith("leaderboard-sync-task");
  });

  it("checkBackgroundSyncStatus returns false when task is not registered", async () => {
    (TaskManager.isTaskRegisteredAsync as jest.Mock).mockResolvedValue(false);

    const result = await backgroundTasks.checkBackgroundSyncStatus();

    expect(result).toBe(false);
  });
});

describe("background task execution", () => {
  const taskFn = () => tasks["leaderboard-sync-task"]();

  beforeEach(() => {
    mockGetDocs.mockReset();
    mockCollection.mockReset().mockReturnValue("teams-ref");
  });

  it("returns NewData (1) when Firestore fetch succeeds", async () => {
    mockGetDocs.mockResolvedValue({ size: 5 });

    const result = await taskFn();

    expect(result).toBe(1); // BackgroundFetchResult.NewData
    expect(mockGetDocs).toHaveBeenCalled();
  });

  it("returns Failed (3) when Firestore fetch throws a network error", async () => {
    mockGetDocs.mockRejectedValue(new Error("Network error"));

    const result = await taskFn();

    expect(result).toBe(3); // BackgroundFetchResult.Failed
  });

  it("returns Failed (3) when Firestore fetch throws a permission error", async () => {
    mockGetDocs.mockRejectedValue(new Error("permission-denied"));

    const result = await taskFn();

    expect(result).toBe(3); // BackgroundFetchResult.Failed
  });
});
