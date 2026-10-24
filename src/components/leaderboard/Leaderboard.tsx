import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { BottomNav } from '../dashboard/Dashboard';
import { LiveBadge, ScoreBar, AnimatedScoreCounter } from '../shared';
import { onValue, ref } from 'firebase/database';
import { rtdb, FIREBASE_DB_URL } from '../../lib/firebase';
import {
  WORKSHOP_TEAMS,
  PEOPLE_QUEST_POINTS_PER_MEMBER,
  THEME_GARDEN_MISSION,
  IS_PILOT_MODE,
  PHOTO_VOTE_POINTS_PER_VOTE,
  getFinalGatheringInfo,
} from '../../config/workshopConfig';
import {
  calculateLeaderboardData,
  normalizeTeamId,
  isPqSubmittedForTeam,
  isThemeGardenDoneForTeam,
  getPqForTeam,
  calculatePhotoVoteCounts,
} from '../../utils/scoreCalculator';
import type { Team } from '../../types';

type TabKey = 'team' | 'mission';

// ─────────────────────────────────────────────────────────────────
// 최종 집결 시간 (매일 14:20 기준) 타이머
// ─────────────────────────────────────────────────────────────────
function useSessionTimer() {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const { remainingMs, formattedTimeLeft } = getFinalGatheringInfo(now);
  const [h, m, s] = formattedTimeLeft.split(':');
  return { h, m, s, urgent: remainingMs > 0 && remainingMs < 15 * 60 * 1000, done: remainingMs === 0 };
}

// ─────────────────────────────────────────────────────────────────
// 통계 카드 행
// ─────────────────────────────────────────────────────────────────
const StatsRow: React.FC<{ teams: Team[] }> = ({ teams }) => {
  const timer = useSessionTimer();
  const totalCompleted = teams.reduce((acc, t) => acc + (t.missionsCompleted || 0), 0);

  return (
    <div className="grid grid-cols-3 gap-2 px-4 py-3">
      {[
        { val: `${teams.length}개 조`, label: '참가 조', color: 'text-amber-400' },
        { val: `${totalCompleted}건`, label: '완료 미션', color: 'text-green-400' },
        {
          val: timer.done ? '집결 완료' : `${timer.h}:${timer.m}:${timer.s}`,
          label: '14:20 집결까지',
          color: timer.urgent ? 'text-red-400 animate-pulse' : 'text-sky-400 font-mono',
        },
      ].map(({ val, label, color }) => (
        <div key={label} className="bg-[#1A2235] border border-white/8 rounded-xl p-2.5 text-center shadow">
          <div className={`font-bebas text-2xl leading-none ${color}`}>{val}</div>
          <div className="text-[12px] text-slate-400 mt-1">{label}</div>
        </div>
      ))}
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
    <div className="flex items-end justify-center gap-2 py-3 px-2">
      {podiumOrder.map((team) => {
        if (!team) return null;
        const actualRank = team.rank;
        const isFirst = actualRank === 1;
        const isSecond = actualRank === 2;
        const isMe = team.id === myTeamId;

        const heights = isFirst ? 'h-26' : isSecond ? 'h-20' : 'h-16';
        const bgColors = isFirst
          ? 'bg-gradient-to-t from-amber-500/25 via-amber-500/10 to-amber-500/5 border-amber-400/50 shadow-lg'
          : isSecond
          ? 'bg-gradient-to-t from-slate-400/20 to-slate-400/5 border-slate-400/30'
          : 'bg-gradient-to-t from-amber-700/20 to-amber-700/5 border-amber-700/30';

        return (
          <div key={team.id} className="flex-1 flex flex-col items-center max-w-[105px]">
            <div className={`w-full border rounded-t-2xl flex flex-col items-center justify-between p-2 ${heights} ${bgColors} ${isMe ? 'ring-2 ring-red-500 ring-offset-2 ring-offset-[#0D1117]' : ''}`}>
              <span className={`font-bebas text-xl font-bold ${
                isFirst ? 'text-amber-300' : isSecond ? 'text-slate-300' : 'text-amber-600'
              }`}>
                {actualRank}위
              </span>
              <div className="text-center w-full">
                <p className="text-[14px] font-bold text-white truncate">{team.name}</p>
                <div className="font-bebas text-amber-300 text-[14px]">
                  <AnimatedScoreCounter value={team.score} className="text-amber-300" />pt
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// 탭 1: 조별 순위
// ─────────────────────────────────────────────────────────────────
const TeamTab: React.FC<{ teams: Team[]; myTeamId: string; photoVotes: Record<string, any> }> = ({ teams, myTeamId, photoVotes }) => {
  const maxScore = useMemo(() => Math.max(...teams.map(t => t.score), 200), [teams]);

  const voteCounts = useMemo(() => {
    return calculatePhotoVoteCounts(photoVotes);
  }, [photoVotes]);

  const prevRanksRef = useRef<Record<string, number>>({});
  const [rankDiffs, setRankDiffs] = useState<Record<string, number>>({});

  useEffect(() => {
    const diffs: Record<string, number> = {};
    teams.forEach(t => {
      const prev = prevRanksRef.current[t.id];
      if (prev !== undefined && prev !== t.rank) {
        diffs[t.id] = prev - t.rank;
      }
      prevRanksRef.current[t.id] = t.rank;
    });

    if (Object.keys(diffs).length > 0) {
      setRankDiffs(diffs);
      const timer = setTimeout(() => setRankDiffs({}), 3500);
      return () => clearTimeout(timer);
    }
  }, [teams]);

  return (
    <div className="px-4 pb-28 space-y-3 pt-1">
      <Podium teams={teams} myTeamId={myTeamId} />

      <div className="space-y-2">
        {teams.map((team) => {
          const isMe = team.id === myTeamId;
          const teamConfig = WORKSHOP_TEAMS.find(t => t.id === team.id);
          const diff = rankDiffs[team.id];
          const isFullCompleted = (team.missionsCompleted || 0) >= 2;
          const votes = voteCounts[team.id] || 0;

          return (
            <div
              key={team.id}
              className={`p-3.5 rounded-2xl border transition-all ${
                isMe
                  ? 'bg-[#1D2538] border-red-500/50 shadow-lg'
                  : team.rank === 1
                  ? 'bg-gradient-to-r from-[#1A2235] to-[#252018] border-amber-500/40 shadow-md'
                  : 'bg-[#1A2235] border-white/8'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="flex flex-col items-center justify-center w-6">
                    <span className={`font-bebas text-xl leading-none ${
                      team.rank === 1 ? 'text-amber-400 font-bold' : 'text-slate-400'
                    }`}>
                      {team.rank}
                    </span>
                    {diff !== undefined && diff !== 0 && (
                      <span className={`text-[11px] font-extrabold leading-none mt-0.5 ${
                        diff > 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {diff > 0 ? `▲${diff}` : `▼${Math.abs(diff)}`}
                      </span>
                    )}
                  </div>

                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-white"
                    style={{ background: teamConfig?.color || '#E31837' }}
                  >
                    {team.shortCode}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <strong className="text-[16px] text-white">{team.name}</strong>
                      {isMe && (
                        <span className="text-[11.5px] bg-red-600 text-white px-1.5 py-0.5 rounded font-bold">
                          우리 조
                        </span>
                      )}
                      {isFullCompleted && (
                        <span className="text-[11.5px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded font-bold">
                          완주
                        </span>
                      )}
                      {votes > 0 && (
                        <span className="text-[11.5px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1.5 py-0.5 rounded font-bold">
                          사진 {votes}표 (+{votes * PHOTO_VOTE_POINTS_PER_VOTE}pt)
                        </span>
                      )}
                    </div>
                    <span className="text-[12.5px] text-slate-400">
                      {teamConfig?.courseName}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-bebas text-2xl text-white flex items-baseline justify-end">
                    <AnimatedScoreCounter value={team.score} className="text-white" />
                    <span className="text-red-500 text-sm ml-0.5">pt</span>
                  </div>
                  <span className="text-[12px] text-slate-400 block">
                    미션 {team.missionsCompleted}/2 완료
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
// 탭 2: 미션별 현황
// ─────────────────────────────────────────────────────────────────
const MissionTab: React.FC<{
  peopleQuests: Record<string, any>;
  themeGardenPhotos: Record<string, any>;
  photoVotes: Record<string, any>;
}> = ({ peopleQuests, themeGardenPhotos, photoVotes }) => {
  const isPeopleQuestSubmitted = useAppStore((s) => s.isPeopleQuestSubmitted);
  const isThemeGardenSubmitted = useAppStore((s) => s.isThemeGardenSubmitted);
  const myTeam = useAppStore((s) => s.myTeam);
  const [zoomPhotoUrl, setZoomPhotoUrl] = useState<string | null>(null);

  const voteCounts = useMemo(() => {
    return calculatePhotoVoteCounts(photoVotes);
  }, [photoVotes]);

  const pqCompletedTeams = useMemo(() => {
    return WORKSHOP_TEAMS.filter(t => {
      const isSub = isPqSubmittedForTeam(t.id, peopleQuests);
      const isMyTeamSub = t.id === normalizeTeamId(myTeam?.id) && isPeopleQuestSubmitted;
      return isSub || isMyTeamSub;
    });
  }, [peopleQuests, myTeam?.id, isPeopleQuestSubmitted]);

  const themeCompletedTeams = useMemo(() => {
    return WORKSHOP_TEAMS.filter(t => {
      const isDone = isThemeGardenDoneForTeam(t.id, themeGardenPhotos);
      const isMyTeamDone = t.id === normalizeTeamId(myTeam?.id) && isThemeGardenSubmitted;
      return isDone || isMyTeamDone;
    });
  }, [themeGardenPhotos, myTeam?.id, isThemeGardenSubmitted]);

  return (
    <div className="px-4 pb-28 space-y-4 pt-2">
      {/* 미션 1: 최고의 스토리 동료 추천 */}
      <div className="bg-[#1A2235] border border-red-500/30 rounded-2xl p-4 shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[16.5px] font-bold text-white">1. 최고의 스토리 동료 추천</h3>
          <span className="text-[13px] font-bold text-amber-400">
            조별 +{PEOPLE_QUEST_POINTS_PER_MEMBER}pt ({pqCompletedTeams.length}/6조 완료)
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {WORKSHOP_TEAMS.map(team => {
            const pq = getPqForTeam(team.id, peopleQuests);
            const isMyTeam = team.id === normalizeTeamId(myTeam?.id);
            const isSubmitted = isPqSubmittedForTeam(team.id, peopleQuests) || (isMyTeam && isPeopleQuestSubmitted);
            const recName = pq?.recommendation?.recommendedPersonName;

            return (
              <div
                key={team.id}
                className={`p-2.5 rounded-xl border text-left text-[13px] ${
                  isSubmitted
                    ? 'bg-green-500/15 border-green-500/30 text-green-300'
                    : 'bg-black/20 border-white/5 text-slate-500'
                }`}
              >
                <div className="flex justify-between items-center mb-0.5">
                  <span className="font-bold text-white">{team.name}</span>
                  <span className="text-[12px] font-bold">
                    {isSubmitted ? '완료' : '대기'}
                  </span>
                </div>
                <p className="text-[12.5px] text-slate-300 truncate">
                  {recName ? `${recName} 님 추천` : '미작성'}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* 미션 2: 조별 단체사진 */}
      <div className="bg-[#1A2235] border border-pink-500/30 rounded-2xl p-4 shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[16.5px] font-bold text-white">
            {IS_PILOT_MODE ? '2. 두산 저수지 단체사진' : '2. 테마가든 단체사진'}
          </h3>
          <span className="text-[13px] font-bold text-amber-400">
            조별 +{THEME_GARDEN_MISSION.pointsPerMember}pt ({themeCompletedTeams.length}/6조 완료)
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {WORKSHOP_TEAMS.map(team => {
            const photoRec = themeGardenPhotos[team.id] || themeGardenPhotos[normalizeTeamId(team.id)];
            const isMyTeam = team.id === normalizeTeamId(myTeam?.id);
            const isDone = isThemeGardenDoneForTeam(team.id, themeGardenPhotos) || (isMyTeam && isThemeGardenSubmitted);
            const votes = voteCounts[team.id] || 0;

            return (
              <div
                key={team.id}
                className={`p-2.5 rounded-xl border text-left text-[13px] flex flex-col justify-between ${
                  isDone
                    ? 'bg-pink-950/20 border-pink-500/40 text-pink-200'
                    : 'bg-black/20 border-white/5 text-slate-500'
                }`}
              >
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="font-bold text-white">{team.name}</span>
                    <span className="text-[12px] font-bold text-amber-300">
                      {votes > 0 ? `${votes}표 (+${votes * PHOTO_VOTE_POINTS_PER_VOTE}pt)` : isDone ? '완료' : '미등록'}
                    </span>
                  </div>

                  {photoRec?.photoUrl ? (
                    <div
                      onClick={() => setZoomPhotoUrl(photoRec.photoUrl)}
                      className="relative rounded-lg overflow-hidden border border-pink-500/40 cursor-pointer group h-20 bg-black/50"
                    >
                      <img
                        src={photoRec.photoUrl}
                        alt={`${team.name} 단체사진`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  ) : (
                    <div className="h-20 rounded-lg bg-black/30 border border-dashed border-white/10 flex items-center justify-center text-slate-500 text-[12px]">
                      대기 중
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {zoomPhotoUrl && (
        <div
          onClick={() => setZoomPhotoUrl(null)}
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 animate-fade-in select-none"
        >
          <div className="relative max-w-lg w-full max-h-[90vh] flex flex-col items-center">
            <img
              src={zoomPhotoUrl}
              alt="확대 사진"
              className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl border border-white/20"
            />
            <button
              onClick={() => setZoomPhotoUrl(null)}
              className="mt-3 px-5 py-2 bg-white/20 hover:bg-white/30 text-white rounded-full text-xs font-bold"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// Leaderboard 메인 (조별 순위 & 미션 현황)
// ─────────────────────────────────────────────────────────────────
const Leaderboard: React.FC = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabKey>('team');
  const myTeam = useAppStore((s) => s.myTeam);
  const participantName = useAppStore((s) => s.participantName);
  const participantCompany = useAppStore((s) => s.participantCompany);
  const answeredQuizIds = useAppStore((s) => s.answeredQuizIds || []);
  const isPeopleQuestSubmitted = useAppStore((s) => s.isPeopleQuestSubmitted);
  const lastResetAt = useAppStore((s) => s.lastResetAt);
  const resetLocalProgress = useAppStore((s) => s.resetLocalProgress);
  const syncSessionData = useAppStore((s) => s.syncSessionData);
  const myTeamId = normalizeTeamId(myTeam?.id);

  const [participantsData, setParticipantsData] = useState<Record<string, any>>({});
  const [peopleQuestsData, setPeopleQuestsData] = useState<Record<string, any>>({});
  const [themeGardenPhotosData, setThemeGardenPhotosData] = useState<Record<string, any>>({});
  const [photoVotesData, setPhotoVotesData] = useState<Record<string, any>>({});
  const dbUrl = FIREBASE_DB_URL;

  const isMyTeamPqSubmitted = useMemo(() => {
    return isPqSubmittedForTeam(myTeamId, peopleQuestsData) || isPeopleQuestSubmitted;
  }, [myTeamId, peopleQuestsData, isPeopleQuestSubmitted]);

  const { teams: computedTeams } = useMemo(() => {
    return calculateLeaderboardData(
      participantsData,
      peopleQuestsData,
      {
        name: participantName,
        company: participantCompany,
        teamId: myTeamId || null,
        answeredQuizIds,
        isPeopleQuestSubmitted: isMyTeamPqSubmitted,
      },
      themeGardenPhotosData,
      photoVotesData
    );
  }, [
    participantsData,
    peopleQuestsData,
    themeGardenPhotosData,
    photoVotesData,
    participantName,
    participantCompany,
    myTeamId,
    answeredQuizIds,
    isMyTeamPqSubmitted,
  ]);

  useEffect(() => {
    syncSessionData({ teams: computedTeams });
  }, [computedTeams, syncSessionData]);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await fetch(`${dbUrl}/sessions/trekking2026.json?t=${Date.now()}`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data && typeof data === 'object') {
            if (data.lastResetAt && (!lastResetAt || data.lastResetAt > lastResetAt)) {
              resetLocalProgress(data.lastResetAt);
            }
            setParticipantsData(data.participants || {});
            setPeopleQuestsData(data.peopleQuest || {});
            setThemeGardenPhotosData(data.themeGardenPhotos || {});
            setPhotoVotesData(data.photoVotes || {});
          }
        }
      } catch (err) {
        console.warn('리더보드 조회 경고:', err);
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
            if (data.lastResetAt && (!lastResetAt || data.lastResetAt > lastResetAt)) {
              resetLocalProgress(data.lastResetAt);
            }
            setParticipantsData(data.participants || {});
            setPeopleQuestsData(data.peopleQuest || {});
            setThemeGardenPhotosData(data.themeGardenPhotos || {});
            setPhotoVotesData(data.photoVotes || {});
          }
        }
      );
    } catch (e) {}

    return () => {
      clearInterval(pollInterval);
      unsubscribe();
    };
  }, [dbUrl, lastResetAt, resetLocalProgress]);

  const TABS: { key: TabKey; label: string }[] = [
    { key: 'team',    label: '조별 순위' },
    { key: 'mission', label: '미션·사진 현황' },
  ];

  return (
    <div className="max-w-[430px] mx-auto bg-[#0D1117] min-h-screen flex flex-col text-slate-100 font-['Noto_Sans_KR']">
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
          <span className="font-bebas text-xl tracking-widest text-white">
            TEAM <span className="text-amber-400">RANKING</span>
          </span>
          <LiveBadge label="LIVE" />
        </div>
      </header>

      {/* 탭 버튼 */}
      <div className="flex bg-[#13192A] border-b border-white/8 flex-shrink-0">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2.5 text-[15px] font-bold border-b-2 transition-all ${
              tab === t.key
                ? 'text-amber-400 border-amber-400'
                : 'text-slate-400 border-transparent hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 통계 */}
      <div className="flex-shrink-0">
        <StatsRow teams={computedTeams} />
      </div>

      {/* 탭 본문 콘텐츠 */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'team'    && <TeamTab teams={computedTeams} myTeamId={myTeamId} photoVotes={photoVotesData} />}
        {tab === 'mission' && <MissionTab peopleQuests={peopleQuestsData} themeGardenPhotos={themeGardenPhotosData} photoVotes={photoVotesData} />}
      </div>

      <BottomNav active="/leaderboard" />
    </div>
  );
};

export default Leaderboard;
