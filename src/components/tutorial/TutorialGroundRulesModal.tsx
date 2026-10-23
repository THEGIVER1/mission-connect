import React, { useState, useEffect } from 'react';
import {
  TUTORIAL_QUIZ,
  GROUND_RULE_ROLE_OPTIONS,
  GROUND_RULE_PRESETS,
  WORKSHOP_TEAMS,
  IS_PILOT_MODE,
} from '../../config/workshopConfig';
import { normalizeTeamId } from '../../utils/scoreCalculator';
import { rtdb, FIREBASE_DB_URL } from '../../lib/firebase';
import { ref, update } from 'firebase/database';
import { fireConfetti } from '../../lib/confetti';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  teamId: string;
  participantName?: string | null;
  participantCompany?: string | null;
}

export const TutorialGroundRulesModal: React.FC<Props> = ({
  isOpen,
  onClose,
  teamId,
  participantName,
}) => {
  const normTeamId = normalizeTeamId(teamId);
  const teamConfig = WORKSHOP_TEAMS.find(t => t.id === normTeamId) || WORKSHOP_TEAMS[0];

  const [activeTab, setActiveTab] = useState<'rules' | 'quiz'>('rules');

  // 1. 몸풀기 Quiz 상태 (조별 기준)
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isQuizSubmitted, setIsQuizSubmitted] = useState<boolean>(false);
  const [isQuizCorrect, setIsQuizCorrect] = useState<boolean>(false);
  const [quizSubmittedBy, setQuizSubmittedBy] = useState<string>('');

  // 2. 조별 그라운드룰 상태
  const [selectedRoles, setSelectedRoles] = useState<Record<string, string>>({});
  const [selectedRules, setSelectedRules] = useState<string[]>(['rule_slow']);
  const [customRuleText, setCustomRuleText] = useState<string>('');
  const [customRulesList, setCustomRulesList] = useState<string[]>([]);
  const [isSavingRules, setIsSavingRules] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  const dbUrl = FIREBASE_DB_URL;

  // 서버 데이터 동기화 (조별 기준)
  useEffect(() => {
    if (!isOpen) return;

    // 1) 조별 그라운드룰 로드
    fetch(`${dbUrl}/sessions/trekking2026/groundRules/${normTeamId}.json?t=${Date.now()}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && typeof data === 'object') {
          if (data.roles) setSelectedRoles(data.roles);
          if (Array.isArray(data.selectedRuleIds)) {
            setSelectedRules(data.selectedRuleIds.filter((id: string) => id !== 'rule_healing'));
          }
          if (Array.isArray(data.customRules)) setCustomRulesList(data.customRules);
        }
      })
      .catch(err => console.warn('그라운드룰 로드 경고:', err));

    // 2) 조별 몸풀기 퀴즈 완료 여부 로드
    fetch(`${dbUrl}/sessions/trekking2026/tutorials/${normTeamId}.json?t=${Date.now()}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.completed) {
          setSelectedOption(data.selectedOption ?? TUTORIAL_QUIZ.correctIndex);
          setIsQuizSubmitted(true);
          setIsQuizCorrect(data.isCorrect ?? true);
          setQuizSubmittedBy(data.submittedBy || '');
        } else {
          setIsQuizSubmitted(false);
        }
      })
      .catch(err => console.warn('몸풀기 퀴즈 상태 로드 경고:', err));
  }, [isOpen, normTeamId, dbUrl]);

  if (!isOpen) return null;

  // 조별 몸풀기 퀴즈 제출
  const handleQuizSubmit = async () => {
    if (selectedOption === null) return;

    const correct = selectedOption === TUTORIAL_QUIZ.correctIndex;
    setIsQuizCorrect(correct);
    setIsQuizSubmitted(true);
    setQuizSubmittedBy(participantName || teamConfig.name);

    if (correct) {
      fireConfetti();
    }

    const payload = {
      teamId: normTeamId,
      teamName: teamConfig.name,
      completed: true,
      selectedOption,
      isCorrect: correct,
      submittedBy: participantName || teamConfig.name,
      completedAt: new Date().toISOString(),
    };

    try {
      await fetch(`${dbUrl}/sessions/trekking2026/tutorials/${normTeamId}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const tutRef = ref(rtdb, `sessions/trekking2026/tutorials/${normTeamId}`);
      update(tutRef, payload).catch(() => {});
    } catch (e) {
      console.warn('몸풀기 퀴즈 저장 경고:', e);
    }
  };

  const toggleRule = (ruleId: string) => {
    setSelectedRules(prev =>
      prev.includes(ruleId) ? prev.filter(id => id !== ruleId) : [...prev, ruleId]
    );
  };

  const handleAddCustomRule = () => {
    if (!customRuleText.trim()) return;
    setCustomRulesList(prev => [...prev, customRuleText.trim()]);
    setCustomRuleText('');
  };

  const handleRemoveCustomRule = (index: number) => {
    setCustomRulesList(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveGroundRules = async () => {
    setIsSavingRules(true);
    setSaveSuccess(false);

    const payload = {
      teamId: normTeamId,
      teamName: teamConfig.name,
      roles: selectedRoles,
      selectedRuleIds: selectedRules,
      selectedRuleTexts: selectedRules.map(id => GROUND_RULE_PRESETS.find(p => p.id === id)?.text || id),
      customRules: customRulesList,
      updatedBy: participantName || teamConfig.name,
      updatedAt: new Date().toISOString(),
    };

    try {
      await fetch(`${dbUrl}/sessions/trekking2026/groundRules/${normTeamId}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const ruleRef = ref(rtdb, `sessions/trekking2026/groundRules/${normTeamId}`);
      await update(ruleRef, payload);
    } catch (e) {
      console.warn('그라운드룰 저장 경고:', e);
    }

    setIsSavingRules(false);
    setSaveSuccess(true);
    fireConfetti();
    setTimeout(() => {
      setSaveSuccess(false);
      setActiveTab('quiz');
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 animate-fade-in select-none">
      <div className="bg-[#13192A] border border-white/15 w-full max-w-[430px] max-h-[92vh] rounded-3xl flex flex-col shadow-2xl overflow-hidden">
        {/* 상단 헤더 */}
        <div className="bg-[#182035] border-b border-white/10 px-4 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <span
              className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold text-white"
              style={{ background: teamConfig.color }}
            >
              {teamConfig.shortCode}
            </span>
            <div>
              <h3 className="text-[16px] font-bold text-white">
                {teamConfig.name} 그라운드룰 & 연습 퀴즈
              </h3>
              <span className="text-[12.5px] text-slate-400">조 대표 1명이 입력하면 조 전체에 반영됩니다</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/10 text-slate-300 flex items-center justify-center hover:bg-white/20 active:scale-95 text-xs"
          >
            ✕
          </button>
        </div>

        {/* 탭 전환 */}
        <div className="flex bg-[#101626] p-1.5 border-b border-white/8 gap-1.5 flex-shrink-0">
          <button
            onClick={() => setActiveTab('rules')}
            className={`flex-1 py-2 rounded-xl text-[14px] font-bold transition-all ${
              activeTab === 'rules'
                ? 'bg-sky-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            1. 조별 그라운드룰
          </button>
          <button
            onClick={() => setActiveTab('quiz')}
            className={`flex-1 py-2 rounded-xl text-[14px] font-bold transition-all flex items-center justify-center gap-1 ${
              activeTab === 'quiz'
                ? 'bg-red-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>2. 연습 Quiz</span>
            {isQuizSubmitted && <span className="text-emerald-300 text-[12.5px]">✓</span>}
          </button>
        </div>

        {/* 탭 1: 조별 그라운드룰 & 역할 분담 */}
        {activeTab === 'rules' && (
          <div className="p-4 space-y-4 flex-1 overflow-y-auto">
            {/* 역할 배분 섹션 */}
            <div className="space-y-2">
              <h4 className="text-[15px] font-bold text-white">
                조별 역할 배분
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {GROUND_RULE_ROLE_OPTIONS.map(role => (
                  <div key={role.id} className="bg-[#182035] border border-white/8 rounded-xl p-2.5 space-y-1.5">
                    <strong className="text-[14px] text-white block">{role.title}</strong>
                    <p className="text-[12px] text-slate-400 leading-tight">
                      {role.description}
                    </p>
                    <input
                      type="text"
                      placeholder="담당자 이름"
                      value={selectedRoles[role.id] || ''}
                      onChange={e => setSelectedRoles({ ...selectedRoles, [role.id]: e.target.value })}
                      className="w-full bg-[#101626] border border-white/10 rounded-lg px-2 py-1 text-[13.5px] text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* 추천 그라운드룰 체크리스트 */}
            <div className="space-y-2">
              <h4 className="text-[15px] font-bold text-white">
                우리 조 그라운드룰 선택
              </h4>
              <div className="space-y-1.5">
                {GROUND_RULE_PRESETS.map(preset => {
                  const isChecked = selectedRules.includes(preset.id);
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => toggleRule(preset.id)}
                      className={`w-full text-left p-2.5 rounded-xl border text-[14px] flex items-center gap-2.5 transition-all ${
                        isChecked
                          ? 'bg-sky-500/15 border-sky-400 text-white font-medium'
                          : 'bg-black/20 border-white/5 text-slate-400 hover:border-white/15'
                      }`}
                    >
                      <span className={`w-4 h-4 rounded flex items-center justify-center text-[12px] font-bold ${
                        isChecked ? 'bg-sky-500 text-slate-950' : 'border border-slate-500'
                      }`}>
                        {isChecked ? '✓' : ''}
                      </span>
                      <span className="flex-1 leading-snug">{preset.text}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 직접 입력 커스텀 그라운드룰 */}
            <div className="space-y-2">
              <h4 className="text-[14.5px] font-bold text-slate-300">
                우리 조만의 룰 추가 (선택)
              </h4>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="예: 20분 동안 산책하며 사진 찍기"
                  value={customRuleText}
                  onChange={e => setCustomRuleText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddCustomRule()}
                  className="flex-1 bg-[#101626] border border-white/10 rounded-xl px-3 py-2 text-[14px] text-white placeholder-slate-600 focus:outline-none focus:border-sky-500"
                />
                <button
                  type="button"
                  onClick={handleAddCustomRule}
                  className="px-3 py-2 bg-sky-500 text-slate-950 font-bold text-[14px] rounded-xl hover:bg-sky-400 active:scale-95"
                >
                  추가
                </button>
              </div>

              {customRulesList.length > 0 && (
                <div className="space-y-1 pt-1">
                  {customRulesList.map((cr, idx) => (
                    <div key={idx} className="bg-sky-950/30 border border-sky-500/20 rounded-lg px-2.5 py-1.5 flex items-center justify-between text-[14px] text-sky-200">
                      <span>• {cr}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCustomRule(idx)}
                        className="text-slate-500 hover:text-red-400 text-xs px-1"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 탭 2: 연습 Quiz (조별 기준) */}
        {activeTab === 'quiz' && (
          <div className="p-4 space-y-3.5 flex-1 overflow-y-auto">
            <div className="bg-[#182035] border border-white/10 rounded-2xl p-4 space-y-3 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-[13px] bg-red-500/20 text-red-300 border border-red-500/30 px-2.5 py-0.5 rounded-full font-bold">
                  {IS_PILOT_MODE ? '카페쿰베오' : '빵명장'}
                </span>
                <span className="text-[13px] text-slate-400">
                  {isQuizSubmitted ? `${teamConfig.name} 완료 (${quizSubmittedBy})` : '조 대표 1명 제출'}
                </span>
              </div>

              <div className="space-y-1">
                <h4 className="text-[16px] font-bold text-white leading-snug">
                  {TUTORIAL_QUIZ.questionText}
                </h4>
                <p className="text-[13.5px] text-amber-300/90">
                  {TUTORIAL_QUIZ.hintText}
                </p>
              </div>

              {/* 보기 4지선다 */}
              <div className="space-y-2 pt-1">
                {TUTORIAL_QUIZ.options.map((opt, idx) => {
                  const isSelected = selectedOption === idx;
                  const isCorrectAnswer = idx === TUTORIAL_QUIZ.correctIndex;
                  let btnStyle = 'bg-black/30 border-white/10 text-slate-200 hover:border-white/30';

                  if (isQuizSubmitted) {
                    if (isCorrectAnswer) {
                      btnStyle = 'bg-emerald-500/20 border-emerald-400 text-emerald-300 font-extrabold';
                    } else if (isSelected) {
                      btnStyle = 'bg-red-500/20 border-red-400 text-red-300';
                    }
                  } else if (isSelected) {
                    btnStyle = 'bg-sky-500/20 border-sky-400 text-white font-bold';
                  }

                  return (
                    <button
                      key={opt}
                      type="button"
                      disabled={isQuizSubmitted}
                      onClick={() => setSelectedOption(idx)}
                      className={`w-full text-left p-3 rounded-xl border text-[15px] flex items-center justify-between transition-all active:scale-98 ${btnStyle}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[13px] font-bold">
                          {idx + 1}
                        </span>
                        <span>{opt}</span>
                      </div>
                      {isQuizSubmitted && isCorrectAnswer && (
                        <span className="text-emerald-400 text-sm font-bold">정답</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {isQuizSubmitted && (
                <div className={`p-3 rounded-xl border text-[14px] leading-relaxed ${
                  isQuizCorrect
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                    : 'bg-red-950/40 border-red-500/40 text-red-200'
                }`}>
                  <p className="font-bold">
                    {isQuizCorrect
                      ? TUTORIAL_QUIZ.explanation
                      : IS_PILOT_MODE
                      ? '오답입니다. 정답은 6,500원입니다.'
                      : '오답입니다. 정답은 3,800원입니다.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 하단 액션 버튼 */}
        <div className="bg-[#182035] border-t border-white/10 p-3 flex items-center gap-2 flex-shrink-0">
          {activeTab === 'rules' ? (
            <button
              type="button"
              disabled={isSavingRules}
              onClick={handleSaveGroundRules}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-extrabold text-[15px] rounded-xl shadow-lg active:scale-95 transition-all"
            >
              {isSavingRules ? '저장 중...' : saveSuccess ? '저장 완료! 연습 퀴즈로 이동...' : '그라운드룰 저장 & 연습 Quiz 이동 →'}
            </button>
          ) : (
            <>
              {!isQuizSubmitted ? (
                <button
                  type="button"
                  disabled={selectedOption === null}
                  onClick={handleQuizSubmit}
                  className="w-full py-3 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white font-extrabold text-[15px] rounded-xl shadow-lg active:scale-95 transition-all"
                >
                  조 대표 정답 제출하기
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-3 bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-[15px] rounded-xl shadow-lg active:scale-95 transition-all"
                >
                  연습 Quiz 완료 (닫기)
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
