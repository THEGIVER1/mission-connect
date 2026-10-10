import React, { useState, useEffect } from 'react';
import {
  TUTORIAL_QUIZ,
  GROUND_RULE_ROLE_OPTIONS,
  GROUND_RULE_PRESETS,
  WORKSHOP_TEAMS,
} from '../../config/workshopConfig';
import { normalizeTeamId, createParticipantId } from '../../utils/scoreCalculator';
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
  participantCompany,
}) => {
  const normTeamId = normalizeTeamId(teamId);
  const teamConfig = WORKSHOP_TEAMS.find(t => t.id === normTeamId) || WORKSHOP_TEAMS[0];

  const [activeTab, setActiveTab] = useState<'quiz' | 'rules'>('quiz');

  // 1. 튜토리얼 퀴즈 상태
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isQuizSubmitted, setIsQuizSubmitted] = useState<boolean>(false);
  const [isQuizCorrect, setIsQuizCorrect] = useState<boolean>(false);

  // 2. 조별 그라운드룰 상태
  const [selectedRoles, setSelectedRoles] = useState<Record<string, string>>({}); // { roleId: memberName }
  const [selectedRules, setSelectedRules] = useState<string[]>([
    'rule_healing', // 기본 추천: 30분 개인 힐링 시간
    'rule_slow',
  ]);
  const [customRuleText, setCustomRuleText] = useState<string>('');
  const [customRulesList, setCustomRulesList] = useState<string[]>([]);
  const [isSavingRules, setIsSavingRules] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  const dbUrl = FIREBASE_DB_URL;

  // 서버 데이터 동기화
  useEffect(() => {
    if (!isOpen) return;

    // 1) 기존 저장된 조별 그라운드룰 불러오기
    fetch(`${dbUrl}/sessions/trekking2026/groundRules/${normTeamId}.json?t=${Date.now()}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && typeof data === 'object') {
          if (data.roles) setSelectedRoles(data.roles);
          if (Array.isArray(data.selectedRuleIds)) setSelectedRules(data.selectedRuleIds);
          if (Array.isArray(data.customRules)) setCustomRulesList(data.customRules);
        }
      })
      .catch(err => console.warn('그라운드룰 로드 경고:', err));

    // 2) 튜토리얼 완료 여부
    if (participantName) {
      const pId = createParticipantId(participantName, participantCompany);
      fetch(`${dbUrl}/sessions/trekking2026/participants/${encodeURIComponent(pId)}/tutorial.json?t=${Date.now()}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data && data.completed) {
            setSelectedOption(data.selectedOption ?? TUTORIAL_QUIZ.correctIndex);
            setIsQuizSubmitted(true);
            setIsQuizCorrect(data.isCorrect ?? true);
          }
        })
        .catch(err => console.warn('튜토리얼 상태 로드 경고:', err));
    }
  }, [isOpen, normTeamId, participantName, participantCompany, dbUrl]);

  if (!isOpen) return null;

  // 튜토리얼 퀴즈 제출
  const handleQuizSubmit = async () => {
    if (selectedOption === null) return;

    const correct = selectedOption === TUTORIAL_QUIZ.correctIndex;
    setIsQuizCorrect(correct);
    setIsQuizSubmitted(true);

    if (correct) {
      fireConfetti();
    }

    if (participantName) {
      const pId = createParticipantId(participantName, participantCompany);
      const payload = {
        completed: true,
        selectedOption,
        isCorrect: correct,
        completedAt: new Date().toISOString(),
      };

      try {
        await fetch(`${dbUrl}/sessions/trekking2026/participants/${encodeURIComponent(pId)}/tutorial.json`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const tutRef = ref(rtdb, `sessions/trekking2026/participants/${pId}/tutorial`);
        update(tutRef, payload).catch(() => {});
      } catch (e) {
        console.warn('튜토리얼 저장 경고:', e);
      }
    }
  };

  // 룰 토글
  const toggleRule = (ruleId: string) => {
    setSelectedRules(prev =>
      prev.includes(ruleId) ? prev.filter(id => id !== ruleId) : [...prev, ruleId]
    );
  };

  // 커스텀 룰 추가
  const handleAddCustomRule = () => {
    if (!customRuleText.trim()) return;
    setCustomRulesList(prev => [...prev, customRuleText.trim()]);
    setCustomRuleText('');
  };

  const handleRemoveCustomRule = (index: number) => {
    setCustomRulesList(prev => prev.filter((_, i) => i !== index));
  };

  // 그라운드룰 저장
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
      updatedBy: participantName || '익명',
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
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 animate-fade-in select-none">
      <div className="bg-[#13192A] border border-white/15 w-full max-w-[390px] max-h-[92vh] rounded-3xl flex flex-col shadow-2xl overflow-hidden">
        {/* 상단 헤더 */}
        <div className="bg-[#182035] border-b border-white/10 px-4 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-sm font-bold text-white"
                  style={{ background: teamConfig.color }}>
              {teamConfig.shortCode}
            </span>
            <div>
              <span className="text-[10px] text-red-400 font-bold uppercase tracking-wider block">
                1:30~2:00 집결 오프닝
              </span>
              <h3 className="text-[14px] font-bold text-white">
                {teamConfig.name} 튜토리얼 & 그라운드룰
              </h3>
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
            onClick={() => setActiveTab('quiz')}
            className={`flex-1 py-2 rounded-xl text-[12px] font-bold transition-all flex items-center justify-center gap-1 ${
              activeTab === 'quiz'
                ? 'bg-gradient-to-r from-red-600 to-orange-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>🥐</span>
            <span>1. 빵 가격 튜토리얼</span>
            {isQuizSubmitted && <span className="text-emerald-300 text-[10px]">✔</span>}
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`flex-1 py-2 rounded-xl text-[12px] font-bold transition-all flex items-center justify-center gap-1 ${
              activeTab === 'rules'
                ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>🤝</span>
            <span>2. 조별 그라운드룰</span>
            {selectedRules.length > 0 && <span className="text-sky-300 text-[10px]">({selectedRules.length})</span>}
          </button>
        </div>

        {/* 탭 1: 튜토리얼 퀴즈 */}
        {activeTab === 'quiz' && (
          <div className="p-4 space-y-3.5 flex-1 overflow-y-auto">
            {/* 빵명장 튜토리얼 안내 배너 */}
            <div className="bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-red-500/15 border border-amber-500/30 rounded-2xl p-3 text-[11.5px] text-slate-200 leading-relaxed">
              <div className="flex items-center gap-1.5 font-bold text-amber-400 mb-1">
                <span>🥐</span>
                <span>어플 테스트 & 빵명장 시그니처 퀴즈</span>
              </div>
              출발 전 세븐일레븐 앞 야외 테이블에서 조원들과 가볍게 어플 작동을 테스트해 보세요! (바로 옆 빵명장 매장 진열대를 확인하고 1위 시그니처 빵의 가격을 맞혀보세요.)
            </div>

            {/* 퀴즈 문제 카드 */}
            <div className="bg-[#182035] border border-white/10 rounded-2xl p-3.5 space-y-3 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-[11px] bg-red-500/20 text-red-300 border border-red-500/30 px-2 py-0.5 rounded-full font-bold">
                  빵명장 서울대공원점
                </span>
                <span className="text-[11px] text-slate-400">
                  앱 사용 튜토리얼
                </span>
              </div>

              <div className="space-y-1">
                <h4 className="text-[14px] font-bold text-white leading-snug">
                  {TUTORIAL_QUIZ.questionText}
                </h4>
                <p className="text-[11px] text-amber-300/90 font-medium">
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
                      className={`w-full text-left p-3 rounded-xl border text-[13px] flex items-center justify-between transition-all active:scale-98 ${btnStyle}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[11px] font-bold">
                          {idx + 1}
                        </span>
                        <span>{opt}</span>
                      </div>
                      {isQuizSubmitted && isCorrectAnswer && (
                        <span className="text-emerald-400 text-sm font-bold">정답 👏</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* 제출 후 해설 */}
              {isQuizSubmitted && (
                <div className={`p-3 rounded-xl border text-[11.5px] leading-relaxed animate-fade-in ${
                  isQuizCorrect
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                    : 'bg-red-950/40 border-red-500/40 text-red-200'
                }`}>
                  <p className="font-bold mb-1">
                    {isQuizCorrect ? '🎉 완벽합니다! 정답입니다.' : '💡 오답입니다. 정답은 6,500원(2번)입니다.'}
                  </p>
                  <p>{TUTORIAL_QUIZ.explanation}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 탭 2: 조별 그라운드룰 & 역할 분담 */}
        {activeTab === 'rules' && (
          <div className="p-4 space-y-4 flex-1 overflow-y-auto">
            {/* 30분 힐링 & 그라운드룰 안내 */}
            <div className="bg-gradient-to-r from-sky-500/15 via-blue-500/10 to-indigo-500/15 border border-sky-500/30 rounded-2xl p-3 text-[11.5px] text-slate-200 leading-relaxed">
              <div className="flex items-center gap-1.5 font-bold text-sky-400 mb-1">
                <span>🤝</span>
                <span>출발 전 조별 자기소개 & 그라운드룰 약속</span>
              </div>
              조원들과 역할을 나누고 우리 조만의 힐링 규칙을 정해보세요! (예: <strong>30분 개인 힐링 시간</strong>, 천천히 걷기 등)
            </div>

            {/* 역할 배분 섹션 */}
            <div className="space-y-2">
              <h4 className="text-[13px] font-bold text-white flex items-center gap-1">
                <span>👥</span>
                <span>우리 조 역할 배분 (담당 조원명 입력)</span>
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {GROUND_RULE_ROLE_OPTIONS.map(role => (
                  <div key={role.id} className="bg-[#182035] border border-white/8 rounded-xl p-2.5 space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-base">{role.icon}</span>
                      <strong className="text-[12px] text-white">{role.title}</strong>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-tight">
                      {role.description}
                    </p>
                    <input
                      type="text"
                      placeholder="담당자 이름"
                      value={selectedRoles[role.id] || ''}
                      onChange={e => setSelectedRoles({ ...selectedRoles, [role.id]: e.target.value })}
                      className="w-full bg-[#101626] border border-white/10 rounded-lg px-2 py-1 text-[11px] text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* 추천 그라운드룰 체크리스트 */}
            <div className="space-y-2">
              <h4 className="text-[13px] font-bold text-white flex items-center gap-1">
                <span>🌿</span>
                <span>우리 조의 약속 (그라운드룰) 선택</span>
              </h4>
              <div className="space-y-1.5">
                {GROUND_RULE_PRESETS.map(preset => {
                  const isChecked = selectedRules.includes(preset.id);
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => toggleRule(preset.id)}
                      className={`w-full text-left p-2.5 rounded-xl border text-[12px] flex items-center gap-2.5 transition-all ${
                        isChecked
                          ? 'bg-sky-500/15 border-sky-400 text-white font-medium'
                          : 'bg-black/20 border-white/5 text-slate-400 hover:border-white/15'
                      }`}
                    >
                      <span className={`w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold ${
                        isChecked ? 'bg-sky-500 text-slate-950' : 'border border-slate-500'
                      }`}>
                        {isChecked ? '✓' : ''}
                      </span>
                      <span>{preset.icon}</span>
                      <span className="flex-1 leading-snug">{preset.text}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 직접 입력 커스텀 그라운드룰 */}
            <div className="space-y-2">
              <h4 className="text-[12.5px] font-bold text-slate-300 flex items-center gap-1">
                <span>✍️</span>
                <span>우리 조만의 특별한 룰 직접 추가</span>
              </h4>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="예: 30분 동안 혼자 산책하며 사진 3장 찍기"
                  value={customRuleText}
                  onChange={e => setCustomRuleText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddCustomRule()}
                  className="flex-1 bg-[#101626] border border-white/10 rounded-xl px-3 py-2 text-[12px] text-white placeholder-slate-600 focus:outline-none focus:border-sky-500"
                />
                <button
                  type="button"
                  onClick={handleAddCustomRule}
                  className="px-3 py-2 bg-sky-500 text-slate-950 font-bold text-[12px] rounded-xl hover:bg-sky-400 active:scale-95"
                >
                  추가
                </button>
              </div>

              {customRulesList.length > 0 && (
                <div className="space-y-1 pt-1">
                  {customRulesList.map((cr, idx) => (
                    <div key={idx} className="bg-sky-950/30 border border-sky-500/20 rounded-lg px-2.5 py-1.5 flex items-center justify-between text-[11.5px] text-sky-200">
                      <span>✨ {cr}</span>
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

        {/* 하단 액션 버튼 */}
        <div className="bg-[#182035] border-t border-white/10 p-3 flex items-center gap-2 flex-shrink-0">
          {activeTab === 'quiz' ? (
            <>
              {!isQuizSubmitted ? (
                <button
                  type="button"
                  disabled={selectedOption === null}
                  onClick={handleQuizSubmit}
                  className="w-full py-3 bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-500 hover:to-orange-400 disabled:opacity-40 text-white font-extrabold text-[13px] rounded-xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-1.5"
                >
                  <span>정답 제출하고 튜토리얼 완료하기 🚀</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveTab('rules')}
                  className="w-full py-3 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-extrabold text-[13px] rounded-xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-1.5"
                >
                  <span>다음: 2단계 조별 그라운드룰 정하기 →</span>
                </button>
              )}
            </>
          ) : (
            <button
              type="button"
              disabled={isSavingRules}
              onClick={handleSaveGroundRules}
              className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-40 text-slate-950 font-extrabold text-[13px] rounded-xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-1.5"
            >
              <span>{isSavingRules ? '저장 처리 중...' : saveSuccess ? '✅ 저장 완료!' : '우리 조 그라운드룰 확정 & 저장 💾'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
