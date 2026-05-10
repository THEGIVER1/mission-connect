import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { LiveBadge, SectionTitle, Card, PointsBadge, MissionStatusBadge, ScoreBar } from '../shared';
import type { Mission } from '../../types';

// ─── 상단 헤더 ────────────────────────────────────────────────
const Header: React.FC = () => {
  const { myTeam, session } = useAppStore();
  const timeLeft = useMemo(() => {
    if (!session) return '--:--';
    const diff = Math.max(0, session.endsAt.getTime() - Date.now());
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
  }, [session]);

  return (
    <header className="bg-[#13192A] border-b border-white/8 px-5 pt-3 pb-4 relative">
      {/* 브랜드 레드 라인 */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-red-600 to-orange-500" />

      <div className="flex items-start justify-between mb-3">
        <div>
          <h1 className="font-['Bebas_Neue'] text-3xl tracking-widest text-white leading-none">
            MISSION<span className="text-red-500">.</span>CONNECT
          </h1>
          <p className="text-[10px] text-slate-500 tracking-[2px] uppercase mt-0.5">Team Building Platform</p>
        </div>
        <LiveBadge />
      </div>

      {/* 이벤트 컨텍스트 칩 */}
      <div className="flex gap-2 mb-3">
        <span className="flex items-center gap-1.5 text-[11px] text-slate-400 bg-[#1A2235] border border-white/8 rounded-full px-3 py-1">
          ⚾ <strong className="text-white">두산경영연구원</strong>
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-slate-400 bg-[#1A2235] border border-white/8 rounded-full px-3 py-1">
          🧪 <strong className="text-white">HR 트레킹 워크샵</strong>
        </span>
      </div>

      {/* 팀 & 진행률 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-red-600 flex items-center justify-center text-sm font-bold text-white">
            {myTeam?.shortCode ?? '--'}
          </div>
          <div>
            <p className="text-[11px] text-slate-500">나의 팀</p>
            <p className="text-[15px] font-bold text-white leading-tight">{myTeam?.name ?? '—'}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-slate-500">남은 시간</p>
          <p className="text-[13px] font-bold text-amber-400 font-['Bebas_Neue'] tracking-widest">{timeLeft}</p>
        </div>
      </div>

      {/* 진행률 바 */}
      <div className="mt-2.5">
        <div className="flex justify-between text-[10px] text-slate-500 mb-1">
          <span>진행률</span>
          <span className="text-green-400 font-bold">
            {myTeam?.missionsCompleted ?? 0} / {myTeam?.totalMissions ?? 8} 미션 완료
          </span>
        </div>
        <div className="h-1 bg-white/8 rounded-full overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-red-600 to-orange-500 transition-all duration-700"
               style={{ width: `${((myTeam?.missionsCompleted ?? 0) / (myTeam?.totalMissions ?? 8)) * 100}%` }} />
        </div>
      </div>
    </header>
  );
};

// ─── 실시간 점수 & 순위 카드 ─────────────────────────────────
const ScoreCard: React.FC = () => {
  const { myTeam, teams } = useAppStore();
  const topTeams = teams.slice(0, 5);  // 리더보드: 5팀 모두 표시
  const maxScore = teams[0]?.score ?? 1;

  return (
    <Card className="mx-4 mt-4 p-4">
      {/* 배경 글로우 */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full -translate-y-8 translate-x-8 pointer-events-none" />

      <p className="text-[11px] text-slate-500 uppercase tracking-widest mb-1">우리 팀 현재 점수</p>
      <div className="flex items-end justify-between mb-3">
        <div>
          <div className="font-['Bebas_Neue'] text-5xl text-white leading-none">
            {myTeam?.score.toLocaleString() ?? '—'}
            <span className="text-red-500 text-3xl">pt</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[11px] text-green-400 font-bold">▲ +120</span>
            <span className="text-[11px] text-slate-500">최근 미션 획득</span>
          </div>
        </div>
        <div className="bg-amber-400 text-amber-900 rounded-xl px-4 py-2 text-center flex flex-col">
          <span className="text-[10px] font-bold">현재 순위</span>
          <span className="font-['Bebas_Neue'] text-3xl leading-none">{myTeam?.rank ?? '—'}위</span>
          <span className="text-[9px]">/ {teams.length}팀</span>
        </div>
      </div>

      {/* 미니 리더보드 TOP 3 */}
      <div className="space-y-1.5">
        {topTeams.map((team) => (
          <div key={team.id}
               className={`flex items-center gap-2 px-2 py-1.5 rounded-lg ${team.id === myTeam?.id ? 'bg-red-500/10 border border-red-500/20' : 'bg-white/4'}`}>
            <span className="text-xs font-bold text-slate-500 w-4">{team.rank}</span>
            <span className={`text-[13px] font-bold flex-1 ${team.id === myTeam?.id ? 'text-red-400' : 'text-white'}`}>
              {team.name}{team.id === myTeam?.id ? ' ← 우리' : ''}
            </span>
            <ScoreBar value={team.score} max={maxScore}
                      color={team.id === myTeam?.id ? '#E31837' : '#F5A623'} />
            <span className="text-[13px] font-bold text-amber-400 w-20 text-right">
              {team.score.toLocaleString()}pt
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
};

// ─── 미션 카드 ────────────────────────────────────────────────
const MissionCard: React.FC<{ mission: Mission; onClick: () => void }> = ({ mission, onClick }) => {
  const TYPE_CONFIG = {
    gps:       { icon: '📍', bgClass: 'bg-green-500/15', borderColor: 'rgba(39,174,96,0.3)'  },
    ar:        { icon: '📷', bgClass: 'bg-amber-500/12', borderColor: 'rgba(245,166,35,0.3)' },
    quiz:      { icon: '🎯', bgClass: 'bg-red-500/12',   borderColor: 'rgba(227,24,55,0.3)'  },
    challenge: { icon: '🎯', bgClass: 'bg-red-500/12',   borderColor: 'rgba(227,24,55,0.3)'  },
  };
  const cfg = TYPE_CONFIG[mission.type];
  const isLocked = mission.status === 'locked';

  return (
    <button onClick={onClick} disabled={isLocked}
            className={`bg-[#1A2235] border rounded-2xl p-4 text-left relative overflow-hidden transition-transform active:scale-95 ${isLocked ? 'opacity-50' : ''}`}
            style={{ borderColor: cfg.borderColor }}>
      <PointsBadge points={mission.points} />
      <div className={`w-10 h-10 rounded-xl ${cfg.bgClass} flex items-center justify-center text-xl mb-2 mt-1`}>
        {isLocked ? '🔒' : cfg.icon}
      </div>
      <p className="text-[13px] font-bold text-white mb-1 leading-snug">{mission.name}</p>
      <p className="text-[11px] text-slate-500 leading-snug mb-2">{mission.locationLabel}</p>
      <MissionStatusBadge status={mission.status} />
    </button>
  );
};

// ─── GPS 메인 CTA 버튼 ────────────────────────────────────────
const GpsCTA: React.FC = () => {
  const navigate = useNavigate();
  const activeMission = useAppStore((s) => s.missions.find((m) => m.status === 'active'));

  if (!activeMission) return null;

  return (
    <button onClick={() => navigate('/map')}
            className="mx-4 mt-3 w-[calc(100%-2rem)] bg-green-600 text-white font-bold text-[15px] rounded-2xl py-4
                       flex items-center justify-center gap-2 relative overflow-hidden active:scale-98 transition-transform">
      <span className="relative z-10">📍 GPS 미션 포스트 도착 확인</span>
      {/* shimmer */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/8 to-transparent animate-[shimmer_2.5s_infinite]" />
    </button>
  );
};

// ─── 공지 섹션 ────────────────────────────────────────────────
const NoticeSection: React.FC = () => {
  const notices = useAppStore((s) => s.notices.slice(0, 3));

  return (
    <Card className="mx-4">
      <div className="flex items-center justify-between px-4 py-3 bg-[#212C42] border-b border-white/8">
        <div className="flex items-center gap-2">
          <span className="text-base">📢</span>
          <span className="text-[13px] font-bold text-white">실시간 공지</span>
          <span className="text-[10px] font-bold bg-red-600 text-white px-1.5 py-0.5 rounded-full">
            {notices.length}
          </span>
        </div>
        <span className="text-[10px] text-slate-500">업데이트됨</span>
      </div>
      {notices.map((n, i) => (
        <div key={n.id} className={`px-4 py-3 ${i < notices.length - 1 ? 'border-b border-white/8' : ''}`}>
          <p className="text-[10px] text-red-400 font-bold tracking-wide mb-1">
            {i === 0 ? '🔴 운영본부 · 긴급' : '운영본부'}
          </p>
          <p className="text-[13px] text-white leading-snug">{n.message}</p>
          <p className="text-[10px] text-slate-500 mt-1">
            {i === 0 ? '방금 전' : `${Math.floor((Date.now() - n.sentAt.getTime()) / 60000)}분 전`}
          </p>
        </div>
      ))}
    </Card>
  );
};

// ─── 하단 네비게이션 ─────────────────────────────────────────
const BottomNav: React.FC<{ active: string }> = ({ active }) => {
  const navigate = useNavigate();
  const NAV = [
    { key:'/',           icon:'🏠', label:'홈'   },
    { key:'/map',        icon:'🗺️', label:'지도' },
    { key:'/ar',         icon:'📷', label:'AR'   },
    { key:'/leaderboard',icon:'🏆', label:'순위' },
    { key:'/profile',    icon:'👤', label:'내 정보' },
  ];
  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-[390px] mx-auto bg-[#13192A] border-t border-white/8 flex justify-around items-center py-2.5 pb-5">
      {NAV.map((n) => (
        <button key={n.key} onClick={() => navigate(n.key)}
                className={`flex flex-col items-center gap-1 px-4 transition-opacity ${active === n.key ? 'opacity-100' : 'opacity-40'}`}>
          <span className="text-xl">{n.icon}</span>
          <span className={`text-[10px] font-medium ${active === n.key ? 'text-red-400' : 'text-slate-500'}`}>
            {n.label}
          </span>
        </button>
      ))}
    </nav>
  );
};

// ─── 대시보드 페이지 (조립) ───────────────────────────────────
const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const missions = useAppStore((s) => s.missions);

  return (
    <div className="max-w-[390px] mx-auto bg-[#0D1117] min-h-screen pb-24 font-['Noto_Sans_KR']">
      <Header />
      <ScoreCard />

      <SectionTitle action={<button className="text-[10px] text-red-400 font-bold">전체보기</button>}>
        활성 미션
      </SectionTitle>
      <div className="px-4 grid grid-cols-2 gap-2.5 mb-3">
        {missions.map((m) => (
          <MissionCard key={m.id} mission={m}
                       onClick={() => {
                         if (m.type === 'ar') navigate('/ar');
                         else navigate('/map');
                       }} />
        ))}
      </div>

      <GpsCTA />

      <SectionTitle>운영본부 공지</SectionTitle>
      <NoticeSection />

      <BottomNav active="/" />
    </div>
  );
};

export default Dashboard;
export { BottomNav };
