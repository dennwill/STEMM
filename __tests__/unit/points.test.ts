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
    const transaction = {
      get: jest.fn(async (ref: { path: string }) => {
        if (ref.path === "users/user-1") return snap({ team_id: "TEAM1" });
        if (ref.path === "point_awards/TEAM1_reaction") return snap(undefined, false);
        return snap(undefined, false);
      }),
      set: jest.fn(),
      update: jest.fn(),
    };
    mockRunTransaction.mockImplementation(async (_firestore, callback) => callback(transaction));

    const result = await awardActivityCompletionPoints("reaction", "Reaction Board Challenge");

    expect(result).toEqual({ awarded: true, points: 100, teamId: "TEAM1" });
    expect(mockDoc).toHaveBeenCalledWith(expect.anything(), "users", "user-1");
    expect(mockDoc).toHaveBeenCalledWith(expect.anything(), "point_awards", "TEAM1_reaction");
    expect(mockDoc).toHaveBeenCalledWith(expect.anything(), "teams", "TEAM1");
    expect(transaction.set).toHaveBeenCalledWith(
      { path: "point_awards/TEAM1_reaction" },
      expect.objectContaining({
        team_id: "TEAM1",
        user_uid: "user-1",
        activity_id: "reaction",
        activity_title: "Reaction Board Challenge",
        points: 100,
        validation_version: 1,
      }),
    );
    expect(transaction.update).toHaveBeenCalledWith(
      { path: "teams/TEAM1" },
      {
        score: { __increment: 100 },
        last_score_update: "server-timestamp",
      },
    );
    expect(mockIncrement).toHaveBeenCalledWith(100);
    expect(mockServerTimestamp).toHaveBeenCalled();
  });

  it("does not double-award an activity already completed by the team", async () => {
    const transaction = {
      get: jest.fn(async (ref: { path: string }) => {
        if (ref.path === "users/user-1") return snap({ team_id: "TEAM1" });
        if (ref.path === "point_awards/TEAM1_reaction") return snap({ points: 100 }, true);
        return snap(undefined, false);
      }),
      set: jest.fn(),
      update: jest.fn(),
    };
    mockRunTransaction.mockImplementation(async (_firestore, callback) => callback(transaction));

    const result = await awardActivityCompletionPoints("reaction", "Reaction Board Challenge");

    expect(result).toEqual({
      awarded: false,
      points: 100,
      teamId: "TEAM1",
      reason: "already-awarded",
    });
    expect(transaction.set).not.toHaveBeenCalled();
    expect(transaction.update).not.toHaveBeenCalled();
  });

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
