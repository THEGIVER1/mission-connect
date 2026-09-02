import React, { useMemo, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { LiveBadge, Card, ScoreBar } from '../shared';
import { ACTIVE_VENUE, WORKSHOP_TEAMS } from '../../config/workshopConfig';

// ─── 상단 헤더 ────────────────────────────────────────────────
const Header: React.FC = () => {
  const { myTeam, session, participantName, participantCompany } = useAppStore();

  const timeLeft = useMemo(() => {
    if (!session) return '--:--';
    const diff = Math.max(0, session.endsAt.getTime() - Date.now());
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
  }, [session]);

  const teamConfig = WORKSHOP_TEAMS.find(t => t.id === myTeam?.id);

  return (
    <header className="bg-[#13192A] border-b border-white/8 px-4 pt-3 pb-4 relative">
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-red-600 to-orange-500" />

      <div className="flex items-start justify-between mb-2.5">
        <div>
          <h1 className="font-['Bebas_Neue'] text-2xl tracking-widest text-white leading-none">
            2026 CHRO <span className="text-red-500">TREKKING</span>
          </h1>
          <p className="text-[10px] text-slate-400 mt-0.5 tracking-wider">
            {participantName ? `${participantName}님 (${participantCompany})` : 'CHRO Activity Platform'}
          </p>
        </div>
        <LiveBadge />
      </div>

      {/* 이벤트 & 팀/코스 칩 */}
      <div className="flex items-center gap-1.5 mb-3 flex-wrap">
        <span className="flex items-center gap-1 text-[11px] text-slate-300 bg-[#1A2235] border border-white/8 rounded-full px-2.5 py-0.5">
          🌲 {ACTIVE_VENUE.venueName}
        </span>
        {teamConfig && (
          <span className="flex items-center gap-1 text-[11px] font-bold rounded-full px-2.5 py-0.5"
                style={{
                  background: teamConfig.assignedCourse === 'forest' ? 'rgba(16,185,129,0.15)' : 'rgba(56,189,248,0.15)',
                  color: teamConfig.assignedCourse === 'forest' ? '#34D399' : '#38BDF8',
                  border: `1px solid ${teamConfig.assignedCourse === 'forest' ? 'rgba(16,185,129,0.3)' : 'rgba(56,189,248,0.3)'}`,
                }}>
            {teamConfig.emoji} {teamConfig.name} · {teamConfig.courseName} ({teamConfig.courseDistance})
          </span>
        )}
      </div>

      {/* 팀 요약 & 남은 시간 */}
      <div className="flex items-center justify-between bg-black/30 p-2.5 rounded-xl border border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-white shadow"
               style={{ background: teamConfig?.color || '#E31837' }}>
            {myTeam?.shortCode ?? '--'}
          </div>
          <div>
            <p className="text-[10px] text-slate-400">우리 조</p>
            <p className="text-[13px] font-bold text-white leading-tight">{myTeam?.name ?? '—'}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-slate-400">트레킹 잔여 시간</p>
          <p className="text-[13px] font-bold text-amber-400 font-['Bebas_Neue'] tracking-widest">{timeLeft}</p>
        </div>
      </div>
    </header>
  );
};

// ─── 점수 & 순위 카드 ─────────────────────────────────────────
const ScoreCard: React.FC = () => {
  const { myTeam, teams } = useAppStore();
  const maxScore = Math.max(...teams.map(t => t.score), 1);
  const teamConfig = WORKSHOP_TEAMS.find(t => t.id === myTeam?.id);

  return (
    <Card className="mx-4 mt-3 p-3.5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
          {myTeam?.name ?? '우리 조'} 획득 점수
        </span>
        <span className="text-[11px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full">
          현재 {myTeam?.rank ?? 1}위
        </span>
      </div>

      <div className="flex items-end justify-between mb-2">
        <div className="font-['Bebas_Neue'] text-4xl text-white leading-none">
          {myTeam?.score.toLocaleString() ?? '0'}
          <span className="text-red-500 text-2xl ml-1">pt</span>
        </div>
        <span className="text-[11px] text-slate-400">
          활동 미션 2개
        </span>
      </div>

      <ScoreBar value={myTeam?.score ?? 0} max={maxScore} color={teamConfig?.color || '#E31837'} />
    </Card>
  );
};

// ─── 2대 핵심 액티비티 카드 섹션 ───────────────────────────────
const ActivitySection: React.FC = () => {
  const navigate = useNavigate();
  const { myTeam, participantName, participantCompany } = useAppStore();

  const [pqSubmitted, setPqSubmitted] = useState(false);
  const [answeredQuizCount, setAnsweredQuizCount] = useState(0);

  const teamId = myTeam?.id ?? 'team1';
  const participantId = participantName && participantCompany
    ? `${participantName}_${participantCompany}`.replace(/\s/g, '_')
    : 'anonymous';

  const dbUrl = import.meta.env.VITE_FIREBASE_DATABASE_URL || 'https://doosan-teambuilding-default-rtdb.firebaseio.com';

  useEffect(() => {
    // People Quest 상태 확인
    fetch(`${dbUrl}/sessions/trekking2026/peopleQuest/${teamId}.json`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d && d.status === 'submitted') setPqSubmitted(true);
      })
      .catch(() => {});

    // Discovery Quiz 상태 확인
    fetch(`${dbUrl}/sessions/trekking2026/participants/${encodeURIComponent(participantId)}/quizzes.json`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d && typeof d === 'object') setAnsweredQuizCount(Object.keys(d).length);
      })
      .catch(() => {});
  }, [teamId, participantId, dbUrl]);

  return (
    <div className="mx-4 mt-4 space-y-3">
      <div className="flex items-center justify-between px-1">
        <span className="text-[13px] font-bold text-white tracking-wide">
          🎯 오늘의 트레킹 미션 (2개)
        </span>
        <span className="text-[11px] text-slate-400">자유 대화 & 현장 관찰</span>
      </div>

      {/* Activity 1: People Quest */}
      <button
        type="button"
        onClick={() => navigate('/people-quest')}
        className="w-full text-left bg-gradient-to-br from-[#1A2235] to-[#141C2E] border border-red-500/30 hover:border-red-500/60 rounded-2xl p-4 shadow-lg active:scale-98 transition-all relative overflow-hidden"
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-base">
              💬
            </span>
            <div>
              <span className="text-[10px] text-red-400 font-bold uppercase tracking-wider block">Activity 1 · 상시 진행</span>
              <h3 className="text-[16px] font-bold text-white">People Quest</h3>
            </div>
          </div>
          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
            pqSubmitted
              ? 'bg-green-500/15 text-green-400 border-green-500/30'
              : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
          }`}>
            {pqSubmitted ? '✅ 제출 완료' : '대화 진행 중'}
          </span>
        </div>

        <p className="text-[12px] text-slate-300 leading-relaxed mb-3">
          대화를 통해 우리 조직의 숨은 이야기를 가진 사람을 찾아보세요. (추천 인물은 저녁 진진가 퀴즈의 핵심 후보가 됩니다)
        </p>

        <div className="flex items-center justify-between text-[11px] pt-2.5 border-t border-white/5">
          <span className="text-slate-400">GPS 무관 · 2명 추천 시 조원당 <strong>+200pt</strong></span>
          <span className="text-red-400 font-bold flex items-center gap-0.5">
            참여하기 →
          </span>
        </div>
      </button>

      {/* Activity 2: Discovery Quiz */}
      <button
        type="button"
        onClick={() => navigate('/discovery-quiz')}
        className="w-full text-left bg-gradient-to-br from-[#1A2235] to-[#121B2C] border border-sky-500/30 hover:border-sky-500/60 rounded-2xl p-4 shadow-lg active:scale-98 transition-all relative overflow-hidden"
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-base">
              🧭
            </span>
            <div>
              <span className="text-[10px] text-sky-400 font-bold uppercase tracking-wider block">Activity 2 · 현장 GPS</span>
              <h3 className="text-[16px] font-bold text-white">Discovery Quiz</h3>
            </div>
          </div>
          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
            answeredQuizCount >= 5
              ? 'bg-green-500/15 text-green-400 border-green-500/30'
              : answeredQuizCount > 0
              ? 'bg-sky-500/15 text-sky-400 border-sky-500/30'
              : 'bg-white/5 text-slate-400 border-white/10'
          }`}>
            {answeredQuizCount >= 5 ? '✅ 5/5 완주' : answeredQuizCount > 0 ? `진행 중 (${answeredQuizCount}/5)` : 'GPS 탐색 중'}
          </span>
        </div>

        <p className="text-[12px] text-slate-300 leading-relaxed mb-3">
          지정된 장소에 도착해 현장 안내판과 시설 정보를 확인하고 가볍게 퀴즈를 풀어보세요.
        </p>

        <div className="flex items-center justify-between text-[11px] pt-2.5 border-t border-white/5">
          <span className="text-slate-400">GPS 현장 인증 · 정답 문항당 <strong>+100pt</strong></span>
          <span className="text-sky-400 font-bold flex items-center gap-0.5">
            퀴즈 풀기 →
          </span>
        </div>
      </button>

      {/* 하단 기획 안내 문구 */}
      <div className="bg-[#121826] border border-white/5 rounded-xl p-3 text-[11px] text-slate-400 leading-relaxed">
        💡 <strong>트레킹 활동 안내</strong><br />
        트레킹 중 미션은 두 가지입니다. <strong>People Quest</strong>는 이동하며 자유롭게 대화해 수행하고, <strong>Discovery Quiz</strong>는 코스 내 지정 장소에 도착하면 참여할 수 있습니다.
      </div>
    </div>
  );
};

// ─── 하단 3개 탭 네비게이션 (초간결화) ─────────────────────────
const BottomNav: React.FC<{ active: string }> = ({ active }) => {
  const navigate = useNavigate();
  const NAV = [
    { key: '/',            icon: '🏠', label: '홈' },
    { key: '/map',         icon: '🗺️', label: '코스지도' },
    { key: '/leaderboard', icon: '🏆', label: '실시간순위' },
  ];
  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-[390px] mx-auto bg-[#13192A] border-t border-white/8 flex justify-around items-center py-2.5 pb-5 z-40">
      {NAV.map((n) => (
        <button
          key={n.key}
          onClick={() => navigate(n.key)}
          className={`flex flex-col items-center gap-1 px-5 transition-opacity ${
            active === n.key ? 'opacity-100 font-bold' : 'opacity-40'
          }`}
        >
          <span className="text-xl">{n.icon}</span>
          <span className={`text-[11px] ${active === n.key ? 'text-red-400 font-bold' : 'text-slate-400'}`}>
            {n.label}
          </span>
        </button>
      ))}
    </nav>
  );
};

// ─── 대시보드 페이지 ─────────────────────────────────────────
const Dashboard: React.FC = () => {
  return (
    <div className="max-w-[390px] mx-auto bg-[#0D1117] min-h-screen pb-24 font-['Noto_Sans_KR']">
      <Header />
      <ScoreCard />
      <ActivitySection />
      <BottomNav active="/" />
    </div>
  );
};

export default Dashboard;
export { BottomNav };
