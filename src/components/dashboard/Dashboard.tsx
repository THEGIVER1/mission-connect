import React, { useMemo, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { LiveBadge, Card, ScoreBar } from '../shared';
import { onValue, ref } from 'firebase/database';
import { rtdb } from '../../lib/firebase';
import {
  ACTIVE_VENUE,
  WORKSHOP_TEAMS,
  PEOPLE_QUEST_POINTS_PER_MEMBER,
  getCourseTotalMaxPoints,
  DISCOVERY_QUIZZES,
} from '../../config/workshopConfig';
import { calculateLeaderboardData } from '../../utils/scoreCalculator';
import type { Team } from '../../types';

// ─── 상단 헤더 ────────────────────────────────────────────────
const Header: React.FC = () => {
  const { myTeam, session, participantName, participantCompany } = useAppStore();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeLeft = useMemo(() => {
    if (!session) return '00:00:00';
    const diff = Math.max(0, session.endsAt.getTime() - now);
    const h = String(Math.floor(diff / 3600000)).padStart(2, '0');
    const m = String(Math.floor(((diff % 3600000) / 60000))).padStart(2, '0');
    const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
    return `${h}:${m}:${s}`;
  }, [session, now]);

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

// ─── 점수 & 순위 카드 (실시간 RTDB 동기화 & 개인 점수 노출) ────────
const ScoreCard: React.FC<{
  teamScore: number;
  teamRank: number;
  personalScore: number;
  maxScore: number;
}> = ({ teamScore, teamRank, personalScore, maxScore }) => {
  const { myTeam } = useAppStore();
  const teamConfig = WORKSHOP_TEAMS.find(t => t.id === myTeam?.id);

  return (
    <Card className="mx-4 mt-3 p-3.5 shadow-xl">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
          {myTeam?.name ?? '우리 조'} 실시간 획득 점수
        </span>
        <span className="text-[11px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2.5 py-0.5 rounded-full">
          현재 {teamRank}위 🏆
        </span>
      </div>

      <div className="flex items-end justify-between mb-2">
        <div className="font-['Bebas_Neue'] text-4xl text-white leading-none">
          {teamScore.toLocaleString()}
          <span className="text-red-500 text-2xl ml-1">pt</span>
        </div>
        <div className="text-right">
          <span className="text-[11px] bg-red-500/15 text-red-400 border border-red-500/30 px-2 py-0.5 rounded font-bold block">
            내 기여: {personalScore}pt
          </span>
        </div>
      </div>

      <ScoreBar value={teamScore} max={maxScore} color={teamConfig?.color || '#E31837'} />
    </Card>
  );
};

// ─── 2대 핵심 액티비티 카드 섹션 (실시간 RTDB 상태 연동) ────────
const ActivitySection: React.FC<{
  pqSubmitted: boolean;
  answeredQuizCount: number;
  totalQuizCount: number;
}> = ({ pqSubmitted, answeredQuizCount, totalQuizCount }) => {
  const navigate = useNavigate();

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
          트레킹 대화를 통해 우리 조직의 가장 인상 깊은 동료를 찾아보세요. (추천 인물과 스토리는 저녁 퀴즈 대항전의 핵심 소재가 됩니다)
        </p>

        <div className="flex items-center justify-between text-[11px] pt-2.5 border-t border-white/5">
          <span className="text-slate-400">조별 1명 추천 시 조원당 <strong>+{PEOPLE_QUEST_POINTS_PER_MEMBER}pt</strong></span>
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
            answeredQuizCount >= totalQuizCount
              ? 'bg-green-500/15 text-green-400 border-green-500/30'
              : answeredQuizCount > 0
              ? 'bg-sky-500/15 text-sky-400 border-sky-500/30'
              : 'bg-white/5 text-slate-400 border-white/10'
          }`}>
            {answeredQuizCount >= totalQuizCount ? `✅ ${totalQuizCount}/${totalQuizCount} 완주` : answeredQuizCount > 0 ? `진행 중 (${answeredQuizCount}/${totalQuizCount})` : 'GPS 탐색 중'}
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

// ─── 하단 3개 탭 네비게이션 ──────────────────────────────────
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

// ─── 대시보드 메인 컴포넌트 (실시간 RTDB 양방향 바인딩 & Dual-Channel 동기화) ─────────
const Dashboard: React.FC = () => {
  const {
    myTeam,
    participantName,
    participantCompany,
    selectedCourse,
    updateTeamScore,
    isPeopleQuestSubmitted,
    answeredQuizIds,
    syncSessionData,
    lastResetAt,
    resetLocalProgress,
    setAnsweredQuizIds,
    setPeopleQuestSubmitted,
  } = useAppStore();

  const [liveTeamScore, setLiveTeamScore] = useState<number>(myTeam?.score ?? 0);
  const [liveTeamRank, setLiveTeamRank] = useState<number>(myTeam?.rank ?? 1);
  const [livePersonalScore, setLivePersonalScore] = useState<number>(() => {
    const quizPts = (answeredQuizIds?.length ?? 0) * 100;
    const pqPts = isPeopleQuestSubmitted ? PEOPLE_QUEST_POINTS_PER_MEMBER : 0;
    return quizPts + pqPts;
  });
  const [maxScore, setMaxScore] = useState<number>(100);
  const [pqSubmitted, setPqSubmitted] = useState<boolean>(isPeopleQuestSubmitted || false);
  const [answeredQuizCount, setAnsweredQuizCount] = useState<number>(answeredQuizIds?.length ?? 0);

  const teamId = myTeam?.id ?? 'team1';
  const participantId = participantName && participantCompany
    ? `${participantName.trim()}_${participantCompany}`.replace(/\s/g, '_')
    : 'anonymous';

  const activeCourseQuizzes = DISCOVERY_QUIZZES.filter(q => q.courseKey === 'all' || q.courseKey === selectedCourse);
  const totalQuizCount = activeCourseQuizzes.length;
  const dbUrl = import.meta.env.VITE_FIREBASE_DATABASE_URL || 'https://doosan-teambuilding-default-rtdb.firebaseio.com';

  const processSessionData = (data: any) => {
    if (!data || typeof data !== 'object') return;

    // 0) 관리자 데이터 리셋 감지 시 로컬 캐시 즉시 소거
    if (data.lastResetAt && (!lastResetAt || data.lastResetAt > lastResetAt)) {
      resetLocalProgress(data.lastResetAt);
    }

    const participants = (data.participants && typeof data.participants === 'object') ? data.participants : {};
    const quests = (data.peopleQuest && typeof data.peopleQuest === 'object') ? data.peopleQuest : {};

    // 1) People Quest 상태: RTDB 상태를 단일 진실 공급원으로 바인딩
    const isTeamPqSubmitted = quests[teamId]?.status === 'submitted';
    setPqSubmitted(isTeamPqSubmitted);
    if (!isTeamPqSubmitted && isPeopleQuestSubmitted) {
      setPeopleQuestSubmitted(false);
    }

    // 2) 내 개인 RTDB 참가자 레코드 확인 및 퀴즈 목록 동기화
    let myP = participants[participantId];
    if (!myP && participantName) {
      const trimmedName = participantName.trim();
      myP = Object.values(participants).find((p: any) => (p?.name || '').trim() === trimmedName);
    }

    const answeredIds: string[] = [];
    let pQuizCount = 0;
    if (myP?.quizzes && typeof myP.quizzes === 'object') {
      Object.entries(myP.quizzes).forEach(([qId, q]: [string, any]) => {
        if (q.isCorrect || q.pointsEarned !== undefined) {
          pQuizCount += 1;
          answeredIds.push(qId);
        }
      });
    }

    if (!myP?.quizzes || Object.keys(myP.quizzes).length === 0) {
      if (answeredQuizIds.length > 0) {
        setAnsweredQuizIds([]);
      }
    } else if (answeredIds.length !== answeredQuizIds.length) {
      setAnsweredQuizIds(answeredIds);
    }

    // 3) 통합 점수 계산기 실행 (전체 조 및 참여자 동시 계산)
    const { individuals, teams } = calculateLeaderboardData(
      participants,
      quests,
      {
        name: participantName,
        company: participantCompany,
        teamId,
        answeredQuizIds: answeredIds,
        isPeopleQuestSubmitted: isTeamPqSubmitted,
      }
    );

    const myInd = individuals.find(ind => ind.name.trim() === (participantName || '').trim());
    const personalTotal = myInd ? myInd.pts : (answeredIds.length * 100) + (isTeamPqSubmitted ? PEOPLE_QUEST_POINTS_PER_MEMBER : 0);

    setLivePersonalScore(personalTotal);
    setAnsweredQuizCount(pQuizCount);

    // 4) 내 조 실시간 점수 & 순위 바인딩
    const highest = Math.max(...teams.map(r => r.score), getCourseTotalMaxPoints(selectedCourse));
    setMaxScore(highest);

    const myRankObj = teams.find(r => r.id === teamId);
    if (myRankObj) {
      setLiveTeamScore(myRankObj.score);
      setLiveTeamRank(myRankObj.rank);
      updateTeamScore(teamId, myRankObj.score);
      syncSessionData({
        teams,
        myTeamScore: myRankObj.score,
        myTeamRank: myRankObj.rank,
        myTeamMissionsCompleted: myRankObj.missionsCompleted,
        answeredQuizIds: answeredIds,
        isPeopleQuestSubmitted: isTeamPqSubmitted,
      });
    }
  };

  useEffect(() => {
    // 1) REST 즉시 호출 (빠른 0ms 복원)
    const fetchSessionData = async () => {
      try {
        const res = await fetch(`${dbUrl}/sessions/trekking2026.json?t=${Date.now()}`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          processSessionData(data);
        }
      } catch (err) {
        console.warn('대시보드 REST 폴링 경고:', err);
      }
    };

    fetchSessionData();

    // 2) 2.5초 주기 REST 폴링 백업 (모바일 네트워크 전환 안정화)
    const pollInterval = setInterval(fetchSessionData, 2500);

    // 3) Firebase SDK WebSocket 실시간 리스너
    let unsubscribe = () => {};
    try {
      const sessionRef = ref(rtdb, 'sessions/trekking2026');
      unsubscribe = onValue(
        sessionRef,
        (snapshot) => {
          if (!snapshot.exists()) return;
          const data = snapshot.val();
          processSessionData(data);
        },
        (error) => {
          console.warn('대시보드 실시간 동기화 경고:', error);
        }
      );
    } catch (e) {
      console.warn('Firebase 리스너 등록 경고:', e);
    }

    return () => {
      clearInterval(pollInterval);
      unsubscribe();
    };
  }, [teamId, participantId, selectedCourse, participantName, isPeopleQuestSubmitted]);

  return (
    <div className="max-w-[390px] mx-auto bg-[#0D1117] min-h-screen pb-24 font-['Noto_Sans_KR']">
      <Header />
      <ScoreCard
        teamScore={liveTeamScore}
        teamRank={liveTeamRank}
        personalScore={livePersonalScore}
        maxScore={maxScore}
      />
      <ActivitySection
        pqSubmitted={pqSubmitted}
        answeredQuizCount={answeredQuizCount}
        totalQuizCount={totalQuizCount}
      />
      <BottomNav active="/" />
    </div>
  );
};

export default Dashboard;
export { BottomNav };
