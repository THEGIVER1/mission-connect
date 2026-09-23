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
 * 조 식별자(ID) 정규화 유틸리티
 * '1조', '1', 'team1', 'team_1' 등 어떤 형태의 입력도 항상 'team1'~'team6'으로 표준화
 */
export function normalizeTeamId(raw: string | undefined | null): string {
  if (!raw) return 'team1';
  const str = String(raw).trim().toLowerCase();
  if (str === 'team1' || str === '1조' || str === '1' || str === 'team_1') return 'team1';
  if (str === 'team2' || str === '2조' || str === '2' || str === 'team_2') return 'team2';
  if (str === 'team3' || str === '3조' || str === '3' || str === 'team_3') return 'team3';
  if (str === 'team4' || str === '4조' || str === '4' || str === 'team_4') return 'team4';
  if (str === 'team5' || str === '5조' || str === '5' || str === 'team_5') return 'team5';
  if (str === 'team6' || str === '6조' || str === '6' || str === 'team_6') return 'team6';
  const found = WORKSHOP_TEAMS.find(t => t.id === str || t.name === str || t.shortCode === str);
  return found ? found.id : 'team1';
}

/**
 * 대시보드, 실시간 순위(리더보드), 관리자 화면 모두에 100% 동일한 점수를 보장하는 통합 계산 엔진
 *
 * [점수 규칙]
 * 1. People Quest: 조별 미션. 조에서 1명 추천 제출 시 해당 조 모든 조원에게 +100pt 부여.
 * 2. Discovery Quiz: 개인 미션. 각 개인이 맞힌 문항당 +100pt 부여.
 * 3. 조별 총점: 해당 조에 소속된 모든 조원의 점수 합산 (수학적 100% 일치 보장).
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
  const normalizedMyTeamId = normalizeTeamId(currentUser?.teamId);

  // 1. 사전 등록 명단이 있을 경우 초기화 (동적 모드에서는 빈 배열)
  PRE_REGISTERED_PARTICIPANTS.forEach((p, i) => {
    const pTeamId = normalizeTeamId(p.teamId);
    const isTeamPqDone = peopleQuestsData[pTeamId]?.status === 'submitted';
    const basePqPoints = isTeamPqDone ? PEOPLE_QUEST_POINTS_PER_MEMBER : 0;
    const basePqMissions = isTeamPqDone ? 1 : 0;

    listMap.set(p.name.trim(), {
      id: p.id,
      name: p.name.trim(),
      team: WORKSHOP_TEAMS.find(t => t.id === pTeamId)?.name ?? '1조',
      teamId: pTeamId,
      company: p.company,
      pts: basePqPoints,
      missions: basePqMissions,
      emoji: EMOJIS[i % EMOJIS.length],
      rank: 1,
    });
  });

  // 2. Firebase RTDB 실제 참여자 데이터 집계
  if (participantsData && typeof participantsData === 'object') {
    Object.values(participantsData).forEach((p: any, idx: number) => {
      if (!p || !p.name) return;
      const trimmedName = String(p.name).trim();
      const pTeamId = normalizeTeamId(p.teamId);
      const teamConfig = WORKSHOP_TEAMS.find(t => t.id === pTeamId);

      let quizPoints = 0;
      let quizMissions = 0;
      if (p.quizzes && typeof p.quizzes === 'object') {
        Object.values(p.quizzes).forEach((q: any) => {
          if (q.pointsEarned !== undefined) {
            quizPoints += Number(q.pointsEarned);
          } else if (q.isCorrect) {
            quizPoints += 100;
          }
          if (q.isCorrect || q.pointsEarned !== undefined) {
            quizMissions += 1;
          }
        });
      }

      const isTeamPqDone = peopleQuestsData[pTeamId]?.status === 'submitted';
      const pqPoints = isTeamPqDone ? PEOPLE_QUEST_POINTS_PER_MEMBER : 0;
      const pqMissions = isTeamPqDone ? 1 : 0;

      const totalPts = quizPoints + pqPoints;
      const totalMissions = quizMissions + pqMissions;

      listMap.set(trimmedName, {
        id: p.id || `${trimmedName}_${p.company || ''}`.replace(/\s/g, '_'),
        name: trimmedName,
        team: teamConfig?.name ?? '1조',
        teamId: pTeamId,
        company: p.company || '',
        pts: totalPts,
        missions: totalMissions,
        emoji: EMOJIS[idx % EMOJIS.length],
        rank: 1,
      });
    });
  }

  // 3. 현재 로그인된 사용자가 RTDB에 아직 반영 전인 경우(즉시 반영)
  if (currentUser?.name && currentUser.name.trim()) {
    const myTrimmedName = currentUser.name.trim();
    const existing = listMap.get(myTrimmedName);
    const teamConfig = WORKSHOP_TEAMS.find(t => t.id === normalizedMyTeamId);
    const isTeamPqDone = peopleQuestsData[normalizedMyTeamId]?.status === 'submitted';

    if (!existing) {
      // RTDB에 아직 없는 신규 접속자: 로컬 점수(0pt 또는 풀이)로 등록
      const localQuizPts = (currentUser.answeredQuizIds?.length ?? 0) * 100;
      const localPqPts = isTeamPqDone ? PEOPLE_QUEST_POINTS_PER_MEMBER : 0;
      const totalPts = localQuizPts + localPqPts;
      const totalMissions = (currentUser.answeredQuizIds?.length ?? 0) + (isTeamPqDone ? 1 : 0);

      listMap.set(myTrimmedName, {
        id: `${myTrimmedName}_${currentUser.company || ''}`.replace(/\s/g, '_'),
        name: myTrimmedName,
        team: teamConfig?.name ?? '1조',
        teamId: normalizedMyTeamId,
        company: currentUser.company || '',
        pts: totalPts,
        missions: totalMissions,
        emoji: '🔥',
        rank: 1,
      });
    }
  }

  // 4. 개인 기여 순위 정렬
  const individuals = Array.from(listMap.values())
    .sort((a, b) => b.pts - a.pts || a.name.localeCompare(b.name))
    .map((item, idx) => ({
      ...item,
      rank: idx + 1,
    }));

  // 5. 6개 조 순위 및 총점 산출 (소속 조원 점수 100% 합산)
  const teams: Team[] = WORKSHOP_TEAMS.map((teamConfig) => {
    const teamMembers = individuals.filter((ind) => ind.teamId === teamConfig.id);
    const totalScore = teamMembers.reduce((sum, m) => sum + m.pts, 0);
    const totalMissions = teamMembers.reduce((sum, m) => sum + m.missions, 0);
    const isPqDone = peopleQuestsData[teamConfig.id]?.status === 'submitted';

    return {
      id: teamConfig.id,
      name: teamConfig.name,
      shortCode: teamConfig.shortCode,
      color: teamConfig.color,
      score: totalScore,
      missionsCompleted: Math.max(totalMissions, isPqDone ? 1 : 0),
      memberCount: teamMembers.length,
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
