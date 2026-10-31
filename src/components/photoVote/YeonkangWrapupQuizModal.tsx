import React, { useState, useEffect, useMemo } from 'react';
import {
  WORKSHOP_TEAMS,
  YEONKANG_WRAPUP_QUIZ_OPTIONS,
  YEONKANG_WRAPUP_QUIZ_POINTS_PER_ITEM,
  WRAPUP_QUIZ_TITLE,
  WRAPUP_QUIZ_ANSWER_TEXT,
  getFinalGatheringInfo,
  IS_PILOT_MODE,
  STEP4_OPEN_LABEL,
} from '../../config/workshopConfig';
import { normalizeTeamId, calcWrapupQuizPoints } from '../../utils/scoreCalculator';
import { rtdb, FIREBASE_DB_URL } from '../../lib/firebase';
import { ref, onValue, set } from 'firebase/database';
import { fireConfetti } from '../../lib/confetti';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  teamId: string;
  participantName?: string | null;
  onQuizSubmitted?: () => void;
}

export const YeonkangWrapupQuizModal: React.FC<Props> = ({
  isOpen,
  onClose,
  teamId,
  participantName,
  onQuizSubmitted,
}) => {
  const normTeamId = normalizeTeamId(teamId);
  const myTeamConfig = WORKSHOP_TEAMS.find(t => t.id === normTeamId) || WORKSHOP_TEAMS[0];

  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [submittedBy, setSubmittedBy] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [forceOpenStep4, setForceOpenStep4] = useState<boolean>(false);
  const [nowMs, setNowMs] = useState<number>(Date.now());
  const [toastMsg, setToastMsg] = useState<string>('');

  const dbUrl = FIREBASE_DB_URL;

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2500);
  };

  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const fetchQuizState = async () => {
      try {
        const res = await fetch(`${dbUrl}/sessions/trekking2026.json?t=${Date.now()}`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          setForceOpenStep4(!!(data?.step4ForceOpen));
          const teamQuiz = data?.wrapupQuizzes?.[normTeamId];
          if (teamQuiz && typeof teamQuiz === 'object') {
            if (Array.isArray(teamQuiz.selectedItems)) {
              setSelectedItems(teamQuiz.selectedItems);
            }
            setIsSubmitted(!!teamQuiz.completed);
            setSubmittedBy(teamQuiz.submittedBy || '');
          }
        }
      } catch (e) {
        console.warn('Wrap-up 퀴즈 조회 경고:', e);
      }
    };

    fetchQuizState();

    let unsub = () => {};
    try {
      const qRef = ref(rtdb, `sessions/trekking2026/wrapupQuizzes/${normTeamId}`);
      unsub = onValue(qRef, snap => {
        if (snap.exists()) {
          const val = snap.val();
          if (Array.isArray(val.selectedItems)) {
            setSelectedItems(val.selectedItems);
          }
          setIsSubmitted(!!val.completed);
          setSubmittedBy(val.submittedBy || '');
        }
      });
    } catch (e) {}

    return () => {
      unsub();
    };
  }, [isOpen, normTeamId, dbUrl]);

  const { formattedTimeLeft, isStep4Open: isStep3Completed } = useMemo(() => {
    return getFinalGatheringInfo(nowMs, forceOpenStep4);
  }, [nowMs, forceOpenStep4]);

  if (!isOpen) return null;

  const toggleItem = (item: string) => {
    if (isSubmitted) {
      showToast('이미 제출되어 수정할 수 없습니다.');
      return;
    }
    setSelectedItems(prev =>
      prev.includes(item) ? prev.filter(x => x !== item) : [...prev, item]
    );
  };

  const earnedPoints = calcWrapupQuizPoints(selectedItems);

  const handleSubmit = async () => {
    if (isSubmitted) {
      showToast('이미 제출되어 수정할 수 없습니다.');
      return;
    }
    if (!isStep3Completed) {
      showToast(`STEP 4 오픈 시간(${STEP4_OPEN_LABEL}) 이후 제출할 수 있습니다.`);
      return;
    }
    if (selectedItems.length === 0) {
      showToast('최소 1개 이상 선택해 주세요.');
      return;
    }

    setIsSaving(true);
    const payload = {
      teamId: normTeamId,
      teamName: myTeamConfig.name,
      selectedItems,
      pointsEarned: earnedPoints,
      completed: true,
      submittedBy: participantName || myTeamConfig.name,
      updatedAt: new Date().toISOString(),
    };

    try {
      await fetch(`${dbUrl}/sessions/trekking2026/wrapupQuizzes/${normTeamId}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const qRef = ref(rtdb, `sessions/trekking2026/wrapupQuizzes/${normTeamId}`);
      await set(qRef, payload);

      setIsSubmitted(true);
      setSubmittedBy(payload.submittedBy);
      if (onQuizSubmitted) onQuizSubmitted();
      fireConfetti({ count: 70, spread: 80 });
      showToast(IS_PILOT_MODE ? `${myTeamConfig.name} Q2 제출 완료! (+${earnedPoints}pt 반영)` : `${myTeamConfig.name} Q2 제출 완료! (점수는 시상식에서 공개)`);
    } catch (e) {
      console.warn('Q2 퀴즈 저장 오류:', e);
      showToast('저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 animate-fade-in select-none">
      <div className="bg-[#13192A] border border-white/15 w-full max-w-[430px] max-h-[92vh] rounded-3xl flex flex-col shadow-2xl overflow-hidden">
        {/* 상단 헤더 */}
        <div className="bg-[#182035] border-b border-white/10 px-4 py-3 flex items-center justify-between flex-shrink-0">
          <div>
            <span className="text-[12px] text-purple-400 font-bold uppercase tracking-wider block">
              STEP 4 · 개당 +{YEONKANG_WRAPUP_QUIZ_POINTS_PER_ITEM}pt
            </span>
            <h3 className="text-[17px] font-bold text-white">
              {WRAPUP_QUIZ_TITLE}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/10 text-slate-300 flex items-center justify-center hover:bg-white/20 active:scale-95 text-xs"
          >
            ✕
          </button>
        </div>

        {/* 요약 바 */}
        <div className="bg-[#101626] px-4 py-2.5 border-b border-white/8 flex items-center justify-between text-[13px] flex-shrink-0">
          <span className="text-slate-300">
            선택한 항목: <strong className="text-white">{selectedItems.length}개</strong>
          </span>
          {isSubmitted && (
            <span className="text-amber-400 font-bold">
              획득 점수: {IS_PILOT_MODE ? `+${earnedPoints}pt` : '시상식 공개'}
            </span>
          )}
        </div>

        {!isStep3Completed && (
          <div className="mx-4 mt-2.5 bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[13px] font-bold py-2 px-3 rounded-xl text-center">
            STEP 4 오픈 시간({STEP4_OPEN_LABEL})에 활성화됩니다. 
          </div>
        )}

        {toastMsg && (
          <div className="mx-4 mt-2.5 bg-purple-600/30 border border-purple-400/50 text-white text-[13.5px] font-bold py-2 px-3 rounded-xl text-center">
            {toastMsg}
          </div>
        )}

        {/* 본문: 7개 복수선택 옵션 */}
        <div className="p-4 space-y-2.5 flex-1 overflow-y-auto">
          <div className="space-y-2">
            {YEONKANG_WRAPUP_QUIZ_OPTIONS.map((option) => {
              const isChecked = selectedItems.includes(option);
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => toggleItem(option)}
                  disabled={isSubmitted}
                  className={`${isSubmitted ? 'cursor-not-allowed opacity-80 ' : ''}w-full text-left p-3.5 rounded-2xl border text-[15.5px] flex items-center justify-between transition-all active:scale-98 ${
                    isChecked
                      ? 'bg-purple-600/20 border-purple-400 text-white font-bold shadow-md'
                      : 'bg-[#182035] border-white/10 text-slate-300 hover:border-white/25'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-5 h-5 rounded-md flex items-center justify-center text-[13px] font-bold ${
                        isChecked
                          ? 'bg-purple-500 text-white'
                          : 'border border-slate-500 bg-black/20'
                      }`}
                    >
                      {isChecked ? '✓' : ''}
                    </span>
                    <span>{option}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {isSubmitted && (
            <div className="bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 p-3 rounded-xl text-[13.5px] text-center">
              {IS_PILOT_MODE ? (<><strong>정답입니다!</strong> {WRAPUP_QUIZ_ANSWER_TEXT} ({myTeamConfig.name} +{earnedPoints}pt 반영됨 · 작성: {submittedBy})</>) : (<>{WRAPUP_QUIZ_ANSWER_TEXT} (작성: {submittedBy})</>)}
            </div>
          )}
        </div>

        {/* 하단 제출 버튼 */}
        <div className="bg-[#182035] border-t border-white/10 p-3 flex gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-1/3 py-3 bg-[#1A2235] hover:bg-[#222C44] text-slate-300 font-bold text-[15px] rounded-xl border border-white/10 active:scale-95 transition-all"
          >
            닫기
          </button>
          <button
            type="button"
            disabled={isSaving || !isStep3Completed || isSubmitted}
            onClick={handleSubmit}
            className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-extrabold text-[15px] rounded-xl shadow-lg active:scale-95 transition-all"
          >
            {isSaving
              ? '저장 중...'
              : isSubmitted
              ? '제출 완료 (수정 불가)'
              : '제출하기 (제출 후 수정 불가)'}
          </button>
        </div>
      </div>
    </div>
  );
};
