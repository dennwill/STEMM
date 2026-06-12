import * as crud from '@/lib/crud';
import type {
  Team,
  TeamMember,
  Activity,
  ChallengeSession,
  ChallengeDataPoint,
  LeaderboardScore,
} from '@/lib/crud';

const expectedFunctions = [
  'createTeam',
  'getTeam',
  'getTeamByDiscriminantId',
  'getAllTeams',
  'updateTeam',
  'deleteTeam',
  'createTeamMember',
  'getTeamMember',
  'getMembersByTeam',
  'updateTeamMember',
  'deleteTeamMember',
  'createActivity',
  'getActivity',
  'getAllActivities',
  'getActivitiesByCategory',
  'updateActivity',
  'deleteActivity',
  'createChallengeSession',
  'getChallengeSession',
  'getSessionsByTeam',
  'getSessionsByActivity',
  'updateChallengeSession',
  'deleteChallengeSession',
  'createDataPoint',
  'getDataPoint',
  'getDataPointsBySession',
  'updateDataPoint',
  'deleteDataPoint',
  'createLeaderboardScore',
  'getLeaderboardScore',
  'getScoreByTeam',
  'getLeaderboard',
  'upsertLeaderboardScore',
  'updateLeaderboardScore',
  'deleteLeaderboardScore',
] as const;

function makeCaseId(label: string) {
  return `${label}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

describe('crud module exports', () => {
  it('exports all expected functions', () => {
    for (const name of expectedFunctions) {
      expect(crud).toHaveProperty(name);
    }
  });

  it.each(expectedFunctions.map((n) => [n]))(
    '%s is a function',
    (name) => {
      expect(typeof (crud as Record<string, unknown>)[name]).toBe('function');
    },
  );

  it('exports Team type (compile-time check)', () => {
    const caseId = makeCaseId('team');
    const team: Team = {
      id: caseId.length,
      discriminant_id: caseId.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6),
      team_name: `Team ${caseId}`,
      grade_level: `${caseId.length % 12 || 12}th Grade`,
      created_at: new Date(2026, 0, caseId.length % 28 || 1).toISOString(),
    };
    expect(team.team_name).toContain(caseId);
    expect(team.discriminant_id).toHaveLength(6);
  });

  it('exports TeamMember type (compile-time check)', () => {
    const caseId = makeCaseId('member');
    const member: TeamMember = {
      id: caseId.length,
      team_id: caseId.length + 1,
      first_name: `Member ${caseId}`,
    };
    expect(member.first_name).toContain(caseId);
  });

  it('exports Activity type (compile-time check)', () => {
    const caseId = makeCaseId('activity');
    const activity: Activity = {
      id: caseId.length,
      category: `science-${caseId}`,
      challenge_name: `Challenge ${caseId}`,
      description: `Dynamic activity description ${caseId}`,
    };
    expect(activity.category).toContain(caseId);
    expect(activity.description).toContain(caseId);
  });

  it('exports ChallengeSession type (compile-time check)', () => {
    const caseId = makeCaseId('session');
    const session: ChallengeSession = {
      id: caseId.length,
      team_id: caseId.length + 1,
      activity_id: caseId.length + 2,
      prediction_text: `Prediction ${caseId}`,
      discussion_reflection: `Reflection ${caseId}`,
      rating: (caseId.length % 5) + 1,
      gps_lat: -37.8136,
      gps_lng: 144.9631,
      completed_at: new Date(2026, 0, caseId.length % 28 || 1).toISOString(),
    };
    expect(session.prediction_text).toContain(caseId);
    expect(session.rating).toBeGreaterThanOrEqual(1);
  });

  it('exports ChallengeDataPoint type (compile-time check)', () => {
    const caseId = makeCaseId('point');
    const dp: ChallengeDataPoint = {
      id: caseId.length,
      session_id: caseId.length + 1,
      attempt_number: (caseId.length % 3) + 1,
      action_or_design: `Design ${caseId}`,
      prediction_value: `${caseId.length} predicted units`,
      outcome_value: `${caseId.length + 10} outcome units`,
      prediction_correct: caseId.length % 2 === 0,
      media_file_path: `file:///tmp/${caseId}.mp4`,
    };
    expect(dp.action_or_design).toContain(caseId);
    expect(dp.media_file_path).toContain(caseId);
  });

  it('exports LeaderboardScore type (compile-time check)', () => {
    const caseId = makeCaseId('score');
    const score: LeaderboardScore = {
      id: caseId.length,
      team_id: caseId.length + 1,
      score: caseId.length * 100,
      last_updated: new Date(2026, 0, caseId.length % 28 || 1).toISOString(),
    };
    expect(score.score).toBeGreaterThan(0);
  });
});
