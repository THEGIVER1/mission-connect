import {
  WORKSHOP_TEAMS,
  PEOPLE_QUEST_POINTS_PER_MEMBER,
  PRE_REGISTERED_PARTICIPANTS,
} from '../config/workshopConfig';
import type { Team } from '../types';

export interface IndividualItem {
  id: string;
  name: string;
  team: string;
  teamId: string;
  company: string;
  pts: number;
  missions: number;
  emoji: string;
  rank: number;
}

export interface CurrentUserContext {
  name: string | null;
  company: string | null;
  teamId: string | null;
  answeredQuizIds?: string[];
  isPeopleQuestSubmitted?: boolean;
}

const EMOJIS = ['🔥', '💡', '🤝', '⚖️', '🏆', '🌟', '💪', '🎯'];

/**
 * Calculates unified Leaderboard and Dashboard scores across all 50 pre-registered
 * participants and 6 teams with 100% mathematical consistency.
 *
 * Rules:
 * 1. People Quest: Team-wide activity. When submitted, EVERY member in that team receives +100pt.
 * 2. Discovery Quiz: Individual activity. Each correct answer gives that individual +100pt.
 * 3. Team Score: Sum of individual scores of all members in that team.
 */
export function calculateLeaderboardData(
  participantsData: Record<string, any> = {},
  peopleQuestsData: Record<string, any> = {},
  currentUser?: CurrentUserContext
): {
  individuals: IndividualItem[];
  teams: Team[];
} {
  const listMap = new Map<string, IndividualItem>();
  const myTeamId = currentUser?.teamId;
  const isMyTeamPqSubmitted = currentUser?.isPeopleQuestSubmitted;

  // 1. Initialize all 50 pre-registered participants
  PRE_REGISTERED_PARTICIPANTS.forEach((p, i) => {
    const isTeamPqDone =
      peopleQuestsData[p.teamId]?.status === 'submitted' ||
      (p.teamId === myTeamId && !!isMyTeamPqSubmitted);

    const basePqPoints = isTeamPqDone ? PEOPLE_QUEST_POINTS_PER_MEMBER : 0;
    const basePqMissions = isTeamPqDone ? 1 : 0;

    listMap.set(p.name.trim(), {
      id: p.id,
      name: p.name.trim(),
      team: p.teamName,
      teamId: p.teamId,
      company: p.company,
      pts: basePqPoints,
      missions: basePqMissions,
      emoji: EMOJIS[i % EMOJIS.length],
      rank: 1,
    });
  });

  // 2. Merge RTDB participant responses (quiz results, profile updates)
  Object.values(participantsData).forEach((p: any) => {
    if (!p?.name) return;
    const trimmedName = p.name.trim();
    const existing = listMap.get(trimmedName) || {
      id: p.id || trimmedName,
      name: trimmedName,
      team: p.teamName || '1조',
      teamId: p.teamId || 'team1',
      company: p.company || '',
      pts: 0,
      missions: 0,
      emoji: '🌟',
      rank: 1,
    };

    let quizPoints = 0;
    let quizMissions = 0;
    if (p.quizzes && typeof p.quizzes === 'object') {
      Object.values(p.quizzes).forEach((q: any) => {
        if (q.pointsEarned) quizPoints += Number(q.pointsEarned);
        if (q.isCorrect || q.pointsEarned !== undefined) quizMissions += 1;
      });
    }

    const targetTeamId = p.teamId || existing.teamId;
    const isTeamPqDone =
      peopleQuestsData[targetTeamId]?.status === 'submitted' ||
      p.peopleQuestCompleted ||
      (targetTeamId === myTeamId && !!isMyTeamPqSubmitted);

    const pqPoints = isTeamPqDone ? PEOPLE_QUEST_POINTS_PER_MEMBER : 0;
    const pqMissions = isTeamPqDone ? 1 : 0;

    const totalPts = Math.max(Number(p.score ?? 0), quizPoints + pqPoints);
    const totalMissions = Math.max(Number(p.missionsCompleted ?? 0), quizMissions + pqMissions);

    listMap.set(trimmedName, {
      ...existing,
      team: p.teamName || existing.team,
      teamId: targetTeamId,
      company: p.company || existing.company,
      pts: totalPts,
      missions: totalMissions,
    });
  });

  // 3. Optimistic local state override for the currently logged-in participant
  if (currentUser?.name) {
    const myTrimmedName = currentUser.name.trim();
    const myExisting = listMap.get(myTrimmedName) || {
      id: myTrimmedName,
      name: myTrimmedName,
      team: myTeamId ? (WORKSHOP_TEAMS.find(t => t.id === myTeamId)?.name ?? '1조') : '1조',
      teamId: myTeamId ?? 'team1',
      company: currentUser.company ?? '',
      pts: 0,
      missions: 0,
      emoji: '🔥',
      rank: 1,
    };

    const isMyTeamPqDone =
      (myTeamId && peopleQuestsData[myTeamId]?.status === 'submitted') ||
      !!isMyTeamPqSubmitted;

    const myLocalQuizPts = (currentUser.answeredQuizIds?.length ?? 0) * 100;
    const myLocalPqPts = isMyTeamPqDone ? PEOPLE_QUEST_POINTS_PER_MEMBER : 0;
    const myCalculatedTotal = myLocalQuizPts + myLocalPqPts;
    const myCalculatedMissions = (currentUser.answeredQuizIds?.length ?? 0) + (isMyTeamPqDone ? 1 : 0);

    listMap.set(myTrimmedName, {
      ...myExisting,
      team: myTeamId ? (WORKSHOP_TEAMS.find(t => t.id === myTeamId)?.name ?? myExisting.team) : myExisting.team,
      teamId: myTeamId ?? myExisting.teamId,
      company: currentUser.company ?? myExisting.company,
      pts: Math.max(myExisting.pts, myCalculatedTotal),
      missions: Math.max(myExisting.missions, myCalculatedMissions),
    });
  }

  // 4. Rank individuals
  const individuals = Array.from(listMap.values())
    .sort((a, b) => b.pts - a.pts || a.name.localeCompare(b.name))
    .map((item, idx) => ({
      ...item,
      rank: idx + 1,
    }));

  // 5. Derive 6 team scores directly from individual aggregates
  const teams: Team[] = WORKSHOP_TEAMS.map((teamConfig) => {
    const teamMembers = individuals.filter((ind) => ind.teamId === teamConfig.id);
    const totalScore = teamMembers.reduce((sum, m) => sum + m.pts, 0);
    const totalMissions = teamMembers.reduce((sum, m) => sum + m.missions, 0);

    const isPqDone =
      peopleQuestsData[teamConfig.id]?.status === 'submitted' ||
      (teamConfig.id === myTeamId && !!isMyTeamPqSubmitted);
    const minMissions = isPqDone ? 1 : 0;

    return {
      id: teamConfig.id,
      name: teamConfig.name,
      shortCode: teamConfig.shortCode,
      color: teamConfig.color,
      score: totalScore,
      missionsCompleted: Math.max(totalMissions, minMissions),
      memberCount: teamMembers.length || 8,
      totalMissions: 2,
      lastActivity: new Date(),
      status: 'active' as const,
      rank: 1,
    };
  })
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .map((team, idx) => ({
      ...team,
      rank: idx + 1,
    }));

  return { individuals, teams };
}
