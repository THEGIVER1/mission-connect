import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import {
  DISCOVERY_QUIZZES,
  WORKSHOP_TEAMS,
  CourseKey,
} from '../../config/workshopConfig';
import { DiscoveryQuizItem } from '../../types';

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
  } = useAppStore();

  const activeCourse = selectedCourse;
  const teamConfig = WORKSHOP_TEAMS.find(t => t.id === myTeam?.id);

  // 내 코스에 해당하는 3개 퀴즈 (공통 2개 + 코스 전용 1개)
  const activeQuizzes: DiscoveryQuizItem[] = useMemo(() => {
    return DISCOVERY_QUIZZES.filter(q => q.courseKey === 'all' || q.courseKey === activeCourse);
  }, [activeCourse]);

  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [hasSubmittedAnswer, setHasSubmittedAnswer] = useState<boolean>(false);
  const [quizResults, setQuizResults] = useState<Record<string, UserQuizResult>>({});
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [devBypassGps, setDevBypassGps] = useState<boolean>(false); // 테스트 편의용

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

  // 3. GPS 현재 위치 측정
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
        setIsLocating(false);
      },
      err => {
        setIsLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGpsError('Discovery Quiz 참여를 위해 위치 권한을 허용해 주세요.');
        } else {
          setGpsError('위치 정보를 가져오는 데 실패했습니다.');
        }
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  useEffect(() => {
    checkCurrentLocation();
  }, []);

  // 거리 계산 및 반경 진입 여부
  const distance = useMemo(() => {
    if (!myLocation || !currentQuiz) return Infinity;
    return haversine(myLocation, currentQuiz.coords);
  }, [myLocation, currentQuiz]);

  const isInRange = devBypassGps || (distance <= (currentQuiz?.radiusMeters ?? 60));

  // 4. 정답 제출 핸들러
  const handleAnswerSubmit = async () => {
    if (selectedOption === null || hasSubmittedAnswer || !currentQuiz) return;

    const isCorrect = selectedOption === currentQuiz.correctIndex;
    const pointsEarned = isCorrect ? currentQuiz.points : 0;
    const nowIso = new Date().toISOString();

    const newResult: UserQuizResult = {
      selectedIdx: selectedOption,
      isCorrect,
      pointsEarned,
      answeredAt: nowIso,
    };

    setQuizResults(prev => ({ ...prev, [currentQuiz.id]: newResult }));
    setHasSubmittedAnswer(true);

    // Firebase RTDB 저장
    try {
      await fetch(`${dbUrl}/sessions/trekking2026/participants/${encodeURIComponent(participantId)}/quizzes/${currentQuiz.id}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newResult),
      });

      // 참가자 점수 및 퀴즈 카운트 동기화
      const pRes = await fetch(`${dbUrl}/sessions/trekking2026/participants/${encodeURIComponent(participantId)}.json`);
      const existing = pRes.ok ? await pRes.json() : null;
      const prevScore = Number(existing?.score ?? 0);
      const nextScore = prevScore + pointsEarned;

      await fetch(`${dbUrl}/sessions/trekking2026/participants/${encodeURIComponent(participantId)}.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          score: nextScore,
        }),
      });

      if (myTeam?.id && pointsEarned > 0) {
        updateTeamScore(myTeam.id, nextScore);
      }
    } catch (err) {
      console.warn('퀴즈 결과 저장 실패:', err);
    }
  };

  // 5. 전체 3개 퀴즈 풀이 결과 통계
  const completedCount = useMemo(() => {
    return activeQuizzes.filter(q => quizResults[q.id] !== undefined).length;
  }, [activeQuizzes, quizResults]);

  const totalPointsEarned = useMemo(() => {
    return Object.values(quizResults).reduce((sum, r) => sum + (r.pointsEarned || 0), 0);
  }, [quizResults]);

  const isAllCompleted = completedCount === activeQuizzes.length && activeQuizzes.length > 0;

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
              {teamConfig?.courseName} (총 3문항)
            </p>
          </div>
          <span className="text-[11px] bg-sky-500/15 text-sky-400 border border-sky-500/30 px-2 py-0.5 rounded-full font-bold">
            {completedCount}/{activeQuizzes.length} 완료
          </span>
        </div>
      </header>

      {/* 3개 스팟 진행 인디케이터 바 */}
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
                  {res ? (res.isCorrect ? '정답 +100' : '오답') : `스팟 ${i + 1}`}
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
              {isInRange ? '📍 현장 도착 완료 (퀴즈 풀이 가능)' : '🚶‍♂️ 스팟으로 이동 중'}
            </span>
            <button
              onClick={checkCurrentLocation}
              disabled={isLocating}
              className="text-[11px] text-sky-400 hover:text-sky-300 underline flex items-center gap-1"
            >
              {isLocating ? '측정 중...' : 'GPS 새로고침'}
            </button>
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
              <strong className={distance <= (currentQuiz?.radiusMeters ?? 60) ? 'text-emerald-400' : 'text-amber-400'}>
                {distance !== Infinity ? `약 ${distance}m` : '위치 확인 필요'}
              </strong>
            </span>
          </div>

          {gpsError && (
            <p className="text-[11px] text-red-400 bg-red-500/10 p-2 rounded-lg mt-1">
              ⚠️ {gpsError}
            </p>
          )}

          {/* 데스크톱/테스트용 우회 토글 */}
          <div className="pt-1 flex justify-end">
            <button
              onClick={() => setDevBypassGps(!devBypassGps)}
              className="text-[10px] text-slate-500 hover:text-slate-400 underline"
            >
              {devBypassGps ? '🔒 GPS 실제 측정 모드 전환' : '🧪 데스크톱/테스트 우회 활성화'}
            </button>
          </div>
        </div>

        {/* 퀴즈 문제 카드 */}
        <div className="bg-[#1A2235] border border-white/10 rounded-2xl p-4 space-y-4 shadow-xl">
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
                  disabled={hasSubmittedAnswer || !isInRange}
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
                  {selectedOption === currentQuiz.correctIndex ? '+100pt 획득' : '+0pt'}
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
              disabled={selectedOption === null || !isInRange}
              className="w-full py-3.5 bg-sky-500 hover:bg-sky-600 disabled:opacity-40 text-white font-bold text-[14px] rounded-xl active:scale-98 transition-all shadow-lg shadow-sky-500/20"
            >
              {!isInRange ? '📍 스팟 반경 내 도착 시 제출 가능' : '답안 제출하기'}
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
                  🏆 3문항 완료! 실시간 순위 확인 →
                </button>
              )}
            </div>
          )}
        </div>

        {/* 3문항 전체 완주 결과 배너 */}
        {isAllCompleted && (
          <div className="bg-gradient-to-r from-emerald-900/40 to-sky-900/40 border border-emerald-500/30 rounded-2xl p-4 text-center space-y-2 shadow-xl">
            <span className="text-2xl">🏆</span>
            <h4 className="text-[16px] font-bold text-white">
              {teamConfig?.courseName} 3개 스팟 퀴즈 완주!
            </h4>
            <p className="text-[12px] text-slate-300">
              총 300pt 중 <strong className="text-amber-400">{totalPointsEarned}pt</strong>를 획득하셨습니다.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DiscoveryQuizScreen;
