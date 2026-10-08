import {
  WORKSHOP_TEAMS,
  PEOPLE_QUEST_POINTS_PER_MEMBER,
  THEME_GARDEN_MISSION,
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
  isThemeGardenSubmitted?: boolean;
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
 * Firebase RTDB 키로 안전하게 사용할 수 있도록 특수문자 및 공백을 정규화
 * 금지 문자: . # $ [ ] / ( ) 및 공백
 */
export function sanitizeFirebaseKey(raw: string | undefined | null): string {
  if (!raw) return 'anonymous';
  return String(raw).trim().replace(/[.#$[\]/()]/g, '_').replace(/\s+/g, '_');
}

export function createParticipantId(name: string | undefined | null, company: string | undefined | null): string {
  const cleanName = sanitizeFirebaseKey(name || '익명');
  const cleanComp = sanitizeFirebaseKey(company || '소속');
  return `${cleanName}_${cleanComp}`;
}

/**
 * 특정 조의 People Quest가 제출 완료(submitted)되었는지 안전하게 판별
 */
export function isPqSubmittedForTeam(
  teamId: string | undefined | null,
  peopleQuestsData: Record<string, any> = {}
): boolean {
  if (!teamId || !peopleQuestsData || typeof peopleQuestsData !== 'object') return false;
  const targetNorm = normalizeTeamId(teamId);

  if (peopleQuestsData[targetNorm]?.status === 'submitted') return true;
  if (peopleQuestsData[teamId]?.status === 'submitted') return true;

  for (const [key, val] of Object.entries(peopleQuestsData)) {
    if (!val || typeof val !== 'object') continue;
    if (val.status === 'submitted') {
      if (normalizeTeamId(key) === targetNorm) return true;
      if (val.teamId && normalizeTeamId(val.teamId) === targetNorm) return true;
      if (val.teamName && normalizeTeamId(val.teamName) === targetNorm) return true;
    }
  }
  return false;
}

/**
 * 특정 조의 테마가든 단체사진이 제출 완료되었는지 판별
 */
export function isThemeGardenDoneForTeam(
  teamId: string | undefined | null,
  themeGardenPhotosData: Record<string, any> = {}
): boolean {
  if (!teamId || !themeGardenPhotosData || typeof themeGardenPhotosData !== 'object') return false;
  const targetNorm = normalizeTeamId(teamId);

  if (themeGardenPhotosData[targetNorm]?.photoUrl || themeGardenPhotosData[targetNorm]?.status === 'submitted') return true;
  if (themeGardenPhotosData[teamId]?.photoUrl || themeGardenPhotosData[teamId]?.status === 'submitted') return true;

  for (const [key, val] of Object.entries(themeGardenPhotosData)) {
    if (!val || typeof val !== 'object') continue;
    if (val.photoUrl || val.status === 'submitted') {
      if (normalizeTeamId(key) === targetNorm) return true;
      if (val.teamId && normalizeTeamId(val.teamId) === targetNorm) return true;
      if (val.teamName && normalizeTeamId(val.teamName) === targetNorm) return true;
    }
  }
  return false;
}

/**
 * 특정 조의 People Quest 데이터를 안전하게 획득
 */
export function getPqForTeam(
  teamId: string | undefined | null,
  peopleQuestsData: Record<string, any> = {}
): any | null {
  if (!teamId || !peopleQuestsData || typeof peopleQuestsData !== 'object') return null;
  const targetNorm = normalizeTeamId(teamId);

  if (peopleQuestsData[targetNorm]) return peopleQuestsData[targetNorm];
  if (peopleQuestsData[teamId]) return peopleQuestsData[teamId];

  for (const [key, val] of Object.entries(peopleQuestsData)) {
    if (!val || typeof val !== 'object') continue;
    if (
      normalizeTeamId(key) === targetNorm ||
      (val.teamId && normalizeTeamId(val.teamId) === targetNorm) ||
      (val.teamName && normalizeTeamId(val.teamName) === targetNorm)
    ) {
      return val;
    }
  }
  return null;
}

/**
 * 대시보드, 실시간 순위(리더보드), 관리자 화면 모두에 100% 동일한 점수를 보장하는 통합 계산 엔진
 *
 * [점수 규칙]
 * 1. People Quest: 조별 미션. 조에서 1명 추천 제출 시 해당 조 모든 조원에게 +100pt 부여.
 * 2. 테마가든 미션: 조별 미션. 조별 단체사진 업로드 시 해당 조 모든 조원에게 +100pt 부여.
 * 3. Discovery Quiz: 개인 미션. 각 개인이 맞힌 문항당 +100pt 부여.
 * 4. 조별 총점: 해당 조에 소속된 모든 조원의 점수 합산 (수학적 100% 일치 보장).
 */
export function calculateLeaderboardData(
  participantsData: Record<string, any> = {},
  peopleQuestsData: Record<string, any> = {},
  currentUser?: CurrentUserContext,
  themeGardenPhotosData: Record<string, any> = {}
): {
  individuals: IndividualItem[];
  teams: Team[];
} {
  const listMap = new Map<string, IndividualItem>();
  const normalizedMyTeamId = normalizeTeamId(currentUser?.teamId);

  // 1. 사전 등록 명단이 있을 경우 초기화
  PRE_REGISTERED_PARTICIPANTS.forEach((p, i) => {
    const pTeamId = normalizeTeamId(p.teamId);
    const isTeamPqDone = isPqSubmittedForTeam(pTeamId, peopleQuestsData) || (pTeamId === normalizedMyTeamId && !!currentUser?.isPeopleQuestSubmitted);
    const isThemeDone = isThemeGardenDoneForTeam(pTeamId, themeGardenPhotosData) || (pTeamId === normalizedMyTeamId && !!currentUser?.isThemeGardenSubmitted);
    
    const basePqPoints = isTeamPqDone ? PEOPLE_QUEST_POINTS_PER_MEMBER : 0;
    const baseThemePoints = isThemeDone ? THEME_GARDEN_MISSION.pointsPerMember : 0;
    const baseMissions = (isTeamPqDone ? 1 : 0) + (isThemeDone ? 1 : 0);
    const uniqueKey = p.id || `${p.name.trim()}_${p.company || ''}_${pTeamId}`.replace(/\s/g, '_');

    listMap.set(uniqueKey, {
      id: p.id,
      name: p.name.trim(),
      team: WORKSHOP_TEAMS.find(t => t.id === pTeamId)?.name ?? '1조',
      teamId: pTeamId,
      company: p.company,
      pts: basePqPoints + baseThemePoints,
      missions: baseMissions,
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

      // 조별 People Quest 완료 여부 판정
      const isTeamPqDone =
        isPqSubmittedForTeam(pTeamId, peopleQuestsData) ||
        p.peopleQuestCompleted === true ||
        (pTeamId === normalizedMyTeamId && !!currentUser?.isPeopleQuestSubmitted);

      // 조별 테마가든 미션 완료 여부 판정
      const isThemeDone =
        isThemeGardenDoneForTeam(pTeamId, themeGardenPhotosData) ||
        (pTeamId === normalizedMyTeamId && !!currentUser?.isThemeGardenSubmitted);

      const pqPoints = isTeamPqDone ? PEOPLE_QUEST_POINTS_PER_MEMBER : 0;
      const themePoints = isThemeDone ? THEME_GARDEN_MISSION.pointsPerMember : 0;
      const totalPts = quizPoints + pqPoints + themePoints;
      const totalMissions = quizMissions + (isTeamPqDone ? 1 : 0) + (isThemeDone ? 1 : 0);
      const uniqueKey = p.id ? sanitizeFirebaseKey(p.id) : createParticipantId(trimmedName, p.company);

      listMap.set(uniqueKey, {
        id: uniqueKey,
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
    const myUniqueKey = createParticipantId(myTrimmedName, currentUser.company);
    const existing = listMap.get(myUniqueKey) || Array.from(listMap.values()).find(ind => ind.name === myTrimmedName && ind.company === (currentUser.company || ''));
    const teamConfig = WORKSHOP_TEAMS.find(t => t.id === normalizedMyTeamId);
    const isTeamPqDone = isPqSubmittedForTeam(normalizedMyTeamId, peopleQuestsData) || !!currentUser.isPeopleQuestSubmitted;
    const isThemeDone = isThemeGardenDoneForTeam(normalizedMyTeamId, themeGardenPhotosData) || !!currentUser.isThemeGardenSubmitted;

    if (!existing) {
      const localQuizPts = (currentUser.answeredQuizIds?.length ?? 0) * 100;
      const localPqPts = isTeamPqDone ? PEOPLE_QUEST_POINTS_PER_MEMBER : 0;
      const localThemePts = isThemeDone ? THEME_GARDEN_MISSION.pointsPerMember : 0;
      const totalPts = localQuizPts + localPqPts + localThemePts;
      const totalMissions = (currentUser.answeredQuizIds?.length ?? 0) + (isTeamPqDone ? 1 : 0) + (isThemeDone ? 1 : 0);

      listMap.set(myUniqueKey, {
        id: myUniqueKey,
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
    const isPqDone = isPqSubmittedForTeam(teamConfig.id, peopleQuestsData) || (teamConfig.id === normalizedMyTeamId && !!currentUser?.isPeopleQuestSubmitted);
    const isThemeDone = isThemeGardenDoneForTeam(teamConfig.id, themeGardenPhotosData) || (teamConfig.id === normalizedMyTeamId && !!currentUser?.isThemeGardenSubmitted);

    return {
      id: teamConfig.id,
      name: teamConfig.name,
      shortCode: teamConfig.shortCode,
      color: teamConfig.color,
      score: totalScore,
      missionsCompleted: Math.max(totalMissions, (isPqDone ? 1 : 0) + (isThemeDone ? 1 : 0)),
      memberCount: teamMembers.length,
      totalMissions: 4, // 1 튜토리얼/그라운드룰, 1 테마가든, 1 피플퀘스트, 3 디스커버리 퀴즈 등
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
