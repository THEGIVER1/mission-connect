import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import {
  PRE_REGISTERED_PARTICIPANTS,
  PEOPLE_QUEST_MISSION_TITLE,
  PEOPLE_QUEST_MISSION_GUIDE,
  PEOPLE_QUEST_POINTS_PER_MEMBER,
  WORKSHOP_TEAMS,
} from '../../config/workshopConfig';
import { normalizeTeamId } from '../../utils/scoreCalculator';
import { PreRegisteredPerson } from '../../types';
import { fireConfetti } from '../../lib/confetti';
import { ref, set, get, update, onValue } from 'firebase/database';
import { rtdb } from '../../lib/firebase';

interface UnifiedRecommendation {
  recommendedPersonId: string;
  recommendedPersonName: string;
  recommendedPersonCompany: string;
  selectedTopic: string;
  reason: string;
}

const TOPIC_OPTIONS = [
  '최근 가장 푹 빠진 취미/관심사',
  '5일 자유시간에 하고 싶은 일',
  '다시 태어나면 해보고 싶은 직업',
  '3년 내 꼭 이루고 싶은 버킷리스트',
  '의외의 특별한 사실이나 이력',
  '회사생활 중 가장 성장했던 경험',
  '새롭게 도전해보고 싶은 분야',
];

const PeopleQuestScreen: React.FC = () => {
  const navigate = useNavigate();
  const {
    myTeam,
    participantName,
    participantCompany,
    completeMission,
    updateTeamScore,
    setPeopleQuestSubmitted,
    syncSessionData,
    lastResetAt,
    resetLocalProgress,
  } = useAppStore();

  const [recommendation, setRecommendation] = useState<UnifiedRecommendation>({
    recommendedPersonId: '',
    recommendedPersonName: '',
    recommendedPersonCompany: '',
    selectedTopic: TOPIC_OPTIONS[0],
    reason: '',
  });

  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [submittedData, setSubmittedData] = useState<any>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [companyFilter, setCompanyFilter] = useState<'all' | '㈜두산' | '두산경영연구원'>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 동적 참여자 목록 & 직접 입력 상태
  const [realParticipants, setRealParticipants] = useState<any[]>([]);
  const [modalTab, setModalTab] = useState<'roster' | 'manual'>('roster');
  const [manualName, setManualName] = useState<string>('');
  const [manualCompany, setManualCompany] = useState<string>('㈜두산');

  const teamId = normalizeTeamId(myTeam?.id);
  const dbUrl = import.meta.env.VITE_FIREBASE_DATABASE_URL || 'https://doosan-teambuilding-default-rtdb.firebaseio.com';

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 1. Firebase RTDB에서 우리 조의 People Quest 현황 및 전체 참가자 실시간 동기화 (Dual: REST + SDK)
  useEffect(() => {
    if (!myTeam?.id) return;

    // 1) REST 즉시 조회
    const fetchPQ = async () => {
      try {
        const sessionRes = await fetch(`${dbUrl}/sessions/trekking2026.json?t=${Date.now()}`, { cache: 'no-store' });
        if (sessionRes.ok) {
          const sessionData = await sessionRes.json();
          if (sessionData && sessionData.lastResetAt && (!lastResetAt || sessionData.lastResetAt > lastResetAt)) {
            resetLocalProgress(sessionData.lastResetAt);
            setIsSubmitted(false);
            setSubmittedData(null);
            setPeopleQuestSubmitted(false);
            setRecommendation({
              recommendedPersonId: '',
              recommendedPersonName: '',
              recommendedPersonCompany: '',
              selectedTopic: TOPIC_OPTIONS[0],
              reason: '',
            });
            return;
          }
        }

        const res = await fetch(`${dbUrl}/sessions/trekking2026/peopleQuest/${myTeam.id}.json?t=${Date.now()}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.status === 'submitted') {
            setIsSubmitted(true);
            setSubmittedData(data);
            setPeopleQuestSubmitted(true);
            if (data.recommendation) {
              setRecommendation(prev => ({
                ...prev,
                ...data.recommendation,
              }));
            }
          } else {
            setIsSubmitted(false);
            setSubmittedData(null);
            setPeopleQuestSubmitted(false);
            if (data?.recommendation) {
              setRecommendation(prev => ({
                ...prev,
                ...data.recommendation,
              }));
            }
          }
        } else {
          setIsSubmitted(false);
          setSubmittedData(null);
          setPeopleQuestSubmitted(false);
        }
      } catch (err) {
        console.warn('REST PQ 조회 경고:', err);
      }
    };

    const fetchParticipants = async () => {
      try {
        const res = await fetch(`${dbUrl}/sessions/trekking2026/participants.json?t=${Date.now()}`);
        if (res.ok) {
          const data = await res.json();
          if (data && typeof data === 'object') {
            setRealParticipants(Object.values(data));
          } else {
            setRealParticipants([]);
          }
        }
      } catch (err) {
        console.warn('참가자 목록 조회 경고:', err);
      }
    };

    fetchPQ();
    fetchParticipants();

    // 2) WebSocket 실시간 리스너
    try {
      const pqRef = ref(rtdb, `sessions/trekking2026/peopleQuest/${myTeam.id}`);
      const unsubscribePQ = onValue(
        pqRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.val();
            if (data && data.status === 'submitted') {
              setIsSubmitted(true);
              setSubmittedData(data);
              setPeopleQuestSubmitted(true);
              if (data.recommendation) {
                setRecommendation(prev => ({
                  ...prev,
                  ...data.recommendation,
                }));
              }
            } else {
              setIsSubmitted(false);
              setSubmittedData(null);
              setPeopleQuestSubmitted(false);
              if (data?.recommendation) {
                setRecommendation(prev => ({
                  ...prev,
                  ...data.recommendation,
                }));
              }
            }
          } else {
            setIsSubmitted(false);
            setSubmittedData(null);
            setPeopleQuestSubmitted(false);
          }
        },
        (error) => {
          console.warn('PeopleQuest 동기화 경고:', error);
        }
      );

      const pRef = ref(rtdb, 'sessions/trekking2026/participants');
      const unsubscribeP = onValue(
        pRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.val();
            if (data && typeof data === 'object') {
              setRealParticipants(Object.values(data));
            } else {
              setRealParticipants([]);
            }
          } else {
            setRealParticipants([]);
          }
        },
        (error) => {
          console.warn('참가자 목록 동기화 경고:', error);
        }
      );

      return () => {
        unsubscribePQ();
        unsubscribeP();
      };
    } catch (e) {
      console.warn('Firebase 리스너 연결 경고:', e);
    }
  }, [myTeam?.id, dbUrl, lastResetAt, resetLocalProgress]);

  // 2. 추천 대상자 검색 및 필터링 (본인 제외, 실제 접속 참가자 통합)
  const availablePeople = useMemo(() => {
    const map = new Map<string, any>();
    PRE_REGISTERED_PARTICIPANTS.forEach(p => {
      map.set(p.name.trim(), p);
    });
    realParticipants.forEach(p => {
      if (!p?.name) return;
      map.set(p.name.trim(), {
        id: p.id || p.name.trim(),
        name: p.name.trim(),
        company: p.company || '',
        teamId: p.teamId || 'team1',
        teamName: p.teamName || '1조',
      });
    });

    const list = Array.from(map.values());
    return list.filter((p) => {
      if (participantName && p.name.trim() === participantName.trim()) return false;
      if (companyFilter !== 'all' && p.company !== companyFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return p.name.toLowerCase().includes(q) || (p.company || '').toLowerCase().includes(q) || (p.teamName || '').includes(q);
      }
      return true;
    });
  }, [participantName, companyFilter, searchQuery, realParticipants]);

  // 3. 인물 선택 핸들러
  const handleSelectPerson = (person: { id: string; name: string; company: string }) => {
    setRecommendation(prev => ({
      ...prev,
      recommendedPersonId: person.id,
      recommendedPersonName: person.name,
      recommendedPersonCompany: person.company,
    }));
    setIsModalOpen(false);
  };

  // 3-1. 직접 입력 선택 핸들러
  const handleManualSelect = () => {
    if (!manualName.trim()) {
      showToast('⚠️ 동료 이름을 입력해주세요.');
      return;
    }
    setRecommendation(prev => ({
      ...prev,
      recommendedPersonId: manualName.trim(),
      recommendedPersonName: manualName.trim(),
      recommendedPersonCompany: manualCompany,
    }));
    setIsModalOpen(false);
  };

  // 4. 임시 저장 (Dual: REST + SDK)
  const handleDraftSave = async () => {
    if (!myTeam?.id) return;
    setIsSaving(true);
    const draftPayload = {
      teamId: myTeam.id,
      teamName: myTeam.name,
      recommendation,
      status: 'draft',
      updatedAt: new Date().toISOString(),
      updatedBy: `${participantName || '익명'}(${participantCompany || '소속'})`,
    };

    try {
      // 1) REST
      await fetch(`${dbUrl}/sessions/trekking2026/peopleQuest/${myTeam.id}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draftPayload),
      });

      // 2) SDK
      try {
        const pqRef = ref(rtdb, `sessions/trekking2026/peopleQuest/${myTeam.id}`);
        await set(pqRef, draftPayload);
      } catch (sdkErr) {}

      showToast('💾 임시 저장이 완료되었습니다.');
    } catch (e: any) {
      console.warn('임시 저장 실패:', e);
      showToast('⚠️ 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  // 5. 최종 제출 실행 (Dual: REST + SDK + 0ms Optimistic Update)
  const executeSubmit = async () => {
    if (!myTeam?.id) return;
    setIsSaving(true);
    setIsConfirmModalOpen(false);

    try {
      const nowIso = new Date().toISOString();
      const payload = {
        teamId,
        teamName: myTeam.name,
        recommendation,
        status: 'submitted',
        submittedAt: nowIso,
        submittedBy: `${participantName || '익명'}(${participantCompany || '소속'})`,
      };

      // 1) 로컬 Zustand 스토어 즉시 반영 (0ms 낙관적 업데이트)
      setPeopleQuestSubmitted(true);
      completeMission('mission_people_quest', PEOPLE_QUEST_POINTS_PER_MEMBER);
      updateTeamScore(teamId, (myTeam.score ?? 0) + PEOPLE_QUEST_POINTS_PER_MEMBER);
      syncSessionData({
        isPeopleQuestSubmitted: true,
        myTeamScore: (myTeam.score ?? 0) + PEOPLE_QUEST_POINTS_PER_MEMBER,
      });

      // 2) REST API로 People Quest 상태 및 참가자 점수 보장 저장
      try {
        await fetch(`${dbUrl}/sessions/trekking2026/peopleQuest/${teamId}.json`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (participantName && participantCompany) {
          const participantId = `${participantName.trim()}_${participantCompany}`.replace(/\s/g, '_');
          // 기존 참가자 퀴즈 점수 조회
          const pRes = await fetch(`${dbUrl}/sessions/trekking2026/participants/${encodeURIComponent(participantId)}.json`);
          let existingData: any = null;
          if (pRes.ok) existingData = await pRes.json();

          let quizEarned = 0;
          let quizCompletedCount = 0;
          if (existingData?.quizzes && typeof existingData.quizzes === 'object') {
            Object.values(existingData.quizzes).forEach((q: any) => {
              quizEarned += Number(q.pointsEarned || 0);
              if (q.isCorrect) quizCompletedCount += 1;
            });
          }

          const newScore = quizEarned + PEOPLE_QUEST_POINTS_PER_MEMBER;
          const newMissions = quizCompletedCount + 1;

          await fetch(`${dbUrl}/sessions/trekking2026/participants/${encodeURIComponent(participantId)}.json`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: participantName.trim(),
              company: participantCompany,
              teamId,
              teamName: myTeam.name,
              score: newScore,
              missionsCompleted: newMissions,
              peopleQuestCompleted: true,
              updatedAt: nowIso,
            }),
          });
        }
      } catch (restErr) {
        console.warn('REST PQ 제출 경고:', restErr);
      }

      // 3) Firebase RTDB SDK 저장 (웹소켓 브로드캐스트)
      try {
        const pqRef = ref(rtdb, `sessions/trekking2026/peopleQuest/${teamId}`);
        await set(pqRef, payload);

        if (participantName && participantCompany) {
          const participantId = `${participantName.trim()}_${participantCompany}`.replace(/\s/g, '_');
          const pRef = ref(rtdb, `sessions/trekking2026/participants/${participantId}`);
          await update(pRef, {
            name: participantName.trim(),
            company: participantCompany,
            teamId,
            teamName: myTeam.name,
            peopleQuestCompleted: true,
          });
        }
      } catch (sdkErr) {
        console.warn('SDK PQ 제출 경고:', sdkErr);
      }

      setIsSubmitted(true);
      setSubmittedData(payload);

      // 축하 컨페티 효과 실행
      fireConfetti({ count: 80, spread: 85 });
      showToast(`🎉 조별 추천 미션 완료! (조원 전원 +${PEOPLE_QUEST_POINTS_PER_MEMBER}pt)`);
    } catch (e: any) {
      console.error('PeopleQuest 제출 에러:', e);
      showToast(`⚠️ 제출 중 오류가 발생했습니다: ${e?.message || '네트워크 확인 필요'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenConfirm = () => {
    if (!recommendation.recommendedPersonName) {
      alert('추천할 동료를 먼저 선택해주세요.');
      return;
    }
    if (!recommendation.reason.trim()) {
      alert('동료와 나눈 이야기나 추천 사유를 작성해주세요.');
      return;
    }
    setIsConfirmModalOpen(true);
  };

  return (
    <div className="max-w-[390px] mx-auto bg-[#0D1117] min-h-screen pb-24 font-['Noto_Sans_KR'] flex flex-col text-slate-100 select-none">
      {/* 토스트 메시지 */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-[#1E293B] border border-red-500/40 text-white text-[13px] px-4 py-2.5 rounded-xl shadow-2xl animate-bounce">
          {toastMessage}
        </div>
      )}

      {/* 상단 헤더 */}
      <header className="bg-[#13192A] border-b border-white/8 px-4 pt-3 pb-3 relative flex-shrink-0 z-10">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-red-600 to-orange-500" />
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="w-9 h-9 rounded-xl bg-[#1A2235] border border-white/8 flex items-center justify-center text-white text-base active:scale-95"
          >
            ←
          </button>
          <div className="text-center">
            <span className="font-bebas text-xl tracking-widest text-white">
              ACTIVITY 1 · <span className="text-red-500">PEOPLE QUEST</span>
            </span>
            <p className="text-[10px] text-slate-400">조별 대화 & 인물 추천 미션</p>
          </div>
          <span className="text-[11px] bg-red-500/15 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full font-bold">
            +{PEOPLE_QUEST_POINTS_PER_MEMBER}pt
          </span>
        </div>
      </header>

      <div className="p-4 space-y-4 flex-1 overflow-y-auto">
        {/* 미션 안내 카드 */}
        <div className="bg-[#13192A] border border-white/10 rounded-2xl p-4 space-y-2 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-bold text-red-400 flex items-center gap-1.5">
              💬 {myTeam?.name} 협동 미션
            </span>
            {isSubmitted ? (
              <span className="text-[11px] bg-green-500/20 text-green-400 border border-green-500/30 px-2.5 py-0.5 rounded-full font-bold">
                ✓ 제출 완료 (+{PEOPLE_QUEST_POINTS_PER_MEMBER}pt)
              </span>
            ) : (
              <span className="text-[11px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2.5 py-0.5 rounded-full font-bold">
                진행 중 (조별 1명 추천)
              </span>
            )}
          </div>
          <h2 className="text-[16px] font-bold text-white leading-snug">
            {PEOPLE_QUEST_MISSION_TITLE}
          </h2>
          <p className="text-[12px] text-slate-300 leading-relaxed">
            {PEOPLE_QUEST_MISSION_GUIDE}
          </p>
        </div>

        {/* 이미 제출 완료된 경우 결과 카드 표시 */}
        {isSubmitted ? (
          <div className="bg-[#1A2235] border border-green-500/30 rounded-2xl p-4 space-y-4 shadow-xl text-center">
            <div className="w-14 h-14 bg-green-500/20 text-green-400 border border-green-500/40 rounded-full flex items-center justify-center text-2xl mx-auto shadow-inner">
              🎉
            </div>
            <div>
              <h3 className="text-[17px] font-bold text-white">우리 조의 추천 제출 완료!</h3>
              <p className="text-[12px] text-slate-300 mt-1">
                저녁 식사 자리의 <strong>퀴즈 대항전 및 네트워킹 하이라이트</strong>에서 공개됩니다.
              </p>
            </div>

            <div className="bg-black/30 border border-white/5 rounded-xl p-3.5 text-left space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[11px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full font-bold">
                  {submittedData?.recommendation?.selectedTopic || '추천 스토리'}
                </span>
                <span className="text-[11px] text-slate-400">
                  {submittedData?.submittedBy}
                </span>
              </div>
              <p className="text-[15px] font-bold text-white">
                👑 {submittedData?.recommendation?.recommendedPersonName} 님 ({submittedData?.recommendation?.recommendedPersonCompany})
              </p>
              <p className="text-[12px] text-slate-300 bg-white/5 p-2.5 rounded-lg italic">
                "{submittedData?.recommendation?.reason}"
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => navigate('/leaderboard')}
                className="flex-1 py-3 bg-amber-500 text-slate-900 font-bold text-[13px] rounded-xl active:scale-98 shadow"
              >
                🏆 실시간 순위 확인하기
              </button>
              <button
                onClick={() => navigate('/')}
                className="flex-1 py-3 bg-[#13192A] border border-white/10 text-white font-bold text-[13px] rounded-xl active:scale-98 shadow"
              >
                대시보드로 돌아가기
              </button>
            </div>
          </div>
        ) : (
          /* 작성 및 입력 폼 */
          <div className="space-y-4">
            {/* 1. 추천 대상자 선택 카드 */}
            <div className="bg-[#1A2235] border border-white/10 rounded-2xl p-4 space-y-3 shadow-lg">
              <div className="flex items-center justify-between">
                <label className="text-[13px] font-bold text-white flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 flex items-center justify-center text-[11px] font-bold">
                    1
                  </span>
                  추천할 동료 선택 *
                </label>
                <span className="text-[11px] text-slate-400">(본인 제외)</span>
              </div>

              {recommendation.recommendedPersonName ? (
                <div className="flex items-center justify-between bg-black/40 border border-red-500/40 rounded-xl p-3">
                  <div>
                    <span className="text-[11px] text-red-400 font-bold block">
                      {recommendation.recommendedPersonCompany}
                    </span>
                    <span className="text-[15px] font-bold text-white">
                      {recommendation.recommendedPersonName} 님
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    className="px-3 py-1.5 bg-[#212C42] hover:bg-[#2A3752] text-slate-300 text-[12px] rounded-lg border border-white/10"
                  >
                    변경하기
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="w-full py-3.5 bg-black/30 hover:bg-black/50 border border-dashed border-white/20 rounded-xl text-slate-300 text-[13px] font-bold flex items-center justify-center gap-2 active:scale-98 transition-all"
                >
                  <span>🔍</span>
                  <span>추천할 동료 선택 또는 직접 입력</span>
                </button>
              )}
            </div>

            {/* 2. 대화 주제 선택 */}
            <div className="bg-[#1A2235] border border-white/10 rounded-2xl p-4 space-y-2 shadow-lg">
              <label className="text-[13px] font-bold text-white flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 flex items-center justify-center text-[11px] font-bold">
                  2
                </span>
                가장 인상 깊었던 대화 주제
              </label>
              <select
                value={recommendation.selectedTopic}
                onChange={e => setRecommendation(prev => ({ ...prev, selectedTopic: e.target.value }))}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-3 text-[13px] text-white focus:outline-none focus:border-red-500 transition-colors appearance-none"
              >
                {TOPIC_OPTIONS.map(opt => (
                  <option key={opt} value={opt} style={{ background: '#1A2235', color: 'white' }}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. 대화 스토리 및 추천 이유 작성 */}
            <div className="bg-[#1A2235] border border-white/10 rounded-2xl p-4 space-y-2 shadow-lg">
              <div className="flex justify-between items-center">
                <label className="text-[13px] font-bold text-white flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 flex items-center justify-center text-[11px] font-bold">
                    3
                  </span>
                  나눈 이야기 & 추천 사유 *
                </label>
                <span className={`text-[11px] ${recommendation.reason.length > 130 ? 'text-amber-400 font-bold' : 'text-slate-500'}`}>
                  {recommendation.reason.length}/150자
                </span>
              </div>
              <textarea
                maxLength={150}
                rows={4}
                value={recommendation.reason}
                onChange={e => setRecommendation(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="트레킹 중 나눈 인상 깊었던 이야기나 동료의 매력 포인트를 자유롭게 적어주세요. (예: 주말마다 마라톤 풀코스를 3번 완주하셨다는 이야기를 듣고 깜짝 놀랐습니다!)"
                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-[13px] placeholder-slate-600 focus:outline-none focus:border-red-500 transition-colors resize-none leading-relaxed"
              />
            </div>

            {/* 하단 액션 버튼 */}
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleDraftSave}
                disabled={isSaving}
                className="w-1/3 py-3.5 bg-[#1A2235] hover:bg-[#222C44] text-slate-300 font-bold text-[14px] rounded-xl border border-white/10 active:scale-98 transition-all"
              >
                임시 저장
              </button>
              <button
                type="button"
                onClick={handleOpenConfirm}
                disabled={isSaving}
                className="flex-1 py-3.5 bg-red-500 hover:bg-red-600 text-white font-bold text-[14px] rounded-xl active:scale-98 transition-all shadow-lg shadow-red-500/20 flex items-center justify-center gap-1.5"
              >
                <span>최종 제출 (+{PEOPLE_QUEST_POINTS_PER_MEMBER}pt)</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 최종 제출 확인 모달 */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#13192A] border border-red-500/40 w-full max-w-[340px] rounded-3xl p-5 text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 bg-red-500/20 text-red-400 border border-red-500/30 rounded-full flex items-center justify-center text-xl mx-auto">
              💬
            </div>
            <div>
              <h3 className="text-[16px] font-bold text-white leading-snug">
                [{recommendation.recommendedPersonName}] 님을 최종 추천할까요?
              </h3>
              <p className="text-[12px] text-slate-400 mt-1">
                제출 시 조원 전원에게 <strong>+{PEOPLE_QUEST_POINTS_PER_MEMBER}pt</strong>가 즉시 부여되며, 실시간 리더보드에 반영됩니다.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setIsConfirmModalOpen(false)}
                className="flex-1 py-3 bg-[#1A2235] text-slate-400 font-bold text-[13px] rounded-xl border border-white/10"
              >
                취소
              </button>
              <button
                onClick={executeSubmit}
                disabled={isSaving}
                className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-bold text-[13px] rounded-xl shadow active:scale-98"
              >
                {isSaving ? '제출 중...' : '최종 제출'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 추천 동료 선택 / 직접 입력 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-[#13192A] border border-white/10 w-full max-w-[390px] h-[82vh] rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden animate-slide-up">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div>
                <h3 className="text-[16px] font-bold text-white">추천할 동료 찾기</h3>
                <p className="text-[11px] text-slate-400">대화 중 인상 깊었던 동료를 선택하거나 입력하세요</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-slate-400 text-lg"
              >
                ✕
              </button>
            </div>

            {/* 탭 전환 (참여 동료 목록 / 직접 이름 입력) */}
            <div className="flex bg-[#0D1117] border-b border-white/10">
              <button
                type="button"
                onClick={() => setModalTab('roster')}
                className={`flex-1 py-2.5 text-[12px] font-bold border-b-2 transition-all ${
                  modalTab === 'roster'
                    ? 'text-red-400 border-red-500'
                    : 'text-slate-400 border-transparent hover:text-white'
                }`}
              >
                👥 참여 동료 목록 ({availablePeople.length}명)
              </button>
              <button
                type="button"
                onClick={() => setModalTab('manual')}
                className={`flex-1 py-2.5 text-[12px] font-bold border-b-2 transition-all ${
                  modalTab === 'manual'
                    ? 'text-red-400 border-red-500'
                    : 'text-slate-400 border-transparent hover:text-white'
                }`}
              >
                ✏️ 직접 이름 입력
              </button>
            </div>

            {modalTab === 'roster' ? (
              <>
                {/* 검색창 & 소속 필터 */}
                <div className="p-3 bg-[#0D1117] space-y-2 border-b border-white/5">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="이름 또는 소속 검색 (예: 홍길동)"
                    className="w-full bg-[#1A2235] border border-white/10 rounded-xl px-3.5 py-2.5 text-[13px] text-white placeholder-slate-600 focus:outline-none focus:border-red-500"
                  />
                  <div className="flex gap-1.5">
                    {(['all', '㈜두산', '두산경영연구원'] as const).map(tab => (
                      <button
                        key={tab}
                        onClick={() => setCompanyFilter(tab)}
                        className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                          companyFilter === tab
                            ? 'bg-red-500 text-white'
                            : 'bg-[#1A2235] text-slate-400 hover:text-white'
                        }`}
                      >
                        {tab === 'all' ? '전체' : tab}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 참가자 리스트 */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {availablePeople.length === 0 ? (
                    <div className="text-center py-10 px-4 space-y-3">
                      <div className="text-3xl">👥</div>
                      <p className="text-slate-400 text-[13px] font-bold">
                        아직 참여한 동료가 없거나 검색 결과가 없습니다.
                      </p>
                      <p className="text-slate-500 text-[11px]">
                        아직 앱에 로그인하지 않은 동료는 [직접 이름 입력]으로 추천할 수 있습니다.
                      </p>
                      <button
                        type="button"
                        onClick={() => setModalTab('manual')}
                        className="px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl text-[12px] font-bold hover:bg-red-500/30"
                      >
                        ✏️ 직접 이름 입력하러 가기
                      </button>
                    </div>
                  ) : (
                    availablePeople.map(p => (
                      <button
                        key={p.id}
                        onClick={() => handleSelectPerson(p)}
                        className="w-full bg-[#1A2235] hover:bg-[#202B42] border border-white/5 rounded-xl p-3 flex items-center justify-between text-left transition-all active:scale-98"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 font-bold text-[13px]">
                            {p.name.charAt(0)}
                          </div>
                          <div>
                            <span className="text-[14px] font-bold text-white block">
                              {p.name}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {p.company} {p.teamName ? `· ${p.teamName}` : ''}
                            </span>
                          </div>
                        </div>
                        <span className="text-[12px] text-red-400 font-bold">
                          선택 →
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </>
            ) : (
              /* 직접 이름 입력 폼 */
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="bg-[#1A2235] border border-white/10 rounded-2xl p-4 space-y-3">
                  <div>
                    <label className="text-[12px] font-bold text-slate-300 block mb-1">
                      추천할 동료 이름 *
                    </label>
                    <input
                      type="text"
                      value={manualName}
                      onChange={e => setManualName(e.target.value)}
                      placeholder="예: 홍길동"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-3 text-[14px] text-white placeholder-slate-600 focus:outline-none focus:border-red-500"
                    />
                  </div>

                  <div>
                    <label className="text-[12px] font-bold text-slate-300 block mb-1">
                      소속 회사 *
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {['㈜두산', '두산경영연구원'].map(comp => (
                        <button
                          key={comp}
                          type="button"
                          onClick={() => setManualCompany(comp)}
                          className={`py-2.5 rounded-xl text-[12px] font-bold border transition-all ${
                            manualCompany === comp
                              ? 'bg-red-500/20 border-red-500 text-red-300 font-bold'
                              : 'bg-black/30 border-white/10 text-slate-400'
                          }`}
                        >
                          {comp}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleManualSelect}
                  className="w-full py-3.5 bg-red-500 hover:bg-red-600 text-white font-bold text-[14px] rounded-xl shadow-lg active:scale-98 transition-all"
                >
                  이 동료로 선택 완료 ✓
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PeopleQuestScreen;
