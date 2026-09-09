import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import {
  WORKSHOP_COMPANIES,
  WORKSHOP_TEAMS,
  MY_INFO_QUESTIONS,
  ACTIVE_VENUE,
  WorkshopTeamConfig,
} from '../config/workshopConfig';

const COMPANIES = WORKSHOP_COMPANIES;
const TEAMS = WORKSHOP_TEAMS;

type Step = 'info' | 'myinfo';

const TeamSelect: React.FC = () => {
  const navigate = useNavigate();
  const { selectTeam, myTeam, participantName, participantCompany, logout } = useAppStore();

  const [step, setStep] = useState<Step>('info');
  const [name, setName] = useState(participantName || '');
  const [company, setCompany] = useState(participantCompany || '');
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(myTeam?.id || null);

  // 「나의 정보 7개 질문」 답변 상태 관리
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedTeam = TEAMS.find(t => t.id === selectedTeamId) || null;

  const handleAnswerChange = (qId: string, value: string) => {
    if (value.length > 100) return;
    setAnswers(prev => ({ ...prev, [qId]: value }));
  };

  // Step 1 -> Step 2 검증
  const handleInfoNext = () => {
    if (!name.trim()) { setError('이름을 입력해주세요.'); return; }
    if (!company) { setError('소속을 선택해주세요.'); return; }
    if (!selectedTeamId) { setError('배정받은 행사 조를 선택해주세요.'); return; }
    setError('');
    setStep('myinfo');
  };

  // Step 2 완료 및 최종 입장
  const handleFinalEnter = async () => {
    // 최소 4개 이상 또는 전체 입력 확인
    const answeredCount = MY_INFO_QUESTIONS.filter(q => (answers[q.id] || '').trim().length > 0).length;
    if (answeredCount < 3) {
      setError('동료들과 즐거운 대화를 위해 최소 3개 이상의 질문에 답해주세요!');
      return;
    }

    if (!selectedTeam) return;
    setIsSubmitting(true);
    setError('');

    const participantId = `${name.trim()}_${company}`.replace(/\s/g, '_');
    const dbUrl = import.meta.env.VITE_FIREBASE_DATABASE_URL || 'https://doosan-teambuilding-default-rtdb.firebaseio.com';

    try {
      const checkRes = await fetch(`${dbUrl}/sessions/trekking2026/participants/${encodeURIComponent(participantId)}.json`);
      const existing = checkRes.ok ? await checkRes.json() : null;
      const initialScore = Number(existing?.score ?? 0);
      const initialCompleted = Number(existing?.missionsCompleted ?? 0);

      await fetch(`${dbUrl}/sessions/trekking2026/participants/${encodeURIComponent(participantId)}.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          company,
          teamId: selectedTeam.id,
          teamName: selectedTeam.name,
          course: selectedTeam.assignedCourse,
          myInfo: answers,
          // 하위 호환
          truth1: answers['q1_passion'] || '',
          truth2: answers['q5_unexpectedFact'] || answers['q4_bucketList'] || '',
          lie: answers['q3_dreamJob'] || '',
          score: initialScore,
          missionsCompleted: initialCompleted,
          joinedAt: existing?.joinedAt ?? new Date().toISOString(),
          status: 'active',
        }),
      });

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
      }, name.trim(), company, selectedTeam.assignedCourse);
    } catch (e) {
      console.warn('입장 저장 실패:', e);
      selectTeam({
        id: selectedTeam.id,
        name: selectedTeam.name,
        shortCode: selectedTeam.shortCode,
        color: selectedTeam.color,
        memberCount: 1,
        score: 0,
        rank: TEAMS.indexOf(selectedTeam) + 1,
        missionsCompleted: 0,
        totalMissions: 2,
        lastActivity: new Date(),
        status: 'active',
      }, name.trim(), company, selectedTeam.assignedCourse);
    } finally {
      setIsSubmitting(false);
      navigate('/');
    }
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
          <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg border"
               style={{
                 background: isSel ? `${team.color}25` : 'rgba(255,255,255,0.05)',
                 borderColor: isSel ? team.color : 'rgba(255,255,255,0.1)',
               }}>
            {team.emoji}
          </div>
          <div className="flex-1">
            <span className="text-[15px] font-bold text-white">{team.name}</span>
            <span className="text-[10px] ml-2 text-slate-400">({team.courseDistance})</span>
          </div>
          <div className="w-5 h-5 rounded-full border flex items-center justify-center"
               style={{
                 borderColor: isSel ? team.color : 'rgba(255,255,255,0.2)',
                 background: isSel ? team.color : 'transparent',
               }}>
            {isSel && <span className="text-white text-[10px] font-bold">✓</span>}
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="max-w-[390px] mx-auto bg-[#0D1117] min-h-screen flex flex-col text-slate-100">

      {/* 상단 브랜딩 헤더 */}
      <div className="relative bg-[#13192A] px-5 pt-8 pb-5 text-center">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-red-600 to-orange-500" />
        <p style={{ color: '#005EB8', fontSize: '32px', fontWeight: '900', letterSpacing: '3px', fontStyle: 'italic', marginBottom: '4px' }}>
          DOOSAN
        </p>
        <p className="text-[12px] text-white tracking-[4px] font-bold uppercase mb-2">
          2026 CHRO TREKKING
        </p>
        <div className="flex items-center justify-center gap-1.5">
          <span className="text-[10px] bg-[#1A2235] border border-white/8 rounded-full px-2.5 py-0.5 text-slate-400">
            🌲 서울대공원 · 국립현대미술관
          </span>
          <span className="text-[10px] bg-[#1A2235] border border-white/8 rounded-full px-2.5 py-0.5 text-slate-400">
            👥 CHRO 부문 워크샵
          </span>
        </div>
      </div>

      {/* 스텝 인디케이터 (2단계) */}
      <div className="flex items-center justify-center gap-3 pt-4 pb-2 border-b border-white/5 bg-[#101626]">
        <div className="flex items-center gap-1.5">
          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold
            ${step === 'info' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}>
            {step === 'info' ? '1' : '✓'}
          </div>
          <span className={`text-[11px] ${step === 'info' ? 'text-white font-bold' : 'text-slate-400'}`}>기본 정보</span>
        </div>
        <div className="w-8 h-0.5 bg-slate-700" />
        <div className="flex items-center gap-1.5">
          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold
            ${step === 'myinfo' ? 'bg-red-500 text-white' : 'bg-slate-700 text-slate-500'}`}>
            2
          </div>
          <span className={`text-[11px] ${step === 'myinfo' ? 'text-white font-bold' : 'text-slate-500'}`}>나의 정보 입력 (7문항)</span>
        </div>
      </div>

      {/* STEP 1: 참가자 기본 정보 입력 & 조 선택 */}
      {step === 'info' && (
        <div className="px-5 pt-4 flex flex-col gap-3.5 flex-1 overflow-y-auto pb-6">
          {/* 이미 로그인된 세션이 있는 경우 바로가기 카드 */}
          {myTeam && participantName && (
            <div className="bg-[#1A2235] border border-red-500/30 rounded-2xl p-3.5 text-center space-y-2 shadow-lg">
              <span className="text-[10px] bg-green-500/15 text-green-400 border border-green-500/30 px-2 py-0.5 rounded-full font-bold">
                ✓ 자동 로그인 세션 유지됨
              </span>
              <p className="text-[13px] text-white">
                <strong className="text-amber-400">{participantName}</strong>님 ({participantCompany} · {myTeam.name})
              </p>
              <div className="flex gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white font-bold text-[12px] rounded-xl active:scale-98 shadow"
                >
                  대시보드로 바로 이동 →
                </button>
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    setName('');
                    setCompany('');
                    setSelectedTeamId(null);
                  }}
                  className="px-3 py-2 bg-black/30 hover:bg-black/50 text-slate-400 hover:text-white text-[11px] rounded-xl border border-white/10"
                >
                  새로 입력
                </button>
              </div>
            </div>
          )}

          <div>
            <p className="text-[17px] font-bold text-white">참가자 정보 입력 👋</p>
            <p className="text-[12px] text-slate-400">이름, 소속, 배정받은 행사 조를 선택하세요</p>
          </div>

          <div>
            <label className="text-[12px] text-slate-400 mb-1 block font-medium">이름 *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="이름 입력 (예: 홍길동)"
              className="w-full bg-[#1A2235] border border-white/10 rounded-xl px-3.5 py-3
                text-white text-[14px] placeholder-slate-600
                focus:outline-none focus:border-red-500 transition-colors"
            />
          </div>

          <div>
            <label className="text-[12px] text-slate-400 mb-1 block font-medium">소속 *</label>
            <select
              value={company}
              onChange={e => setCompany(e.target.value)}
              className="w-full bg-[#1A2235] border border-white/10 rounded-xl px-3.5 py-3
                text-[14px] focus:outline-none focus:border-red-500 transition-colors appearance-none"
              style={{ color: company ? 'white' : '#475569' }}>
              <option value="" disabled>소속을 선택하세요</option>
              {COMPANIES.map(c => (
                <option key={c} value={c} style={{ color: 'white', background: '#1A2235' }}>{c}</option>
              ))}
            </select>
          </div>

          {/* 조 선택 */}
          <div className="pt-1">
            <label className="text-[12px] text-slate-400 mb-1.5 block font-medium">
              행사 조 선택 * <span className="text-[11px] text-slate-500 font-normal">(사전 배정된 조)</span>
            </label>

            <div className="space-y-3">
              {/* 산림욕장 조 */}
              <div>
                <p className="text-[11px] font-bold text-emerald-400 mb-1.5 flex items-center gap-1">
                  🌲 산림욕장 트레킹 (1~3조)
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {forestTeams.map(renderTeamCard)}
                </div>
              </div>

              {/* 호수둘레길 조 */}
              <div>
                <p className="text-[11px] font-bold text-sky-400 mb-1.5 flex items-center gap-1">
                  🌊 호수둘레길 산책 (4~6조)
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {lakeTeams.map(renderTeamCard)}
                </div>
              </div>
            </div>
          </div>

          {error && (
            <p className="text-[12px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              ⚠️ {error}
            </p>
          )}

          <div className="pt-2 mt-auto">
            <button
              onClick={handleInfoNext}
              className="w-full py-3.5 rounded-xl font-bold text-[15px] text-white
                bg-red-500 active:scale-98 transition-all shadow-md shadow-red-500/20"
            >
              다음 → 나의 정보 7문항 입력
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: 나의 정보 입력 (7개 질문) */}
      {step === 'myinfo' && (
        <div className="px-5 pt-4 flex flex-col gap-4 flex-1 overflow-y-auto pb-8">
          <div>
            <div className="flex items-center justify-between">
              <p className="text-[17px] font-bold text-white">나의 정보 입력 💡</p>
              <span className="text-[11px] bg-red-500/15 text-red-400 px-2.5 py-0.5 rounded-full border border-red-500/30 font-bold">
                저녁 퀴즈 & 대화용
              </span>
            </div>
            <p className="text-[12px] text-slate-300 mt-1 leading-relaxed bg-[#1A2235] p-3 rounded-xl border border-white/5">
              동료들과 나눌 <strong>나만의 관심사, 경험, 커리어 이야기</strong>를 편하게 작성해 주세요. (저녁 퀴즈쇼 및 네트워킹의 기초자료로 활용됩니다)
            </p>
          </div>

          {/* 7개 질문 카드 리스트 */}
          <div className="space-y-3.5">
            {MY_INFO_QUESTIONS.map((q, idx) => {
              const val = answers[q.id] || '';
              return (
                <div key={q.id} className="bg-[#1A2235] border border-white/10 rounded-2xl p-3.5 space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <span className="w-5 h-5 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 flex items-center justify-center text-[11px] font-bold flex-shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <label className="flex-1 text-[13px] font-bold text-white leading-snug">
                      {q.title}
                    </label>
                    <span className={`text-[10px] flex-shrink-0 ${val.length > 90 ? 'text-amber-400 font-bold' : 'text-slate-500'}`}>
                      {val.length}/100자
                    </span>
                  </div>

                  <input
                    type="text"
                    maxLength={100}
                    value={val}
                    onChange={e => handleAnswerChange(q.id, e.target.value)}
                    placeholder={q.placeholder}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5
                      text-white text-[13px] placeholder-slate-600 focus:outline-none focus:border-red-500 transition-colors"
                  />
                </div>
              );
            })}
          </div>

          {/* 개인정보 유의 안내 문구 */}
          <div className="bg-[#121826] border border-white/5 rounded-xl p-2.5 text-[11px] text-slate-400">
            🔒 입력하신 내용은 <strong>2026 CHRO Trekking</strong> 팀빌딩 활동 및 저녁 퀴즈 대항전 운영을 위해서만 안전하게 활용됩니다.
          </div>

          {error && (
            <p className="text-[12px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
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
              className="flex-1 py-3.5 rounded-xl font-bold text-[15px] text-white flex items-center justify-center gap-2
                bg-red-500 hover:bg-red-600 active:scale-98 transition-all shadow-md shadow-red-500/20"
            >
              {isSubmitting ? (
                <>입장 처리 중...</>
              ) : (
                <>입장 완료 및 트레킹 시작 🚀</>
              )}
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default TeamSelect;
