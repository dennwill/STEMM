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
    const team: Team = {
      id: 1,
      discriminant_id: 'ABC123',
      team_name: 'Test',
      grade_level: '5',
      created_at: '2026-01-01',
    };
    expect(team.id).toBe(1);
  });

  it('exports TeamMember type (compile-time check)', () => {
    const member: TeamMember = {
      id: 1,
      team_id: 1,
      first_name: 'Alice',
    };
    expect(member.first_name).toBe('Alice');
  });

  it('exports Activity type (compile-time check)', () => {
    const activity: Activity = {
      id: 1,
      category: 'science',
      challenge_name: 'Volcano',
      description: null,
    };
    expect(activity.category).toBe('science');
  });

  it('exports ChallengeSession type (compile-time check)', () => {
    const session: ChallengeSession = {
      id: 1,
      team_id: 1,
      activity_id: 1,
      prediction_text: null,
      discussion_reflection: null,
      rating: null,
      gps_lat: null,
      gps_lng: null,
      completed_at: '2026-01-01',
    };
    expect(session.id).toBe(1);
  });

  it('exports ChallengeDataPoint type (compile-time check)', () => {
    const dp: ChallengeDataPoint = {
      id: 1,
      session_id: 1,
      attempt_number: 1,
      action_or_design: null,
      prediction_value: null,
      outcome_value: null,
      prediction_correct: null,
      media_file_path: null,
    };
    expect(dp.session_id).toBe(1);
  });

  it('exports LeaderboardScore type (compile-time check)', () => {
    const score: LeaderboardScore = {
      id: 1,
      team_id: 1,
      score: 100,
      last_updated: '2026-01-01',
    };
    expect(score.score).toBe(100);
  });
});
