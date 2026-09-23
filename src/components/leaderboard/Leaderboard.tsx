import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { BottomNav } from '../dashboard/Dashboard';
import { LiveBadge, ScoreBar } from '../shared';
import { onValue, ref } from 'firebase/database';
import { rtdb } from '../../lib/firebase';
import {
  WORKSHOP_TEAMS,
  DISCOVERY_QUIZZES,
  PEOPLE_QUEST_POINTS_PER_MEMBER,
} from '../../config/workshopConfig';
import { calculateLeaderboardData, IndividualItem } from '../../utils/scoreCalculator';
import type { Team } from '../../types';

type TabKey = 'team' | 'mission' | 'individual';

// ─────────────────────────────────────────────────────────────────
// 세션 타이머 (1초 단위 실시간 갱신)
// ─────────────────────────────────────────────────────────────────
function useSessionTimer() {
  const session = useAppStore((s) => s.session);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!session) return { h: '00', m: '00', s: '00', pct: 0, urgent: false };

  const total = session.endsAt.getTime() - session.startedAt.getTime();
  const left  = Math.max(0, session.endsAt.getTime() - now);
  const h = String(Math.floor(left / 3600000)).padStart(2, '0');
  const m = String(Math.floor(((left % 3600000) / 60000))).padStart(2, '0');
  const s = String(Math.floor((left % 60000) / 1000)).padStart(2, '0');
  const pct = Math.min(100, Math.max(0, Math.round(((total - left) / total) * 100)));
  return { h, m, s, pct, urgent: left < 15 * 60 * 1000 };
}

// ─────────────────────────────────────────────────────────────────
// 통계 카드 행 (실시간 타이머 + 완료 미션 수)
// ─────────────────────────────────────────────────────────────────
const StatsRow: React.FC<{ teams: Team[] }> = ({ teams }) => {
  const timer = useSessionTimer();
  const totalCompleted = teams.reduce((acc, t) => acc + (t.missionsCompleted || 0), 0);

  return (
    <div className="grid grid-cols-3 gap-2 px-4 py-3">
      {[
        { val: `${teams.length}개 조`, label: '참가 조', color: 'text-amber-400' },
        { val: `${totalCompleted}건`, label: '완료 미션', color: 'text-green-400' },
        { val: `${timer.h}:${timer.m}:${timer.s}`, label: '남은 시간 (실시간)', color: timer.urgent ? 'text-red-400 animate-pulse' : 'text-sky-400 font-mono' },
      ].map(({ val, label, color }) => (
        <div key={label} className="bg-[#1A2235] border border-white/8 rounded-xl p-2.5 text-center shadow">
          <div className={`font-bebas text-2xl leading-none ${color}`}>{val}</div>
          <div className="text-[10px] text-slate-400 mt-1">{label}</div>
        </div>
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// 세션 진행 바
// ─────────────────────────────────────────────────────────────────
const SessionProgressBar: React.FC = () => {
  const timer = useSessionTimer();
  return (
    <div className="px-4 pb-2">
      <div className="flex justify-between text-[10px] text-slate-400 mb-1 font-medium">
        <span>세션 진행률</span>
        <span className="text-white font-bold">{timer.pct}%</span>
      </div>
      <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{
            width: `${timer.pct}%`,
            background: timer.urgent
              ? 'linear-gradient(90deg,#E31837,#FF6B35)'
              : 'linear-gradient(90deg,#0284C7,#10B981)',
          }}
        />
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// 시상대 TOP 3
// ─────────────────────────────────────────────────────────────────
const Podium: React.FC<{ teams: Team[]; myTeamId: string }> = ({ teams, myTeamId }) => {
  const top3 = teams.slice(0, 3);
  if (top3.length < 3) return null;
  const podiumOrder = [top3[1], top3[0], top3[2]];

  return (
    <div className="flex items-end justify-center gap-2 py-4 px-2">
      {podiumOrder.map((team) => {
        if (!team) return null;
        const actualRank = team.rank;
        const isFirst = actualRank === 1;
        const isSecond = actualRank === 2;
        const isMe = team.id === myTeamId;

        const heights = isFirst ? 'h-28' : isSecond ? 'h-22' : 'h-18';
        const bgColors = isFirst
          ? 'bg-gradient-to-t from-amber-500/20 to-amber-500/5 border-amber-500/40'
          : isSecond
          ? 'bg-gradient-to-t from-slate-400/20 to-slate-400/5 border-slate-400/30'
          : 'bg-gradient-to-t from-amber-700/20 to-amber-700/5 border-amber-700/30';

        const teamConfig = WORKSHOP_TEAMS.find(t => t.id === team.id);

        return (
          <div key={team.id} className="flex-1 flex flex-col items-center max-w-[105px]">
            <div className="text-xl mb-1">{teamConfig?.emoji || '🌲'}</div>
            <div className={`w-full border rounded-t-2xl flex flex-col items-center justify-between p-2 ${heights} ${bgColors} ${isMe ? 'ring-2 ring-red-500 ring-offset-2 ring-offset-[#0D1117]' : ''}`}>
              <span className={`font-bebas text-2xl font-bold ${
                isFirst ? 'text-amber-400' : isSecond ? 'text-slate-300' : 'text-amber-600'
              }`}>
                {actualRank}
              </span>
              <div className="text-center w-full">
                <p className="text-[12px] font-bold text-white truncate">{team.name}</p>
                <p className="text-[11px] font-bebas text-amber-300">{team.score.toLocaleString()}pt</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// 탭 1: 팀 순위
// ─────────────────────────────────────────────────────────────────
const TeamTab: React.FC<{ teams: Team[]; myTeamId: string }> = ({ teams, myTeamId }) => {
  const maxScore = useMemo(() => Math.max(...teams.map(t => t.score), 100), [teams]);

  return (
    <div className="px-4 pb-28 space-y-3 pt-2">
      <Podium teams={teams} myTeamId={myTeamId} />

      <div className="space-y-2 pt-2">
        {teams.map((team) => {
          const isMe = team.id === myTeamId;
          const teamConfig = WORKSHOP_TEAMS.find(t => t.id === team.id);

          return (
            <div
              key={team.id}
              className={`p-3.5 rounded-2xl border transition-all ${
                isMe ? 'bg-[#1D2538] border-red-500/50 shadow-lg' : 'bg-[#1A2235] border-white/8'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <span className="font-bebas text-xl text-slate-400 w-5 text-center">
                    {team.rank}
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-[#212C42] border border-white/8 flex items-center justify-center text-base">
                    {teamConfig?.emoji || '🌲'}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <strong className="text-[14px] text-white">{team.name}</strong>
                      {isMe && (
                        <span className="text-[9px] bg-red-600 text-white px-1.5 py-0.5 rounded font-bold">
                          우리 조
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {teamConfig?.courseName} ({team.memberCount}명 참여)
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-bebas text-2xl text-white">
                    {team.score.toLocaleString()}
                    <span className="text-red-500 text-sm ml-0.5">pt</span>
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    완료 미션 {team.missionsCompleted}건
                  </span>
                </div>
              </div>

              <ScoreBar value={team.score} max={maxScore} color={teamConfig?.color || '#E31837'} />
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// 탭 2: 미션별 현황 (동적 배점 연동 & 실시간 인원수 집계)
// ─────────────────────────────────────────────────────────────────
const MissionTab: React.FC<{
  peopleQuests: Record<string, any>;
  participants: Record<string, any>;
}> = ({ peopleQuests, participants }) => {
  const answeredQuizIds = useAppStore((s) => s.answeredQuizIds || []);
  const isPeopleQuestSubmitted = useAppStore((s) => s.isPeopleQuestSubmitted);
  const myTeam = useAppStore((s) => s.myTeam);
  const participantName = useAppStore((s) => s.participantName);

  // People Quest 제출 완료 팀 수
  const pqCompletedTeams = useMemo(() => {
    return WORKSHOP_TEAMS.filter(t => {
      const isSub = peopleQuests[t.id]?.status === 'submitted';
      const isMyTeamSub = t.id === myTeam?.id && isPeopleQuestSubmitted;
      return isSub || isMyTeamSub;
    });
  }, [peopleQuests, myTeam?.id, isPeopleQuestSubmitted]);

  // 각 Discovery Quiz 문항별 완료 참가자 수 집계
  const quizStats = useMemo(() => {
    const pList = Object.values(participants);
    return DISCOVERY_QUIZZES.map((quiz, idx) => {
      let completedCount = 0;
      let correctCount = 0;
      let isMyAnswered = false;
      let isMyCorrect = false;

      pList.forEach((p: any) => {
        if (p?.quizzes && p.quizzes[quiz.id]) {
          completedCount += 1;
          if (p.quizzes[quiz.id].isCorrect) correctCount += 1;
          if (participantName && (p.name || '').trim() === participantName.trim()) {
            isMyAnswered = true;
            isMyCorrect = !!p.quizzes[quiz.id].isCorrect;
          }
        }
      });

      // 내 로컬 상태 낙관적 보정
      if (answeredQuizIds.includes(quiz.id)) {
        isMyAnswered = true;
        if (!isMyCorrect) isMyCorrect = true; // 기본 정답 가산
        if (completedCount === 0) completedCount = 1;
        if (correctCount === 0) correctCount = 1;
      }

      return {
        quiz,
        idx,
        completedCount,
        correctCount,
        isMyAnswered,
        isMyCorrect,
      };
    });
  }, [participants, answeredQuizIds, participantName]);

  return (
    <div className="px-4 pb-28 space-y-4 pt-2">
      {/* Activity 1: People Quest */}
      <div className="bg-[#1A2235] border border-red-500/30 rounded-2xl p-4 shadow-lg space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">💬</span>
            <div>
              <span className="text-[10px] text-red-400 font-bold uppercase tracking-wider block">Activity 1 · 대화형 (조별 1명 추천)</span>
              <h3 className="text-[15px] font-bold text-white">People Quest (최고의 스토리 동료 추천)</h3>
            </div>
          </div>
          <span className="text-[11px] font-bold text-amber-400">
            +{PEOPLE_QUEST_POINTS_PER_MEMBER}pt/인
          </span>
        </div>

        <p className="text-[12px] text-slate-300 leading-relaxed">
          트레킹 중 조원들과 대화하며 인상 깊었던 동료 1명을 추천합니다. 제출 시 <strong>조원 전원에게 +{PEOPLE_QUEST_POINTS_PER_MEMBER}pt</strong>가 부여됩니다.
        </p>

        {/* 진행률 바 */}
        <div>
          <div className="flex justify-between text-[11px] text-slate-400 mb-1">
            <span>6개 조 제출 완료율</span>
            <span className="text-green-400 font-bold">
              {pqCompletedTeams.length} / {WORKSHOP_TEAMS.length}개 조 완료 ({Math.round((pqCompletedTeams.length / WORKSHOP_TEAMS.length) * 100)}%)
            </span>
          </div>
          <div className="h-2 bg-black/40 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-red-600 to-green-500 rounded-full transition-all duration-700"
              style={{ width: `${(pqCompletedTeams.length / WORKSHOP_TEAMS.length) * 100}%` }}
            />
          </div>
        </div>

        {/* 조별 현황 뱃지 (6개 조) */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          {WORKSHOP_TEAMS.map(team => {
            const pq = peopleQuests[team.id];
            const isMyTeam = team.id === myTeam?.id;
            const isSubmitted = pq?.status === 'submitted' || (isMyTeam && isPeopleQuestSubmitted);
            const isDraft = pq?.status === 'draft';
            const recName = pq?.recommendation?.recommendedPersonName;
            const topic = pq?.recommendation?.selectedTopic;

            return (
              <div
                key={team.id}
                className={`p-2.5 rounded-xl border text-left text-[11px] transition-all ${
                  isSubmitted
                    ? 'bg-green-500/15 border-green-500/30 text-green-300'
                    : isDraft
                    ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                    : 'bg-black/20 border-white/5 text-slate-500'
                }`}
              >
                <div className="flex justify-between items-center mb-0.5">
                  <span className="font-bold text-white flex items-center gap-1">
                    {team.emoji} {team.name}
                    {isMyTeam && <span className="text-[9px] bg-red-600 text-white px-1 rounded font-normal">우리 조</span>}
                  </span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                    isSubmitted ? 'bg-green-500/30 text-green-300' : isDraft ? 'bg-amber-500/30 text-amber-300' : 'text-slate-500'
                  }`}>
                    {isSubmitted ? '완료 ✓' : isDraft ? '작성중 💾' : '미진행'}
                  </span>
                </div>
                {recName ? (
                  <p className="text-[10px] text-slate-300 truncate">
                    👑 {recName} 님 {topic ? `(${topic.slice(0, 10)}...)` : ''}
                  </p>
                ) : (
                  <p className="text-[10px] text-slate-500">대화 진행 중</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Activity 2: Discovery Quiz */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-[13px] font-bold text-white flex items-center gap-1.5">
            🧭 Activity 2: Discovery Quiz 현장 퀴즈 ({DISCOVERY_QUIZZES.length}문항)
          </span>
          <span className="text-[11px] text-sky-400 font-bold">개인별 각자 풀이 (+100pt)</span>
        </div>

        {quizStats.map(({ quiz, idx, completedCount, correctCount, isMyAnswered, isMyCorrect }) => {
          const courseLabel = quiz.courseKey === 'all'
            ? '전체 공통'
            : quiz.courseKey === 'forest'
            ? '1~3조 동물원둘레길'
            : '4~6조 호수둘레길';

          return (
            <div key={quiz.id} className="bg-[#1A2235] border border-white/8 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-bold text-sky-400">
                    QUIZ {idx + 1}. {quiz.title}
                  </span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                    quiz.courseKey === 'all'
                      ? 'bg-slate-700 text-slate-300'
                      : quiz.courseKey === 'forest'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                  }`}>
                    {courseLabel}
                  </span>
                </div>
                <span className="text-[11px] text-amber-400 font-bold">+{quiz.points}pt</span>
              </div>

              <p className="text-[12px] text-slate-300 leading-snug">{quiz.questionText}</p>

              <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400 border-t border-white/5">
                <div className="flex items-center gap-3">
                  <span>참가자 풀이: <strong className="text-white">{completedCount}명</strong></span>
                  <span>정답: <strong className="text-green-400">{correctCount}명</strong></span>
                </div>
                {isMyAnswered ? (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    isMyCorrect ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                  }`}>
                    {isMyCorrect ? '내 결과: 정답 ✓' : '내 결과: 오답 ✕'}
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-500">내 결과: 미풀이</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const IndividualTab: React.FC<{
  individuals: IndividualItem[];
  participantName: string | null;
}> = ({ individuals, participantName }) => {
  return (
    <div className="px-4 pb-28 space-y-2 pt-2">
      <div className="bg-[#1A2235] border border-white/8 rounded-xl p-3 text-center mb-2">
        <p className="text-[12px] font-bold text-white">
          개인 미션 기여 순위 (전체 {individuals.length}명)
        </p>
        <p className="text-[10px] text-slate-400 mt-0.5">
          개인 획득 점수 = 디스커버리 퀴즈 정답(+100pt/문항) + 조별 피플퀘스트 완료(+100pt)
        </p>
      </div>

      {individuals.length === 0 ? (
        <div className="bg-[#1A2235] border border-white/8 rounded-2xl p-8 text-center space-y-2 my-4">
          <div className="text-3xl">👥</div>
          <h4 className="text-[14px] font-bold text-white">아직 등록된 참가자가 없습니다</h4>
          <p className="text-[12px] text-slate-400">
            참가자가 로그인하고 미션에 참여하면 실시간으로 순위표에 등록됩니다.
          </p>
        </div>
      ) : (
        individuals.map((p) => {
          const isMe = !!participantName && p.name.trim() === participantName.trim();
          return (
            <div
              key={p.id || p.name}
              className={`flex items-center gap-3 px-3.5 py-3 rounded-2xl border transition-all ${
                isMe
                  ? 'bg-red-500/15 border-red-500 shadow-lg shadow-red-500/10 ring-1 ring-red-500'
                  : 'bg-[#1A2235] border-white/6'
              }`}
            >
              <span className={`font-bebas text-xl w-7 text-center ${
                p.rank === 1
                  ? 'text-amber-400 text-2xl font-bold'
                  : p.rank === 2
                  ? 'text-slate-300 text-xl font-bold'
                  : p.rank === 3
                  ? 'text-amber-600 text-xl font-bold'
                  : 'text-slate-500'
              }`}>
                {p.rank === 1 ? '🥇' : p.rank === 2 ? '🥈' : p.rank === 3 ? '🥉' : p.rank}
              </span>
              <div className="w-9 h-9 rounded-xl bg-[#212C42] border border-white/8 flex items-center justify-center text-lg flex-shrink-0">
                {p.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className={`text-[14px] font-bold ${isMe ? 'text-red-400' : 'text-white'}`}>
                    {p.name}
                  </span>
                  {isMe && (
                    <span className="text-[9px] font-bold bg-red-600 text-white px-1.5 py-0.5 rounded">나</span>
                  )}
                  {p.company && (
                    <span className="text-[10px] text-slate-500">({p.company})</span>
                  )}
                </div>
                <span className="text-[11px] text-slate-400">{p.team} · {p.missions}개 미션 완주</span>
              </div>
              <div className="flex flex-col items-end">
                <span className={`font-bebas text-[22px] leading-none ${p.pts > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                  {p.pts}<span className="text-[11px] text-slate-400 ml-0.5">pt</span>
                </span>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// Leaderboard 메인 (Dual-Channel 실시간 동기화)
// ─────────────────────────────────────────────────────────────────
const Leaderboard: React.FC = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabKey>('team');
  const teamsFromStore = useAppStore((s) => s.teams);
  const myTeam = useAppStore((s) => s.myTeam);
  const participantName = useAppStore((s) => s.participantName);
  const participantCompany = useAppStore((s) => s.participantCompany);
  const answeredQuizIds = useAppStore((s) => s.answeredQuizIds || []);
  const isPeopleQuestSubmitted = useAppStore((s) => s.isPeopleQuestSubmitted);
  const syncSessionData = useAppStore((s) => s.syncSessionData);
  const myTeamId = myTeam?.id ?? '';

  const [participantsData, setParticipantsData] = useState<Record<string, any>>({});
  const [peopleQuestsData, setPeopleQuestsData] = useState<Record<string, any>>({});
  const dbUrl = import.meta.env.VITE_FIREBASE_DATABASE_URL || 'https://doosan-teambuilding-default-rtdb.firebaseio.com';

  // 1. 실시간 개인 순위표(50명) 및 6개 조 랭킹 통합 계산
  const { individuals, teams: computedTeams } = useMemo(() => {
    return calculateLeaderboardData(
      participantsData,
      peopleQuestsData,
      {
        name: participantName,
        company: participantCompany,
        teamId: myTeamId || null,
        answeredQuizIds,
        isPeopleQuestSubmitted,
      }
    );
  }, [
    participantsData,
    peopleQuestsData,
    participantName,
    participantCompany,
    myTeamId,
    answeredQuizIds,
    isPeopleQuestSubmitted,
  ]);

  // Zustand 스토어 동기화
  useEffect(() => {
    syncSessionData({ teams: computedTeams });
  }, [computedTeams, syncSessionData]);

  // 3. Dual-Channel 실시간 데이터 로드 (REST 2.5s Polling + WebSocket)
  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await fetch(`${dbUrl}/sessions/trekking2026.json?t=${Date.now()}`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data && typeof data === 'object') {
            setParticipantsData(data.participants || {});
            setPeopleQuestsData(data.peopleQuest || {});
          }
        }
      } catch (err) {
        console.warn('리더보드 REST 조회 경고:', err);
      }
    };
    fetchLeaderboard();

    const pollInterval = setInterval(fetchLeaderboard, 2500);

    let unsubscribe = () => {};
    try {
      const sessionRef = ref(rtdb, 'sessions/trekking2026');
      unsubscribe = onValue(
        sessionRef,
        (snapshot) => {
          if (!snapshot.exists()) return;
          const data = snapshot.val();
          if (data && typeof data === 'object') {
            setParticipantsData(data.participants || {});
            setPeopleQuestsData(data.peopleQuest || {});
          }
        },
        (error) => {
          console.warn('리더보드 실시간 동기화 경고:', error);
        }
      );
    } catch (e) {
      console.warn('Firebase 리스너 등록 경고:', e);
    }

    return () => {
      clearInterval(pollInterval);
      unsubscribe();
    };
  }, [dbUrl]);

  const TABS: { key: TabKey; label: string }[] = [
    { key: 'team',       label: '팀 순위'   },
    { key: 'mission',    label: '미션별'    },
    { key: 'individual', label: '개인 기여' },
  ];

  return (
    <div className="max-w-[390px] mx-auto bg-[#0D1117] min-h-screen flex flex-col text-slate-100 font-['Noto_Sans_KR']">
      {/* 상단 헤더 */}
      <header className="bg-[#13192A] border-b border-white/8 px-4 pt-3 pb-3 relative flex-shrink-0">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-red-600 to-orange-500" />
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="w-9 h-9 rounded-xl bg-[#1A2235] border border-white/8 flex items-center justify-center text-white text-base"
          >
            ←
          </button>
          <div className="flex items-center gap-2">
            <span className="font-bebas text-xl tracking-widest text-white">
              LEADER<span className="text-amber-400">BOARD</span>
            </span>
          </div>
          <LiveBadge label="LIVE" />
        </div>
      </header>

      {/* 탭 버튼 */}
      <div className="flex bg-[#13192A] border-b border-white/8 flex-shrink-0">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2.5 text-[13px] font-bold border-b-2 transition-all ${
              tab === t.key
                ? 'text-amber-400 border-amber-400'
                : 'text-slate-400 border-transparent hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 통계 & 실시간 타이머 바 */}
      <div className="flex-shrink-0">
        <StatsRow teams={computedTeams} />
        <SessionProgressBar />
      </div>

      {/* 탭 본문 콘텐츠 */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'team'       && <TeamTab teams={computedTeams} myTeamId={myTeamId} />}
        {tab === 'mission'    && <MissionTab peopleQuests={peopleQuestsData} participants={participantsData} />}
        {tab === 'individual' && <IndividualTab individuals={individuals} participantName={participantName} />}
      </div>

      <BottomNav active="/leaderboard" />
    </div>
  );
};

export default Leaderboard;
