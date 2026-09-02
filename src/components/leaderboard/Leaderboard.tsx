import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { BottomNav } from '../dashboard/Dashboard';
import { LiveBadge, TeamAvatar, ScoreBar } from '../shared';
import { onValue, ref } from 'firebase/database';
import { rtdb } from '../../lib/firebase';
import {
  WORKSHOP_TEAMS,
  DISCOVERY_QUIZZES,
  PEOPLE_QUEST_QUESTIONS,
  PEOPLE_QUEST_POINTS_PER_MEMBER,
  PRE_REGISTERED_PARTICIPANTS,
} from '../../config/workshopConfig';
import type { Team } from '../../types';

// ─────────────────────────────────────────────────────────────────
// 탭 타입
// ─────────────────────────────────────────────────────────────────
type TabKey = 'team' | 'mission' | 'individual';

type ParticipantRealtime = {
  name?: string;
  company?: string;
  teamId?: string;
  teamName?: string;
  score?: number;
  missionsCompleted?: number;
  quizzes?: Record<string, { isCorrect: boolean; pointsEarned: number }>;
  status?: Team['status'];
};

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
  const m = String(Math.floor((diff => (diff % 3600000) / 60000)(left))).padStart(2, '0');
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
        { val: `${teams.length}팀`, label: '참가 팀', color: 'text-amber-400' },
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
      {podiumOrder.map((team, idx) => {
        if (!team) return null;
        const actualRank = team.rank;
        const isFirst = actualRank === 1;
        const isSecond = actualRank === 2;
        const isThird = actualRank === 3;
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
// 팀 순위 행
// ─────────────────────────────────────────────────────────────────
const TeamRow: React.FC<{ team: Team; maxScore: number; myTeamId: string }> = ({
  team, maxScore, myTeamId,
}) => {
  const isMe = team.id === myTeamId;
  const teamConfig = WORKSHOP_TEAMS.find(t => t.id === team.id);

  const rankColor = team.rank === 1 ? 'text-amber-400'
    : team.rank === 2 ? 'text-slate-300'
    : team.rank === 3 ? 'text-amber-700'
    : 'text-slate-500';

  const barColor = team.rank === 1 ? '#F5A623'
    : team.rank === 2 ? '#A8B2C0'
    : team.rank === 3 ? '#CD7F32'
    : isMe ? '#E31837' : '#38BDF8';

  return (
    <div className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl border transition-all ${
      isMe ? 'bg-red-500/8 border-red-500/30 shadow' : 'bg-[#1A2235] border-white/6'
    }`}>
      {/* 순위 */}
      <div className="flex flex-col items-center w-7 flex-shrink-0">
        <span className={`font-bebas text-xl leading-none ${rankColor}`}>{team.rank}</span>
      </div>

      {/* 아바타 */}
      <TeamAvatar shortCode={team.shortCode} color={team.color} size="sm" />

      {/* 팀 정보 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`text-[14px] font-bold truncate ${isMe ? 'text-red-400' : 'text-white'}`}>
            {team.name}
          </span>
          {teamConfig && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0"
              style={{
                background: teamConfig.assignedCourse === 'forest' ? 'rgba(16,185,129,0.15)' : 'rgba(56,189,248,0.15)',
                color: teamConfig.assignedCourse === 'forest' ? '#34D399' : '#38BDF8',
              }}
            >
              {teamConfig.assignedCourse === 'forest' ? '🌲 산림' : '🌊 호수'}
            </span>
          )}
          {isMe && (
            <span className="text-[9px] font-bold bg-red-600 text-white px-1.5 py-0.5 rounded flex-shrink-0">
              우리
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[11px] text-slate-400">
            {team.missionsCompleted}건 완료
          </span>
          <ScoreBar value={team.score} max={maxScore} color={barColor} />
        </div>
      </div>

      {/* 점수 */}
      <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
        <span className="font-bebas text-[17px] text-white leading-none">
          {team.score.toLocaleString()}
          <span className="text-[11px] text-slate-400 ml-0.5">pt</span>
        </span>
        <span className="text-[10px] font-medium text-slate-500">
          {team.memberCount}명 참여
        </span>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// 탭 1: 팀 순위
// ─────────────────────────────────────────────────────────────────
const TeamTab: React.FC<{ teams: Team[]; myTeamId: string }> = ({ teams, myTeamId }) => {
  const maxScore = Math.max(...teams.map(t => t.score), 1);

  return (
    <div className="space-y-2 px-4 pb-28">
      <Podium teams={teams} myTeamId={myTeamId} />
      <div className="flex items-center justify-between mb-1 pt-1">
        <span className="text-[11px] font-bold text-slate-400 tracking-widest uppercase">전체 조 순위</span>
        <span className="text-[11px] text-slate-500">{teams.length}개 조</span>
      </div>
      {teams.map((team) => (
        <TeamRow key={team.id} team={team} maxScore={maxScore} myTeamId={myTeamId} />
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// 탭 2: 미션별 현황 (CHRO 2대 Activity 전용)
// ─────────────────────────────────────────────────────────────────
const MissionTab: React.FC<{
  peopleQuests: Record<string, any>;
  participants: Record<string, any>;
}> = ({ peopleQuests, participants }) => {
  // People Quest 제출 완료 팀 수
  const pqCompletedTeams = useMemo(() => {
    return WORKSHOP_TEAMS.filter(t => peopleQuests[t.id]?.status === 'submitted');
  }, [peopleQuests]);

  // 각 Discovery Quiz 문항별 완료 참가자 수 집계
  const quizStats = useMemo(() => {
    const pList = Object.values(participants);
    return DISCOVERY_QUIZZES.map((quiz, idx) => {
      let completedCount = 0;
      let correctCount = 0;
      pList.forEach((p: any) => {
        if (p?.quizzes && p.quizzes[quiz.id]) {
          completedCount += 1;
          if (p.quizzes[quiz.id].isCorrect) correctCount += 1;
        }
      });
      return {
        quiz,
        idx,
        completedCount,
        correctCount,
      };
    });
  }, [participants]);

  return (
    <div className="px-4 pb-28 space-y-4 pt-2">
      {/* Activity 1: People Quest */}
      <div className="bg-[#1A2235] border border-red-500/30 rounded-2xl p-4 shadow-lg">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">💬</span>
            <div>
              <span className="text-[10px] text-red-400 font-bold uppercase tracking-wider block">Activity 1 · 대화형</span>
              <h3 className="text-[15px] font-bold text-white">People Quest (숨은 인물 2명 추천)</h3>
            </div>
          </div>
          <span className="text-[11px] font-bold text-amber-400">
            +{PEOPLE_QUEST_POINTS_PER_MEMBER}pt/인
          </span>
        </div>

        <p className="text-[12px] text-slate-300 leading-relaxed mb-3">
          조별로 대화를 통해 의외의 취미와 특별한 경험을 가진 동료를 찾아 추천하는 미션입니다.
        </p>

        {/* 진행률 바 */}
        <div className="mb-3">
          <div className="flex justify-between text-[11px] text-slate-400 mb-1">
            <span>조별 제출 완료율</span>
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

        {/* 조별 현황 뱃지 */}
        <div className="grid grid-cols-3 gap-1.5 pt-1">
          {WORKSHOP_TEAMS.map(team => {
            const isDone = peopleQuests[team.id]?.status === 'submitted';
            return (
              <div
                key={team.id}
                className={`p-2 rounded-xl text-center border text-[11px] ${
                  isDone
                    ? 'bg-green-500/15 border-green-500/30 text-green-300 font-bold'
                    : 'bg-black/20 border-white/5 text-slate-500'
                }`}
              >
                {team.emoji} {team.name}: {isDone ? '완료 ✓' : '진행중'}
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
          <span className="text-[11px] text-sky-400 font-bold">문항당 +100pt</span>
        </div>

        {quizStats.map(({ quiz, idx, completedCount, correctCount }) => (
          <div key={quiz.id} className="bg-[#1A2235] border border-white/8 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-bold text-sky-400">
                QUIZ {idx + 1}. {quiz.title}
              </span>
              <span className="text-[10px] text-slate-400">📍 {quiz.locationLabel}</span>
            </div>

            <p className="text-[12px] text-slate-300">{quiz.questionText}</p>

            <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400">
              <span>참가자 풀이: <strong className="text-white">{completedCount}명</strong></span>
              <span>정답 맞힌 인원: <strong className="text-green-400">{correctCount}명</strong></span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// 탭 3: 개인 기여 순위 (실시간 RTDB 반영)
// ─────────────────────────────────────────────────────────────────
const IndividualTab: React.FC<{
  participants: Record<string, any>;
}> = ({ participants }) => {
  const participantName = useAppStore((s) => s.participantName);
  const EMOJIS = ['🔥', '💡', '🤝', '⚖️', '🏆', '🌟', '💪', '🎯'];

  // 개인별 랭킹 리스트 가공
  const individuals = useMemo(() => {
    const list = Object.values(participants).map((p: any, i: number) => ({
      id: p.name || `user_${i}`,
      name: p.name ?? '참가자',
      team: p.teamName ?? '',
      company: p.company ?? '',
      pts: Number(p.score ?? 0),
      missions: Number(p.missionsCompleted ?? 0),
      emoji: EMOJIS[i % EMOJIS.length],
    }));

    // 만약 입장 데이터가 없을 경우 기본 50명 프리셋 표시 (빈 화면 방지)
    if (list.length === 0) {
      return PRE_REGISTERED_PARTICIPANTS.slice(0, 10).map((p, i) => ({
        id: p.id,
        name: p.name,
        team: p.teamName,
        company: p.company,
        pts: 0,
        missions: 0,
        emoji: EMOJIS[i % EMOJIS.length],
        rank: i + 1,
      }));
    }

    return list
      .sort((a, b) => b.pts - a.pts)
      .map((p, i) => ({ ...p, rank: i + 1 }));
  }, [participants]);

  return (
    <div className="px-4 pb-28 space-y-2 pt-2">
      <p className="text-[11px] text-slate-400 text-center mb-3">
        실시간 개인 미션 기여 점수 (People Quest + Discovery Quiz)
      </p>

      {individuals.map((p) => {
        const isMe = !!participantName && p.name.trim() === participantName.trim();
        return (
          <div
            key={p.id}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl border transition-all ${
              isMe ? 'bg-red-500/10 border-red-500/40 shadow' : 'bg-[#1A2235] border-white/6'
            }`}
          >
            <span className={`font-bebas text-xl w-7 text-center ${
              p.rank === 1 ? 'text-amber-400' : p.rank === 2 ? 'text-slate-300' : p.rank === 3 ? 'text-amber-700' : 'text-slate-500'
            }`}>
              {p.rank}
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
              <span className="text-[11px] text-slate-400">{p.team} · {p.missions}미션 완주</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="font-bebas text-[18px] text-white leading-none">
                {p.pts}<span className="text-[11px] text-slate-400 ml-0.5">pt</span>
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// Leaderboard 메인
// ─────────────────────────────────────────────────────────────────
const Leaderboard: React.FC = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabKey>('team');
  const teamsFromStore = useAppStore((s) => s.teams);
  const myTeam = useAppStore((s) => s.myTeam);
  const myTeamId = myTeam?.id ?? '';

  const [realtimeTeams, setRealtimeTeams] = useState<Team[]>(teamsFromStore);
  const [participantsData, setParticipantsData] = useState<Record<string, any>>({});
  const [peopleQuestsData, setPeopleQuestsData] = useState<Record<string, any>>({});

  useEffect(() => {
    const dbUrl = import.meta.env.VITE_FIREBASE_DATABASE_URL || 'https://doosan-teambuilding-default-rtdb.firebaseio.com';

    // 1. 전체 데이터 초기 Fetch & 실시간 집계
    const fetchAndAggregate = async () => {
      try {
        const [pRes, qRes] = await Promise.all([
          fetch(`${dbUrl}/sessions/trekking2026/participants.json`),
          fetch(`${dbUrl}/sessions/trekking2026/peopleQuest.json`),
        ]);

        const participants: Record<string, ParticipantRealtime> | null = pRes.ok ? await pRes.json() : null;
        const quests: Record<string, any> | null = qRes.ok ? await qRes.json() : null;

        if (participants) setParticipantsData(participants);
        if (quests) setPeopleQuestsData(quests);

        const aggregated = new Map<string, Team>();
        teamsFromStore.forEach((team) => {
          aggregated.set(team.id, {
            ...team,
            score: 0,
            memberCount: 0,
            missionsCompleted: 0,
          });
        });

        // 1) 참가자별 점수 & 완료수 합산
        if (participants && typeof participants === 'object') {
          Object.values(participants).forEach((participant) => {
            if (!participant?.teamId) return;
            const teamId = participant.teamId;
            const current = aggregated.get(teamId);
            const participantScore = Number(participant.score ?? 0);
            const participantMissions = Number(participant.missionsCompleted ?? 0);

            if (current) {
              aggregated.set(teamId, {
                ...current,
                memberCount: current.memberCount + 1,
                score: current.score + participantScore,
                missionsCompleted: current.missionsCompleted + participantMissions,
                lastActivity: new Date(),
              });
            }
          });
        }

        // 2) People Quest 팀별 완료 여부 반영
        if (quests && typeof quests === 'object') {
          Object.entries(quests).forEach(([teamId, questData]: [string, any]) => {
            const current = aggregated.get(teamId);
            if (current && questData?.status === 'submitted') {
              // 조별 People Quest 완료 처리
              if (current.missionsCompleted === 0) {
                current.missionsCompleted = 1;
              }
            }
          });
        }

        const rankedTeams = Array.from(aggregated.values())
          .sort((a, b) => b.score - a.score)
          .map((team, i) => ({ ...team, rank: i + 1 }));

        setRealtimeTeams(rankedTeams);
      } catch (err) {
        console.warn('리더보드 집계 실패:', err);
      }
    };

    fetchAndAggregate();
    const interval = setInterval(fetchAndAggregate, 5000); // 5초마다 실시간 최신화

    // Firebase realtime listener
    const pRef = ref(rtdb, 'sessions/trekking2026/participants');
    const unsubscribe = onValue(pRef, () => {
      fetchAndAggregate();
    });

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, [teamsFromStore]);

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
        <StatsRow teams={realtimeTeams} />
        <SessionProgressBar />
      </div>

      {/* 탭 본문 콘텐츠 */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'team'       && <TeamTab teams={realtimeTeams} myTeamId={myTeamId} />}
        {tab === 'mission'    && <MissionTab peopleQuests={peopleQuestsData} participants={participantsData} />}
        {tab === 'individual' && <IndividualTab participants={participantsData} />}
      </div>

      <BottomNav active="/leaderboard" />
    </div>
  );
};

export default Leaderboard;
