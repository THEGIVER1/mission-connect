import React, { useMemo, useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { LiveBadge, Card, ScoreBar, AnimatedScoreCounter } from '../shared';
import { CompletionCertificateModal } from '../common/CompletionCertificateModal';
import { TutorialGroundRulesModal } from '../tutorial/TutorialGroundRulesModal';
import { ThemeGardenMissionModal } from '../themeGarden/ThemeGardenMissionModal';
import { onValue, ref, update } from 'firebase/database';
import { rtdb, FIREBASE_DB_URL } from '../../lib/firebase';
import {
  ACTIVE_VENUE,
  WORKSHOP_COMPANIES,
  WORKSHOP_TEAMS,
  PEOPLE_QUEST_POINTS_PER_MEMBER,
  THEME_GARDEN_MISSION,
  getCourseTotalMaxPoints,
  MY_INFO_QUESTIONS,
} from '../../config/workshopConfig';
import {
  calculateLeaderboardData,
  normalizeTeamId,
  isPqSubmittedForTeam,
  isThemeGardenDoneForTeam,
  getPqForTeam,
  createParticipantId,
  sanitizeFirebaseKey,
} from '../../utils/scoreCalculator';
import type { Team } from '../../types';

// ─── 상단 헤더 ────────────────────────────────────────────────
const Header: React.FC<{ onOpenProfile: () => void }> = ({ onOpenProfile }) => {
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
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onOpenProfile}
            className="text-[10px] bg-[#1A2235] hover:bg-[#232D45] text-sky-300 border border-sky-500/30 px-2 py-1 rounded-lg flex items-center gap-1 active:scale-95 transition-all shadow"
            title="4개 질문 답변 확인 및 수정"
          >
            <span>👤</span>
            <span className="font-bold">내 답변 수정</span>
          </button>
          <LiveBadge />
        </div>
      </div>

      {/* 이벤트 & 팀/코스 칩 */}
      <div className="flex items-center gap-1.5 mb-3 flex-wrap">
        <span className="flex items-center gap-1 text-[11px] text-slate-300 bg-[#1A2235] border border-white/8 rounded-full px-2.5 py-0.5">
          🏪 세븐일레븐 집결
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

// ─── 점수 & 순위 카드 ──────────────────────────────────────────
const ScoreCard: React.FC<{
  teamScore: number;
  teamRank: number;
  personalScore: number;
  maxScore: number;
}> = ({ teamScore, teamRank, personalScore, maxScore }) => {
  const { myTeam } = useAppStore();
  const teamConfig = WORKSHOP_TEAMS.find(t => t.id === myTeam?.id);

  const prevRankRef = useRef<number>(teamRank);
  const [rankChangeText, setRankChangeText] = useState<string | null>(null);

  useEffect(() => {
    const prev = prevRankRef.current;
    if (prev && prev !== teamRank) {
      if (teamRank < prev) {
        setRankChangeText(`▲ ${prev - teamRank}계단 상승!`);
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
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
          {myTeam?.name ?? '우리 조'} 실시간 획득 점수
        </span>
        <div className="flex items-center gap-1.5">
          {rankChangeText && (
            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full animate-bounce ${
              rankChangeText.includes('▲') ? 'bg-emerald-500 text-slate-950' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
            }`}>
              {rankChangeText}
            </span>
          )}
          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${
            teamRank === 1
              ? 'text-amber-300 bg-amber-500/20 border-amber-400/40 shadow-sm shadow-amber-500/30'
              : 'text-amber-400 bg-amber-400/10 border-amber-400/20'
          }`}>
            <span>{teamRank === 1 ? '👑 현재 1위 (선두)' : `현재 ${teamRank}위 🏆`}</span>
          </span>
        </div>
      </div>

      <div className="flex items-end justify-between mb-2">
        <div className="font-['Bebas_Neue'] text-4xl text-white leading-none flex items-baseline">
          <AnimatedScoreCounter value={teamScore} className="text-white" />
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

// ─── 워크샵 타임라인 & 단계별 미션 섹션 (스팟 퀴즈 제외 2대 핵심 액티비티) ────────
const ActivitySection: React.FC<{
  hasTutorialDone: boolean;
  hasGroundRulesDone: boolean;
  themeGardenDone: boolean;
  pqSubmitted: boolean;
  isAllCompleted: boolean;
  onOpenTutorialModal: () => void;
  onOpenThemeGardenModal: () => void;
  onOpenCertificate: () => void;
}> = ({
  hasTutorialDone,
  hasGroundRulesDone,
  themeGardenDone,
  pqSubmitted,
  isAllCompleted,
  onOpenTutorialModal,
  onOpenThemeGardenModal,
  onOpenCertificate,
}) => {
  const navigate = useNavigate();

  return (
    <div className="mx-4 mt-4 space-y-3">
      {/* 👑 전 코스 완주 달성 시 골든 배너 */}
      {isAllCompleted && (
        <div className="bg-gradient-to-r from-amber-500/25 via-yellow-500/15 to-amber-600/25 border-2 border-amber-400/60 rounded-2xl p-4 text-center space-y-2.5 shadow-2xl shadow-amber-500/20 animate-fade-in relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] bg-amber-400 text-slate-950 font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow">
              CHRO ALL MISSIONS CLEARED
            </span>
            <span className="text-xs text-amber-300 font-bold flex items-center gap-1">
              <span>✨</span>
              <span>명예의 전당</span>
            </span>
          </div>
          <div>
            <h3 className="text-[16px] font-extrabold text-white">
              🎉 축하합니다! 모든 미션을 완주하셨습니다!
            </h3>
            <p className="text-[11px] text-slate-300 mt-0.5">
              테마가든 단체사진과 피플퀘스트를 모두 완료하여 완주 증서가 발급되었습니다.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenCertificate}
            className="w-full py-3 bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-400 hover:from-amber-500 hover:to-yellow-500 text-slate-950 font-extrabold text-[13px] rounded-xl shadow-lg shadow-amber-500/30 active:scale-95 transition-all flex items-center justify-center gap-1.5"
          >
            <span>👑 나의 완주 인증서 보기 (골드 엠블럼)</span>
          </button>
        </div>
      )}

      {/* 타임라인 단계 1: 오프닝 & 튜토리얼 / 그라운드룰 (1:30~2:00) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-[12px] font-bold text-amber-400 tracking-wide flex items-center gap-1">
            <span>🏪</span>
            <span>STEP 1 · 1:30~2:00 [세븐일레븐 앞 테이블]</span>
          </span>
          <span className="text-[10px] text-slate-400">오프닝 & 준비</span>
        </div>

        <button
          type="button"
          onClick={onOpenTutorialModal}
          className="w-full text-left bg-gradient-to-br from-[#1E1B2E] via-[#1A2235] to-[#141C2E] border border-amber-500/40 hover:border-amber-400 rounded-2xl p-4 shadow-lg active:scale-98 transition-all relative overflow-hidden group"
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-lg">
                🥐
              </span>
              <div>
                <span className="text-[10px] text-amber-400 font-extrabold uppercase tracking-wider block">
                  오프닝 튜토리얼 & 그라운드룰
                </span>
                <h3 className="text-[15px] font-bold text-white group-hover:text-amber-300 transition-colors">
                  빵 가격 퀴즈 & 우리 조 약속 정하기
                </h3>
              </div>
            </div>
            <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${
              hasGroundRulesDone
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
            }`}>
              {hasGroundRulesDone ? '✅ 설정 완료' : '✍️ 룰 설정하기'}
            </span>
          </div>

          <p className="text-[11.5px] text-slate-300 leading-relaxed mb-2.5">
            세븐일레븐 앞 야외 테이블에서 빵명장 빵 가격 퀴즈로 앱을 테스트하고, 조별 역할(타임키퍼 등) 및 <strong>30분 개인 힐링 시간</strong> 등의 규칙을 정해보세요.
          </p>

          <div className="flex items-center justify-between text-[11px] pt-2 border-t border-white/5">
            <span className="text-slate-400">타임키퍼 · 페이스메이커 · 30분 자유 쉼</span>
            <span className="text-amber-400 font-bold flex items-center gap-0.5">
              확인 및 설정 →
            </span>
          </div>
        </button>
      </div>

      {/* 타임라인 단계 2: 트레킹 & 2대 핵심 미션 (2:00~4:30) */}
      <div className="space-y-2 pt-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-[12px] font-bold text-sky-400 tracking-wide flex items-center gap-1">
            <span>🚶</span>
            <span>STEP 2 · 2:00~4:30 [테마가든 & 트레킹 코스]</span>
          </span>
          <span className="text-[10px] text-slate-400">2대 핵심 미션</span>
        </div>

        {/* 미션 1: 테마가든 단체사진 미션 */}
        <button
          type="button"
          onClick={onOpenThemeGardenModal}
          className="w-full text-left bg-gradient-to-br from-[#231526] via-[#1D1B30] to-[#141C2E] border border-pink-500/40 hover:border-pink-400 rounded-2xl p-4 shadow-lg active:scale-98 transition-all relative overflow-hidden group"
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-xl bg-pink-500/20 border border-pink-500/30 flex items-center justify-center text-lg">
                🌹
              </span>
              <div>
                <span className="text-[10px] text-pink-400 font-extrabold uppercase tracking-wider block">
                  테마가든 미션 · 조원 전원 +100pt
                </span>
                <h3 className="text-[15px] font-bold text-white group-hover:text-pink-300 transition-colors">
                  지정 힌트 스팟 찾기 & 단체사진 업로드
                </h3>
              </div>
            </div>
            <span className={`text-[10.5px] font-bold px-2.5 py-1 rounded-full border flex-shrink-0 ${
              themeGardenDone
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-pink-500/20 text-pink-300 border-pink-500/40'
            }`}>
              {themeGardenDone ? '✅ 업로드 완료' : '📸 사진 촬영'}
            </span>
          </div>

          <p className="text-[11.5px] text-slate-300 leading-relaxed mb-2.5">
            테마가든 내 지정 장소 힌트 사진을 참고해 스팟을 찾고, 조원 전원이 참여하는 시그니처 단체사진을 촬영해 업로드하세요.
          </p>

          <div className="flex items-center justify-between text-[11px] pt-2 border-t border-white/5">
            <span className="text-slate-400">장미원 & 호수 수변 테라스 스팟</span>
            <span className="text-pink-400 font-bold flex items-center gap-0.5">
              미션 사진 올리기 →
            </span>
          </div>
        </button>

        {/* 미션 2: People Quest */}
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
                <span className="text-[10px] text-red-400 font-bold uppercase tracking-wider block">People Quest · 조원 전원 +100pt</span>
                <h3 className="text-[15px] font-bold text-white">최고의 스토리 동료 추천</h3>
              </div>
            </div>
            <span className={`text-[10.5px] font-bold px-2.5 py-1 rounded-full border flex-shrink-0 ${
              pqSubmitted
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
            }`}>
              {pqSubmitted ? '✅ 추천 완료' : '대화 진행 중'}
            </span>
          </div>

          <p className="text-[11.5px] text-slate-300 leading-relaxed mb-2.5">
            트레킹을 함께하며 조원들과 4가지 주제(취미, 버킷리스트, 다른 직업 등)로 대화하고 가장 인상 깊은 동료 1명을 추천해 주세요.
          </p>

          <div className="flex items-center justify-between text-[11px] pt-2 border-t border-white/5">
            <span className="text-slate-400">조별 1명 추천 시 조원당 <strong>+{PEOPLE_QUEST_POINTS_PER_MEMBER}pt</strong></span>
            <span className="text-red-400 font-bold flex items-center gap-0.5">
              추천 작성 →
            </span>
          </div>
        </button>
      </div>

      {/* 타임라인 단계 3: 트레킹 종료 & 빵명장 앞 단체사진 촬영 (4:30~5:00) */}
      <div className="space-y-1.5 pt-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-[12px] font-bold text-emerald-400 tracking-wide flex items-center gap-1">
            <span>🏁</span>
            <span>STEP 3 · 4:30~5:00 [빵명장 앞 & 실내]</span>
          </span>
          <span className="text-[10px] text-slate-400">종료 & 시상</span>
        </div>

        <div className="bg-[#121826] border border-emerald-500/30 rounded-2xl p-3.5 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-bold text-white flex items-center gap-1.5">
              <span>📸</span>
              <span>트레킹 완료 후 빵명장 앞 단체사진</span>
            </span>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold">
              전체 집결
            </span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            4:30까지 <strong>빵명장 서울대공원점 앞</strong>으로 복귀하여 전체 단체사진을 촬영한 뒤 실내로 입장합니다. (실내 퀴즈쇼 및 개인 시상 진행)
          </p>
        </div>
      </div>
    </div>
  );
};

// ─── 내 프로필 & 4문항 답변 조회 및 실시간 수정 모달 ─────────────
const MyProfileModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { participantName, participantCompany, myTeam, selectTeam } = useAppStore();
  
  const [modalName, setModalName] = useState(participantName || '');
  const [modalCompany, setModalCompany] = useState(participantCompany || '㈜두산');
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
    const currCompany = participantCompany || modalCompany || '㈜두산';
    if (participantName) setModalName(participantName);
    if (participantCompany) setModalCompany(participantCompany);
    if (myTeam?.id) setModalTeamId(myTeam.id);

    let localAnswers: Record<string, string> = {};
    try {
      const saved = localStorage.getItem('my_info_answers_draft');
      if (saved) localAnswers = JSON.parse(saved);
    } catch {}

    if (currName) {
      const pId = createParticipantId(currName, currCompany);
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
    const finalCompany = modalCompany || participantCompany || '㈜두산';
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
    }, 1000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#13192A] border border-white/15 w-full max-w-[380px] max-h-[90vh] rounded-3xl flex flex-col shadow-2xl overflow-hidden animate-fade-in">
        {/* 모달 상단 헤더 */}
        <div className="bg-[#182035] border-b border-white/10 px-5 py-3.5 flex items-center justify-between flex-shrink-0">
          <div>
            <span className="text-[10px] text-sky-400 font-bold uppercase tracking-wider block">
              MY PROFILE & 4-SURVEY
            </span>
            <h3 className="text-[15px] font-bold text-white">
              내 정보 및 4문항 답변 수정
            </h3>
          </div>
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
              <label className="text-[10.5px] text-slate-400 block mb-1 font-medium">참가자 이름 *</label>
              <input
                type="text"
                value={modalName}
                onChange={e => setModalName(e.target.value)}
                placeholder="이름 입력"
                className="w-full bg-[#1A2235] border border-white/10 rounded-xl px-2.5 py-1.5 text-white text-[12.5px] font-bold focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="text-[10.5px] text-slate-400 block mb-1 font-medium">소속 회사 *</label>
              <select
                value={modalCompany}
                onChange={e => setModalCompany(e.target.value)}
                className="w-full bg-[#1A2235] border border-white/10 rounded-xl px-2 py-1.5 text-white text-[12.5px] font-bold focus:outline-none focus:border-sky-500 appearance-none"
              >
                {WORKSHOP_COMPANIES.map(c => (
                  <option key={c} value={c} style={{ background: '#1A2235' }}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10.5px] text-slate-400 block mb-1 font-medium">소속 조 변경</label>
            <select
              value={modalTeamId}
              onChange={e => setModalTeamId(e.target.value)}
              className="w-full bg-[#1A2235] border border-white/10 rounded-xl px-2.5 py-1.5 text-white text-[12.5px] font-bold focus:outline-none focus:border-sky-500 appearance-none"
            >
              {WORKSHOP_TEAMS.map(t => (
                <option key={t.id} value={t.id} style={{ background: '#1A2235' }}>
                  {t.emoji} {t.name} ({t.courseName} · {t.courseDistance})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 4개 문항 리스트 */}
        <div className="p-4 space-y-3.5 flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="py-12 text-center text-slate-400 text-[13px]">
              <span className="animate-spin inline-block text-xl mb-2">🔄</span>
              <p>답변을 불러오는 중입니다...</p>
            </div>
          ) : (
            <>
              <div className="bg-black/30 p-2.5 rounded-xl border border-white/5 text-[11px] text-slate-300 leading-relaxed">
                💡 입력하신 답변은 트레킹 대화 및 <strong>저녁 퀴즈쇼 힌트</strong>로 실시간 연동됩니다.
              </div>

              {MY_INFO_QUESTIONS.map((q, idx) => {
                const currentVal = answers[q.id] || '';
                return (
                  <div key={q.id} className="bg-black/40 border border-white/8 rounded-2xl p-3 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <label className="text-[12px] font-bold text-slate-200 leading-snug">
                        <span className="text-sky-400 font-extrabold mr-1">Q{idx + 1}.</span>
                        {q.title}
                      </label>
                      <span className={`text-[10px] font-bold flex-shrink-0 ${currentVal.length >= 90 ? 'text-amber-400' : 'text-slate-500'}`}>
                        {currentVal.length}/100자
                      </span>
                    </div>
                    <textarea
                      rows={2}
                      maxLength={100}
                      value={currentVal}
                      onChange={e => handleTextChange(q.id, e.target.value)}
                      placeholder={q.placeholder}
                      className="w-full bg-[#13192A] border border-white/10 rounded-xl p-2 text-[12px] text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 resize-none"
                    />
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* 하단 액션 */}
        <div className="bg-[#182035] border-t border-white/10 p-4 space-y-2 flex-shrink-0">
          {errorMessage && (
            <div className="bg-red-500/20 border border-red-500/40 text-red-300 text-[12px] font-bold py-1.5 px-3 rounded-xl text-center animate-fade-in">
              ⚠️ {errorMessage}
            </div>
          )}

          {saveSuccess && (
            <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[12px] font-bold py-1.5 px-3 rounded-xl text-center animate-fade-in">
              ✅ 정보와 4문항 답변이 성공적으로 저장되었습니다!
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-[#13192A] text-slate-400 font-bold text-[13px] rounded-xl border border-white/10 hover:bg-[#1A2235] active:scale-95 transition-all"
            >
              닫기
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || isLoading}
              className="flex-1 py-3 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 disabled:opacity-50 text-white font-bold text-[13px] rounded-xl shadow-lg shadow-sky-500/20 active:scale-95 transition-all flex items-center justify-center gap-1.5"
            >
              <span>{isSaving ? '저장 처리 중...' : '저장하기 💾'}</span>
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

// ─── 대시보드 메인 컴포넌트 ───────────────────────────────────
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

  const [rawSessionData, setRawSessionData] = useState<any>({});
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);
  const [isTutorialModalOpen, setIsTutorialModalOpen] = useState(false);
  const [isThemeGardenModalOpen, setIsThemeGardenModalOpen] = useState(false);

  const teamId = normalizeTeamId(myTeam?.id);
  const participantId = participantName && participantCompany
    ? createParticipantId(participantName, participantCompany)
    : 'anonymous';

  const dbUrl = FIREBASE_DB_URL;

  // 1. RTDB 데이터를 단일 진실 공급원(Single Source of Truth)으로 삼는 100% 통합 점수 계산
  const { individuals, teams } = useMemo(() => {
    const participants = (rawSessionData?.participants && typeof rawSessionData.participants === 'object')
      ? rawSessionData.participants
      : {};
    const quests = (rawSessionData?.peopleQuest && typeof rawSessionData.peopleQuest === 'object')
      ? rawSessionData.peopleQuest
      : {};
    const themePhotos = (rawSessionData?.themeGardenPhotos && typeof rawSessionData.themeGardenPhotos === 'object')
      ? rawSessionData.themeGardenPhotos
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
      themePhotos
    );
  }, [rawSessionData, participantName, participantCompany, teamId, answeredQuizIds, isPeopleQuestSubmitted]);

  // 2. 파생 점수 및 상태 산출
  const myRankObj = useMemo(() => {
    return teams.find(t => t.id === teamId) || teams[0];
  }, [teams, teamId]);

  const myIndividual = useMemo(() => {
    if (!participantName) return null;
    const trimmed = participantName.trim();
    return individuals.find(ind => ind.name.trim() === trimmed) || null;
  }, [individuals, participantName]);

  const teamScore = myRankObj ? myRankObj.score : 0;
  const teamRank = myRankObj ? myRankObj.rank : 1;
  const personalScore = myIndividual ? myIndividual.pts : 0;

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
    const myP = rawSessionData?.participants?.[participantId];
    return !!(myP?.tutorial?.completed);
  }, [rawSessionData, participantId]);

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
      updateTeamScore(teamId, teamScore);
      syncSessionData({
        teams,
        myTeamScore: teamScore,
        myTeamRank: teamRank,
        myTeamMissionsCompleted: myRankObj.missionsCompleted,
        isPeopleQuestSubmitted: pqSubmitted,
      });
    }
  }, [teams, teamScore, teamRank, myRankObj, pqSubmitted, teamId, updateTeamScore, syncSessionData]);

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

  const totalMissions = (myIndividual?.missions || 0);
  const isAllCompleted = (pqSubmitted && themeGardenDone) || (totalMissions >= 2);

  // 6. 참가자 프로필 자동 동기화
  useEffect(() => {
    if (!participantName || !participantCompany || !myTeam) return;
    const pId = createParticipantId(participantName, participantCompany);

    let localAnswers: Record<string, string> = {};
    try {
      const saved = localStorage.getItem('my_info_answers_draft');
      if (saved) localAnswers = JSON.parse(saved);
    } catch {}

    const payload = {
      name: participantName.trim(),
      company: participantCompany,
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
    <div className="max-w-[390px] mx-auto bg-[#0D1117] min-h-screen pb-24 font-['Noto_Sans_KR']">
      <Header onOpenProfile={() => setIsProfileModalOpen(true)} />
      <ScoreCard
        teamScore={teamScore}
        teamRank={teamRank}
        personalScore={personalScore}
        maxScore={maxScore}
      />
      <ActivitySection
        hasTutorialDone={hasTutorialDone}
        hasGroundRulesDone={hasGroundRulesDone}
        themeGardenDone={themeGardenDone}
        pqSubmitted={pqSubmitted}
        isAllCompleted={isAllCompleted}
        onOpenTutorialModal={() => setIsTutorialModalOpen(true)}
        onOpenThemeGardenModal={() => setIsThemeGardenModalOpen(true)}
        onOpenCertificate={() => setIsCertModalOpen(true)}
      />
      <BottomNav active="/" />

      {/* 1단계: 튜토리얼 빵 가격 퀴즈 & 조별 그라운드룰 모달 */}
      <TutorialGroundRulesModal
        isOpen={isTutorialModalOpen}
        onClose={() => setIsTutorialModalOpen(false)}
        teamId={teamId}
        participantName={participantName}
        participantCompany={participantCompany}
      />

      {/* 2단계: 테마가든 시그니처 단체사진 촬영 & 업로드 모달 */}
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

      {/* 내 프로필 및 4문항 답변 실시간 수정 모달 */}
      <MyProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />

      {/* 👑 2026 CHRO 트레킹 전 코스 완주 인증서 모달 */}
      <CompletionCertificateModal
        isOpen={isCertModalOpen}
        onClose={() => setIsCertModalOpen(false)}
        personalScore={personalScore}
        teamScore={teamScore}
        totalMissions={totalMissions}
      />
    </div>
  );
};

export default Dashboard;
export { BottomNav };
