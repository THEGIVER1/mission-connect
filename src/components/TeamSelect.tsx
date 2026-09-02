import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import {
  WORKSHOP_COMPANIES,
  WORKSHOP_TEAMS,
  ACTIVE_VENUE,
  WorkshopTeamConfig,
} from '../config/workshopConfig';

const COMPANIES = WORKSHOP_COMPANIES;
const TEAMS = WORKSHOP_TEAMS;

type Step = 'info' | 'team';

const TeamSelect: React.FC = () => {
  const navigate = useNavigate();
  const { selectTeam } = useAppStore();

  const [step, setStep] = useState<Step>('info');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const selectedTeam = TEAMS.find(t => t.id === selectedTeamId) || null;

  const handleInfoNext = () => {
    if (!name.trim()) { setError('이름을 입력해주세요'); return; }
    if (!company) { setError('소속을 선택해주세요'); return; }
    setError('');
    setStep('team');
  };

  const handleEnter = async () => {
    if (!selectedTeam) return;
    const participantId = `${name.trim()}_${company}`.replace(/\s/g, '_');
    const dbUrl = import.meta.env.VITE_FIREBASE_DATABASE_URL || 'https://doosan-teambuilding-default-rtdb.firebaseio.com';

    try {
      // 기존 참가자 데이터 확인 (재입장 시 점수 보존)
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
        totalMissions: 5,
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
        totalMissions: 5,
        lastActivity: new Date(),
        status: 'active',
      }, name.trim(), company, selectedTeam.assignedCourse);
    }

    navigate('/');
  };

  // 1~3조 (산림욕장 트레킹) & 4~6조 (호수둘레길 산책) 그룹화
  const forestTeams = TEAMS.filter(t => t.assignedCourse === 'forest');
  const lakeTeams = TEAMS.filter(t => t.assignedCourse === 'lake');

  const renderTeamCard = (team: WorkshopTeamConfig) => {
    const isSel = selectedTeamId === team.id;
    return (
      <button
        key={team.id}
        onClick={() => setSelectedTeamId(team.id)}
        className="w-full rounded-2xl border-2 p-3.5 text-left transition-all active:scale-98 relative"
        style={isSel
          ? { borderColor: team.color, background: `${team.color}15`, boxShadow: `0 4px 14px ${team.color}25` }
          : { borderColor: 'rgba(255,255,255,0.08)', background: '#1A2235' }}>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl border-2"
               style={{
                 background: isSel ? `${team.color}25` : 'rgba(255,255,255,0.05)',
                 borderColor: isSel ? team.color : 'rgba(255,255,255,0.1)',
               }}>
            {team.emoji}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[16px] font-bold text-white">{team.name}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                    style={{
                      background: team.assignedCourse === 'forest' ? 'rgba(16,185,129,0.15)' : 'rgba(56,189,248,0.15)',
                      color: team.assignedCourse === 'forest' ? '#34D399' : '#38BDF8',
                    }}>
                {team.courseDistance}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">{team.courseName}</p>
          </div>
          <div className="w-6 h-6 rounded-full border-2 flex items-center justify-center"
               style={{
                 borderColor: isSel ? team.color : 'rgba(255,255,255,0.2)',
                 background: isSel ? team.color : 'transparent',
               }}>
            {isSel && <span className="text-white text-xs font-bold">✓</span>}
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="max-w-[390px] mx-auto bg-[#0D1117] min-h-screen flex flex-col">

      {/* 헤더 */}
      <div className="relative bg-[#13192A] px-5 pt-10 pb-7 text-center">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-red-600 to-orange-500" />
        <p style={{ color: '#005EB8', fontSize: '42px', fontWeight: '900', letterSpacing: '4px', fontStyle: 'italic', marginBottom: '8px' }}>DOOSAN</p>
        <p style={{ color: 'white', fontSize: '13px', letterSpacing: '6px', marginBottom: '8px' }}>TREKKING</p>
        <div className="flex items-center justify-center gap-2">
          <span className="text-[11px] bg-[#1A2235] border border-white/8 rounded-full px-3 py-1 text-slate-400">
            🌲 {ACTIVE_VENUE.venueName}
          </span>
          <span className="text-[11px] bg-[#1A2235] border border-white/8 rounded-full px-3 py-1 text-slate-400">
            🚊 코끼리열차 매표소 출발
          </span>
        </div>
      </div>

      {/* 스텝 인디케이터 (2단계) */}
      <div className="flex items-center justify-center gap-3 pt-5 pb-2">
        <div className="flex items-center gap-1.5">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold
            ${step === 'info' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}>
            {step === 'info' ? '1' : '✓'}
          </div>
          <span className={`text-[12px] ${step === 'info' ? 'text-white' : 'text-slate-400'}`}>내 정보</span>
        </div>
        <div className="w-8 h-0.5 bg-slate-700" />
        <div className="flex items-center gap-1.5">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold
            ${step === 'team' ? 'bg-red-500 text-white' : 'bg-slate-700 text-slate-500'}`}>
            2
          </div>
          <span className={`text-[12px] ${step === 'team' ? 'text-white' : 'text-slate-500'}`}>팀 선택</span>
        </div>
      </div>

      {/* STEP 1: 내 정보 입력 */}
      {step === 'info' && (
        <div className="px-5 pt-5 flex flex-col gap-4 flex-1">
          <div>
            <p className="text-[18px] font-bold text-white mb-1">반갑습니다! 👋</p>
            <p className="text-[13px] text-slate-400">이름과 소속을 입력하고 조를 선택해 주세요</p>
          </div>

          <div>
            <label className="text-[12px] text-slate-400 mb-1.5 block">이름</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="홍길동"
              className="w-full bg-[#1A2235] border border-white/10 rounded-xl px-4 py-3.5
                text-white text-[15px] placeholder-slate-600
                focus:outline-none focus:border-red-500 transition-colors"
            />
          </div>

          <div>
            <label className="text-[12px] text-slate-400 mb-1.5 block">소속</label>
            <select
              value={company}
              onChange={e => setCompany(e.target.value)}
              className="w-full bg-[#1A2235] border border-white/10 rounded-xl px-4 py-3.5
                text-[15px] focus:outline-none focus:border-red-500 transition-colors appearance-none"
              style={{ color: company ? 'white' : '#475569' }}>
              <option value="" disabled>소속을 선택하세요</option>
              {COMPANIES.map(c => (
                <option key={c} value={c} style={{ color: 'white', background: '#1A2235' }}>{c}</option>
              ))}
            </select>
          </div>

          {error && (
            <p className="text-[12px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              ⚠️ {error}
            </p>
          )}

          <div className="pt-3 pb-6 mt-auto">
            <button
              onClick={handleInfoNext}
              className="w-full py-4 rounded-2xl font-bold text-[16px] text-white
                bg-red-500 active:scale-98 transition-all shadow-lg shadow-red-500/20">
              다음 → 팀 선택
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: 팀 선택 (1~6조 한눈에 표시) */}
      {step === 'team' && (
        <div className="px-5 pt-4 flex flex-col gap-3 flex-1 overflow-y-auto pb-6">
          <div>
            <div className="flex items-center justify-between">
              <p className="text-[18px] font-bold text-white">배정받은 조를 선택하세요</p>
              <span className="text-[11px] text-slate-400">총 6개 조</span>
            </div>
            <p className="text-[12px] text-slate-400 mt-0.5">
              <span className="text-white font-semibold">{name}</span>님 ({company}) · 사전 배정된 조를 선택하세요
            </p>
          </div>

          {/* 그룹 1: 1~3조 (산림욕장 트레킹길) */}
          <div className="space-y-2 mt-1">
            <div className="flex items-center justify-between px-1">
              <span className="text-[12px] font-bold text-emerald-400 flex items-center gap-1">
                🌲 산림욕장 트레킹 코스 (4.5km)
              </span>
              <span className="text-[10px] text-slate-500">1조 · 2조 · 3조</span>
            </div>
            <div className="space-y-2">
              {forestTeams.map(renderTeamCard)}
            </div>
          </div>

          {/* 그룹 2: 4~6조 (호수둘레길 산책) */}
          <div className="space-y-2 mt-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-[12px] font-bold text-sky-400 flex items-center gap-1">
                🌊 호수둘레길 산책 코스 (2.8km)
              </span>
              <span className="text-[10px] text-slate-500">4조 · 5조 · 6조</span>
            </div>
            <div className="space-y-2">
              {lakeTeams.map(renderTeamCard)}
            </div>
          </div>

          {/* 하단 고정 버튼 영역 */}
          <div className="flex gap-3 pt-3 mt-2">
            <button
              onClick={() => setStep('info')}
              className="w-16 py-4 rounded-2xl font-bold text-slate-400
                bg-[#1A2235] border border-white/10 active:scale-98 transition-all">
              ←
            </button>
            <button
              onClick={handleEnter}
              disabled={!selectedTeam}
              className="flex-1 py-4 rounded-2xl font-bold text-[16px] flex items-center justify-center gap-2
                transition-all active:scale-98 shadow-lg"
              style={selectedTeam
                ? { background: selectedTeam.color, color: 'white', boxShadow: '0 8px 20px -4px rgba(0,0,0,0.5)' }
                : { background: '#1A2235', color: '#475569', border: '1px solid rgba(255,255,255,0.08)' }}>
              {selectedTeam ? (
                <>{selectedTeam.emoji} {selectedTeam.name} 입장하기 ({selectedTeam.assignedCourse === 'forest' ? '산림욕장' : '호수둘레길'})</>
              ) : (
                <>배정받은 팀을 선택해주세요</>
              )}
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default TeamSelect;
