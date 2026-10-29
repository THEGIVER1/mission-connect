import {
  WORKSHOP_TEAMS,
  PEOPLE_QUEST_POINTS_PER_MEMBER,
  THEME_GARDEN_MISSION,
  PRE_REGISTERED_PARTICIPANTS,
  PHOTO_VOTE_POINTS_PER_VOTE,
  IS_PILOT_MODE,
  YEONKANG_WRAPUP_QUIZ_OPTIONS,
  YEONKANG_WRAPUP_QUIZ_POINTS_PER_ITEM,
} from '../config/workshopConfig';
import type { Team } from '../types';

/** (연강원) STEP 1 연습 Quiz 정답 시 조별 점수 */
export const PRACTICE_QUIZ_POINTS = 50;

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
  if (str === 'team7' || str === '7조' || str === '7' || str === 'team_7') return 'team7';
  if (str === 'team8' || str === '8조' || str === '8' || str === 'team_8') return 'team8';
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

export function createParticipantId(name: string | undefined | null, company?: string | undefined | null): string {
  const cleanName = sanitizeFirebaseKey(name || '익명');
  const cleanComp = company && String(company).trim() ? sanitizeFirebaseKey(company) : '';
  return cleanComp ? `${cleanName}_${cleanComp}` : cleanName;
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
 * STEP 4 단체사진 투표 기록에서 특정 조가 선택한 최대 2개 조 ID 배열을 안전하게 추출
 * (하위 호환성: votedTeamIds 배열 또는 기존 단일 votedTeamId 모두 지원)
 */
export function getVotedTeamIdsFromVoteRecord(voteRec: any): string[] {
  if (!voteRec || typeof voteRec !== 'object') return [];
  if (Array.isArray(voteRec.votedTeamIds)) {
    const unique = Array.from(
      new Set(
        voteRec.votedTeamIds
          .filter(Boolean)
          .map((id: string) => normalizeTeamId(id))
      )
    );
    return unique.slice(0, 2);
  }
  if (voteRec.votedTeamId) {
    return [normalizeTeamId(voteRec.votedTeamId)];
  }
  return [];
}

/**
 * 전체 photoVotes 맵에서 각 조별 득표 수 집계
 */
export function calculatePhotoVoteCounts(photoVotesData: Record<string, any> = {}): Record<string, number> {
  const counts: Record<string, number> = {};
  WORKSHOP_TEAMS.forEach(t => {
    counts[t.id] = 0;
  });

  if (!photoVotesData || typeof photoVotesData !== 'object') return counts;

  Object.values(photoVotesData).forEach((voteRec: any) => {
    const targets = getVotedTeamIdsFromVoteRecord(voteRec);
    targets.forEach((targetTeamId) => {
      counts[targetTeamId] = (counts[targetTeamId] || 0) + 1;
    });
  });

  return counts;
}

/**
 * 연강원 파일럿 STEP 4 Q2 퀴즈 점수 계산 (개당 50pt, 모두 정답, 최대 7개 = 350pt)
 */
export function getWrapupQuizScoreForTeam(
  teamId: string | undefined | null,
  wrapupQuizData: Record<string, any> = {}
): { selectedCount: number; points: number; completed: boolean; selectedItems: string[] } {
  if (!teamId || !wrapupQuizData || typeof wrapupQuizData !== 'object') {
    return { selectedCount: 0, points: 0, completed: false, selectedItems: [] };
  }
  const targetNorm = normalizeTeamId(teamId);
  const rec = wrapupQuizData[targetNorm] || wrapupQuizData[teamId];
  if (!rec || typeof rec !== 'object') {
    return { selectedCount: 0, points: 0, completed: false, selectedItems: [] };
  }
  const items = Array.isArray(rec.selectedItems) ? rec.selectedItems : [];
  const uniqueItems = Array.from(new Set(items.filter(Boolean))) as string[];
  const count = Math.min(YEONKANG_WRAPUP_QUIZ_OPTIONS.length, uniqueItems.length);
  return {
    selectedCount: count,
    points: count * YEONKANG_WRAPUP_QUIZ_POINTS_PER_ITEM,
    completed: !!rec.completed || count > 0,
    selectedItems: uniqueItems,
  };
}

/**
 * 대시보드, 실시간 순위(리더보드), 관리자 화면 모두에 100% 동일한 점수를 보장하는 통합 계산 엔진
 *
 * [조별 점수 규칙]
 * 1. 최고의 스토리 동료 추천 완료 시: +100pt
 * 2. 조별 단체사진 업로드 완료 시: +100pt
 * 3. STEP 4 단체사진 투표 득표 시: 1표당 +200pt (조당 최대 2표 행사 가능)
 * 4. (연강원 파일럿 전용) STEP 4 Q2 퀴즈: 선택 개당 +50pt (7개 모두 정답, 최대 +350pt)
 */
export function calculateLeaderboardData(
  participantsData: Record<string, any> = {},
  peopleQuestsData: Record<string, any> = {},
  currentUser?: CurrentUserContext,
  themeGardenPhotosData: Record<string, any> = {},
  photoVotesData: Record<string, any> = {},
  wrapupQuizData: Record<string, any> = {},
  tutorialsData: Record<string, any> = {}
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
      const totalPts = pqPoints + themePoints;
      const totalMissions = (isTeamPqDone ? 1 : 0) + (isThemeDone ? 1 : 0);
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
      const localPqPts = isTeamPqDone ? PEOPLE_QUEST_POINTS_PER_MEMBER : 0;
      const localThemePts = isThemeDone ? THEME_GARDEN_MISSION.pointsPerMember : 0;
      const totalPts = localPqPts + localThemePts;
      const totalMissions = (isTeamPqDone ? 1 : 0) + (isThemeDone ? 1 : 0);

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

  // 5. 6개 조 순위 및 총점 산출 (미션당 100pt + 단체사진 투표 득표당 200pt)
  const photoVoteCounts = calculatePhotoVoteCounts(photoVotesData);

  const teams: Team[] = WORKSHOP_TEAMS.map((teamConfig) => {
    const teamMembers = individuals.filter((ind) => ind.teamId === teamConfig.id);
    const isPqDone = isPqSubmittedForTeam(teamConfig.id, peopleQuestsData) || (teamConfig.id === normalizedMyTeamId && !!currentUser?.isPeopleQuestSubmitted);
    const isThemeDone = isThemeGardenDoneForTeam(teamConfig.id, themeGardenPhotosData) || (teamConfig.id === normalizedMyTeamId && !!currentUser?.isThemeGardenSubmitted);

    const voteCount = photoVoteCounts[teamConfig.id] || 0;
    const voteBonusPoints = voteCount * PHOTO_VOTE_POINTS_PER_VOTE;
    const wrapupQuizInfo = getWrapupQuizScoreForTeam(teamConfig.id, wrapupQuizData);

    const tutorialRec = tutorialsData?.[teamConfig.id];
    const practiceQuizPoints =
      tutorialRec?.completed && tutorialRec?.isCorrect !== false
        ? PRACTICE_QUIZ_POINTS
        : 0;

    const teamScore =
      (isPqDone ? PEOPLE_QUEST_POINTS_PER_MEMBER : 0) +
      (isThemeDone ? THEME_GARDEN_MISSION.pointsPerMember : 0) +
      voteBonusPoints +
      wrapupQuizInfo.points +
      practiceQuizPoints;
    const completedCount = (isPqDone ? 1 : 0) + (isThemeDone ? 1 : 0);

    return {
      id: teamConfig.id,
      name: teamConfig.name,
      shortCode: teamConfig.shortCode,
      color: teamConfig.color,
      score: teamScore,
      missionsCompleted: completedCount,
      memberCount: teamMembers.length,
      totalMissions: 2, // 1 단체사진, 1 최고의 스토리 동료 추천
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
