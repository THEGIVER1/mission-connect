import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import {
  WORKSHOP_COMPANIES,
  WORKSHOP_TEAMS,
  WORKSHOP_COURSES,
  ACTIVE_VENUE,
  DEFAULT_COURSE,
  CourseKey,
} from '../config/workshopConfig';

const COMPANIES = WORKSHOP_COMPANIES;
const TEAMS = WORKSHOP_TEAMS;

type Step = 'info' | 'course' | 'team';

const TeamSelect: React.FC = () => {
  const navigate = useNavigate();
  const { selectTeam } = useAppStore();

  const [step, setStep] = useState<Step>('info');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<CourseKey>(DEFAULT_COURSE);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [error, setError] = useState('');

  const handleInfoNext = () => {
    if (!name.trim()) { setError('이름을 입력해주세요'); return; }
    if (!company) { setError('소속을 선택해주세요'); return; }
    setError('');
    setStep('course');
  };

  const handleCourseNext = () => {
    setError('');
    setStep('team');
  };

  const handleEnter = async () => {
    if (!selectedTeam) return;
    const team = TEAMS.find(t => t.id === selectedTeam)!;
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
          teamId: team.id,
          teamName: team.name,
          course: selectedCourse,
          score: initialScore,
          missionsCompleted: initialCompleted,
          joinedAt: existing?.joinedAt ?? new Date().toISOString(),
          status: 'active',
        }),
      });

      selectTeam({
        id: team.id,
        name: team.name,
        shortCode: team.shortCode,
        color: team.color,
        memberCount: 1,
        score: initialScore,
        rank: TEAMS.indexOf(team) + 1,
        missionsCompleted: initialCompleted,
        totalMissions: 5,
        lastActivity: new Date(),
        status: 'active',
      }, name.trim(), company, selectedCourse);
    } catch (e) {
      console.warn('입장 저장 실패:', e);
      selectTeam({
        id: team.id,
        name: team.name,
        shortCode: team.shortCode,
        color: team.color,
        memberCount: 1,
        score: 0,
        rank: TEAMS.indexOf(team) + 1,
        missionsCompleted: 0,
        totalMissions: 5,
        lastActivity: new Date(),
        status: 'active',
      }, name.trim(), company, selectedCourse);
    }

    navigate('/');
  };

  const courseObj = ACTIVE_VENUE.courses[selectedCourse];

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

      {/* 스텝 인디케이터 (3단계) */}
      <div className="flex items-center justify-center gap-2 pt-5 pb-2">
        <div className="flex items-center gap-1.5">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold
            ${step === 'info' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}>
            {step === 'info' ? '1' : '✓'}
          </div>
          <span className={`text-[11px] ${step === 'info' ? 'text-white' : 'text-slate-400'}`}>내 정보</span>
        </div>
        <div className="w-5 h-0.5 bg-slate-700" />
        <div className="flex items-center gap-1.5">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold
            ${step === 'course' ? 'bg-red-500 text-white' : step === 'team' ? 'bg-green-500 text-white' : 'bg-slate-700 text-slate-500'}`}>
            {step === 'team' ? '✓' : '2'}
          </div>
          <span className={`text-[11px] ${step === 'course' ? 'text-white' : 'text-slate-500'}`}>코스 선택</span>
        </div>
        <div className="w-5 h-0.5 bg-slate-700" />
        <div className="flex items-center gap-1.5">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold
            ${step === 'team' ? 'bg-red-500 text-white' : 'bg-slate-700 text-slate-500'}`}>
            3
          </div>
          <span className={`text-[11px] ${step === 'team' ? 'text-white' : 'text-slate-500'}`}>팀 선택</span>
        </div>
      </div>

      {/* STEP 1: 내 정보 입력 */}
      {step === 'info' && (
        <div className="px-5 pt-5 flex flex-col gap-4 flex-1">
          <div>
            <p className="text-[18px] font-bold text-white mb-1">반갑습니다! 👋</p>
            <p className="text-[13px] text-slate-400">참가자 정보를 입력하고 트레킹을 시작하세요</p>
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
              다음 → 코스 선택
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: 코스 선택 */}
      {step === 'course' && (
        <div className="px-5 pt-5 flex flex-col gap-4 flex-1">
          <div>
            <p className="text-[18px] font-bold text-white mb-1">트레킹 코스를 선택하세요 👟</p>
            <p className="text-[12px] text-slate-400 leading-relaxed">
              코스가 달라도 모든 팀과 <strong className="text-amber-400">공통 미션(P1~P5)</strong>을 함께 수행합니다!
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {WORKSHOP_COURSES.map(c => {
              const isSel = selectedCourse === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedCourse(c.id)}
                  className={`w-full rounded-2xl border-2 p-4 text-left transition-all active:scale-98 relative ${
                    isSel ? 'border-red-500 bg-red-500/10 shadow-lg shadow-red-500/10' : 'border-white/10 bg-[#1A2235]'
                  }`}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{c.emoji}</span>
                      <div>
                        <span className="text-[16px] font-bold text-white block">{c.name}</span>
                        <span className="text-[11px] text-slate-400">{c.tag}</span>
                      </div>
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      isSel ? 'border-red-500 bg-red-500' : 'border-white/20'
                    }`}>
                      {isSel && <span className="text-white text-xs font-bold">✓</span>}
                    </div>
                  </div>

                  <p className="text-[12px] text-slate-300 mb-3">{c.summary}</p>

                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="bg-white/5 border border-white/10 rounded-md px-2 py-0.5 text-slate-300">
                      📏 {c.distance}
                    </span>
                    <span className="bg-white/5 border border-white/10 rounded-md px-2 py-0.5 text-slate-300">
                      ⏱️ {c.duration}
                    </span>
                    <span className="bg-white/5 border border-white/10 rounded-md px-2 py-0.5 text-emerald-400">
                      ⛰️ {c.intensity}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex gap-3 pt-3 pb-6 mt-auto">
            <button
              onClick={() => setStep('info')}
              className="w-16 py-4 rounded-2xl font-bold text-slate-400
                bg-[#1A2235] border border-white/10 active:scale-98 transition-all">
              ←
            </button>
            <button
              onClick={handleCourseNext}
              className="flex-1 py-4 rounded-2xl font-bold text-[16px] text-white
                bg-red-500 active:scale-98 transition-all shadow-lg shadow-red-500/20">
              다음 → 팀 선택
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: 팀 선택 */}
      {step === 'team' && (
        <div className="px-5 pt-5 flex flex-col gap-3 flex-1">
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-[18px] font-bold text-white">팀을 선택하세요</p>
              <span className="text-[11px] bg-red-500/20 text-red-400 border border-red-500/30 rounded-full px-2.5 py-0.5">
                {courseObj.emoji} {courseObj.name}
              </span>
            </div>
            <p className="text-[12px] text-slate-400">
              <span className="text-white font-semibold">{name}</span>님 ({company})
            </p>
          </div>

          <div className="flex flex-col gap-2.5">
            {TEAMS.map(team => {
              const isSel = selectedTeam === team.id;
              return (
                <button
                  key={team.id}
                  onClick={() => setSelectedTeam(team.id)}
                  className="w-full rounded-2xl border-2 p-3.5 text-left transition-all active:scale-98"
                  style={isSel
                    ? { borderColor: team.color, background: `${team.color}18` }
                    : { borderColor: 'rgba(255,255,255,0.1)', background: '#1A2235' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl border-2"
                         style={{
                           background: isSel ? `${team.color}25` : 'rgba(255,255,255,0.05)',
                           borderColor: isSel ? team.color : 'rgba(255,255,255,0.1)',
                         }}>
                      {team.emoji}
                    </div>
                    <div className="flex-1">
                      <span className="text-[16px] font-bold text-white">{team.name}</span>
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
          </div>

          <div className="flex gap-3 pt-3 pb-6 mt-auto">
            <button
              onClick={() => setStep('course')}
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
                ? { background: TEAMS.find(t => t.id === selectedTeam)?.color, color: 'white', boxShadow: '0 8px 20px -4px rgba(0,0,0,0.5)' }
                : { background: '#1A2235', color: '#475569', border: '1px solid rgba(255,255,255,0.08)' }}>
              {selectedTeam ? (
                <>{TEAMS.find(t => t.id === selectedTeam)?.emoji} 트레킹 시작하기!</>
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
