import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { BottomNav } from '../dashboard/Dashboard';
import {
  PEOPLE_QUEST_QUESTIONS,
  PRE_REGISTERED_PARTICIPANTS,
  PEOPLE_QUEST_POINTS_PER_MEMBER,
  ACTIVE_VENUE,
} from '../../config/workshopConfig';
import { PreRegisteredPerson } from '../../types';

interface QuestAnswer {
  personId: string;
  personName: string;
  company: string;
  reason: string;
}

const PeopleQuestScreen: React.FC = () => {
  const navigate = useNavigate();
  const {
    myTeam,
    participantName,
    participantCompany,
    updateTeamScore,
  } = useAppStore();

  const teamId = myTeam?.id ?? 'team1';
  const participantId = participantName && participantCompany
    ? `${participantName}_${participantCompany}`.replace(/\s/g, '_')
    : 'anonymous';

  // 질문별 추천 저장 state: { [qId]: QuestAnswer }
  const [answers, setAnswers] = useState<Record<string, QuestAnswer>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  const [submittedBy, setSubmittedBy] = useState<string | null>(null);

  // 모달 인물 검색 state
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  const dbUrl = import.meta.env.VITE_FIREBASE_DATABASE_URL || 'https://doosan-teambuilding-default-rtdb.firebaseio.com';

  // 1. 조별 People Quest 기존 제출/임시저장 상태 로드
  useEffect(() => {
    const loadTeamQuest = async () => {
      try {
        const res = await fetch(`${dbUrl}/sessions/trekking2026/peopleQuest/${teamId}.json`);
        if (res.ok) {
          const data = await res.json();
          if (data) {
            if (data.recommendations) {
              setAnswers(data.recommendations);
            }
            if (data.status === 'submitted') {
              setIsSubmitted(true);
              setSubmittedAt(data.submittedAt ?? null);
              setSubmittedBy(data.submittedBy ?? null);
            }
          }
        }
      } catch (err) {
        console.warn('People Quest 데이터 로드 실패:', err);
      }
    };
    loadTeamQuest();
  }, [teamId, dbUrl]);

  // 검색 가능한 인물 목록 (본인 제외)
  const candidateList = useMemo(() => {
    return PRE_REGISTERED_PARTICIPANTS.filter(p => {
      // 본인 제외
      if (participantName && p.name.trim() === participantName.trim()) return false;
      // 검색어 필터
      if (!searchQuery.trim()) return true;
      const q = searchQuery.trim().toLowerCase();
      return p.name.toLowerCase().includes(q) || p.company.toLowerCase().includes(q) || p.teamName.includes(q);
    });
  }, [searchQuery, participantName]);

  // 이미 다른 질문에서 선택된 인물 ID 목록 (질문 간 중복 선택 방지)
  const selectedPersonIds = useMemo(() => {
    return Object.entries(answers)
      .filter(([qId]) => qId !== activeQuestionId)
      .map(([, ans]) => ans.personId);
  }, [answers, activeQuestionId]);

  // 인물 선택 핸들러
  const handleSelectPerson = (person: PreRegisteredPerson) => {
    if (!activeQuestionId) return;
    setAnswers(prev => ({
      ...prev,
      [activeQuestionId]: {
        ...(prev[activeQuestionId] || { reason: '' }),
        personId: person.id,
        personName: person.name,
        company: person.company,
      },
    }));
    setActiveQuestionId(null);
    setSearchQuery('');
  };

  // 이유 입력 핸들러
  const handleReasonChange = (qId: string, val: string) => {
    if (val.length > 100) return;
    setAnswers(prev => ({
      ...prev,
      [qId]: {
        ...(prev[qId] || { personId: '', personName: '', company: '' }),
        reason: val,
      },
    }));
  };

  // 임시 저장
  const handleSaveDraft = async () => {
    setIsBusy(true);
    setStatusMessage('');
    try {
      await fetch(`${dbUrl}/sessions/trekking2026/peopleQuest/${teamId}.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId,
          teamName: myTeam?.name ?? '',
          recommendations: answers,
          status: 'draft',
          updatedAt: new Date().toISOString(),
          updatedBy: participantName ?? '익명',
        }),
      });
      setStatusMessage('💾 임시 저장이 완료되었습니다.');
      setTimeout(() => setStatusMessage(''), 3000);
    } catch (err) {
      console.warn('임시 저장 실패:', err);
      setStatusMessage('⚠️ 임시 저장 중 오류가 발생했습니다.');
    } finally {
      setIsBusy(false);
    }
  };

  // 모든 필수 질문 응답 완료 여부
  const isAllAnswered = useMemo(() => {
    return PEOPLE_QUEST_QUESTIONS.every(q => {
      const a = answers[q.id];
      return a && a.personName && a.reason.trim().length > 0;
    });
  }, [answers]);

  // 최종 제출
  const handleSubmit = async () => {
    if (!isAllAnswered || isSubmitted) return;
    const confirmed = window.confirm('최종 제출 후에는 수정할 수 없습니다. 제출하시겠습니까?');
    if (!confirmed) return;

    setIsBusy(true);
    const nowIso = new Date().toISOString();

    try {
      // 1. People Quest 결과 저장
      await fetch(`${dbUrl}/sessions/trekking2026/peopleQuest/${teamId}.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId,
          teamName: myTeam?.name ?? '',
          recommendations: answers,
          status: 'submitted',
          submittedAt: nowIso,
          submittedBy: participantName ?? '익명',
          pointsAwarded: PEOPLE_QUEST_POINTS_PER_MEMBER,
        }),
      });

      // 2. 현재 로그인 참가자 점수 가산 (+200pt)
      const pRes = await fetch(`${dbUrl}/sessions/trekking2026/participants/${encodeURIComponent(participantId)}.json`);
      const existing = pRes.ok ? await pRes.json() : null;
      const prevScore = Number(existing?.score ?? 0);
      const prevMissions = Number(existing?.missionsCompleted ?? 0);
      const nextScore = prevScore + PEOPLE_QUEST_POINTS_PER_MEMBER;

      await fetch(`${dbUrl}/sessions/trekking2026/participants/${encodeURIComponent(participantId)}.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          score: nextScore,
          missionsCompleted: prevMissions + 1,
          peopleQuestCompleted: true,
          peopleQuestCompletedAt: nowIso,
        }),
      });

      if (myTeam?.id) {
        updateTeamScore(myTeam.id, nextScore);
      }

      setIsSubmitted(true);
      setSubmittedAt(nowIso);
      setSubmittedBy(participantName ?? '익명');
    } catch (err) {
      console.warn('최종 제출 실패:', err);
      alert('제출 처리 중 오류가 발생했습니다.');
    } finally {
      setIsBusy(false);
    }
  };

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
              PEOPLE <span className="text-red-500">QUEST</span>
            </span>
            <p className="text-[9px] text-slate-400">대화형 숨은 인물 추천 미션</p>
          </div>
          <span className="text-[11px] font-bold text-amber-400">
            +{PEOPLE_QUEST_POINTS_PER_MEMBER}pt
          </span>
        </div>
      </header>

      {/* 안내 배너 */}
      <div className="bg-[#12192A] border-b border-white/5 px-4 py-3">
        <p className="text-[12px] text-slate-300 leading-relaxed">
          💬 트레킹을 함께하며 평소 잘 몰랐던 구성원들의 이야기를 발견해 보세요. 아래 질문별로 가장 잘 어울리는 사람을 찾아 이름과 선정 이유를 작성해 주세요. (추천된 인물은 저녁 진진가 퀴즈의 주요 후보로 활용됩니다)
        </p>
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5 text-[11px]">
          <span className="text-slate-400">
            {myTeam?.name ?? '우리 조'} · 추천 대상: {PEOPLE_QUEST_QUESTIONS.length}명
          </span>
          <span className={`font-bold ${isSubmitted ? 'text-green-400' : 'text-amber-400'}`}>
            {isSubmitted ? '✅ 최종 제출 완료' : '진행 중'}
          </span>
        </div>
      </div>

      {/* 완료 상태 뷰 (제출 후) */}
      {isSubmitted ? (
        <div className="px-4 py-6 flex-1 flex flex-col justify-center items-center text-center">
          <div className="w-16 h-16 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center text-3xl mb-4">
            🎉
          </div>
          <h2 className="text-[18px] font-bold text-white mb-2">People Quest 완료!</h2>
          <p className="text-[13px] text-green-400 font-medium mb-1">
            우리 조가 발견한 {PEOPLE_QUEST_QUESTIONS.length}명의 명단이 전달되었습니다.
          </p>
          <p className="text-[11px] text-slate-400 mb-6">
            완료 점수 <strong className="text-amber-400 font-bold">+{PEOPLE_QUEST_POINTS_PER_MEMBER}pt</strong>가 조원 전체에 부여되었습니다!
          </p>

          {/* 내가 추천한 2명 요약 카드 */}
          <div className="w-full bg-[#1A2235] border border-white/10 rounded-2xl p-4 text-left space-y-3 mb-6">
            <p className="text-[12px] font-bold text-slate-300 border-b border-white/5 pb-2">
              📋 우리 조가 추천한 인물 명단
            </p>
            {PEOPLE_QUEST_QUESTIONS.map((q, idx) => {
              const ans = answers[q.id];
              return (
                <div key={q.id} className="bg-black/30 p-3 rounded-xl border border-white/5">
                  <p className="text-[11px] text-amber-400 font-bold">Q{idx + 1}. {q.title}</p>
                  <p className="text-[13px] text-white font-bold mt-1">
                    👉 {ans?.personName ?? '선택 없음'} ({ans?.company ?? ''})
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1 italic">
                    "{ans?.reason || '선정 이유 없음'}"
                  </p>
                </div>
              );
            })}
          </div>

          <button
            onClick={() => navigate('/')}
            className="w-full py-3.5 bg-red-500 text-white font-bold rounded-xl active:scale-98 shadow-md"
          >
            메인 화면으로 돌아가기
          </button>
        </div>
      ) : (
        /* 작성 양식 뷰 */
        <div className="px-4 py-4 flex-1 overflow-y-auto space-y-4 pb-28">
          {PEOPLE_QUEST_QUESTIONS.map((q, idx) => {
            const ans = answers[q.id] || { personId: '', personName: '', company: '', reason: '' };
            const hasPerson = !!ans.personName;

            return (
              <div key={q.id} className="bg-[#1A2235] border border-white/10 rounded-2xl p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <span className="w-6 h-6 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 flex items-center justify-center text-xs font-bold flex-shrink-0">
                    Q{idx + 1}
                  </span>
                  <div>
                    <h3 className="text-[14px] font-bold text-white">{q.title}</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">{q.instruction}</p>
                  </div>
                </div>

                {/* 추천 인물 선택 영역 */}
                <div>
                  <label className="text-[11px] text-slate-400 mb-1 block font-medium">추천 대상자 *</label>
                  {hasPerson ? (
                    <div className="flex items-center justify-between bg-black/40 border border-white/15 rounded-xl px-3.5 py-2.5">
                      <div>
                        <span className="text-[14px] font-bold text-white">{ans.personName}</span>
                        <span className="text-[11px] text-slate-400 ml-2">({ans.company})</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveQuestionId(q.id)}
                        className="text-[11px] text-amber-400 hover:text-amber-300 font-bold underline"
                      >
                        변경
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setActiveQuestionId(q.id)}
                      className="w-full py-3 bg-black/30 border border-dashed border-white/20 hover:border-red-500 rounded-xl text-[13px] text-slate-400 hover:text-white flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <span>🔍 참가자 명단에서 검색 및 선택</span>
                    </button>
                  )}
                </div>

                {/* 선정 이유 입력 영역 */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[11px] text-slate-400 font-medium">선정 이유 *</label>
                    <span className={`text-[10px] ${ans.reason.length > 90 ? 'text-amber-400 font-bold' : 'text-slate-500'}`}>
                      {ans.reason.length}/100자
                    </span>
                  </div>
                  <textarea
                    rows={2}
                    maxLength={100}
                    value={ans.reason}
                    onChange={e => handleReasonChange(q.id, e.target.value)}
                    placeholder="이 분을 추천하는 이유나 대화 중 알게 된 스토리를 적어주세요 (최대 100자)"
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-[12px] text-white placeholder-slate-600 focus:outline-none focus:border-red-500 transition-colors resize-none"
                  />
                </div>
              </div>
            );
          })}

          {statusMessage && (
            <p className="text-[12px] text-center text-green-400 bg-green-500/10 border border-green-500/20 py-2 rounded-xl">
              {statusMessage}
            </p>
          )}

          {/* 하단 액션 버튼 */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={isBusy}
              className="flex-1 py-3.5 bg-[#212C42] border border-white/10 text-slate-200 font-bold text-[14px] rounded-xl active:scale-98 transition-all"
            >
              💾 임시 저장
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!isAllAnswered || isBusy}
              className={`flex-1 py-3.5 font-bold text-[14px] rounded-xl active:scale-98 transition-all shadow-md ${
                isAllAnswered && !isBusy
                  ? 'bg-red-500 text-white shadow-red-500/20'
                  : 'bg-[#1A2235] text-slate-500 border border-white/5 cursor-not-allowed'
              }`}
            >
              🚀 최종 제출 (+{PEOPLE_QUEST_POINTS_PER_MEMBER}pt)
            </button>
          </div>
        </div>
      )}

      {/* 인물 검색 모달 */}
      {activeQuestionId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-[360px] bg-[#1A2235] border border-white/15 rounded-2xl flex flex-col max-h-[85vh] overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div>
                <p className="text-[15px] font-bold text-white">추천할 인물 선택</p>
                <p className="text-[11px] text-slate-400">참가자 50명 명단에서 검색하세요</p>
              </div>
              <button
                type="button"
                onClick={() => { setActiveQuestionId(null); setSearchQuery(''); }}
                className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* 검색창 */}
            <div className="p-3 border-b border-white/5">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="이름 또는 소속으로 검색 (예: 김민준, 두산)"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white text-[13px] placeholder-slate-600 focus:outline-none focus:border-red-500"
                autoFocus
              />
            </div>

            {/* 후보 리스트 */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
              {candidateList.length === 0 ? (
                <p className="text-center text-[12px] text-slate-500 py-6">
                  검색 결과가 없습니다.
                </p>
              ) : (
                candidateList.map(person => {
                  const isAlreadySelected = selectedPersonIds.includes(person.id);
                  return (
                    <button
                      key={person.id}
                      type="button"
                      disabled={isAlreadySelected}
                      onClick={() => handleSelectPerson(person)}
                      className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-colors ${
                        isAlreadySelected
                          ? 'opacity-40 bg-black/20 border-transparent cursor-not-allowed'
                          : 'bg-[#121826] border-white/5 hover:border-red-500/50 active:scale-98'
                      }`}
                    >
                      <div>
                        <span className="text-[14px] font-bold text-white">{person.name}</span>
                        <span className="text-[11px] text-slate-400 ml-2">({person.company} · {person.teamName})</span>
                      </div>
                      {isAlreadySelected ? (
                        <span className="text-[10px] text-slate-500 bg-white/5 px-2 py-0.5 rounded">
                          다른 질문에 선택됨
                        </span>
                      ) : (
                        <span className="text-[11px] text-red-400 font-bold">
                          선택 →
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      <BottomNav active="/" />
    </div>
  );
};

export default PeopleQuestScreen;
