import {
  awardActivityCompletionPoints,
  formatAwardPointsMessage,
  getActivityPoints,
} from "@/lib/points";
import { auth } from "@/lib/firebase";
import { doc, increment, runTransaction, serverTimestamp } from "firebase/firestore";

jest.mock("@/lib/firebase", () => ({
  auth: { currentUser: { uid: "user-1" } },
  firestore: { app: "mock-firestore" },
}));

jest.mock("firebase/firestore", () => ({
  doc: jest.fn((_: unknown, collection: string, id: string) => ({ path: `${collection}/${id}` })),
  increment: jest.fn((value: number) => ({ __increment: value })),
  runTransaction: jest.fn(),
  serverTimestamp: jest.fn(() => "server-timestamp"),
}));

type MockSnap = {
  exists: () => boolean;
  data: () => Record<string, unknown> | undefined;
};

function snap(data: Record<string, unknown> | undefined, exists = true): MockSnap {
  return {
    exists: () => exists,
    data: () => data,
  };
}

function makePointCase(activityId = "reaction") {
  const suffix = `${activityId}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  return {
    userId: `user-${suffix}`,
    teamId: `TEAM-${suffix.toUpperCase()}`,
    activityId,
    title: `${activityId} title ${suffix}`,
    awardKey: `TEAM-${suffix.toUpperCase()}_${activityId}`,
  };
}

describe("points scoring", () => {
  const mockRunTransaction = runTransaction as jest.Mock;
  const mockDoc = doc as jest.Mock;
  const mockIncrement = increment as jest.Mock;
  const mockServerTimestamp = serverTimestamp as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    (auth as any).currentUser = { uid: "user-1" };
  });

  it("uses 100 points as the activity completion score", () => {
    expect(getActivityPoints("reaction")).toBe(100);
    expect(getActivityPoints("unknown-activity")).toBe(100);
  });

  it("awards points once by writing an award log and incrementing team score", async () => {
    const data = makePointCase("reaction");
    (auth as any).currentUser = { uid: data.userId };
    const transaction = {
      get: jest.fn(async (ref: { path: string }) => {
        if (ref.path === `users/${data.userId}`) return snap({ team_id: data.teamId });
        if (ref.path === `point_awards/${data.awardKey}`) return snap(undefined, false);
        return snap(undefined, false);
      }),
      set: jest.fn(),
      update: jest.fn(),
    };
    mockRunTransaction.mockImplementation(async (_firestore, callback) => callback(transaction));

    const result = await awardActivityCompletionPoints(data.activityId, data.title);

    expect(result).toEqual({ awarded: true, points: 100, teamId: data.teamId });
    expect(mockDoc).toHaveBeenCalledWith(expect.anything(), "users", data.userId);
    expect(mockDoc).toHaveBeenCalledWith(expect.anything(), "point_awards", data.awardKey);
    expect(mockDoc).toHaveBeenCalledWith(expect.anything(), "teams", data.teamId);
    expect(transaction.set).toHaveBeenCalledWith(
      { path: `point_awards/${data.awardKey}` },
      expect.objectContaining({
        team_id: data.teamId,
        user_uid: data.userId,
        activity_id: data.activityId,
        activity_title: data.title,
        points: 100,
        validation_version: 1,
      }),
    );
    expect(transaction.update).toHaveBeenCalledWith(
      { path: `teams/${data.teamId}` },
      {
        score: { __increment: 100 },
        last_score_update: "server-timestamp",
      },
    );
    expect(mockIncrement).toHaveBeenCalledWith(100);
    expect(mockServerTimestamp).toHaveBeenCalled();
  });

  it("does not double-award an activity already completed by the team", async () => {
    const data = makePointCase("sound");
    (auth as any).currentUser = { uid: data.userId };
    const transaction = {
      get: jest.fn(async (ref: { path: string }) => {
        if (ref.path === `users/${data.userId}`) return snap({ team_id: data.teamId });
        if (ref.path === `point_awards/${data.awardKey}`) return snap({ points: 100 }, true);
        return snap(undefined, false);
      }),
      set: jest.fn(),
      update: jest.fn(),
    };
    mockRunTransaction.mockImplementation(async (_firestore, callback) => callback(transaction));

    const result = await awardActivityCompletionPoints(data.activityId, data.title);

    expect(result).toEqual({
      awarded: false,
      points: 100,
      teamId: data.teamId,
      reason: "already-awarded",
    });
    expect(transaction.set).not.toHaveBeenCalled();
    expect(transaction.update).not.toHaveBeenCalled();
  });

  it.each(["parachute", "sound", "fan", "earthquake", "performance", "reaction", "breathing"])(
    "uses the standard dynamic completion score for %s",
    (activityId) => {
      expect(getActivityPoints(activityId)).toBe(100);
    },
  );

  it("returns no-team when the signed-in user has not joined a team", async () => {
    const transaction = {
      get: jest.fn(async () => snap({ team_id: null })),
      set: jest.fn(),
      update: jest.fn(),
    };
    mockRunTransaction.mockImplementation(async (_firestore, callback) => callback(transaction));

    const result = await awardActivityCompletionPoints("reaction", "Reaction Board Challenge");

    expect(result).toEqual({ awarded: false, points: 100, reason: "no-team" });
    expect(transaction.set).not.toHaveBeenCalled();
    expect(transaction.update).not.toHaveBeenCalled();
  });

  it("returns no-user when no one is signed in", async () => {
    (auth as any).currentUser = null;

    const result = await awardActivityCompletionPoints("reaction", "Reaction Board Challenge");

    expect(result).toEqual({ awarded: false, points: 0, reason: "no-user" });
    expect(mockRunTransaction).not.toHaveBeenCalled();
  });

  it("formats point award messages for the UI", () => {
    expect(formatAwardPointsMessage({ awarded: true, points: 100 })).toBe(
      "Your team earned 100 pts.",
    );
    expect(
      formatAwardPointsMessage({ awarded: false, points: 100, reason: "already-awarded" }),
    ).toBe("This activity was already counted for your team. No extra points added.");
  });
});
