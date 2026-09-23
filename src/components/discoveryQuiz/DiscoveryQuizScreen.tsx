import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import {
  DISCOVERY_QUIZZES,
  WORKSHOP_TEAMS,
  EMERGENCY_GPS_BYPASS_CODE,
  PEOPLE_QUEST_POINTS_PER_MEMBER,
  getCourseQuizTotalPoints,
} from '../../config/workshopConfig';
import { DiscoveryQuizItem } from '../../types';
import { fireConfetti } from '../../lib/confetti';
import { ref, get, set, update } from 'firebase/database';
import { rtdb } from '../../lib/firebase';

function haversine(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return Math.round(R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x)));
}

interface UserQuizResult {
  selectedIdx: number;
  isCorrect: boolean;
  pointsEarned: number;
  answeredAt: string;
}

const DiscoveryQuizScreen: React.FC = () => {
  const navigate = useNavigate();
  const {
    myTeam,
    participantName,
    participantCompany,
    myLocation,
    setMyLocation,
    selectedCourse,
    updateTeamScore,
    addAnsweredQuiz,
    syncSessionData,
    isPeopleQuestSubmitted,
  } = useAppStore();

  const activeCourse = selectedCourse;
  const teamConfig = WORKSHOP_TEAMS.find(t => t.id === myTeam?.id);

  // 내 코스에 해당하는 퀴즈 목록 (동적 필터링)
  const activeQuizzes: DiscoveryQuizItem[] = useMemo(() => {
    return DISCOVERY_QUIZZES.filter(q => q.courseKey === 'all' || q.courseKey === activeCourse);
  }, [activeCourse]);

  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [hasSubmittedAnswer, setHasSubmittedAnswer] = useState<boolean>(false);
  const [quizResults, setQuizResults] = useState<Record<string, UserQuizResult>>({});
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // ★ 도착 후 활성화 버튼 클릭 여부 상태 관리 (세션 복원)
  const [unlockedQuizzes, setUnlockedQuizzes] = useState<Record<string, boolean>>(() => {
    try {
      const saved = sessionStorage.getItem('discovery_unlocked_quizzes');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // 현장 비상 패스코드 모달 상태
  const [isBypassModalOpen, setIsBypassModalOpen] = useState<boolean>(false);
  const [inputBypassCode, setInputBypassCode] = useState<string>('');
  const [bypassCodeError, setBypassCodeError] = useState<string>('');
  const [isBypassUnlocked, setIsBypassUnlocked] = useState<boolean>(() => {
    return sessionStorage.getItem('discovery_gps_bypassed') === 'true';
  });

  const currentQuiz = activeQuizzes[currentIdx] || activeQuizzes[0];
  const participantId = participantName && participantCompany
    ? `${participantName.trim()}_${participantCompany}`.replace(/\s/g, '_')
    : 'anonymous';

  const dbUrl = import.meta.env.VITE_FIREBASE_DATABASE_URL || 'https://doosan-teambuilding-default-rtdb.firebaseio.com';

  // 1. Firebase에서 내가 이미 푼 퀴즈 결과 불러오기
  useEffect(() => {
    const fetchMyQuizzes = async () => {
      try {
        const res = await fetch(`${dbUrl}/sessions/trekking2026/participants/${encodeURIComponent(participantId)}/quizzes.json`);
        if (res.ok) {
          const data = await res.json();
          if (data && typeof data === 'object') {
            setQuizResults(data);
            Object.keys(data).forEach(qId => addAnsweredQuiz(qId));
          }
        }
      } catch (err) {
        console.warn('퀴즈 결과 로드 실패:', err);
      }
    };

    fetchMyQuizzes();
  }, [participantId, dbUrl]);

  // 2. 현재 퀴즈 전환 시 이전 풀이 상태 복원
  useEffect(() => {
    if (!currentQuiz) return;
    const existing = quizResults[currentQuiz.id];
    if (existing) {
      setSelectedOption(existing.selectedIdx);
      setHasSubmittedAnswer(true);
    } else {
      setSelectedOption(null);
      setHasSubmittedAnswer(false);
    }
  }, [currentIdx, currentQuiz, quizResults]);

  // 3. GPS 현재 위치 측정 (스마트 오차 버퍼링)
  const checkCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGpsError('기기에서 위치 정보를 지원하지 않습니다.');
      return;
    }
    setIsLocating(true);
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setMyLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setGpsAccuracy(pos.coords.accuracy || null);
        setIsLocating(false);
      },
      err => {
        setIsLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGpsError('위치 권한이 차단되었습니다. 아래 [🔑 현장 인증코드]로 인증할 수 있습니다.');
        } else {
          setGpsError('위치 신호가 약합니다. 아래 [🔑 현장 인증코드]로 인증할 수 있습니다.');
        }
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  useEffect(() => {
    checkCurrentLocation();
  }, []);

  // 거리 계산 및 스마트 오차 버퍼링
  const distance = useMemo(() => {
    if (!myLocation || !currentQuiz) return Infinity;
    return haversine(myLocation, currentQuiz.coords);
  }, [myLocation, currentQuiz]);

  const allowedRadius = useMemo(() => {
    const base = currentQuiz?.radiusMeters ?? 60;
    const accuracyBuffer = gpsAccuracy ? Math.min(gpsAccuracy, 30) : 15;
    return base + accuracyBuffer;
  }, [currentQuiz, gpsAccuracy]);

  const isInRange = isBypassUnlocked || (distance <= allowedRadius);

  // 현장 비상 패스코드 인증 검증
  const handleVerifyBypassCode = () => {
    if (inputBypassCode.trim() === EMERGENCY_GPS_BYPASS_CODE) {
      setIsBypassUnlocked(true);
      sessionStorage.setItem('discovery_gps_bypassed', 'true');
      setIsBypassModalOpen(false);
      setInputBypassCode('');
      setBypassCodeError('');
    } else {
      setBypassCodeError('올바른 4자리 현장 코드를 입력해주세요.');
    }
  };

  // ★ 퀴즈 활성화 버튼 클릭 핸들러 (현장 도착 시 문제 열기)
  const handleUnlockCurrentQuiz = () => {
    if (!currentQuiz) return;
    setUnlockedQuizzes(prev => {
      const updated = { ...prev, [currentQuiz.id]: true };
      sessionStorage.setItem('discovery_unlocked_quizzes', JSON.stringify(updated));
      return updated;
    });
  };

  // 4. 정답 제출 핸들러 (동적 배점 & 실시간 멱등 재계산 + 0ms 낙관적 스토어 동기화)
  const handleAnswerSubmit = async () => {
    if (selectedOption === null || hasSubmittedAnswer || !currentQuiz) return;

    const isCorrect = selectedOption === currentQuiz.correctIndex;
    const pointsEarned = isCorrect ? (currentQuiz.points || 100) : 0;
    const nowIso = new Date().toISOString();

    const newResult: UserQuizResult = {
      selectedIdx: selectedOption,
      isCorrect,
      pointsEarned,
      answeredAt: nowIso,
    };

    const updatedResults = { ...quizResults, [currentQuiz.id]: newResult };
    setQuizResults(updatedResults);
    setHasSubmittedAnswer(true);

    // Zustand 스토어 즉각 반영 (0ms 낙관적 업데이트)
    addAnsweredQuiz(currentQuiz.id);
    const totalQuizEarned = Object.values(updatedResults).reduce((sum, r) => sum + (r.pointsEarned || 0), 0);
    const isPqDone = isPeopleQuestSubmitted;
    const totalPersonalScore = totalQuizEarned + (isPqDone ? PEOPLE_QUEST_POINTS_PER_MEMBER : 0);
    const totalMissions = Object.values(updatedResults).filter(r => r.isCorrect).length + (isPqDone ? 1 : 0);

    if (myTeam?.id) {
      updateTeamScore(myTeam.id, (myTeam.score ?? 0) + pointsEarned);
      syncSessionData({
        myTeamScore: (myTeam.score ?? 0) + pointsEarned,
        myTeamMissionsCompleted: totalMissions,
        answeredQuizIds: Object.keys(updatedResults),
      });
    }

    // 정답 시 축하 컨페티 효과 실행!
    if (isCorrect) {
      fireConfetti({ count: 70, spread: 75 });
    }

    // 1) REST API로 퀴즈 풀이 및 참가자 프로필 보장 저장
    try {
      await fetch(`${dbUrl}/sessions/trekking2026/participants/${encodeURIComponent(participantId)}/quizzes/${currentQuiz.id}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newResult),
      });

      await fetch(`${dbUrl}/sessions/trekking2026/participants/${encodeURIComponent(participantId)}.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: participantName?.trim() || '',
          company: participantCompany || '',
          teamId: myTeam?.id || 'team1',
          teamName: myTeam?.name || '1조',
          course: selectedCourse,
          score: totalPersonalScore,
          missionsCompleted: totalMissions,
          updatedAt: nowIso,
        }),
      });
    } catch (restErr) {
      console.warn('REST 퀴즈 결과 저장 경고:', restErr);
    }

    // 2) Firebase RTDB SDK 저장 (실시간 웹소켓 푸시 트리거)
    try {
      const qRef = ref(rtdb, `sessions/trekking2026/participants/${participantId}/quizzes/${currentQuiz.id}`);
      await set(qRef, newResult);

      const pRef = ref(rtdb, `sessions/trekking2026/participants/${participantId}`);
      await update(pRef, {
        name: participantName?.trim() || '',
        company: participantCompany || '',
        teamId: myTeam?.id || 'team1',
        teamName: myTeam?.name || '1조',
        course: selectedCourse,
        score: totalPersonalScore,
        missionsCompleted: totalMissions,
        updatedAt: nowIso,
      });
    } catch (sdkErr) {
      console.warn('SDK 퀴즈 결과 저장 경고:', sdkErr);
    }
  };

  // 5. 전체 퀴즈 풀이 결과 동적 통계
  const completedCount = useMemo(() => {
    return activeQuizzes.filter(q => quizResults[q.id] !== undefined).length;
  }, [activeQuizzes, quizResults]);

  const totalPointsEarned = useMemo(() => {
    return Object.values(quizResults).reduce((sum, r) => sum + (r.pointsEarned || 0), 0);
  }, [quizResults]);

  const totalPossibleQuizPoints = useMemo(() => {
    return getCourseQuizTotalPoints(activeCourse);
  }, [activeCourse]);

  const isAllCompleted = completedCount === activeQuizzes.length && activeQuizzes.length > 0;
  const isCurrentQuizAnswered = !!quizResults[currentQuiz?.id];
  const isCurrentQuizUnlocked = unlockedQuizzes[currentQuiz?.id] || isCurrentQuizAnswered;

  return (
    <div className="max-w-[390px] mx-auto bg-[#0D1117] min-h-screen pb-20 font-['Noto_Sans_KR'] flex flex-col text-slate-100 select-none">
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
              ACTIVITY 2 · <span className="text-sky-400">DISCOVERY QUIZ</span>
            </span>
            <p className="text-[10px] text-slate-400">
              {teamConfig?.courseName} (총 {activeQuizzes.length}문항)
            </p>
          </div>
          <span className="text-[11px] bg-sky-500/15 text-sky-400 border border-sky-500/30 px-2 py-0.5 rounded-full font-bold">
            {completedCount}/{activeQuizzes.length} 완료
          </span>
        </div>
      </header>

      {/* 스팟 진행 인디케이터 바 */}
      <div className="bg-[#101626] border-b border-white/8 px-4 py-2.5 flex items-center justify-between gap-2 z-10">
        <div className="flex gap-2 flex-1">
          {activeQuizzes.map((quiz, i) => {
            const res = quizResults[quiz.id];
            const isCurrent = i === currentIdx;

            return (
              <button
                key={quiz.id}
                onClick={() => setCurrentIdx(i)}
                className={`flex-1 py-1.5 px-2 rounded-xl text-center border transition-all ${
                  isCurrent
                    ? 'border-sky-400 bg-sky-500/20 text-sky-300 font-bold'
                    : res
                    ? res.isCorrect
                      ? 'border-green-500/40 bg-green-500/10 text-green-400'
                      : 'border-red-500/40 bg-red-500/10 text-red-400'
                    : 'border-white/5 bg-[#1A2235] text-slate-500'
                }`}
              >
                <span className="text-[11px] block font-bold">Q{i + 1}</span>
                <span className="text-[9px] block truncate">
                  {res ? (res.isCorrect ? `정답 +${quiz.points}` : '오답') : `스팟 ${i + 1}`}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-4 space-y-4 flex-1 overflow-y-auto">
        {/* GPS 현장 인증 상태 카드 */}
        <div className={`border rounded-2xl p-4 space-y-2 transition-all shadow-lg ${
          isInRange
            ? 'bg-emerald-950/20 border-emerald-500/40'
            : 'bg-[#1A2235] border-white/10'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
              isInRange
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
            }`}>
              {isBypassUnlocked
                ? '🔑 현장 인증 완료'
                : isInRange
                ? '📍 현장 도착 완료'
                : '🚶‍♂️ 스팟으로 이동 중'}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={checkCurrentLocation}
                disabled={isLocating}
                className="text-[11px] text-sky-400 hover:text-sky-300 underline flex items-center gap-1"
              >
                {isLocating ? '측정 중...' : 'GPS 새로고침'}
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-[16px] font-bold text-white mb-0.5">
              스팟 {currentIdx + 1}: {currentQuiz?.title}
            </h3>
            <p className="text-[12px] text-slate-300">
              위치: <strong className="text-white">{currentQuiz?.locationLabel}</strong>
            </p>
          </div>

          <div className="flex justify-between items-center text-[11px] pt-1 text-slate-400 border-t border-white/5">
            <span>인증 반경: <strong>{currentQuiz?.radiusMeters}m 이내</strong></span>
            <span>
              현재 거리:{' '}
              <strong className={isInRange ? 'text-emerald-400' : 'text-amber-400'}>
                {isBypassUnlocked ? '비상 인증됨' : distance !== Infinity ? `약 ${distance}m` : '위치 확인 필요'}
              </strong>
            </span>
          </div>

          {gpsError && (
            <p className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/20 p-2 rounded-lg mt-1">
              ⚠️ {gpsError}
            </p>
          )}

          {/* 현장 비상 패스코드 인증 버튼 */}
          {!isInRange && (
            <div className="pt-2 border-t border-white/5 flex justify-between items-center">
              <span className="text-[11px] text-slate-400">위치 인식이 안 되시나요?</span>
              <button
                onClick={() => setIsBypassModalOpen(true)}
                className="text-[11px] text-amber-400 hover:text-amber-300 font-bold bg-amber-500/15 border border-amber-500/30 px-2.5 py-1 rounded-lg transition-all"
              >
                🔑 현장 인증코드로 풀기
              </button>
            </div>
          )}
        </div>

        {/* ────────────────────────────────────────────────────────── */}
        {/* CASE 1: 아직 현장에 도착하지 않은 경우 (문제 100% 잠김)     */}
        {/* ────────────────────────────────────────────────────────── */}
        {!isInRange && !isCurrentQuizAnswered && (
          <div className="bg-[#1A2235] border border-white/10 rounded-2xl p-6 text-center space-y-3 shadow-xl">
            <div className="w-14 h-14 rounded-full bg-slate-800 text-slate-400 border border-white/10 flex items-center justify-center text-2xl mx-auto shadow-inner">
              🔒
            </div>
            <div>
              <span className="text-[11px] bg-amber-500/15 text-amber-400 border border-amber-500/30 px-2.5 py-0.5 rounded-full font-bold">
                문제 잠김 (위치 이동 필요)
              </span>
              <h3 className="text-[16px] font-bold text-white mt-2">
                지정된 장소에 도착하면 문제가 공개됩니다
              </h3>
              <p className="text-[12px] text-slate-400 mt-1">
                위치: <strong className="text-sky-300">{currentQuiz?.locationLabel}</strong>
              </p>
            </div>
            <div className="bg-black/30 p-3 rounded-xl border border-white/5 text-[11px] text-slate-400 leading-relaxed">
              📍 스팟 반경 {currentQuiz?.radiusMeters}m 이내로 이동하거나, 신호 미약 시 상단의 <strong>[🔑 현장 인증코드]</strong>를 입력하면 활성화 버튼이 나타납니다.
            </div>
          </div>
        )}

        {/* ────────────────────────────────────────────────────────── */}
        {/* CASE 2: 도착 완료되었으나 아직 '활성화 버튼'을 누르지 않은 경우 */}
        {/* ────────────────────────────────────────────────────────── */}
        {isInRange && !isCurrentQuizUnlocked && !isCurrentQuizAnswered && (
          <div className="bg-gradient-to-br from-[#162238] to-[#121B2C] border-2 border-emerald-500/40 rounded-2xl p-6 text-center space-y-4 shadow-2xl animate-fade-in">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center text-2xl mx-auto shadow-lg animate-bounce">
              📍
            </div>
            <div>
              <span className="text-[11px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-bold">
                현장 도착 인증 완료
              </span>
              <h3 className="text-[17px] font-bold text-white mt-2">
                [{currentQuiz?.locationLabel}] 에 도착했습니다!
              </h3>
              <p className="text-[12px] text-slate-300 mt-1">
                현장 시설과 안내판을 확인한 후 아래 버튼을 눌러 문제를 확인하세요.
              </p>
            </div>
            <button
              onClick={handleUnlockCurrentQuiz}
              className="w-full py-4 bg-gradient-to-r from-sky-500 to-emerald-500 hover:from-sky-600 hover:to-emerald-600 text-white font-bold text-[15px] rounded-xl shadow-xl shadow-emerald-500/20 active:scale-98 transition-all flex items-center justify-center gap-2"
            >
              <span>🔓 퀴즈 문제 활성화하기 (열기)</span>
            </button>
          </div>
        )}

        {/* ────────────────────────────────────────────────────────── */}
        {/* CASE 3: 활성화 완료 또는 이미 풀이한 경우 (문제 & 보기 노출)  */}
        {/* ────────────────────────────────────────────────────────── */}
        {isCurrentQuizUnlocked && (
          <div className="bg-[#1A2235] border border-white/10 rounded-2xl p-4 space-y-4 shadow-xl animate-fade-in">
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-bold text-sky-400">
                  QUESTION {currentIdx + 1} / {activeQuizzes.length}
                </span>
                <span className="text-[12px] font-bold text-amber-400">
                  +{currentQuiz?.points}pt
                </span>
              </div>
              <p className="text-[15px] font-bold text-white leading-relaxed">
                {currentQuiz?.questionText}
              </p>
            </div>

            {/* 객관식 보기 리스트 */}
            <div className="space-y-2">
              {currentQuiz?.options.map((optionText, idx) => {
                const isSelected = selectedOption === idx;
                let optionStyle = 'bg-black/30 border-white/10 text-slate-200 hover:bg-black/50';

                if (hasSubmittedAnswer) {
                  if (idx === currentQuiz.correctIndex) {
                    optionStyle = 'bg-green-500/20 border-green-500 text-green-300 font-bold';
                  } else if (isSelected) {
                    optionStyle = 'bg-red-500/20 border-red-500 text-red-300';
                  } else {
                    optionStyle = 'bg-black/20 border-white/5 text-slate-500 opacity-60';
                  }
                } else if (isSelected) {
                  optionStyle = 'bg-sky-500/20 border-sky-400 text-sky-300 font-bold shadow-md';
                }

                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={hasSubmittedAnswer}
                    onClick={() => setSelectedOption(idx)}
                    className={`w-full p-3.5 rounded-xl border text-left text-[13px] flex items-center justify-between transition-all ${optionStyle}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center text-[11px] font-bold">
                        {idx + 1}
                      </span>
                      <span>{optionText}</span>
                    </div>
                    {hasSubmittedAnswer && idx === currentQuiz.correctIndex && (
                      <span className="text-green-400 font-bold text-[12px]">정답 ✓</span>
                    )}
                    {hasSubmittedAnswer && isSelected && idx !== currentQuiz.correctIndex && (
                      <span className="text-red-400 font-bold text-[12px]">오답 ✕</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* 정답 해설 박스 (제출 후 노출) */}
            {hasSubmittedAnswer && (
              <div className="bg-black/40 border border-white/10 rounded-xl p-3.5 space-y-1.5 animate-fade-in">
                <div className="flex items-center gap-1.5">
                  <span className="text-[13px]">
                    {selectedOption === currentQuiz.correctIndex ? '🎉 정답입니다!' : '💡 아쉽네요! 오답입니다.'}
                  </span>
                  <span className="text-[11px] font-bold text-amber-400">
                    {selectedOption === currentQuiz.correctIndex ? `+${currentQuiz.points}pt 획득` : '+0pt'}
                  </span>
                </div>
                <p className="text-[12px] text-slate-300 leading-relaxed">
                  {currentQuiz.explanation}
                </p>
              </div>
            )}

            {/* 하단 액션 버튼 */}
            {!hasSubmittedAnswer ? (
              <button
                onClick={handleAnswerSubmit}
                disabled={selectedOption === null}
                className="w-full py-3.5 bg-sky-500 hover:bg-sky-600 disabled:opacity-40 text-white font-bold text-[14px] rounded-xl active:scale-98 transition-all shadow-lg shadow-sky-500/20"
              >
                {selectedOption === null ? '답안을 선택해주세요' : '답안 제출하기'}
              </button>
            ) : (
              <div className="flex gap-2">
                {currentIdx > 0 && (
                  <button
                    onClick={() => setCurrentIdx(prev => prev - 1)}
                    className="px-4 py-3 bg-[#1A2235] text-slate-300 font-bold text-[13px] rounded-xl border border-white/10"
                  >
                    ← 이전 문제
                  </button>
                )}
                {currentIdx < activeQuizzes.length - 1 ? (
                  <button
                    onClick={() => setCurrentIdx(prev => prev + 1)}
                    className="flex-1 py-3 bg-sky-500 hover:bg-sky-600 text-white font-bold text-[13px] rounded-xl shadow"
                  >
                    다음 스팟 퀴즈 (Q{currentIdx + 2}) →
                  </button>
                ) : (
                  <button
                    onClick={() => navigate('/leaderboard')}
                    className="flex-1 py-3 bg-amber-500 text-slate-900 font-bold text-[13px] rounded-xl shadow"
                  >
                    🏆 실시간 순위 확인 →
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* 전체 완주 결과 배너 */}
        {isAllCompleted && (
          <div className="bg-gradient-to-r from-emerald-900/40 to-sky-900/40 border border-emerald-500/30 rounded-2xl p-4 text-center space-y-2 shadow-xl">
            <span className="text-2xl">🏆</span>
            <h4 className="text-[16px] font-bold text-white">
              {teamConfig?.courseName} {activeQuizzes.length}개 스팟 퀴즈 완주!
            </h4>
            <p className="text-[12px] text-slate-300">
              총 {totalPossibleQuizPoints}pt 중 <strong className="text-amber-400">{totalPointsEarned}pt</strong>를 획득하셨습니다.
            </p>
          </div>
        )}
      </div>

      {/* 현장 비상 패스코드 모달 */}
      {isBypassModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#13192A] border border-amber-500/40 w-full max-w-[340px] rounded-3xl p-5 text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full flex items-center justify-center text-xl mx-auto">
              🔑
            </div>
            <div>
              <h3 className="text-[16px] font-bold text-white leading-snug">
                현장 비상 인증코드 입력
              </h3>
              <p className="text-[12px] text-slate-400 mt-1">
                운영진이 안내해 드린 <strong>4자리 인증 번호</strong>를 입력해 주세요.
              </p>
            </div>

            <input
              type="text"
              maxLength={4}
              value={inputBypassCode}
              onChange={e => {
                setInputBypassCode(e.target.value);
                setBypassCodeError('');
              }}
              placeholder="4자리 코드 입력 (예: 2026)"
              className="w-full bg-black/50 border border-white/15 rounded-xl px-4 py-3 text-center text-xl font-bold tracking-widest text-amber-400 focus:outline-none focus:border-amber-500"
            />

            {bypassCodeError && (
              <p className="text-[12px] text-red-400">{bypassCodeError}</p>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => {
                  setIsBypassModalOpen(false);
                  setBypassCodeError('');
                }}
                className="flex-1 py-3 bg-[#1A2235] text-slate-400 font-bold text-[13px] rounded-xl border border-white/10"
              >
                취소
              </button>
              <button
                onClick={handleVerifyBypassCode}
                className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold text-[13px] rounded-xl shadow active:scale-98"
              >
                인증 확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DiscoveryQuizScreen;
