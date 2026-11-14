import React, { useState, useEffect, useRef } from 'react';
import { onValue, ref, update, set } from 'firebase/database';
import { rtdb, FIREBASE_DB_URL } from '../../lib/firebase';
import { LIVE_EVENT_CONFIG, WORKSHOP_TEAMS, PEOPLE_QUEST_TOPIC_OPTIONS } from '../../config/workshopConfig';
import { normalizeTeamId, sanitizeFirebaseKey } from '../../utils/scoreCalculator';
import { fireConfetti } from '../../lib/confetti';

interface StepEnergyMissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamId: string;
  participantName: string | null;
  onMissionUpdated?: () => void;
}

const STRENGTH_KEYWORDS = [
  '🤝 경청 & 공감왕 조',
  '⚡ 추진력 & 스피드 조',
  '💡 아이디어 뱅크 조',
  '😄 긍정 리액션 부자 조',
  '🔥 원팀 시너지 폭발 조',
];

export const StepEnergyMissionModal: React.FC<StepEnergyMissionModalProps> = ({
  isOpen,
  onClose,
  teamId,
  participantName,
  onMissionUpdated,
}) => {
  const normTeamId = normalizeTeamId(teamId);
  const teamObj = WORKSHOP_TEAMS.find(t => t.id === normTeamId);
  const memberKey = sanitizeFirebaseKey(participantName || '익명팀원');

  const targetSteps = Math.max(30, Number(LIVE_EVENT_CONFIG.stepMissionTarget) || 300);
  const gate1Steps = Math.round(targetSteps / 3);
  const gate2Steps = Math.round((targetSteps * 2) / 3);
  const gate3Steps = targetSteps;

  const rewardPoints = Number(LIVE_EVENT_CONFIG.stepMissionPoints) || 100;
  const missionTitle =
    LIVE_EVENT_CONFIG.stepMissionTitle || '스텝 & 토크 릴레이: 3단계 시너지 게이트';

  const [teamData, setTeamData] = useState<{
    totalSteps: number;
    memberSteps: Record<string, number>;
    gate1Answer: string;
    gate1Done: boolean;
    gate2Keyword: string;
    gate2Reason: string;
    gate2Done: boolean;
    gate3PersonName: string;
    gate3Topic: string;
    gate3Reason: string;
    gate3Slogan: string;
    gate3Done: boolean;
    completed: boolean;
    completedAt?: string;
  }>({
    totalSteps: 0,
    memberSteps: {},
    gate1Answer: '',
    gate1Done: false,
    gate2Keyword: STRENGTH_KEYWORDS[0],
    gate2Reason: '',
    gate2Done: false,
    gate3PersonName: '',
    gate3Topic: PEOPLE_QUEST_TOPIC_OPTIONS[0] || '최근 가장 푹 빠진 취미/관심사',
    gate3Reason: '',
    gate3Slogan: '',
    gate3Done: false,
    completed: false,
  });

  // 로컬 입력 초안 상태 (작성 중 덮어쓰기 방지)
  const [g1Input, setG1Input] = useState('');
  const [g2KeyInput, setG2KeyInput] = useState(STRENGTH_KEYWORDS[0]);
  const [g2ReasonInput, setG2ReasonInput] = useState('');
  const [g3PersonInput, setG3PersonInput] = useState('');
  const [g3TopicInput, setG3TopicInput] = useState(
    PEOPLE_QUEST_TOPIC_OPTIONS[0] || '최근 가장 푹 빠진 취미/관심사'
  );
  const [g3ReasonInput, setG3ReasonInput] = useState('');
  const [g3SloganInput, setG3SloganInput] = useState('');
  const [teamMembersList, setTeamMembersList] = useState<string[]>([]);

  const [sensorActive, setSensorActive] = useState<boolean>(false);
  const [sensorStatusMsg, setSensorStatusMsg] = useState<string>(
    '조원들과 함께 걸음을 채워 1·2·3단계 토크 게이트를 순서대로 열어보세요!'
  );
  const [pulseEffect, setPulseEffect] = useState<boolean>(false);
  const [savingGate, setSavingGate] = useState<number | null>(null);
  const lastStepTimeRef = useRef<number>(0);
  const celebratedRef = useRef<boolean>(false);
  const initializedInputsRef = useRef<boolean>(false);

  // 실시간 Firebase RTDB 구독 + 우리 조원 명단 로드
  useEffect(() => {
    if (!isOpen) {
      initializedInputsRef.current = false;
      return;
    }

    const parseSnapshot = (val: any) => {
      if (!val || typeof val !== 'object') return;
      const memberSteps: Record<string, number> =
        val.memberSteps && typeof val.memberSteps === 'object' ? val.memberSteps : {};
      const sumFromMembers = Object.values(memberSteps).reduce(
        (acc, n) => acc + (Number(n) || 0),
        0
      );
      const totalSteps = Math.max(Number(val.totalSteps) || 0, sumFromMembers);
      const gate1Done = Boolean(val.gate1Done);
      const gate2Done = Boolean(val.gate2Done);
      const gate3Done = Boolean(val.gate3Done);
      const completed = Boolean(val.completed) || (gate1Done && gate2Done && gate3Done);

      setTeamData({
        totalSteps,
        memberSteps,
        gate1Answer: val.gate1Answer || '',
        gate1Done,
        gate2Keyword: val.gate2Keyword || STRENGTH_KEYWORDS[0],
        gate2Reason: val.gate2Reason || '',
        gate2Done,
        gate3PersonName: val.gate3PersonName || '',
        gate3Topic: val.gate3Topic || PEOPLE_QUEST_TOPIC_OPTIONS[0],
        gate3Reason: val.gate3Reason || '',
        gate3Slogan: val.gate3Slogan || '',
        gate3Done,
        completed,
        completedAt: val.completedAt,
      });

      if (!initializedInputsRef.current) {
        initializedInputsRef.current = true;
        if (val.gate1Answer) setG1Input(val.gate1Answer);
        if (val.gate2Keyword) setG2KeyInput(val.gate2Keyword);
        if (val.gate2Reason) setG2ReasonInput(val.gate2Reason);
        if (val.gate3PersonName) setG3PersonInput(val.gate3PersonName);
        if (val.gate3Topic) setG3TopicInput(val.gate3Topic);
        if (val.gate3Reason) setG3ReasonInput(val.gate3Reason);
        if (val.gate3Slogan) setG3SloganInput(val.gate3Slogan);
      }

      if (completed && !celebratedRef.current) {
        celebratedRef.current = true;
        try {
          fireConfetti();
        } catch {}
      }
    };

    const fetchLatest = async () => {
      if (!FIREBASE_DB_URL) return;
      try {
        const [stepRes, partRes] = await Promise.all([
          fetch(
            `${FIREBASE_DB_URL}/sessions/trekking2026/stepMissions/${normTeamId}.json?t=${Date.now()}`,
            { cache: 'no-store' }
          ),
          fetch(
            `${FIREBASE_DB_URL}/sessions/trekking2026/participants.json?t=${Date.now()}`,
            { cache: 'no-store' }
          ),
        ]);
        if (stepRes.ok) {
          const data = await stepRes.json();
          if (data) parseSnapshot(data);
        }
        if (partRes.ok) {
          const pMap = await partRes.json();
          if (pMap && typeof pMap === 'object') {
            const names = Array.from(
              new Set(
                Object.values(pMap)
                  .filter((p: any) => p?.name && normalizeTeamId(p.teamId) === normTeamId)
                  .map((p: any) => String(p.name).trim())
              )
            );
            setTeamMembersList(names);
          }
        }
      } catch {}
    };

    fetchLatest();
    const poll = setInterval(fetchLatest, 2500);

    let unsubscribe = () => {};
    try {
      const stepRef = ref(rtdb, `sessions/trekking2026/stepMissions/${normTeamId}`);
      unsubscribe = onValue(stepRef, snap => {
        if (snap.exists()) parseSnapshot(snap.val());
      });
    } catch {}

    return () => {
      clearInterval(poll);
      unsubscribe();
    };
  }, [isOpen, normTeamId, targetSteps]);

  // 현재 도달 가능한 최대 걸음 수 (이전 게이트 미완료 시 다음 구간 초입에서 대기하여 단계별 대화 유도)
  const addSteps = async (increment: number) => {
    setPulseEffect(true);
    setTimeout(() => setPulseEffect(false), 180);

    const currentMySteps = Number(teamData.memberSteps?.[memberKey]) || 0;
    const nextMySteps = currentMySteps + increment;
    const nextMemberSteps = {
      ...(teamData.memberSteps || {}),
      [memberKey]: nextMySteps,
    };
    const nextTotal = Object.values(nextMemberSteps).reduce(
      (acc, v) => acc + (Number(v) || 0),
      0
    );
    const nowIso = new Date().toISOString();

    setTeamData(prev => ({
      ...prev,
      totalSteps: nextTotal,
      memberSteps: nextMemberSteps,
    }));

    const patchBody = {
      teamId: normTeamId,
      teamName: teamObj?.name || normTeamId,
      totalSteps: nextTotal,
      memberSteps: nextMemberSteps,
      updatedAt: nowIso,
      updatedBy: participantName || '참가자',
    };

    try {
      if (FIREBASE_DB_URL) {
        await fetch(`${FIREBASE_DB_URL}/sessions/trekking2026/stepMissions/${normTeamId}.json`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patchBody),
        });
      }
      try {
        await update(ref(rtdb, `sessions/trekking2026/stepMissions/${normTeamId}`), patchBody);
      } catch {}
    } catch {}
  };

  // Gate 1 저장
  const handleSaveGate1 = async () => {
    if (!g1Input.trim()) {
      alert('우리 조원들의 공통점을 1가지 이상 입력해 주세요!');
      return;
    }
    setSavingGate(1);
    const patch = {
      gate1Answer: g1Input.trim(),
      gate1Done: true,
      updatedAt: new Date().toISOString(),
    };
    try {
      if (FIREBASE_DB_URL) {
        await fetch(`${FIREBASE_DB_URL}/sessions/trekking2026/stepMissions/${normTeamId}.json`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        });
      }
      setTeamData(prev => ({ ...prev, ...patch }));
      onMissionUpdated?.();
    } finally {
      setSavingGate(null);
    }
  };

  // Gate 2 저장
  const handleSaveGate2 = async () => {
    if (!g2ReasonInput.trim()) {
      alert('우리 조의 강점을 선택한 이유를 한 줄로 적어주세요!');
      return;
    }
    setSavingGate(2);
    const patch = {
      gate2Keyword: g2KeyInput,
      gate2Reason: g2ReasonInput.trim(),
      gate2Done: true,
      updatedAt: new Date().toISOString(),
    };
    try {
      if (FIREBASE_DB_URL) {
        await fetch(`${FIREBASE_DB_URL}/sessions/trekking2026/stepMissions/${normTeamId}.json`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        });
      }
      setTeamData(prev => ({ ...prev, ...patch }));
      onMissionUpdated?.();
    } finally {
      setSavingGate(null);
    }
  };

  // Gate 3 최종 저장 (+ peopleQuest 자동 연동으로 저녁 퀴즈쇼/시상식 100% 호환)
  const handleSaveGate3 = async () => {
    if (!g3PersonInput.trim() || !g3ReasonInput.trim() || !g3SloganInput.trim()) {
      alert('추천 동료 이름, 추천 스토리, 그리고 우리 조 한 줄 슬로건을 모두 입력해 주세요!');
      return;
    }
    setSavingGate(3);
    const nowIso = new Date().toISOString();
    const patch = {
      gate3PersonName: g3PersonInput.trim(),
      gate3Topic: g3TopicInput,
      gate3Reason: g3ReasonInput.trim(),
      gate3Slogan: g3SloganInput.trim(),
      gate3Done: true,
      completed: true,
      completedAt: nowIso,
      updatedAt: nowIso,
    };

    // 기존 peopleQuest 경로에도 동시 기록하여 관리자 퀴즈쇼 & 엑셀에 100% 연동
    const pqPayload = {
      teamId: normTeamId,
      teamName: teamObj?.name || normTeamId,
      status: 'submitted',
      recommendation: {
        recommendedPersonId: sanitizeFirebaseKey(g3PersonInput.trim()),
        recommendedPersonName: g3PersonInput.trim(),
        recommendedPersonCompany: LIVE_EVENT_CONFIG.venueName || '',
        selectedTopic: g3TopicInput,
        reason: `${g3ReasonInput.trim()} (🔥 우리 조 슬로건: "${g3SloganInput.trim()}" / 강점: ${g2KeyInput})`,
      },
      submittedAt: nowIso,
      submittedBy: participantName || '조 대표',
    };

    try {
      if (FIREBASE_DB_URL) {
        await Promise.all([
          fetch(`${FIREBASE_DB_URL}/sessions/trekking2026/stepMissions/${normTeamId}.json`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(patch),
          }),
          fetch(`${FIREBASE_DB_URL}/sessions/trekking2026/peopleQuest/${normTeamId}.json`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pqPayload),
          }),
        ]);
      }
      try {
        await update(ref(rtdb, `sessions/trekking2026/stepMissions/${normTeamId}`), patch);
        await set(ref(rtdb, `sessions/trekking2026/peopleQuest/${normTeamId}`), pqPayload);
      } catch {}
      setTeamData(prev => ({ ...prev, ...patch }));
      try {
        fireConfetti();
      } catch {}
      onMissionUpdated?.();
    } finally {
      setSavingGate(null);
    }
  };

  // 스마트폰 가속도 센서 활성화
  const enableMotionSensor = async () => {
    try {
      const dm = window.DeviceMotionEvent as any;
      if (dm && typeof dm.requestPermission === 'function') {
        const permission = await dm.requestPermission();
        if (permission !== 'granted') {
          setSensorStatusMsg('센서 권한이 거부되었습니다. 아래 스텝 버튼으로 에너지를 채워주세요!');
          return;
        }
      }
      setSensorActive(true);
      setSensorStatusMsg('🔥 모션 센서 작동 중! 조원들과 휴대폰을 흔들거나 제자리 걸음을 걸어보세요!');
    } catch {
      setSensorActive(true);
      setSensorStatusMsg('🔥 모션 센서 작동 중! 휴대폰을 흔들거나 스텝 버튼을 눌러주세요.');
    }
  };

  useEffect(() => {
    if (!isOpen || !sensorActive) return;
    const handleMotion = (event: DeviceMotionEvent) => {
      const acc = event.accelerationIncludingGravity || event.acceleration;
      if (!acc) return;
      const magnitude = Math.sqrt((acc.x || 0) ** 2 + (acc.y || 0) ** 2 + (acc.z || 0) ** 2);
      const now = Date.now();
      if (magnitude > 13.5 && now - lastStepTimeRef.current > 240) {
        lastStepTimeRef.current = now;
        addSteps(4);
      }
    };
    window.addEventListener('devicemotion', handleMotion);
    return () => window.removeEventListener('devicemotion', handleMotion);
  }, [isOpen, sensorActive, teamData]);

  if (!isOpen) return null;

  const progressPct = Math.min(100, Math.round((teamData.totalSteps / targetSteps) * 100));
  const mySteps = Number(teamData.memberSteps?.[memberKey]) || 0;
  const isGate1Open = teamData.totalSteps >= gate1Steps;
  const isGate2Open = teamData.totalSteps >= gate2Steps && teamData.gate1Done;
  const isGate3Open = teamData.totalSteps >= gate3Steps && teamData.gate2Done;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 font-['Noto_Sans_KR']">
      <div className="bg-[#111726] border border-cyan-500/45 rounded-3xl max-w-[430px] w-full overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* 상단 헤더 */}
        <div className="bg-gradient-to-r from-cyan-950/90 via-sky-900/70 to-slate-900 px-4 py-3.5 border-b border-white/10 flex items-center justify-between shrink-0">
          <div>
            <span className="text-[10.5px] font-extrabold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
              INDOOR TEAM SYNERGY MISSION 1
            </span>
            <h2 className="text-[16.5px] font-black text-white mt-0.5 flex items-center gap-1.5">
              👟 {missionTitle}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 flex items-center justify-center text-sm font-bold"
          >
            ✕
          </button>
        </div>

        {/* 스크롤 본문 */}
        <div className="p-4 space-y-3.5 overflow-y-auto flex-1">
          {/* 최종 완료 배너 */}
          {teamData.completed ? (
            <div className="bg-gradient-to-r from-emerald-500/25 to-teal-500/20 border border-emerald-400/60 rounded-2xl p-3.5 text-center shadow-lg">
              <div className="text-2xl mb-0.5">🏆</div>
              <h3 className="text-[15.5px] font-black text-emerald-300">
                3단계 시너지 게이트 모두 돌파 완료! (+{rewardPoints}pt 획득)
              </h3>
              <p className="text-xs text-slate-200 mt-1">
                우리 조 슬로건: <strong>"{teamData.gate3Slogan}"</strong>
              </p>
            </div>
          ) : (
            <div className="bg-[#1A2235] border border-white/10 rounded-2xl p-3 text-xs text-slate-300 leading-relaxed">
              💡 <strong>실내 활동 가이드:</strong> 조원들이 함께 휴대폰을 흔들거나 스텝 버튼을 눌러 걸음 에너지를 채우면 <strong>1단계({gate1Steps}보) → 2단계({gate2Steps}보) → 3단계({gate3Steps}보) 대화 게이트</strong>가 열립니다. 3개 게이트를 모두 통과하면 <strong>+{rewardPoints}pt</strong>를 획득합니다!
            </div>
          )}

          {/* 상단 실시간 걸음 게이지 & 스텝 액션 */}
          <div className="bg-[#0B0F19] border border-cyan-500/35 rounded-2xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-300">
                {teamObj?.name || '우리 조'} 합산 에너지
              </span>
              <span className="text-xs text-slate-400">
                내 기여: <strong className="text-cyan-300">{mySteps}보</strong>
              </span>
            </div>

            <div className="flex items-baseline justify-center gap-1.5">
              <span
                className={`font-['Bebas_Neue'] text-5xl tracking-wider transition-transform ${
                  pulseEffect ? 'scale-110 text-cyan-300' : 'text-white'
                }`}
              >
                {teamData.totalSteps}
              </span>
              <span className="text-slate-400 text-base font-bold">/ {targetSteps}보</span>
            </div>

            {/* 3단계 게이트 마커 프로그레스 바 */}
            <div className="relative pt-1 pb-2">
              <div className="w-full h-4 bg-slate-800 rounded-full overflow-hidden border border-white/10">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 via-sky-400 to-emerald-400 transition-all duration-300"
                  style={{ width: `${Math.max(4, progressPct)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10.5px] font-bold text-slate-400 mt-1 px-0.5">
                <span className={isGate1Open ? 'text-cyan-300' : ''}>
                  {teamData.gate1Done ? '✅' : isGate1Open ? '🔓' : '🔒'} Gate1 ({gate1Steps}보)
                </span>
                <span className={isGate2Open ? 'text-sky-300' : ''}>
                  {teamData.gate2Done ? '✅' : isGate2Open ? '🔓' : '🔒'} Gate2 ({gate2Steps}보)
                </span>
                <span className={isGate3Open ? 'text-emerald-300' : ''}>
                  {teamData.gate3Done ? '✅' : isGate3Open ? '🔓' : '🔒'} Gate3 ({gate3Steps}보)
                </span>
              </div>
            </div>

            {!sensorActive && (
              <button
                type="button"
                onClick={enableMotionSensor}
                className="w-full py-2 px-3 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/40 text-cyan-200 text-xs font-bold"
              >
                📱 스마트폰 흔들기(만보기 센서) 켜기
              </button>
            )}

            <button
              type="button"
              onClick={() => addSteps(10)}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-[15px] shadow-lg active:scale-95 transition-all"
            >
              👟 파워 스텝! 조원들과 에너지 충전 (+10보)
            </button>
            <p className="text-[11px] text-center text-slate-400">{sensorStatusMsg}</p>
          </div>

          {/* ─── GATE 1: 공감 스파크 (조원 공통점 찾기) ─── */}
          <div
            className={`rounded-2xl p-3.5 border transition-all ${
              teamData.gate1Done
                ? 'bg-emerald-950/25 border-emerald-500/50'
                : isGate1Open
                ? 'bg-[#17223B] border-cyan-400 shadow-lg'
                : 'bg-[#131824] border-white/10 opacity-60'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-black text-cyan-300">
                GATE 1 · 공감 스파크 ({gate1Steps}보 달성 시 오픈)
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-black/40 text-slate-200">
                {teamData.gate1Done ? '✅ 통과 완료' : isGate1Open ? '🔓 대화 미션 진행' : `🔒 ${gate1Steps - teamData.totalSteps}보 남음`}
              </span>
            </div>
            <p className="text-xs text-slate-200 font-bold mb-2">
              Q1. 우리 조원 모두가 공통으로 좋아하는 것이나 뜻밖의 공통점 1가지를 찾아 적어주세요!
            </p>
            {isGate1Open ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={g1Input}
                  onChange={e => setG1Input(e.target.value)}
                  placeholder="예: 전원 커피보다 아아 파! / 캠핑·여행 마니아"
                  className="flex-1 bg-black/50 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
                <button
                  type="button"
                  disabled={savingGate === 1}
                  onClick={handleSaveGate1}
                  className="px-3.5 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black text-xs shrink-0"
                >
                  {teamData.gate1Done ? '수정' : '확인'}
                </button>
              </div>
            ) : (
              <p className="text-[11.5px] text-slate-400">
                걸음 에너지를 {gate1Steps}보까지 채우면 첫 번째 대화 게이트가 열립니다.
              </p>
            )}
          </div>

          {/* ─── GATE 2: 강점 시너지 (우리 조 강점 키워드) ─── */}
          <div
            className={`rounded-2xl p-3.5 border transition-all ${
              teamData.gate2Done
                ? 'bg-emerald-950/25 border-emerald-500/50'
                : isGate2Open
                ? 'bg-[#17223B] border-sky-400 shadow-lg'
                : 'bg-[#131824] border-white/10 opacity-60'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-black text-sky-300">
                GATE 2 · 강점 시너지 ({gate2Steps}보 & Gate 1 완료 시 오픈)
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-black/40 text-slate-200">
                {teamData.gate2Done
                  ? '✅ 통과 완료'
                  : isGate2Open
                  ? '🔓 강점 선택'
                  : '🔒 대기 중'}
              </span>
            </div>
            <p className="text-xs text-slate-200 font-bold mb-2">
              Q2. 오늘 대화하며 발견한 우리 조만의 최고 강점 키워드와 한 줄 이유를 적어주세요!
            </p>
            {isGate2Open ? (
              <div className="space-y-2">
                <select
                  value={g2KeyInput}
                  onChange={e => setG2KeyInput(e.target.value)}
                  className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-2 text-xs text-white"
                >
                  {STRENGTH_KEYWORDS.map(k => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={g2ReasonInput}
                    onChange={e => setG2ReasonInput(e.target.value)}
                    placeholder="한 줄 이유 (예: 누구든 말하면 물개박수로 호응해 줍니다!)"
                    className="flex-1 bg-black/50 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-400"
                  />
                  <button
                    type="button"
                    disabled={savingGate === 2}
                    onClick={handleSaveGate2}
                    className="px-3.5 py-2 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 font-black text-xs shrink-0"
                  >
                    {teamData.gate2Done ? '수정' : '확인'}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-[11.5px] text-slate-400">
                Gate 1을 완료하고 {gate2Steps}보에 도달하면 두 번째 게이트가 열립니다.
              </p>
            )}
          </div>

          {/* ─── GATE 3: 최고의 스토리 동료 추천 & 원팀 슬로건 ─── */}
          <div
            className={`rounded-2xl p-3.5 border transition-all ${
              teamData.gate3Done
                ? 'bg-emerald-950/30 border-emerald-400 shadow-lg'
                : isGate3Open
                ? 'bg-gradient-to-br from-[#1B2845] to-[#151E32] border-amber-400 shadow-xl'
                : 'bg-[#131824] border-white/10 opacity-60'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-black text-amber-300">
                GATE 3 · 최고의 스토리 동료 추천 & 원팀 슬로건 ({gate3Steps}보)
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-black/40 text-amber-200">
                {teamData.gate3Done
                  ? `✅ +${rewardPoints}pt 달성!`
                  : isGate3Open
                  ? '🔓 최종 게이트'
                  : '🔒 대기 중'}
              </span>
            </div>
            <p className="text-xs text-slate-200 font-bold mb-2">
              Q3. 우리 조에서 가장 인상 깊은 스토리를 들려준 동료 1명을 추천하고, 우리 조의 한 줄 슬로건을 완성해 주세요!
            </p>
            {isGate3Open ? (
              <div className="space-y-2">
                {teamMembersList.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {teamMembersList.map(name => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => setG3PersonInput(name)}
                        className={`text-[11px] px-2.5 py-1 rounded-lg border font-bold ${
                          g3PersonInput === name
                            ? 'bg-amber-400 text-slate-950 border-amber-300'
                            : 'bg-black/40 text-slate-300 border-white/10'
                        }`}
                      >
                        👑 {name}
                      </button>
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={g3PersonInput}
                    onChange={e => setG3PersonInput(e.target.value)}
                    placeholder="추천 동료 이름 (예: 홍길동)"
                    className="bg-black/50 border border-white/15 rounded-xl px-3 py-2 text-xs text-white"
                  />
                  <select
                    value={g3TopicInput}
                    onChange={e => setG3TopicInput(e.target.value)}
                    className="bg-black/50 border border-white/15 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    {PEOPLE_QUEST_TOPIC_OPTIONS.map(t => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <input
                  type="text"
                  value={g3ReasonInput}
                  onChange={e => setG3ReasonInput(e.target.value)}
                  placeholder="동료의 인상 깊었던 스토리 & 추천 이유"
                  className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-2 text-xs text-white"
                />
                <input
                  type="text"
                  value={g3SloganInput}
                  onChange={e => setG3SloganInput(e.target.value)}
                  placeholder="우리 조 한 줄 응원 슬로건 (예: 1조 시너지, 끝까지 가보자고!)"
                  className="w-full bg-black/50 border border-amber-400/40 rounded-xl px-3 py-2 text-xs text-white"
                />
                <button
                  type="button"
                  disabled={savingGate === 3}
                  onClick={handleSaveGate3}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-black text-xs shadow-lg"
                >
                  {teamData.gate3Done
                    ? '✅ 제출 완료 (내용 수정하기)'
                    : `🏆 3단계 시너지 게이트 최종 완료 (+${rewardPoints}pt 획득)`}
                </button>
              </div>
            ) : (
              <p className="text-[11.5px] text-slate-400">
                Gate 2를 완료하고 목표 걸음({gate3Steps}보)을 채우면 마지막 게이트가 열립니다.
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 font-bold text-xs"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
