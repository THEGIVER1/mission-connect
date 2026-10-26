import React, { useMemo, useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { LiveBadge, Card, ScoreBar, AnimatedScoreCounter } from '../shared';
import { CompletionCertificateModal } from '../common/CompletionCertificateModal';
import { TutorialGroundRulesModal } from '../tutorial/TutorialGroundRulesModal';
import { ThemeGardenMissionModal } from '../themeGarden/ThemeGardenMissionModal';
import { PhotoVoteModal } from '../photoVote/PhotoVoteModal';
import { YeonkangWrapupQuizModal } from '../photoVote/YeonkangWrapupQuizModal';
import { onValue, ref, update } from 'firebase/database';
import { rtdb, FIREBASE_DB_URL } from '../../lib/firebase';
import {
  WORKSHOP_TEAMS,
  PEOPLE_QUEST_POINTS_PER_MEMBER,
  THEME_GARDEN_MISSION,
  getCourseTotalMaxPoints,
  MY_INFO_QUESTIONS,
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
  createParticipantId,
  getVotedTeamIdsFromVoteRecord,
  getWrapupQuizScoreForTeam,
} from '../../utils/scoreCalculator';

// ─── 상단 헤더 ────────────────────────────────────────────────
const Header: React.FC<{ onOpenProfile: () => void; forceOpenStep4?: boolean }> = ({ onOpenProfile, forceOpenStep4 }) => {
  const { myTeam, participantName } = useAppStore();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const { formattedTimeLeft, isStep3Completed } = useMemo(() => {
    return getFinalGatheringInfo(now, !!forceOpenStep4);
  }, [now, forceOpenStep4]);

  const teamConfig = WORKSHOP_TEAMS.find(t => t.id === myTeam?.id);

  return (
    <header className="bg-[#13192A] border-b border-white/8 px-4 pt-3 pb-3.5 relative">
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-red-600 to-orange-500" />

      <div className="flex items-start justify-between mb-2">
        <div>
          <h1 className="font-['Bebas_Neue'] text-2xl tracking-widest text-white leading-none">
            {IS_PILOT_MODE ? (
              <>연강원 <span className="text-red-500">TEAM ACTIVITY</span></>
            ) : (
              <>2026 CHRO <span className="text-red-500">TREKKING</span></>
            )}
          </h1>
          <p className="text-[12.5px] text-slate-400 mt-0.5">
            {participantName ? `${participantName}님 (${myTeam?.name ?? '참가자'})` : 'CHRO Activity Platform'}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onOpenProfile}
            className="text-[12.5px] bg-[#1A2235] hover:bg-[#232D45] text-sky-300 border border-sky-500/30 px-2.5 py-1 rounded-lg font-bold active:scale-95 transition-all"
          >
            내 답변 수정
          </button>
          <LiveBadge />
        </div>
      </div>

      {/* 이벤트 & 팀/코스 칩 */}
      <div className="flex items-center gap-1.5 mb-2.5 flex-wrap">
        <span className="text-[13px] text-slate-300 bg-[#1A2235] border border-white/8 rounded-full px-2.5 py-0.5 font-medium">
          {IS_PILOT_MODE ? '카페쿰베오 집결 13시' : '빵명장 집결'}
        </span>
        {teamConfig && (
          <span
            className="text-[13px] font-bold rounded-full px-2.5 py-0.5"
            style={{
              background: teamConfig.assignedCourse === 'forest' ? 'rgba(16,185,129,0.15)' : 'rgba(56,189,248,0.15)',
              color: teamConfig.assignedCourse === 'forest' ? '#34D399' : '#38BDF8',
              border: `1px solid ${teamConfig.assignedCourse === 'forest' ? 'rgba(16,185,129,0.3)' : 'rgba(56,189,248,0.3)'}`,
            }}
          >
            {teamConfig.name} · {teamConfig.courseName}{teamConfig.courseDistance ? ` (${teamConfig.courseDistance})` : ''}
          </span>
        )}
      </div>

      {/* 팀 요약 & 남은 시간 */}
      <div className="flex items-center justify-between bg-black/30 p-2.5 rounded-xl border border-white/5">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-white shadow"
            style={{ background: teamConfig?.color || '#E31837' }}
          >
            {myTeam?.shortCode ?? '--'}
          </div>
          <div>
            <p className="text-[12px] text-slate-400">우리 조</p>
            <p className="text-[15px] font-bold text-white leading-tight">{myTeam?.name ?? '—'}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[12px] text-slate-400">최종 집결지까지 남은 시간 (2:20 기준)</p>
          <p className="text-[15px] font-bold text-amber-400 font-['Bebas_Neue'] tracking-widest">
            {isStep3Completed ? '집결 완료 (00:00:00)' : formattedTimeLeft}
          </p>
        </div>
      </div>
    </header>
  );
};

// ─── 조별 점수 & 순위 카드 (개인 기여도 삭제, 조별 기준) ──────────────────
const ScoreCard: React.FC<{
  teamScore: number;
  teamRank: number;
  maxScore: number;
}> = ({ teamScore, teamRank, maxScore }) => {
  const { myTeam } = useAppStore();
  const teamConfig = WORKSHOP_TEAMS.find(t => t.id === myTeam?.id);

  const prevRankRef = useRef<number>(teamRank);
  const [rankChangeText, setRankChangeText] = useState<string | null>(null);

  useEffect(() => {
    const prev = prevRankRef.current;
    if (prev && prev !== teamRank) {
      if (teamRank < prev) {
        setRankChangeText(`▲ ${prev - teamRank}계단 상승`);
      } else {
        setRankChangeText(`▼ ${teamRank - prev}계단`);
      }
      const timer = setTimeout(() => setRankChangeText(null), 3500);
      prevRankRef.current = teamRank;
      return () => clearTimeout(timer);
    }
    prevRankRef.current = teamRank;
  }, [teamRank]);

  return (
    <Card className="mx-4 mt-3 p-3.5 shadow-xl">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[13.5px] text-slate-300 font-bold">
          {myTeam?.name ?? '우리 조'} 점수
        </span>
        <div className="flex items-center gap-1.5">
          {rankChangeText && (
            <span className={`text-[12px] font-extrabold px-2 py-0.5 rounded-full ${
              rankChangeText.includes('▲') ? 'bg-emerald-500 text-slate-950' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
            }`}>
              {rankChangeText}
            </span>
          )}
          <span className={`text-[13px] font-bold px-2.5 py-0.5 rounded-full border ${
            teamRank === 1
              ? 'text-amber-300 bg-amber-500/20 border-amber-400/40'
              : 'text-amber-400 bg-amber-400/10 border-amber-400/20'
          }`}>
            {teamRank === 1 ? '현재 1위' : `현재 ${teamRank}위`}
          </span>
        </div>
      </div>

      <div className="flex items-end justify-between mb-2">
        <div className="font-['Bebas_Neue'] text-4xl text-white leading-none flex items-baseline">
          <AnimatedScoreCounter value={teamScore} className="text-white" />
          <span className="text-red-500 text-2xl ml-1">pt</span>
        </div>
        <span className="text-[12.5px] text-slate-400">
          조 대표 입력 · 최대 {maxScore}pt
        </span>
      </div>

      <ScoreBar value={teamScore} max={maxScore} color={teamConfig?.color || '#E31837'} />
    </Card>
  );
};

// ─── 워크샵 타임라인 & 단계별 미션 섹션 (STEP 1, 2, 3, 4 글자 확대 & 문구 간소화) ────────
const ActivitySection: React.FC<{
  hasTutorialDone: boolean;
  hasGroundRulesDone: boolean;
  themeGardenDone: boolean;
  pqSubmitted: boolean;
  isAllCompleted: boolean;
  uploadedPhotosCount: number;
  myTeamVotesUsed: number;
  myWrapupQuizPoints: number;
  myWrapupQuizDone: boolean;
  isStep3Completed: boolean;
  remainingTimeLeft: string;
  onOpenTutorialModal: () => void;
  onOpenThemeGardenModal: () => void;
  onOpenPhotoVoteModal: () => void;
  onOpenWrapupQuizModal: () => void;
  onOpenCertificate: () => void;
}> = ({
  hasTutorialDone,
  hasGroundRulesDone,
  themeGardenDone,
  pqSubmitted,
  isAllCompleted,
  uploadedPhotosCount,
  myTeamVotesUsed,
  myWrapupQuizPoints,
  myWrapupQuizDone,
  isStep3Completed,
  remainingTimeLeft,
  onOpenTutorialModal,
  onOpenThemeGardenModal,
  onOpenPhotoVoteModal,
  onOpenWrapupQuizModal,
  onOpenCertificate,
}) => {
  const navigate = useNavigate();

  return (
    <div className="mx-4 mt-4 space-y-4">
      {/* 전 코스 완주 배너 */}
      {isAllCompleted && (
        <div className="bg-gradient-to-r from-amber-500/20 to-yellow-500/15 border border-amber-400/60 rounded-2xl p-3.5 flex items-center justify-between shadow-lg">
          <div>
            <h3 className="text-[16px] font-extrabold text-white">
              우리 조 모든 미션 완료!
            </h3>
            <p className="text-[13px] text-slate-300">
              완주 증서가 발급되었습니다.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenCertificate}
            className="px-3.5 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-[13.5px] rounded-xl shadow active:scale-95 transition-all"
          >
            완주 증서 보기
          </button>
        </div>
      )}

      {/* ─── STEP 1 ─── */}
      <div className="space-y-2">
        <div className="flex items-baseline justify-between px-1">
          <div className="flex items-baseline gap-2">
            <span className="text-[22px] font-black text-amber-400 tracking-tight leading-none">
              STEP 1
            </span>
            <span className="text-[14px] font-bold text-slate-200">
              {IS_PILOT_MODE ? '1:00~1:30 카페쿰베오' : '1:30~2:00 빵명장'}
            </span>
          </div>
          <span className="text-[12.5px] text-slate-400">조 대표 입력</span>
        </div>

        <button
          type="button"
          onClick={onOpenTutorialModal}
          className="w-full text-left bg-[#171F32] border border-amber-500/40 hover:border-amber-400 rounded-2xl p-3.5 shadow-md active:scale-98 transition-all"
        >
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-[16.5px] font-bold text-white">
              조별 그라운드룰 & 연습 Quiz
            </h3>
            <span className={`text-[12.5px] font-bold px-2.5 py-0.5 rounded-full border ${
              hasGroundRulesDone && hasTutorialDone
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
            }`}>
              {hasGroundRulesDone && hasTutorialDone ? '완료' : '입력하기 →'}
            </span>
          </div>
          <p className="text-[13.5px] text-slate-400">
            {IS_PILOT_MODE
              ? '조별 역할·그라운드룰 설정 및 베오라떼 가격 맞히기'
              : '조별 역할·그라운드룰 설정 및 소보루 빵 가격 맞히기'}
          </p>
        </button>
      </div>

      {/* ─── STEP 2 ─── */}
      <div className="space-y-2 pt-1">
        <div className="flex items-baseline justify-between px-1">
          <div className="flex items-baseline gap-2">
            <span className="text-[22px] font-black text-sky-400 tracking-tight leading-none">
              STEP 2
            </span>
            <span className="text-[14px] font-bold text-slate-200">
              {IS_PILOT_MODE ? '1:30~2:20 트레킹 미션' : '2:00~4:30 트레킹 미션'}
            </span>
          </div>
          <span className="text-[12.5px] text-slate-400">조별 각 +100pt</span>
        </div>

        {/* 미션 1: 최고의 스토리 동료 추천 */}
        <button
          type="button"
          onClick={() => navigate('/people-quest')}
          className="w-full text-left bg-[#171F32] border border-red-500/35 hover:border-red-400 rounded-2xl p-3.5 shadow-md active:scale-98 transition-all"
        >
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-[16.5px] font-bold text-white">
              1. 최고의 스토리 동료 추천
            </h3>
            <span className={`text-[12.5px] font-bold px-2.5 py-0.5 rounded-full border ${
              pqSubmitted
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-red-500/20 text-red-300 border-red-500/40'
            }`}>
              {pqSubmitted ? '완료 (+100pt)' : '작성하기 →'}
            </span>
          </div>
          <p className="text-[13.5px] text-slate-400">
            조원들과 대화 후 가장 인상 깊은 동료 1명 추천 (조 대표 1명 작성)
          </p>
        </button>

        {/* 미션 2: 조별 단체사진 업로드 */}
        <button
          type="button"
          onClick={onOpenThemeGardenModal}
          className="w-full text-left bg-[#171F32] border border-pink-500/35 hover:border-pink-400 rounded-2xl p-3.5 shadow-md active:scale-98 transition-all"
        >
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-[16.5px] font-bold text-white">
              {IS_PILOT_MODE ? '2. 두산 저수지 단체사진 업로드' : '2. 테마가든 단체사진 업로드'}
            </h3>
            <span className={`text-[12.5px] font-bold px-2.5 py-0.5 rounded-full border ${
              themeGardenDone
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-pink-500/20 text-pink-300 border-pink-500/40'
            }`}>
              {themeGardenDone ? '완료 (+100pt)' : '사진 등록 →'}
            </span>
          </div>
          <p className="text-[13.5px] text-slate-400">
            {IS_PILOT_MODE
              ? '두산 저수지에서 조원 전원 단체사진 촬영 및 업로드'
              : '테마가든 포토 스팟에서 조원 전원 단체사진 촬영 및 업로드'}
          </p>
        </button>
      </div>

      {/* ─── STEP 3 ─── */}
      <div className="space-y-2 pt-1">
        <div className="flex items-baseline justify-between px-1">
          <div className="flex items-baseline gap-2">
            <span className="text-[22px] font-black text-emerald-400 tracking-tight leading-none">
              STEP 3
            </span>
            <span className="text-[14px] font-bold text-slate-200">
              2:20 최종 집결
            </span>
          </div>
          <span className="text-[12.5px] text-emerald-300 font-bold">
            {isStep3Completed ? '집결 시간 도달' : `남은 시간 ${remainingTimeLeft}`}
          </span>
        </div>

        <div className="bg-[#141C2B] border border-emerald-500/30 rounded-2xl p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[16px] font-bold text-white">
              {IS_PILOT_MODE ? '연강원 강의장 최종 집결' : '세븐일레븐 앞 공터 최종 집결'}
            </span>
            <span className="text-[12.5px] bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full font-bold">
              {isStep3Completed ? '집결 완료' : '2:20까지'}
            </span>
          </div>
        </div>
      </div>

      {/* ─── STEP 4: 실시간 단체사진 투표 (및 연강원 Q2 퀴즈) ─── */}
      <div className="space-y-2 pt-1">
        <div className="flex items-baseline justify-between px-1">
          <div className="flex items-baseline gap-2">
            <span className="text-[22px] font-black text-purple-400 tracking-tight leading-none">
              STEP 4
            </span>
            <span className="text-[14px] font-bold text-slate-200">
              {IS_PILOT_MODE
                ? '단체사진 투표 & Wrap-up Quiz'
                : `단체사진 투표 (조당 2표 · 1표당 +${PHOTO_VOTE_POINTS_PER_VOTE}pt)`}
            </span>
          </div>
          <span className="text-[12.5px] text-purple-300 font-bold">
            사진 {uploadedPhotosCount}/6조
          </span>
        </div>

        <button
          type="button"
          onClick={() => {
            if (!isStep3Completed) {
              alert(`STEP 4 단체사진 투표는 STEP 3 최종 집결 시간(2:20) 완료 시 열립니다.\n(현재 남은 시간: ${remainingTimeLeft})`);
              return;
            }
            onOpenPhotoVoteModal();
          }}
          className={`w-full text-left rounded-2xl p-3.5 shadow-md transition-all border ${
            isStep3Completed
              ? 'bg-gradient-to-br from-[#1C162E] to-[#141C2B] border-purple-500/45 hover:border-purple-400 active:scale-98'
              : 'bg-[#121723] border-white/10 opacity-75'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-[16.5px] font-bold text-white">
              {isStep3Completed
                ? IS_PILOT_MODE
                  ? 'Q1. 실시간 조별 단체사진 투표'
                  : '실시간 조별 단체사진 보기 & 투표'
                : IS_PILOT_MODE
                ? '🔒 Q1. 단체사진 투표 (2:20 집결 완료 시 오픈)'
                : '🔒 단체사진 투표 (2:20 집결 완료 시 오픈)'}
            </h3>
            <span className={`text-[12.5px] font-bold px-2.5 py-0.5 rounded-full border ${
              !isStep3Completed
                ? 'bg-slate-800 text-slate-400 border-white/10'
                : myTeamVotesUsed >= 2
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-purple-500/20 text-purple-300 border-purple-500/40'
            }`}>
              {!isStep3Completed
                ? '2:20 오픈'
                : myTeamVotesUsed > 0
                ? `${myTeamVotesUsed}/2표 완료`
                : '투표하기 →'}
            </span>
          </div>
          <p className="text-[13.5px] text-slate-300">
            {isStep3Completed
              ? '조당 1장씩 총 2표 투표 가능하며, 1표 득표당 +200pt가 조별 점수에 실시간 합산됩니다.'
              : `STEP 3 최종 집결 시간(2:20) 완료 시 투표가 활성화됩니다. (남은 시간: ${remainingTimeLeft})`}
          </p>
        </button>

        {IS_PILOT_MODE && (
          <button
            type="button"
            onClick={() => {
              if (!isStep3Completed) {
                alert(`STEP 4 Q2 퀴즈는 STEP 3 최종 집결 시간(2:20) 완료 시 열립니다.\n(현재 남은 시간: ${remainingTimeLeft})`);
                return;
              }
              onOpenWrapupQuizModal();
            }}
            className={`w-full text-left rounded-2xl p-3.5 shadow-md transition-all border ${
              isStep3Completed
                ? 'bg-gradient-to-br from-[#1C162E] to-[#141C2B] border-purple-500/45 hover:border-purple-400 active:scale-98'
                : 'bg-[#121723] border-white/10 opacity-75'
            }`}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-[16.5px] font-bold text-white">
                {isStep3Completed
                  ? 'Q2. 연강원에 있는 것을 모두 선택하세요'
                  : '🔒 Q2. 연강원 퀴즈 (2:20 집결 완료 시 오픈)'}
              </h3>
              <span className={`text-[12.5px] font-bold px-2.5 py-0.5 rounded-full border ${
                !isStep3Completed
                  ? 'bg-slate-800 text-slate-400 border-white/10'
                  : myWrapupQuizDone
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-purple-500/20 text-purple-300 border-purple-500/40'
              }`}>
                {!isStep3Completed
                  ? '2:20 오픈'
                  : myWrapupQuizDone
                  ? `완료 (+${myWrapupQuizPoints}pt)`
                  : '퀴즈 풀기 →'}
              </span>
            </div>
          </button>
        )}
      </div>
    </div>
  );
};

// ─── 내 프로필 & 4문항 답변 조회 및 실시간 수정 모달 ─────────────
const MyProfileModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { participantName, participantCompany, myTeam, selectTeam } = useAppStore();
  
  const [modalName, setModalName] = useState(participantName || '');
  const [modalTeamId, setModalTeamId] = useState(myTeam?.id || 'team1');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const dbUrl = FIREBASE_DB_URL;

  useEffect(() => {
    if (!isOpen) return;
    setIsLoading(true);
    setSaveSuccess(false);
    setErrorMessage('');

    const currName = participantName || modalName || '';
    if (participantName) setModalName(participantName);
    if (myTeam?.id) setModalTeamId(myTeam.id);

    let localAnswers: Record<string, string> = {};
    try {
      const saved = localStorage.getItem('my_info_answers_draft');
      if (saved) localAnswers = JSON.parse(saved);
    } catch {}

    if (currName) {
      const pId = createParticipantId(currName, participantCompany);
      fetch(`${dbUrl}/sessions/trekking2026/participants/${encodeURIComponent(pId)}.json?t=${Date.now()}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data && data.myInfo && typeof data.myInfo === 'object') {
            setAnswers({ ...localAnswers, ...data.myInfo });
          } else {
            setAnswers(localAnswers);
          }
        })
        .catch(() => setAnswers(localAnswers))
        .finally(() => setIsLoading(false));
    } else {
      setAnswers(localAnswers);
      setIsLoading(false);
    }
  }, [isOpen, participantName, participantCompany, myTeam?.id, dbUrl]);

  const handleTextChange = (qId: string, val: string) => {
    if (val.length > 100) return;
    setAnswers(prev => ({ ...prev, [qId]: val }));
  };

  const handleSave = async () => {
    const finalName = (modalName || participantName || '').trim();
    const finalCompany = participantCompany || '';
    const finalTeam = WORKSHOP_TEAMS.find(t => t.id === modalTeamId) || myTeam || WORKSHOP_TEAMS[0];

    if (!finalName) {
      setErrorMessage('이름을 입력해주세요.');
      return;
    }

    setIsSaving(true);
    setSaveSuccess(false);
    setErrorMessage('');

    const targetPId = createParticipantId(finalName, finalCompany);

    try {
      localStorage.setItem('my_info_answers_draft', JSON.stringify(answers));
      localStorage.setItem('participant_registered_id', targetPId);
    } catch {}

    selectTeam({
      id: finalTeam.id,
      name: finalTeam.name,
      shortCode: finalTeam.shortCode,
      color: finalTeam.color,
      memberCount: 1,
      score: myTeam?.score ?? 0,
      rank: myTeam?.rank ?? 1,
      missionsCompleted: myTeam?.missionsCompleted ?? 0,
      totalMissions: 2,
      lastActivity: new Date(),
      status: 'active',
    }, finalName, finalCompany, finalTeam.assignedCourse);

    const patchPayload = {
      name: finalName,
      company: finalCompany,
      teamId: finalTeam.id,
      teamName: finalTeam.name,
      course: finalTeam.assignedCourse,
      myInfo: answers,
      truth1: answers['q1_passion'] || '',
      truth2: answers['q5_unexpectedFact'] || answers['q3_bucketList'] || '',
      lie: answers['q4_dreamJob'] || '',
      status: 'active',
      updatedAt: new Date().toISOString(),
    };

    try {
      await fetch(`${dbUrl}/sessions/trekking2026/participants/${encodeURIComponent(targetPId)}.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patchPayload),
      });
      const pRef = ref(rtdb, `sessions/trekking2026/participants/${targetPId}`);
      update(pRef, patchPayload).catch(() => {});
    } catch (err) {
      console.warn('프로필 저장 경고:', err);
    }

    setSaveSuccess(true);
    setIsSaving(false);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 800);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#13192A] border border-white/15 w-full max-w-[380px] max-h-[90vh] rounded-3xl flex flex-col shadow-2xl overflow-hidden animate-fade-in">
        {/* 모달 상단 헤더 */}
        <div className="bg-[#182035] border-b border-white/10 px-5 py-3.5 flex items-center justify-between flex-shrink-0">
          <h3 className="text-[17px] font-bold text-white">
            내 정보 및 답변 수정
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 text-slate-300 flex items-center justify-center hover:bg-white/20 active:scale-95"
          >
            ✕
          </button>
        </div>

        {/* 프로필 기본 정보 */}
        <div className="bg-[#101626] p-3.5 border-b border-white/5 space-y-2.5 flex-shrink-0">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[13px] text-slate-400 block mb-1 font-medium">이름 *</label>
              <input
                type="text"
                value={modalName}
                onChange={e => setModalName(e.target.value)}
                placeholder="이름 입력"
                className="w-full bg-[#1A2235] border border-white/10 rounded-xl px-2.5 py-1.5 text-white text-[14.5px] font-bold focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="text-[13px] text-slate-400 block mb-1 font-medium">소속 조</label>
              <select
                value={modalTeamId}
                onChange={e => setModalTeamId(e.target.value)}
                className="w-full bg-[#1A2235] border border-white/10 rounded-xl px-2.5 py-1.5 text-white text-[14.5px] font-bold focus:outline-none focus:border-sky-500 appearance-none"
              >
                {WORKSHOP_TEAMS.map(t => (
                  <option key={t.id} value={t.id} style={{ background: '#1A2235' }}>
                    {t.name}{t.courseDistance ? ` (${t.courseDistance})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 4개 문항 리스트 */}
        <div className="p-4 space-y-3 flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="py-12 text-center text-slate-400 text-[15px]">
              불러오는 중...
            </div>
          ) : (
            MY_INFO_QUESTIONS.map((q, idx) => {
              const currentVal = answers[q.id] || '';
              return (
                <div key={q.id} className="bg-black/40 border border-white/8 rounded-2xl p-3 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <label className="text-[14px] font-bold text-slate-200 leading-snug">
                      <span className="text-sky-400 font-extrabold mr-1">Q{idx + 1}.</span>
                      {q.title}
                    </label>
                    <span className="text-[12px] text-slate-500 flex-shrink-0">
                      {currentVal.length}/100
                    </span>
                  </div>
                  <textarea
                    rows={2}
                    maxLength={100}
                    value={currentVal}
                    onChange={e => handleTextChange(q.id, e.target.value)}
                    placeholder={q.placeholder}
                    className="w-full bg-[#13192A] border border-white/10 rounded-xl p-2 text-[14px] text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 resize-none"
                  />
                </div>
              );
            })
          )}
        </div>

        {/* 하단 액션 */}
        <div className="bg-[#182035] border-t border-white/10 p-4 space-y-2 flex-shrink-0">
          {errorMessage && (
            <div className="bg-red-500/20 border border-red-500/40 text-red-300 text-[14px] font-bold py-1.5 px-3 rounded-xl text-center">
              {errorMessage}
            </div>
          )}

          {saveSuccess && (
            <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[14px] font-bold py-1.5 px-3 rounded-xl text-center">
              저장되었습니다.
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-[#13192A] text-slate-400 font-bold text-[15px] rounded-xl border border-white/10 hover:bg-[#1A2235] active:scale-95 transition-all"
            >
              닫기
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || isLoading}
              className="flex-1 py-3 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold text-[15px] rounded-xl shadow active:scale-95 transition-all"
            >
              {isSaving ? '저장 중...' : '저장하기'}
            </button>
          </div>
        </div>
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
    { key: '/leaderboard', icon: '🏆', label: '조별순위' },
  ];
  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto bg-[#13192A] border-t border-white/8 flex justify-around items-center py-2.5 pb-5 z-40">
      {NAV.map((n) => (
        <button
          key={n.key}
          onClick={() => navigate(n.key)}
          className={`flex flex-col items-center gap-1 px-5 transition-opacity ${
            active === n.key ? 'opacity-100 font-bold' : 'opacity-40'
          }`}
        >
          <span className="text-xl">{n.icon}</span>
          <span className={`text-[13.5px] ${active === n.key ? 'text-red-400 font-bold' : 'text-slate-400'}`}>
            {n.label}
          </span>
        </button>
      ))}
    </nav>
  );
};

// ─── 대시보드 메인 컴포넌트 ───────────────────────────────────
const Dashboard: React.FC = () => {
  const {
    myTeam,
    participantName,
    participantCompany,
    selectedCourse,
    isPeopleQuestSubmitted,
    answeredQuizIds,
    syncSessionData,
    lastResetAt,
    resetLocalProgress,
    setPeopleQuestSubmitted,
  } = useAppStore();

  const [rawSessionData, setRawSessionData] = useState<any>({});
  const [nowMs, setNowMs] = useState<number>(Date.now());
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);
  const [isTutorialModalOpen, setIsTutorialModalOpen] = useState(false);
  const [isThemeGardenModalOpen, setIsThemeGardenModalOpen] = useState(false);
  const [isPhotoVoteModalOpen, setIsPhotoVoteModalOpen] = useState(false);
  const [isWrapupQuizModalOpen, setIsWrapupQuizModalOpen] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const teamId = normalizeTeamId(myTeam?.id);
  const participantId = participantName
    ? createParticipantId(participantName, participantCompany)
    : 'anonymous';

  const dbUrl = FIREBASE_DB_URL;

  // 1. RTDB 데이터를 단일 진실 공급원(Single Source of Truth)으로 삼는 조별 점수 계산
  const { teams } = useMemo(() => {
    const participants = (rawSessionData?.participants && typeof rawSessionData.participants === 'object')
      ? rawSessionData.participants
      : {};
    const quests = (rawSessionData?.peopleQuest && typeof rawSessionData.peopleQuest === 'object')
      ? rawSessionData.peopleQuest
      : {};
    const themePhotos = (rawSessionData?.themeGardenPhotos && typeof rawSessionData.themeGardenPhotos === 'object')
      ? rawSessionData.themeGardenPhotos
      : {};
    const photoVotes = (rawSessionData?.photoVotes && typeof rawSessionData.photoVotes === 'object')
      ? rawSessionData.photoVotes
      : {};
    const wrapupQuizzes = (rawSessionData?.wrapupQuizzes && typeof rawSessionData.wrapupQuizzes === 'object')
      ? rawSessionData.wrapupQuizzes
      : {};

    return calculateLeaderboardData(
      participants,
      quests,
      {
        name: participantName,
        company: participantCompany,
        teamId,
        answeredQuizIds,
        isPeopleQuestSubmitted,
        isThemeGardenSubmitted: isThemeGardenDoneForTeam(teamId, themePhotos),
      },
      themePhotos,
      photoVotes,
      wrapupQuizzes
    );
  }, [rawSessionData, participantName, participantCompany, teamId, answeredQuizIds, isPeopleQuestSubmitted]);

  // 2. 파생 점수 및 상태 산출 (모두 조별 기준)
  const myRankObj = useMemo(() => {
    return teams.find(t => t.id === teamId) || teams[0];
  }, [teams, teamId]);

  const teamScore = myRankObj ? myRankObj.score : 0;
  const teamRank = myRankObj ? myRankObj.rank : 1;

  const pqSubmitted = useMemo(() => {
    const quests = (rawSessionData?.peopleQuest && typeof rawSessionData.peopleQuest === 'object')
      ? rawSessionData.peopleQuest
      : {};
    return isPqSubmittedForTeam(teamId, quests) || isPeopleQuestSubmitted || false;
  }, [rawSessionData, teamId, isPeopleQuestSubmitted]);

  const themeGardenDone = useMemo(() => {
    const themePhotos = (rawSessionData?.themeGardenPhotos && typeof rawSessionData.themeGardenPhotos === 'object')
      ? rawSessionData.themeGardenPhotos
      : {};
    return isThemeGardenDoneForTeam(teamId, themePhotos);
  }, [rawSessionData, teamId]);

  const hasGroundRulesDone = useMemo(() => {
    return !!(rawSessionData?.groundRules?.[teamId]);
  }, [rawSessionData, teamId]);

  const hasTutorialDone = useMemo(() => {
    return !!(rawSessionData?.tutorials?.[teamId]?.completed);
  }, [rawSessionData, teamId]);

  const uploadedPhotosCount = useMemo(() => {
    const themePhotos = rawSessionData?.themeGardenPhotos || {};
    return WORKSHOP_TEAMS.filter(t => !!(themePhotos[t.id]?.photoUrl)).length;
  }, [rawSessionData]);

  const myTeamVotesUsed = useMemo(() => {
    const myVoteRec = rawSessionData?.photoVotes?.[teamId];
    return getVotedTeamIdsFromVoteRecord(myVoteRec).length;
  }, [rawSessionData, teamId]);

  const myWrapupQuizInfo = useMemo(() => {
    return getWrapupQuizScoreForTeam(teamId, rawSessionData?.wrapupQuizzes || {});
  }, [rawSessionData, teamId]);

  const forceOpenStep4 = !!(rawSessionData?.step4ForceOpen);
  const { formattedTimeLeft, isStep3Completed } = useMemo(() => {
    return getFinalGatheringInfo(nowMs, forceOpenStep4);
  }, [nowMs, forceOpenStep4]);

  const maxScore = useMemo(() => {
    return Math.max(...teams.map(r => r.score), getCourseTotalMaxPoints(selectedCourse));
  }, [teams, selectedCourse]);

  // 3. RTDB 데이터 수신 및 세션 리셋 감지 처리
  const processSessionData = (data: any) => {
    if (!data || typeof data !== 'object') {
      setRawSessionData({});
      return;
    }

    if (data.lastResetAt && (!lastResetAt || data.lastResetAt > lastResetAt)) {
      resetLocalProgress(data.lastResetAt);
    }

    const pqRecord = getPqForTeam(teamId, data.peopleQuest || {});
    if (pqRecord && pqRecord.status === 'draft' && isPeopleQuestSubmitted) {
      setPeopleQuestSubmitted(false);
    }

    setRawSessionData(data);
  };

  // 4. 스토어 동기화
  useEffect(() => {
    if (myRankObj) {
      syncSessionData({
        teams,
        myTeamScore: teamScore,
        myTeamRank: teamRank,
        myTeamMissionsCompleted: myRankObj.missionsCompleted,
        isPeopleQuestSubmitted: pqSubmitted,
      });
    }
  }, [teams, teamScore, teamRank, myRankObj, pqSubmitted, teamId, syncSessionData]);

  // 5. Dual-Channel 실시간 데이터 로드
  useEffect(() => {
    const fetchSessionData = async () => {
      try {
        const res = await fetch(`${dbUrl}/sessions/trekking2026.json?t=${Date.now()}`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          processSessionData(data);
        } else {
          processSessionData({});
        }
      } catch (err) {
        console.warn('대시보드 REST 폴링 경고:', err);
      }
    };

    fetchSessionData();
    const pollInterval = setInterval(fetchSessionData, 2500);

    let unsubscribe = () => {};
    try {
      const sessionRef = ref(rtdb, 'sessions/trekking2026');
      unsubscribe = onValue(
        sessionRef,
        (snapshot) => {
          if (!snapshot.exists()) {
            processSessionData({});
            return;
          }
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
  }, [teamId, participantId, dbUrl, lastResetAt]);

  const totalMissions = (pqSubmitted ? 1 : 0) + (themeGardenDone ? 1 : 0);
  const isAllCompleted = pqSubmitted && themeGardenDone;

  // 6. 참가자 프로필 자동 동기화
  useEffect(() => {
    if (!participantName || !myTeam) return;
    const pId = createParticipantId(participantName, participantCompany);

    let localAnswers: Record<string, string> = {};
    try {
      const saved = localStorage.getItem('my_info_answers_draft');
      if (saved) localAnswers = JSON.parse(saved);
    } catch {}

    const payload = {
      name: participantName.trim(),
      company: participantCompany || '',
      teamId: myTeam.id,
      teamName: myTeam.name,
      course: myTeam.assignedCourse || 'forest',
      myInfo: localAnswers,
      truth1: localAnswers['q1_passion'] || '',
      truth2: localAnswers['q5_unexpectedFact'] || localAnswers['q3_bucketList'] || '',
      lie: localAnswers['q4_dreamJob'] || '',
      status: 'active',
      updatedAt: new Date().toISOString(),
    };

    fetch(`${dbUrl}/sessions/trekking2026/participants/${encodeURIComponent(pId)}.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(err => console.warn('Dashboard 자동 프로필 동기화 경고:', err));
  }, [participantName, participantCompany, myTeam?.id, dbUrl]);

  return (
    <div className="max-w-[430px] mx-auto bg-[#0D1117] min-h-screen pb-24 font-['Noto_Sans_KR']">
      <Header onOpenProfile={() => setIsProfileModalOpen(true)} forceOpenStep4={forceOpenStep4} />
      <ScoreCard
        teamScore={teamScore}
        teamRank={teamRank}
        maxScore={maxScore}
      />
      <ActivitySection
        hasTutorialDone={hasTutorialDone}
        hasGroundRulesDone={hasGroundRulesDone}
        themeGardenDone={themeGardenDone}
        pqSubmitted={pqSubmitted}
        isAllCompleted={isAllCompleted}
        uploadedPhotosCount={uploadedPhotosCount}
        myTeamVotesUsed={myTeamVotesUsed}
        myWrapupQuizPoints={myWrapupQuizInfo.points}
        myWrapupQuizDone={myWrapupQuizInfo.completed}
        isStep3Completed={isStep3Completed}
        remainingTimeLeft={formattedTimeLeft}
        onOpenTutorialModal={() => setIsTutorialModalOpen(true)}
        onOpenThemeGardenModal={() => setIsThemeGardenModalOpen(true)}
        onOpenPhotoVoteModal={() => setIsPhotoVoteModalOpen(true)}
        onOpenWrapupQuizModal={() => setIsWrapupQuizModalOpen(true)}
        onOpenCertificate={() => setIsCertModalOpen(true)}
      />
      <BottomNav active="/" />

      {/* STEP 1: 조별 그라운드룰 & 연습 퀴즈 모달 */}
      <TutorialGroundRulesModal
        isOpen={isTutorialModalOpen}
        onClose={() => setIsTutorialModalOpen(false)}
        teamId={teamId}
        participantName={participantName}
        participantCompany={participantCompany}
      />

      {/* STEP 2: 조별 단체사진 촬영 & 업로드 모달 */}
      <ThemeGardenMissionModal
        isOpen={isThemeGardenModalOpen}
        onClose={() => setIsThemeGardenModalOpen(false)}
        teamId={teamId}
        participantName={participantName}
        participantCompany={participantCompany}
        onPhotoUploaded={() => {
          fetch(`${dbUrl}/sessions/trekking2026.json?t=${Date.now()}`)
            .then(res => res.json())
            .then(processSessionData)
            .catch(() => {});
        }}
      />

      {/* STEP 4: 실시간 단체사진 갤러리 & 투표 모달 */}
      <PhotoVoteModal
        isOpen={isPhotoVoteModalOpen}
        onClose={() => setIsPhotoVoteModalOpen(false)}
        teamId={teamId}
        participantName={participantName}
        onVoteSubmitted={() => {
          fetch(`${dbUrl}/sessions/trekking2026.json?t=${Date.now()}`, { cache: 'no-store' })
            .then(res => res.json())
            .then(processSessionData)
            .catch(() => {});
        }}
      />

      {/* STEP 4: 연강원 전용 Q2 퀴즈 모달 */}
      {IS_PILOT_MODE && (
        <YeonkangWrapupQuizModal
          isOpen={isWrapupQuizModalOpen}
          onClose={() => setIsWrapupQuizModalOpen(false)}
          teamId={teamId}
          participantName={participantName}
          onQuizSubmitted={() => {
            fetch(`${dbUrl}/sessions/trekking2026.json?t=${Date.now()}`, { cache: 'no-store' })
              .then(res => res.json())
              .then(processSessionData)
              .catch(() => {});
          }}
        />
      )}

      {/* 내 프로필 및 4문항 답변 실시간 수정 모달 */}
      <MyProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />

      {/* 트레킹 완주 인증서 모달 */}
      <CompletionCertificateModal
        isOpen={isCertModalOpen}
        onClose={() => setIsCertModalOpen(false)}
        teamScore={teamScore}
        totalMissions={totalMissions}
      />
    </div>
  );
};

export default Dashboard;
export { BottomNav };
