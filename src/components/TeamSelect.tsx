import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { MOCK_MISSIONS } from '../lib/mockData';

const COMPANIES = [
  '두산에너빌리티',
  '두산밥캣',
  '두산퓨얼셀',
  '두산로보틱스',
  '㈜두산',
  '오리콤',
  '두산연강원',
  '기타',
];

const TEAMS = [
  { id: 'alpha', name: '알파팀', shortCode: 'A', color: '#E31837', emoji: '🔴' },
  { id: 'beta',  name: '베타팀', shortCode: 'B', color: '#2980B9', emoji: '🔵' },
  { id: 'gamma', name: '감마팀', shortCode: 'G', color: '#27AE60', emoji: '🟢' },
  { id: 'delta', name: '델타팀', shortCode: 'D', color: '#F39C12', emoji: '🟡' },
  { id: 'omega', name: '오메가팀', shortCode: 'O', color: '#8E44AD', emoji: '🟣' },
];

type Step = 'info' | 'team';

const TeamSelect: React.FC = () => {
  const navigate = useNavigate();
  const { selectTeam } = useAppStore();

  const [step, setStep] = useState<Step>('info');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [teamCode, setTeamCode] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [error, setError] = useState('');

  const handleNextStep = () => {
    if (!name.trim()) { setError('이름을 입력해주세요'); return; }
    if (!company) { setError('자회사를 선택해주세요'); return; }
    if (!teamCode.trim()) { setError('팀 코드를 입력해주세요'); return; }
    setError('');
    setStep('team');
  };

  const handleEnter = () => {
    if (!selectedTeam) return;
    const team = TEAMS.find(t => t.id === selectedTeam)!;

    selectTeam({
      id: team.id,
      name: team.name,
      shortCode: team.shortCode,
      color: team.color,
      memberCount: 1,
      score: 0,
      rank: TEAMS.indexOf(team) + 1,
      missionsCompleted: 0,
      totalMissions: MOCK_MISSIONS.length,
      lastActivity: new Date(),
      status: 'active',
    });

    navigate('/');
  };

  return (
    <div className="max-w-[390px] mx-auto bg-[#0D1117] min-h-screen flex flex-col">

      {/* 헤더 */}
      <div className="relative bg-[#13192A] px-5 pt-12 pb-8 text-center">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-red-600 to-orange-500" />
        <img 
          src="/src/assets/Doosan_Logo.jpg" 
          alt="DOOSAN" 
          className="h-8 mb-3 mx-auto"
          style={{ filter: 'brightness(0) invert(1)' }}
        />
        <h1 className="font-bebas text-4xl tracking-widest text-white leading-none mb-1">
          MISSION<span className="text-red-500">.</span>CONNECT
        </h1>
        <p className="text-[11px] text-slate-500 tracking-[2px] uppercase mb-4">
          Team Building Platform
        </p>
        <div className="flex items-center justify-center gap-2">
          <span className="text-[11px] bg-[#1A2235] border border-white/8 rounded-full px-3 py-1 text-slate-400">
            🏔️ 두산 트레킹
          </span>
          <span className="text-[11px] bg-[#1A2235] border border-white/8 rounded-full px-3 py-1 text-slate-400">
            👥 HRD 담당자
          </span>
        </div>
      </div>

      {/* 스텝 인디케이터 */}
      <div className="flex items-center justify-center gap-3 pt-6 pb-2">
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
        <div className="px-5 pt-6 flex flex-col gap-4 flex-1">
          <div>
            <p className="text-[18px] font-bold text-white mb-1">반갑습니다! 👋</p>
            <p className="text-[13px] text-slate-500">정보를 입력하고 오늘의 연결을 시작하세요</p>
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
            <label className="text-[12px] text-slate-400 mb-1.5 block">자회사</label>
            <select
              value={company}
              onChange={e => setCompany(e.target.value)}
              className="w-full bg-[#1A2235] border border-white/10 rounded-xl px-4 py-3.5
                text-[15px] focus:outline-none focus:border-red-500 transition-colors appearance-none"
              style={{ color: company ? 'white' : '#475569' }}>
              <option value="" disabled>자회사를 선택하세요</option>
              {COMPANIES.map(c => (
                <option key={c} value={c} style={{ color: 'white', background: '#1A2235' }}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[12px] text-slate-400 mb-1.5 block">팀 코드</label>
            <input
              type="text"
              value={teamCode}
              onChange={e => setTeamCode(e.target.value.toUpperCase())}
              placeholder="운영진에게 받은 코드 입력"
              maxLength={10}
              className="w-full bg-[#1A2235] border border-white/10 rounded-xl px-4 py-3.5
                text-white text-[15px] placeholder-slate-600 tracking-widest
                focus:outline-none focus:border-red-500 transition-colors"
            />
            <p className="text-[11px] text-slate-600 mt-1.5">* 운영진에게 배부된 팀 코드를 입력하세요</p>
          </div>

          {error && (
            <p className="text-[12px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              ⚠️ {error}
            </p>
          )}

          <div className="pt-2 pb-6">
            <button
              onClick={handleNextStep}
              className="w-full py-4 rounded-2xl font-bold text-[16px] text-white
                bg-red-500 active:scale-98 transition-all">
              다음 → 팀 선택
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: 팀 선택 */}
      {step === 'team' && (
        <div className="px-5 pt-6 flex flex-col gap-3 flex-1">
          <div className="mb-2">
            <p className="text-[18px] font-bold text-white mb-1">팀을 선택하세요</p>
            <p className="text-[13px] text-slate-500">
              <span className="text-red-400 font-medium">{name}</span>님 ·{' '}
              <span className="text-slate-400">{company}</span>
            </p>
          </div>

          {TEAMS.map(team => {
            const isSel = selectedTeam === team.id;
            return (
              <button
                key={team.id}
                onClick={() => setSelectedTeam(team.id)}
                className="w-full rounded-2xl border-2 p-4 text-left transition-all active:scale-98"
                style={isSel
                  ? { borderColor: team.color, background: `${team.color}18` }
                  : { borderColor: 'rgba(255,255,255,0.1)', background: '#1A2235' }}>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl border-2"
                       style={{
                         background: isSel ? `${team.color}25` : 'rgba(255,255,255,0.05)',
                         borderColor: isSel ? team.color : 'rgba(255,255,255,0.1)',
                       }}>
                    {team.emoji}
                  </div>
                  <div className="flex-1">
                    <span className="text-[17px] font-bold text-white">{team.name}</span>
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
          })}

          <div className="flex gap-3 pt-2 pb-6">
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
                transition-all active:scale-98"
              style={selectedTeam
                ? { background: TEAMS.find(t => t.id === selectedTeam)?.color, color: 'white' }
                : { background: '#1A2235', color: '#475569', border: '1px solid rgba(255,255,255,0.08)' }}>
              {selectedTeam ? (
                <>{TEAMS.find(t => t.id === selectedTeam)?.emoji} 입장하기!</>
              ) : (
                <>팀을 선택해주세요</>
              )}
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default TeamSelect;