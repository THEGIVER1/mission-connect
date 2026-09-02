import { create } from 'zustand';
import type { AppState, Team, Mission, Alert, Notice, GpsCoord } from '../types';
import {
  MOCK_SESSION, MOCK_TEAMS,
  MOCK_MISSIONS, MOCK_ALERTS, MOCK_NOTICES, MOCK_CORE_VALUES,
} from '../lib/mockData';
import { DEFAULT_COURSE, CourseKey, PEOPLE_QUEST_POINTS_PER_MEMBER } from '../config/workshopConfig';

export interface PeopleQuestRecItem {
  recommendedPersonId: string;
  recommendedPersonName: string;
  recommendedPersonCompany: string;
  reason: string;
}

interface AppStore extends AppState {
  selectedCourse:             CourseKey;
  setCourse:                  (course: CourseKey) => void;
  setMyLocation:              (coord: GpsCoord) => void;
  selectTeam:                 (team: Team, name?: string, company?: string, course?: CourseKey) => void;
  completeMission:            (missionId: string, pointsEarned: number) => void;
  unlockMission:              (missionId: string) => void;
  addNotice:                  (notice: Notice) => void;
  resolveAlert:               (alertId: string) => void;
  markCoreValueFound:         (key: string) => void;
  updateTeamScore:            (teamId: string, score: number) => void;
  updateTeamStatus:           (teamId: string, status: Team['status']) => void;

  // ── CHRO 2대 액티비티 상태 ──
  peopleQuestDraft:           Record<string, PeopleQuestRecItem>;
  isPeopleQuestSubmitted:     boolean;
  setPeopleQuestDraft:        (questionId: string, rec: PeopleQuestRecItem) => void;
  setPeopleQuestSubmitted:    (submitted: boolean) => void;
  answeredQuizIds:            string[];
  addAnsweredQuiz:            (quizId: string) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  session:    MOCK_SESSION,
  myTeam:     null,
  selectedCourse: DEFAULT_COURSE,
  participantName: null as string | null,
  participantCompany: null as string | null,
  myLocation: null,
  teams:      MOCK_TEAMS,
  missions:   MOCK_MISSIONS,
  alerts:     MOCK_ALERTS,
  notices:    MOCK_NOTICES,
  coreValues: MOCK_CORE_VALUES,
  isAdmin:    false,

  // CHRO 액티비티
  peopleQuestDraft: {},
  isPeopleQuestSubmitted: false,
  setPeopleQuestDraft: (questionId, rec) =>
    set((s) => ({
      peopleQuestDraft: { ...s.peopleQuestDraft, [questionId]: rec },
    })),
  setPeopleQuestSubmitted: (submitted) => set({ isPeopleQuestSubmitted: submitted }),

  answeredQuizIds: [],
  addAnsweredQuiz: (quizId) =>
    set((s) => ({
      answeredQuizIds: s.answeredQuizIds.includes(quizId) ? s.answeredQuizIds : [...s.answeredQuizIds, quizId],
    })),

  setCourse: (course) => set({ selectedCourse: course }),

  // ── 팀 선택: 해당 팀 정보를 myTeam으로 세팅 ──────────────
  selectTeam: (team, name?: string, company?: string, course?: CourseKey) =>
    set((s) => {
      const activeCourse = course ?? s.selectedCourse;
      return {
        myTeam:     team,
        selectedCourse: activeCourse,
        participantName: name ?? s.participantName,
        participantCompany: company ?? s.participantCompany,
        myLocation: null,
        missions:   [],
        coreValues: MOCK_CORE_VALUES.map((cv) => ({ ...cv, found: false })),
        teams: s.teams.map((t) =>
          t.id === team.id
            ? { ...t, score: 0, missionsCompleted: 0, rank: t.rank }
            : t
        ),
      };
    }),

  setMyLocation: (coord) => set({ myLocation: coord }),

  // ── 미션 완료: 내 팀 점수 & teams 리더보드 동시 갱신 ─────
  completeMission: (missionId, pointsEarned) =>
    set((s) => {
      const idx  = s.missions.findIndex((m) => m.id === missionId);
      const next = s.missions[idx + 1];

      const missions = s.missions.map((m, i) => {
        if (m.id === missionId)          return { ...m, status: 'completed' as const };
        if (next && m.id === next.id)    return { ...m, status: 'active'    as const };
        return m;
      });

      const newScore = (s.myTeam?.score ?? 0) + pointsEarned;
      const newCompleted = (s.myTeam?.missionsCompleted ?? 0) + 1;

      // teams 리더보드도 실시간 갱신
      const updatedTeams = s.teams
        .map((t) => t.id === s.myTeam?.id
          ? { ...t, score: newScore, missionsCompleted: newCompleted }
          : t
        )
        .sort((a, b) => b.score - a.score)
        .map((t, i) => ({ ...t, rank: i + 1 }));

      return {
        missions,
        myTeam: s.myTeam
          ? { ...s.myTeam, score: newScore, missionsCompleted: newCompleted }
          : null,
        teams: updatedTeams,
      };
    }),

  unlockMission: (missionId) =>
    set((s) => ({
      missions: s.missions.map((m) =>
        m.id === missionId ? { ...m, status: 'active' as const } : m
      ),
    })),

  addNotice: (notice) =>
    set((s) => ({ notices: [notice, ...s.notices] })),

  resolveAlert: (alertId) =>
    set((s) => ({
      alerts: s.alerts.map((a) =>
        a.id === alertId ? { ...a, status: 'resolved' as const, resolvedAt: new Date() } : a
      ),
    })),

  markCoreValueFound: (key) =>
    set((s) => ({
      coreValues: s.coreValues.map((cv) =>
        cv.key === key ? { ...cv, found: true } : cv
      ),
    })),

  updateTeamScore: (teamId, score) =>
    set((s) => {
      const updatedTeams = s.teams
        .map((t) => (t.id === teamId ? { ...t, score } : t))
        .sort((a, b) => b.score - a.score)
        .map((t, i) => ({ ...t, rank: i + 1 }));
      const myTeamRank = updatedTeams.find((t) => t.id === s.myTeam?.id)?.rank ?? s.myTeam?.rank ?? 1;
      return {
        myTeam: s.myTeam && s.myTeam.id === teamId ? { ...s.myTeam, score, rank: myTeamRank } : s.myTeam ? { ...s.myTeam, rank: myTeamRank } : null,
        teams: updatedTeams,
      };
    }),

  updateTeamStatus: (teamId, status) =>
    set((s) => ({
      teams: s.teams.map((t) => (t.id === teamId ? { ...t, status } : t)),
    })),
}));
