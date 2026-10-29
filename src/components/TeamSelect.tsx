import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { ref, get, update } from 'firebase/database';
import { rtdb, FIREBASE_DB_URL } from '../lib/firebase';
import {
  WORKSHOP_COMPANIES,
  WORKSHOP_TEAMS,
  MY_INFO_QUESTIONS,
  PEOPLE_QUEST_POINTS_PER_MEMBER,
  WorkshopTeamConfig,
  IS_PILOT_MODE,
} from '../config/workshopConfig';
import { createParticipantId, sanitizeFirebaseKey } from '../utils/scoreCalculator';

const COMPANIES = WORKSHOP_COMPANIES;
const TEAMS = WORKSHOP_TEAMS;

type Step = 'info' | 'myinfo';

const TeamSelect: React.FC = () => {
  const navigate = useNavigate();
  const { selectTeam, myTeam, participantName, logout } = useAppStore();

  const [step, setStep] = useState<Step>('info');
  const [name, setName] = useState(participantName || '');
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(myTeam?.id || null);

  // 「나의 정보 4개 질문」 답변 상태 관리 (로컬 드래프트 우선 복원)
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('my_info_answers_draft');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);

  const selectedTeam = TEAMS.find(t => t.id === selectedTeamId) || null;
  const dbUrl = FIREBASE_DB_URL;

  // 1. 기존 RTDB 데이터 불러오기 (서버 데이터 우선 병합)
  useEffect(() => {
    if (!name.trim()) return;
    const participantId = createParticipantId(name.trim(), '');
    fetch(`${dbUrl}/sessions/trekking2026/participants/${encodeURIComponent(participantId)}.json?t=${Date.now()}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d && d.myInfo && Object.keys(d.myInfo).length > 0) {
          setAnswers(prev => ({ ...prev, ...d.myInfo }));
        }
      })
      .catch(() => {});
  }, [name, dbUrl]);

  // 2. 실시간 입력 디바운스 로컬 & 서버 자동 저장 (작성 도중 유실 원천 방어)
  const handleAnswerChange = (qId: string, value: string) => {
    if (value.length > 100) return;
    setAnswers(prev => {
      const updated = { ...prev, [qId]: value };
      try {
        localStorage.setItem('my_info_answers_draft', JSON.stringify(updated));
        setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      } catch (e) {
        console.warn('로컬 드래프트 저장 실패:', e);
      }

      // 백그라운드 REST 즉시 동기화
      if (name.trim()) {
        const pId = createParticipantId(name.trim(), '');
        fetch(`${dbUrl}/sessions/trekking2026/participants/${encodeURIComponent(pId)}.json`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            company: '',
            teamId: selectedTeam?.id || myTeam?.id || 'team1',
            teamName: selectedTeam?.name || myTeam?.name || '1조',
            course: selectedTeam?.assignedCourse || myTeam?.assignedCourse || 'forest',
            myInfo: updated,
            truth1: updated['q1_passion'] || '',
            truth2: updated['q5_unexpectedFact'] || updated['q3_bucketList'] || '',
            lie: updated['q4_dreamJob'] || '',
            status: 'active',
            updatedAt: new Date().toISOString(),
          }),
        }).catch(() => {});
      }

      return updated;
    });
  };

  // Step 1 -> Step 2 검증
  const handleInfoNext = () => {
    if (!name.trim()) { setError('이름을 입력해주세요.'); return; }
    if (!selectedTeamId) { setError('배정받은 행사 조를 선택해주세요.'); return; }
    setError('');
    setStep('myinfo');
  };

  // Step 2 완료 및 최종 입장 (절대 멈춤 없는 즉각 전환 & 타임아웃 보호 비동기 저장)
  const handleFinalEnter = async () => {
    if (!selectedTeam) return;
    setIsSubmitting(true);
    setError('');

    const trimmedName = name.trim();
    const participantId = createParticipantId(trimmedName, '');

    // 1. 즉시 로컬 스토어에 팀 및 참가자 정보 세팅 (0ms 지연)
    const initialScore = 0;
    const initialCompleted = 0;

    selectTeam({
      id: selectedTeam.id,
      name: selectedTeam.name,
      shortCode: selectedTeam.shortCode,
      color: selectedTeam.color,
      memberCount: 1,
      score: initialScore,
      rank: TEAMS.indexOf(selectedTeam) + 1,
      missionsCompleted: initialCompleted,
      totalMissions: 2,
      lastActivity: new Date(),
      status: 'active',
    }, trimmedName, '', selectedTeam.assignedCourse);

    // 2. localStorage에 즉시 답변 드래프트 영구 저장
    try {
      localStorage.setItem('my_info_answers_draft', JSON.stringify(answers));
      localStorage.setItem('participant_registered_id', participantId);
    } catch {}

    // 3. 페이로드 준비
    const payload = {
      name: trimmedName,
      company: '',
      teamId: selectedTeam.id,
      teamName: selectedTeam.name,
      course: selectedTeam.assignedCourse,
      myInfo: answers,
      truth1: answers['q1_passion'] || '',
      truth2: answers['q5_unexpectedFact'] || answers['q3_bucketList'] || '',
      lie: answers['q4_dreamJob'] || '',
      score: initialScore,
      missionsCompleted: initialCompleted,
      peopleQuestCompleted: false,
      joinedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'active',
    };

    // 4. Firebase RTDB에 안전하게 저장 (REST PATCH 3초 타임아웃)
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3000);
      await fetch(`${dbUrl}/sessions/trekking2026/participants/${encodeURIComponent(participantId)}.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timer);
    } catch (restErr) {
      console.warn('REST 저장 경고:', restErr);
    }

    // 5. SDK 백그라운드 푸시 (비동기 처리)
    try {
      const pRef = ref(rtdb, `sessions/trekking2026/participants/${participantId}`);
      update(pRef, payload).catch(e => console.warn('SDK update 백그라운드 경고:', e));
    } catch (sdkErr) {
      console.warn('SDK ref 경고:', sdkErr);
    }

    setIsSubmitting(false);
    navigate('/', { replace: true });
  };

  const forestTeams = TEAMS.filter(t => t.assignedCourse === 'forest');
  const lakeTeams = TEAMS.filter(t => t.assignedCourse === 'lake');

  const renderTeamCard = (team: WorkshopTeamConfig) => {
    const isSel = selectedTeamId === team.id;
    return (
      <button
        key={team.id}
        type="button"
        onClick={() => setSelectedTeamId(team.id)}
        className="w-full rounded-xl border p-3 text-left transition-all active:scale-98"
        style={isSel
          ? { borderColor: team.color, background: `${team.color}18`, boxShadow: `0 2px 10px ${team.color}20` }
          : { borderColor: 'rgba(255,255,255,0.08)', background: '#1A2235' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-white"
               style={{
                 background: team.color,
               }}>
            {team.shortCode}
          </div>
          <div className="flex-1">
            <span className="text-[17px] font-bold text-white">{team.name}</span>
            {team.courseDistance && <span className="text-[12.5px] ml-2 text-slate-400">({team.courseDistance})</span>}
          </div>
          <div className="w-5 h-5 rounded-full border flex items-center justify-center"
               style={{
                 borderColor: isSel ? team.color : 'rgba(255,255,255,0.2)',
                 background: isSel ? team.color : 'transparent',
               }}>
            {isSel && <span className="text-white text-[12.5px] font-bold">✓</span>}
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="max-w-[430px] mx-auto bg-[#0D1117] min-h-screen flex flex-col text-slate-100">

      {/* 상단 브랜딩 헤더 */}
      <div className="relative bg-[#13192A] px-5 pt-8 pb-5 text-center">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-red-600 to-orange-500" />
        <p style={{ color: '#005EB8', fontSize: '32px', fontWeight: '900', letterSpacing: '3px', fontStyle: 'italic', marginBottom: '4px' }}>
          DOOSAN
        </p>
        <p className="text-[14px] text-white tracking-[4px] font-bold uppercase mb-2">
          {IS_PILOT_MODE ? '연강원 TEAM ACTIVITY' : '2026 CHRO TREKKING'}
        </p>
        <div className="flex items-center justify-center gap-1.5">
          <span className="text-[12.5px] bg-[#1A2235] border border-white/8 rounded-full px-2.5 py-0.5 text-slate-400">
            {IS_PILOT_MODE ? '🌲 두산연강원 · 두산 저수지' : '🌲 서울대공원 · 국립현대미술관'}
          </span>
          <span className="text-[12.5px] bg-[#1A2235] border border-white/8 rounded-full px-2.5 py-0.5 text-slate-400">
            {IS_PILOT_MODE ? '🕐 오후 1:00 ~ 3:00' : '👥 CHRO 부문 워크샵'}
          </span>
        </div>
      </div>

      {/* 스텝 인디케이터 (2단계) */}
      <div className="flex items-center justify-center gap-3 pt-4 pb-2 border-b border-white/5 bg-[#101626]">
        <div className="flex items-center gap-1.5">
          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[12.5px] font-bold
            ${step === 'info' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}>
            {step === 'info' ? '1' : '✓'}
          </div>
          <span className={`text-[13.5px] ${step === 'info' ? 'text-white font-bold' : 'text-slate-400'}`}>기본 정보</span>
        </div>
        <div className="w-8 h-0.5 bg-slate-700" />
        <div className="flex items-center gap-1.5">
          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[12.5px] font-bold
            ${step === 'myinfo' ? 'bg-red-500 text-white' : 'bg-slate-700 text-slate-500'}`}>
            2
          </div>
          <span className={`text-[13.5px] ${step === 'myinfo' ? 'text-white font-bold' : 'text-slate-500'}`}>나의 정보 입력 (4문항)</span>
        </div>
      </div>

      {/* STEP 1: 참가자 기본 정보 입력 & 조 선택 */}
      {step === 'info' && (
        <div className="px-5 pt-4 flex flex-col gap-3.5 flex-1 overflow-y-auto pb-6">
          {/* 이미 로그인된 세션이 있는 경우 바로가기 & 수정 카드 */}
          {myTeam && participantName && (
            <div className="bg-[#1A2235] border border-red-500/30 rounded-2xl p-4 text-center space-y-2.5 shadow-lg">
              <span className="text-[12.5px] bg-green-500/15 text-green-400 border border-green-500/30 px-2.5 py-0.5 rounded-full font-bold">
                ✓ 현재 로그인된 참가자
              </span>
              <p className="text-[16px] text-white">
                <strong className="text-amber-400">{participantName}</strong>님 ({myTeam.name})
              </p>
              <div className="space-y-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="w-full py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold text-[15px] rounded-xl active:scale-98 shadow"
                >
                  대시보드로 바로 이동 →
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setStep('myinfo')}
                    className="flex-1 py-2 bg-sky-500/20 hover:bg-sky-500/30 text-sky-400 border border-sky-500/30 text-[14px] font-bold rounded-xl"
                  >
                    ✏️ 4문항 답변 수정/입력
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      setName('');
                      setSelectedTeamId(null);
                    }}
                    className="px-3 py-2 bg-black/40 text-slate-400 hover:text-white text-[13.5px] rounded-xl border border-white/10"
                  >
                    다른 이름으로 입장
                  </button>
                </div>
              </div>
            </div>
          )}

          <div>
            <p className="text-[19px] font-bold text-white">참가자 정보 입력</p>
            <p className="text-[14px] text-slate-400">이름과 배정받은 조를 선택하세요</p>
          </div>

          <div>
            <label className="text-[14px] text-slate-400 mb-1 block font-medium">이름 *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="이름 입력 (예: 홍길동)"
              className="w-full bg-[#1A2235] border border-white/10 rounded-xl px-3.5 py-3
                text-white text-[16px] placeholder-slate-600
                focus:outline-none focus:border-red-500 transition-colors"
            />
          </div>

          {/* 조 선택 */}
          <div className="pt-1">
            <label className="text-[14px] text-slate-400 mb-1.5 block font-medium">
              행사 조 선택 * <span className="text-[13.5px] text-slate-500 font-normal">(사전 배정된 조)</span>
            </label>

            {IS_PILOT_MODE ? (
              <div>
                <p className="text-[13.5px] font-bold text-red-400 mb-1.5">
                  연강원 트레킹 코스 (1~5조)
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {TEAMS.map(renderTeamCard)}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {/* 현대미술관 코스 조 */}
                <div>
                  <p className="text-[13.5px] font-bold text-sky-400 mb-1.5">
                    현대미술관 코스 · 도보 3km (1~2조)
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {lakeTeams.map(renderTeamCard)}
                  </div>
                </div>

                {/* 동물원 둘레길 코스 조 */}
                <div>
                  <p className="text-[13.5px] font-bold text-red-400 mb-1.5">
                    동물원 둘레길 코스 · 도보 7km (3~8조)
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {forestTeams.map(renderTeamCard)}
                  </div>
                </div>
              </div>
            )}
          </div>

          {error && (
            <p className="text-[14px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              ⚠️ {error}
            </p>
          )}

          <div className="pt-2 mt-auto">
            <button
              onClick={handleInfoNext}
              className="w-full py-3.5 rounded-xl font-bold text-[17px] text-white
                bg-red-500 active:scale-98 transition-all shadow-md shadow-red-500/20"
            >
              다음 → 나의 정보 4문항 입력
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: 나의 정보 입력 (4개 질문 - 실시간 자동 저장 적용) */}
      {step === 'myinfo' && (
        <div className="px-5 pt-4 flex flex-col gap-4 flex-1 overflow-y-auto pb-8">
          <div>
            <div className="flex items-center justify-between">
              <p className="text-[19px] font-bold text-white">나의 정보 입력</p>
              <span className="text-[13px] bg-green-500/15 text-green-400 px-2.5 py-0.5 rounded-full border border-green-500/30 font-bold">
                {lastSavedTime ? `${lastSavedTime} 저장됨` : '자동 저장'}
              </span>
            </div>
            <p className="text-[14px] text-slate-300 mt-1">
              동료들과 나눌 관심사와 이야기를 간단히 작성해 주세요.
            </p>
          </div>

          {/* 4개 질문 카드 리스트 */}
          <div className="space-y-4">
            {MY_INFO_QUESTIONS.map((q, idx) => {
              const val = answers[q.id] || '';
              return (
                <div key={q.id} className="bg-[#1A2235] border border-white/10 rounded-2xl p-4 space-y-2.5 shadow-md">
                  {/* 질문 헤더 */}
                  <div className="flex justify-between items-start gap-2">
                    <span className="w-5 h-5 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 flex items-center justify-center text-[13.5px] font-bold flex-shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <label className="flex-1 text-[15.5px] font-bold text-white leading-snug">
                      {q.title}
                    </label>
                    <span className={`text-[12.5px] flex-shrink-0 ${val.length > 90 ? 'text-amber-400 font-bold' : 'text-slate-500'}`}>
                      {val.length}/100자
                    </span>
                  </div>

                  {/* 예시 텍스트: 별도 줄바꿈 박스로 100% 온전하게 노출 */}
                  <div className="bg-black/30 border border-white/5 rounded-xl p-2.5 text-[14px] text-slate-300 leading-relaxed">
                    💡 <strong className="text-amber-300">예시:</strong> {q.placeholder.replace(/^예시?:\s*/, '')}
                  </div>

                  {/* 실제 입력창 */}
                  <input
                    type="text"
                    maxLength={100}
                    value={val}
                    onChange={e => handleAnswerChange(q.id, e.target.value)}
                    placeholder="나의 답변 입력..."
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-3
                      text-white text-[15.5px] placeholder-slate-600 focus:outline-none focus:border-red-500 transition-colors"
                  />
                </div>
              );
            })}
          </div>

          {/* 개인정보 유의 안내 문구 */}
          <div className="bg-[#121826] border border-white/5 rounded-xl p-2.5 text-[13.5px] text-slate-400">
            🔒 입력하신 내용은 팀빌딩 행사 활동 운영을 위해서만 안전하게 활용됩니다.
          </div>

          {error && (
            <p className="text-[14px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              ⚠️ {error}
            </p>
          )}

          <div className="flex gap-2.5 pt-2 mt-auto">
            <button
              onClick={() => setStep('info')}
              disabled={isSubmitting}
              className="w-16 py-3.5 rounded-xl font-bold text-slate-400
                bg-[#1A2235] border border-white/10 active:scale-98 transition-all"
            >
              ←
            </button>
            <button
              onClick={handleFinalEnter}
              disabled={isSubmitting}
              className="flex-1 py-3.5 rounded-xl font-bold text-[17px] text-white flex items-center justify-center gap-2
                bg-red-500 hover:bg-red-600 active:scale-98 transition-all shadow-md shadow-red-500/20"
            >
              {isSubmitting ? '저장 중...' : '입장 완료'}
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default TeamSelect;
