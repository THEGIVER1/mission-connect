import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { BottomNav } from '../dashboard/Dashboard';
import {
  DISCOVERY_QUIZZES,
  ACTIVE_VENUE,
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
    updateTeamScore,
  } = useAppStore();

  const participantId = participantName && participantCompany
    ? `${participantName}_${participantCompany}`.replace(/\s/g, '_')
    : 'anonymous';

  const [currentQuizIdx, setCurrentQuizIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [hasSubmittedAnswer, setHasSubmittedAnswer] = useState(false);
  const [quizResults, setQuizResults] = useState<Record<string, UserQuizResult>>({});

  // GPS 관련
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  // 테스트 및 비상용 GPS 우회 모드
  const [devBypassGps, setDevBypassGps] = useState(false);

  const dbUrl = import.meta.env.VITE_FIREBASE_DATABASE_URL || 'https://doosan-teambuilding-default-rtdb.firebaseio.com';

  const currentQuiz: DiscoveryQuizItem = DISCOVERY_QUIZZES[currentQuizIdx];

  // 1. 기존 풀이 기록 로드
  useEffect(() => {
    const loadQuizHistory = async () => {
      try {
        const res = await fetch(`${dbUrl}/sessions/trekking2026/participants/${encodeURIComponent(participantId)}/quizzes.json`);
        if (res.ok) {
          const data = await res.json();
          if (data && typeof data === 'object') {
            setQuizResults(data);
          }
        }
      } catch (err) {
        console.warn('퀴즈 기록 로드 실패:', err);
      }
    };
    loadQuizHistory();
  }, [participantId, dbUrl]);

  // 2. GPS 위치 측정
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
          setGpsError('Discovery Quiz 참여를 위해 위치정보 사용이 필요합니다. 브라우저 또는 기기 설정에서 위치 권한을 허용해 주세요.');
        } else {
          setGpsError('위치 정보를 가져오는 데 실패했습니다. 다시 시도해 주세요.');
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

  // 정답 제출 핸들러
  const handleAnswerSubmit = async () => {
    if (selectedOption === null || hasSubmittedAnswer) return;

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

      if (pointsEarned > 0) {
        // 참가자 점수 가산
        const pRes = await fetch(`${dbUrl}/sessions/trekking2026/participants/${encodeURIComponent(participantId)}.json`);
        const existing = pRes.ok ? await pRes.json() : null;
        const prevScore = Number(existing?.score ?? 0);
        const nextScore = prevScore + pointsEarned;

        await fetch(`${dbUrl}/sessions/trekking2026/participants/${encodeURIComponent(participantId)}.json`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ score: nextScore }),
        });

        if (myTeam?.id) {
          updateTeamScore(myTeam.id, nextScore);
        }
      }
    } catch (err) {
      console.warn('퀴즈 결과 저장 실패:', err);
    }
  };

  // 다음 퀴즈로 이동
  const handleNextQuiz = () => {
    setSelectedOption(null);
    setHasSubmittedAnswer(false);
    if (currentQuizIdx < DISCOVERY_QUIZZES.length - 1) {
      setCurrentQuizIdx(prev => prev + 1);
    }
  };

  // 완료 통계
  const completedQuizzesCount = Object.keys(quizResults).length;
  const isAllQuizzesCompleted = completedQuizzesCount >= DISCOVERY_QUIZZES.length;
  const totalCorrectCount = Object.values(quizResults).filter(r => r.isCorrect).length;
  const totalEarnedPoints = Object.values(quizResults).reduce((sum, r) => sum + r.pointsEarned, 0);

  return (
    <div className="max-w-[390px] mx-auto bg-[#0D1117] min-h-screen flex flex-col text-slate-100">
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
          <div className="text-center">
            <span className="font-bebas text-xl tracking-widest text-white">
              DISCOVERY <span className="text-sky-400">QUIZ</span>
            </span>
            <p className="text-[9px] text-slate-400">현장 정보 관찰 퀴즈</p>
          </div>
          <span className="text-[11px] font-bold text-sky-400">
            문항당 +100pt
          </span>
        </div>
      </header>

      {/* 전체 완료 화면 */}
      {isAllQuizzesCompleted ? (
        <div className="px-5 py-8 flex-1 flex flex-col justify-center items-center text-center">
          <div className="w-16 h-16 rounded-full bg-sky-500/20 border-2 border-sky-500 flex items-center justify-center text-3xl mb-4">
            🏛️
          </div>
          <h2 className="text-[19px] font-bold text-white mb-2">Discovery Quiz 완료!</h2>
          <p className="text-[13px] text-sky-400 font-medium mb-1">
            서울대공원과 미술관 곳곳의 정보를 모두 발견했습니다.
          </p>
          <p className="text-[12px] text-slate-400 mb-6">
            모든 퀴즈 미션을 성공적으로 완수하셨습니다.
          </p>

          <div className="w-full bg-[#1A2235] border border-white/10 rounded-2xl p-4 space-y-3 mb-6">
            <div className="flex justify-between items-center py-1 border-b border-white/5">
              <span className="text-[13px] text-slate-400">완료 문항 수</span>
              <span className="text-[14px] font-bold text-white">{completedQuizzesCount} / {DISCOVERY_QUIZZES.length}문항</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-white/5">
              <span className="text-[13px] text-slate-400">정답 맞힌 수</span>
              <span className="text-[14px] font-bold text-green-400">{totalCorrectCount}문항</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-[13px] text-slate-400">획득 점수</span>
              <span className="text-[16px] font-bold text-amber-400">+{totalEarnedPoints}pt</span>
            </div>
          </div>

          <button
            onClick={() => navigate('/')}
            className="w-full py-3.5 bg-red-500 text-white font-bold rounded-xl active:scale-98 shadow-md"
          >
            메인 화면으로 이동
          </button>
        </div>
      ) : (
        <div className="flex-1 flex flex-col p-4 overflow-y-auto pb-24">
          {/* 문항 번호 인디케이터 */}
          <div className="flex items-center justify-between mb-3 bg-[#1A2235] border border-white/5 px-3.5 py-2 rounded-xl">
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-bold text-sky-400">
                QUIZ {currentQuizIdx + 1} / {DISCOVERY_QUIZZES.length}
              </span>
              <span className="text-[11px] text-slate-400">📍 {currentQuiz.locationLabel}</span>
            </div>
            <span className="text-[11px] bg-white/5 px-2 py-0.5 rounded text-slate-400">
              +{currentQuiz.points}pt
            </span>
          </div>

          {/* 위치 권한 오류 화면 */}
          {gpsError ? (
            <div className="bg-[#1A2235] border border-red-500/30 rounded-2xl p-5 text-center my-auto space-y-4">
              <div className="text-3xl">📡</div>
              <h3 className="text-[15px] font-bold text-white">위치 권한 필요</h3>
              <p className="text-[12px] text-slate-300 leading-relaxed">{gpsError}</p>
              <button
                onClick={checkCurrentLocation}
                className="w-full py-3 bg-red-500 text-white font-bold rounded-xl text-[13px]"
              >
                다시 시도하기
              </button>
            </div>
          ) : !isInRange ? (
            /* GPS 범위 밖: 잠금 화면 */
            <div className="bg-[#1A2235] border border-white/10 rounded-2xl p-6 text-center my-auto space-y-4 shadow-lg">
              <div className="w-14 h-14 mx-auto rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-2xl">
                🔒
              </div>
              <div>
                <h3 className="text-[16px] font-bold text-white mb-1.5">{currentQuiz.title}</h3>
                <p className="text-[12px] text-amber-300 leading-relaxed">
                  아직 퀴즈 장소에 도착하지 않았습니다.<br />
                  안내된 트레킹 코스를 따라 지정 장소로 이동해 주세요.
                </p>
              </div>

              <div className="bg-black/40 border border-white/10 rounded-xl p-3.5 text-[12px]">
                <p className="text-slate-400">퀴즈 장소: <strong className="text-white">{currentQuiz.locationLabel}</strong></p>
                <p className="text-slate-400 mt-1">
                  남은 거리: <strong className="text-amber-400">{distance === Infinity ? '측정 중...' : `약 ${distance}m` }</strong>
                  <span className="text-[10px] text-slate-500 ml-1">(인증 반경 {currentQuiz.radiusMeters}m 이내)</span>
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  onClick={checkCurrentLocation}
                  disabled={isLocating}
                  className="w-full py-3 bg-[#212C42] border border-white/15 text-white font-bold rounded-xl text-[13px] active:scale-98 flex items-center justify-center gap-1.5"
                >
                  {isLocating ? '위치 측정 중...' : '🔄 위치 재확인'}
                </button>

                {/* 개발 / 현장 비상용 우회 토글 */}
                <button
                  type="button"
                  onClick={() => setDevBypassGps(true)}
                  className="w-full py-2 bg-transparent text-slate-500 hover:text-slate-400 text-[11px] underline"
                >
                  [현장 테스트 모드로 바로 풀기]
                </button>
              </div>
            </div>
          ) : (
            /* 범위 내: 퀴즈 풀이 화면 */
            <div className="bg-[#1A2235] border border-sky-500/30 rounded-2xl p-4 flex flex-col space-y-4 shadow-xl">
              <div>
                <span className="text-[11px] bg-green-500/15 text-green-400 border border-green-500/30 px-2 py-0.5 rounded-full font-bold">
                  ✅ 현장 도착 인증 완료
                </span>
                <h3 className="text-[16px] font-bold text-white mt-2 mb-1.5">
                  {currentQuiz.title}
                </h3>
                <p className="text-[13px] text-slate-200 leading-relaxed font-medium bg-black/30 p-3 rounded-xl border border-white/5">
                  {currentQuiz.questionText}
                </p>
              </div>

              {/* 보기 선택지 */}
              <div className="space-y-2">
                {currentQuiz.options.map((optText, oIdx) => {
                  const isSelected = selectedOption === oIdx;
                  let optStyle = 'border-white/10 bg-black/20 text-slate-200';

                  if (hasSubmittedAnswer) {
                    if (oIdx === currentQuiz.correctIndex) {
                      optStyle = 'border-green-500 bg-green-500/20 text-green-300 font-bold';
                    } else if (isSelected && oIdx !== currentQuiz.correctIndex) {
                      optStyle = 'border-red-500 bg-red-500/20 text-red-300 line-through';
                    } else {
                      optStyle = 'opacity-40 border-white/5 text-slate-500';
                    }
                  } else if (isSelected) {
                    optStyle = 'border-sky-500 bg-sky-500/20 text-white font-bold shadow-md shadow-sky-500/10';
                  }

                  return (
                    <button
                      key={oIdx}
                      type="button"
                      disabled={hasSubmittedAnswer}
                      onClick={() => setSelectedOption(oIdx)}
                      className={`w-full p-3 rounded-xl border text-left flex items-center justify-between text-[13px] transition-all ${optStyle}`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-5 h-5 rounded-full border border-white/20 flex items-center justify-center text-[11px] font-bold">
                          {oIdx + 1}
                        </span>
                        <span>{optText}</span>
                      </div>
                      {hasSubmittedAnswer && oIdx === currentQuiz.correctIndex && (
                        <span className="text-green-400 text-sm font-bold">✓ 정답</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* 해설 및 결과 표시 */}
              {hasSubmittedAnswer && (
                <div className="bg-black/40 border border-white/10 rounded-xl p-3.5 space-y-1.5 animate-fadeIn">
                  <p className={`text-[13px] font-bold ${
                    selectedOption === currentQuiz.correctIndex ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {selectedOption === currentQuiz.correctIndex ? '🎉 정답입니다! (+100pt)' : '😢 아쉽지만 틀렸습니다.'}
                  </p>
                  <p className="text-[12px] text-slate-300 leading-relaxed">
                    💡 {currentQuiz.explanation}
                  </p>
                </div>
              )}

              {/* 하단 버튼 */}
              <div className="pt-2 mt-auto">
                {!hasSubmittedAnswer ? (
                  <button
                    type="button"
                    disabled={selectedOption === null}
                    onClick={handleAnswerSubmit}
                    className={`w-full py-3.5 rounded-xl font-bold text-[14px] transition-all active:scale-98 ${
                      selectedOption !== null
                        ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20'
                        : 'bg-[#212C42] text-slate-500 border border-white/5 cursor-not-allowed'
                    }`}
                  >
                    정답 제출하기
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleNextQuiz}
                    className="w-full py-3.5 bg-red-500 text-white font-bold rounded-xl text-[14px] active:scale-98 shadow-md"
                  >
                    {currentQuizIdx < DISCOVERY_QUIZZES.length - 1 ? '다음 문제 이동 →' : '퀴즈 결과 보기 🏆'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <BottomNav active="/" />
    </div>
  );
};

export default DiscoveryQuizScreen;
