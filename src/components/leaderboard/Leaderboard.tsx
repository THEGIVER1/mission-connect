import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { BottomNav } from '../dashboard/Dashboard';
import { LiveBadge, TeamAvatar, ScoreBar } from '../shared';
import { onValue, ref } from 'firebase/database';
import { rtdb } from '../../lib/firebase';
import type { Team } from '../../types';

// ─────────────────────────────────────────────────────────────────
// 탭 타입
// ─────────────────────────────────────────────────────────────────
type TabKey = 'team' | 'mission' | 'individual';

type ParticipantRealtime = {
  teamId?: string;
  teamName?: string;
  score?: number;
  missionsCompleted?: number;
  status?: Team['status'];
};

// ─────────────────────────────────────────────────────────────────
// 세션 타이머
// ─────────────────────────────────────────────────────────────────
function useSessionTimer() {
  const session = useAppStore((s) => s.session);
  const [now, setNow] = React.useState(Date.now());

  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!session) return { h: '00', m: '00', s: '00', pct: 0, urgent: false };

  const total = session.endsAt.getTime() - session.startedAt.getTime();
  const left  = Math.max(0, session.endsAt.getTime() - now);
  const h = String(Math.floor(left / 3600000)).padStart(2, '0');
  const m = String(Math.floor((left % 3600000) / 60000)).padStart(2, '0');
  const s = String(Math.floor((left % 60000) / 1000)).padStart(2, '0');
  const pct = Math.round(((total - left) / total) * 100);
  return { h, m, s, pct, urgent: left < 15 * 60 * 1000 };
}

// ─────────────────────────────────────────────────────────────────
// 통계 카드 행
// ─────────────────────────────────────────────────────────────────
const StatsRow: React.FC<{ teams: Team[] }> = ({ teams }) => {
  const { missions } = useAppStore();
  const timer = useSessionTimer();
  const totalCompleted = teams.reduce((acc, t) => acc + t.missionsCompleted, 0);

  return (
    <div className="grid grid-cols-3 gap-2 px-4 py-3">
      {[
        { val: teams.length,      label: '참가 팀',    color: 'text-amber-400'  },
        { val: totalCompleted,    label: '완료 미션',  color: 'text-green-400'  },
        { val: `${timer.h}:${timer.m}`, label: '남은 시간', color: timer.urgent ? 'text-red-400 animate-pulse' : 'text-red-400' },
      ].map(({ val, label, color }) => (
        <div key={label} className="bg-[#1A2235] border border-white/8 rounded-xl p-3 text-center">
          <div className={`font-bebas text-2xl leading-none ${color}`}>{val}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">{label}</div>
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
      <div className="flex justify-between text-[10px] text-slate-500 mb-1">
        <span>세션 진행률</span>
        <span>{timer.pct}%</span>
      </div>
      <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-1000"
             style={{
               width: `${timer.pct}%`,
               background: timer.urgent
                 ? 'linear-gradient(90deg,#E31837,#FF6B35)'
                 : 'linear-gradient(90deg,#2980B9,#27AE60)',
             }} />
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// 시상대 TOP 3
// ─────────────────────────────────────────────────────────────────
const Podium: React.FC<{ teams: Team[]; myTeamId: string }> = ({ teams, myTeamId }) => {
  const top3 = teams.slice(0, 3);
  // 시상대 순서: 2위 - 1위 - 3위
  const order = [top3[1], top3[0], top3[2]].filter(Boolean);
  const heights = { 0: 'h-12', 1: 'h-16', 2: 'h-9' };   // 2위, 1위, 3위 블록 높이
  const avatarSizes: ('sm' | 'md' | 'lg')[] = ['md', 'lg', 'sm'];
  const medals = ['🥈', '🥇', '🥉'];
  const medalColors = ['#A8B2C0', '#F5A623', '#CD7F32'];
  const blockColors = [
    'bg-slate-500/15 border-slate-500/25',
    'bg-amber-400/20 border-amber-400/30',
    'bg-amber-700/15 border-amber-700/25',
  ];

  return (
    <div className="px-4 pb-3">
      <div className="flex items-end justify-center gap-2">
        {order.map((team, i) => {
          if (!team) return <div key={i} className="flex-1" />;
          const isMe = team.id === myTeamId;
          return (
            <div key={team.id} className="flex flex-col items-center gap-1.5 flex-1">
              {/* 왕관 (1위) */}
              {i === 1 && <span className="text-xl -mb-1">👑</span>}

              {/* 아바타 */}
              <TeamAvatar shortCode={team.shortCode} color={team.color} size={avatarSizes[i]} />

              {/* 이름 */}
              <p className={`text-[11px] font-bold text-center leading-tight truncate w-full px-1
                ${isMe ? 'text-red-400' : 'text-white'}`}>
                {team.name}{isMe ? ' ★' : ''}
              </p>

              {/* 점수 */}
              <p className="text-[11px] text-slate-400 font-bold">
                {team.score.toLocaleString()}pt
              </p>

              {/* 메달 + 시상대 블록 */}
              <div className={`w-full ${heights[i as 0 | 1 | 2]} border rounded-t-lg ${blockColors[i]}
                               flex items-center justify-center`}>
                <span className="text-xl">{medals[i]}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// 팀 순위 행
// ─────────────────────────────────────────────────────────────────
const TeamRow: React.FC<{ team: Team; maxScore: number; myTeamId: string; prevRank?: number }> = ({
  team, maxScore, myTeamId, prevRank,
}) => {
  const isMe     = team.id === myTeamId;
  const rankDiff = prevRank !== undefined ? prevRank - team.rank : 0;

  const rankColor = team.rank === 1 ? 'text-amber-400'
    : team.rank === 2 ? 'text-slate-300'
    : team.rank === 3 ? 'text-amber-700'
    : 'text-slate-500';

  const barColor = team.rank === 1 ? '#F5A623'
    : team.rank === 2 ? '#A8B2C0'
    : team.rank === 3 ? '#CD7F32'
    : isMe ? '#E31837' : '#4A5568';

  const statusConfig = {
    active:   { cls: 'bg-green-500/12 text-green-400',  label: '정상'  },
    sos:      { cls: 'bg-red-500/12   text-red-400',    label: 'SOS'   },
    warning:  { cls: 'bg-amber-500/12 text-amber-400',  label: '경고'  },
    inactive: { cls: 'bg-white/5      text-slate-500',  label: '비활성' },
  }[team.status];

  return (
    <div className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl border transition-all
      ${isMe
        ? 'bg-red-500/8 border-red-500/30'
        : 'bg-[#1A2235] border-white/6'}`}>

      {/* 순위 */}
      <div className="flex flex-col items-center w-7 flex-shrink-0">
        <span className={`font-bebas text-xl leading-none ${rankColor}`}>{team.rank}</span>
        {rankDiff !== 0 && (
          <span className={`text-[9px] font-bold ${rankDiff > 0 ? 'text-green-400' : 'text-red-400'}`}>
            {rankDiff > 0 ? `▲${rankDiff}` : `▼${Math.abs(rankDiff)}`}
          </span>
        )}
      </div>

      {/* 아바타 */}
      <TeamAvatar shortCode={team.shortCode} color={team.color} size="sm" />

      {/* 팀 정보 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={`text-[14px] font-bold truncate ${isMe ? 'text-red-400' : 'text-white'}`}>
            {team.name}
          </span>
          {isMe && (
            <span className="text-[9px] font-bold bg-red-600 text-white px-1.5 py-0.5 rounded flex-shrink-0">
              우리
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[11px] text-slate-500">
            {team.missionsCompleted}/{team.totalMissions} 미션
          </span>
          <ScoreBar value={team.score} max={maxScore} color={barColor} />
        </div>
      </div>

      {/* 점수 & 상태 */}
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <span className="font-bebas text-[17px] text-white leading-none">
          {team.score.toLocaleString()}
          <span className="text-[11px] text-slate-500 ml-0.5">pt</span>
        </span>
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${statusConfig.cls}`}>
          {statusConfig.label}
        </span>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// 탭: 팀 순위
// ─────────────────────────────────────────────────────────────────
const TeamTab: React.FC<{ teams: Team[]; myTeamId: string }> = ({ teams, myTeamId }) => {
  const maxScore = teams[0]?.score ?? 1;

  return (
    <div className="space-y-2 px-4 pb-28">
      <Podium teams={teams} myTeamId={myTeamId} />
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-bold text-slate-500 tracking-widest uppercase">전체 순위</span>
        <span className="text-[11px] text-slate-500">{teams.length}팀 참가</span>
      </div>
      {teams.map((team, i) => (
        <TeamRow key={team.id} team={team} maxScore={maxScore}
                 myTeamId={myTeamId} prevRank={i < 3 ? undefined : team.rank + (i % 2 === 0 ? 1 : -1)} />
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// 탭: 미션별 현황
// ─────────────────────────────────────────────────────────────────
const MissionTab: React.FC = () => {
  const { missions, teams } = useAppStore();

  const missionStats = useMemo(() =>
    missions.map((m) => {
      // 각 미션 완료 팀 수 시뮬레이션
      const completedCount = m.status === 'completed' ? teams.length
        : m.status === 'active'   ? Math.floor(teams.length * 0.6)
        : m.status === 'locked'   ? 0
        : Math.floor(teams.length * 0.3);
      return { ...m, completedCount };
    }),
  [missions, teams]);

  const typeLabel: Record<string, string> = {
    gps:'GPS 인증', ar:'AR 스캔', quiz:'퀴즈', challenge:'챌린지',
  };
  const typeColor: Record<string, string> = {
    gps:'text-green-400 bg-green-500/12', ar:'text-amber-400 bg-amber-500/12',
    quiz:'text-red-400 bg-red-500/12', challenge:'text-red-400 bg-red-500/12',
  };

  return (
    <div className="px-4 pb-28 space-y-3 pt-2">
      {missionStats.map((m) => (
        <div key={m.id} className="bg-[#1A2235] border border-white/8 rounded-2xl p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${typeColor[m.type]}`}>
                {typeLabel[m.type]}
              </span>
              <span className="text-[13px] font-bold text-white">{m.postId} · {m.name}</span>
            </div>
            <span className="text-[11px] font-bold text-amber-400">+{m.points}pt</span>
          </div>

          <p className="text-[11px] text-slate-500 mb-3">{m.locationLabel}</p>

          {/* 완료율 바 */}
          <div className="mb-2">
            <div className="flex justify-between text-[10px] text-slate-500 mb-1">
              <span>팀 완료율</span>
              <span className="font-bold text-white">
                {m.completedCount} / {teams.length}팀
              </span>
            </div>
            <div className="h-2 bg-white/8 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700"
                   style={{
                     width: `${(m.completedCount / teams.length) * 100}%`,
                     background: m.status === 'completed' ? '#27AE60'
                       : m.status === 'locked' ? '#4A5568'
                       : 'linear-gradient(90deg,#E31837,#FF6B35)',
                   }} />
            </div>
          </div>

          {/* 상태 배지 */}
          <div className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full
            ${m.status === 'completed' ? 'bg-green-500/12 text-green-400'
            : m.status === 'active'    ? 'bg-red-500/12 text-red-400'
            : m.status === 'locked'    ? 'bg-white/5 text-slate-500'
            : 'bg-amber-500/12 text-amber-400'}`}>
            <div className={`w-1.5 h-1.5 rounded-full bg-current ${m.status === 'active' ? 'animate-pulse' : ''}`} />
            {m.status === 'completed' ? '전팀 가능' : m.status === 'active' ? '진행중' : m.status === 'locked' ? '잠금' : '대기'}
          </div>
        </div>
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// 탭: 개인 기여 (Mock)
// ─────────────────────────────────────────────────────────────────
const INDIVIDUAL_MOCK_DISABLED = [
  { rank:1, name:'김지훈',  team:'알파 3팀', pts:820, missions:4, emoji:'🔥' },
  { rank:2, name:'이수진',  team:'감마 2팀', pts:780, missions:4, emoji:'💡' },
  { rank:3, name:'박민준',  team:'베타 1팀', pts:750, missions:3, emoji:'🤝' },
  { rank:4, name:'최유리',  team:'감마 2팀', pts:710, missions:3, emoji:'⚖️' },
  { rank:5, name:'정태양',  team:'델타 1팀', pts:680, missions:3, emoji:'🏆' },
  { rank:6, name:'한소희',  team:'알파 3팀', pts:650, missions:3, emoji:'🔥' },
  { rank:7, name:'오성민',  team:'베타 2팀', pts:610, missions:2, emoji:'💡' },
  { rank:8, name:'윤지아',  team:'엡실론 2팀',pts:580,missions:2, emoji:'🤝' },
];

const IndividualTab: React.FC = () => {
  const [individuals, setIndividuals] = React.useState<{rank:number,name:string,team:string,pts:number,missions:number,emoji:string}[]>([]);
  const EMOJIS = ['🔥','💡','🤝','⚖️','🏆','🌟','💪','🎯'];

  React.useEffect(() => {
    const participantsRef = ref(rtdb, 'sessions/trekking2026/participants');
    const unsubscribe = onValue(participantsRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) return;
      const list = Object.values(data as Record<string, any>)
        .map((p: any, i: number) => ({
          name: p.name ?? '참가자',
          team: p.teamName ?? '',
          pts: Number(p.score ?? 0),
          missions: Number(p.missionsCompleted ?? 0),
          emoji: EMOJIS[i % EMOJIS.length],
        }))
        .sort((a, b) => b.pts - a.pts)
        .map((p, i) => ({ ...p, rank: i + 1 }));
      setIndividuals(list);
    });
    return () => unsubscribe();
  }, []);

  return (
  <div className="px-4 pb-28 space-y-2 pt-2">
    <p className="text-[11px] text-slate-500 text-center mb-3">개인 미션 기여 점수 기준</p>
    {individuals.map((p) => (
      <div key={p.rank}
           className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl border
             ${p.name === '김지훈' ? 'bg-red-500/8 border-red-500/30' : 'bg-[#1A2235] border-white/6'}`}>
        <span className={`font-bebas text-xl w-7 text-center
          ${p.rank === 1 ? 'text-amber-400' : p.rank === 2 ? 'text-slate-300' : p.rank === 3 ? 'text-amber-700' : 'text-slate-500'}`}>
          {p.rank}
        </span>
        <div className="w-9 h-9 rounded-xl bg-[#212C42] border border-white/8
                        flex items-center justify-center text-lg flex-shrink-0">
          {p.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className={`text-[14px] font-bold ${p.name === '김지훈' ? 'text-red-400' : 'text-white'}`}>
              {p.name}
            </span>
            {p.name === '김지훈' && (
              <span className="text-[9px] font-bold bg-red-600 text-white px-1.5 py-0.5 rounded">나</span>
            )}
          </div>
          <span className="text-[11px] text-slate-500">{p.team} · {p.missions}미션</span>
        </div>
        <div className="flex flex-col items-end">
          <span className="font-bebas text-[17px] text-white leading-none">
            {p.pts}<span className="text-[11px] text-slate-500 ml-0.5">pt</span>
          </span>
        </div>
      </div>
    ))}
  </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// Leaderboard 메인
// ─────────────────────────────────────────────────────────────────
const Leaderboard: React.FC = () => {
  const navigate  = useNavigate();
  const [tab, setTab] = useState<TabKey>('team');
  const teamsFromStore = useAppStore((s) => s.teams);
  const myTeam = useAppStore((s) => s.myTeam);
  const myTeamId = myTeam?.id ?? '';
  const [realtimeTeams, setRealtimeTeams] = useState<Team[]>(teamsFromStore);

  React.useEffect(() => {
    const participantsRef = ref(rtdb, 'sessions/trekking2026/participants');

    const unsubscribe = onValue(participantsRef, (snapshot) => {
      const participants = snapshot.val() as Record<string, ParticipantRealtime> | null;
      if (!participants) {
        const fallback = [...teamsFromStore]
          .sort((a, b) => b.score - a.score)
          .map((team, i) => ({ ...team, rank: i + 1 }));
        setRealtimeTeams(fallback);
        return;
      }

      const teamBaseMap = new Map(teamsFromStore.map((team) => [team.id, team]));
      const aggregated = new Map<string, Team>();

      Object.values(participants).forEach((participant) => {
        if (!participant?.teamId) return;
        const teamId = participant.teamId;
        const baseTeam = teamBaseMap.get(teamId);
        const current = aggregated.get(teamId);
        const participantScore = Number(participant.score ?? 0);
        const participantMissions = Number(participant.missionsCompleted ?? 0);
        const status = participant.status ?? current?.status ?? baseTeam?.status ?? 'active';

        if (!current) {
          aggregated.set(teamId, {
            id: teamId,
            name: participant.teamName ?? baseTeam?.name ?? teamId.toUpperCase(),
            shortCode: baseTeam?.shortCode ?? teamId.slice(0, 1).toUpperCase(),
            color: baseTeam?.color ?? '#4A5568',
            memberCount: 1,
            score: participantScore,
            rank: 0,
            missionsCompleted: participantMissions,
            totalMissions: baseTeam?.totalMissions ?? 0,
            lastActivity: new Date(),
            status,
          });
          return;
        }

        aggregated.set(teamId, {
          ...current,
          memberCount: current.memberCount + 1,
          score: current.score + participantScore,
          missionsCompleted: current.missionsCompleted + participantMissions,
          status,
          lastActivity: new Date(),
        });
      });

      const rankedTeams = Array.from(aggregated.values())
        .sort((a, b) => b.score - a.score)
        .map((team, i) => ({ ...team, rank: i + 1 }));

      setRealtimeTeams(rankedTeams);
    });

    return () => unsubscribe();
  }, [teamsFromStore]);

  const TABS: { key: TabKey; label: string }[] = [
    { key: 'team',       label: '팀 순위'   },
    { key: 'mission',    label: '미션별'    },
    { key: 'individual', label: '개인 기여' },
  ];

  return (
    <div className="max-w-[390px] mx-auto bg-[#0D1117] min-h-screen flex flex-col">

      {/* 상단 헤더 */}
      <header className="bg-[#13192A] border-b border-white/8 px-4 pt-3 pb-3 relative flex-shrink-0">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-red-600 to-orange-500" />
        <div className="flex items-center justify-between">
          <button onClick={() => navigate('/')}
                  className="w-9 h-9 rounded-xl bg-[#1A2235] border border-white/8
                             flex items-center justify-center text-white text-base">
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

      {/* 탭 */}
      <div className="flex bg-[#13192A] border-b border-white/8 flex-shrink-0">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
                  className={`flex-1 py-2.5 text-[13px] font-bold border-b-2 transition-all
                    ${tab === t.key
                      ? 'text-amber-400 border-amber-400'
                      : 'text-slate-500 border-transparent'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* 통계 & 진행 바 */}
      <div className="flex-shrink-0">
        <StatsRow teams={realtimeTeams} />
        <SessionProgressBar />
      </div>

      {/* 탭 콘텐츠 */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'team'       && <TeamTab teams={realtimeTeams} myTeamId={myTeamId} />}
        {tab === 'mission'    && <MissionTab />}
        {tab === 'individual' && <IndividualTab />}
      </div>

      <BottomNav active="/leaderboard" />
    </div>
  );
};

export default Leaderboard;
