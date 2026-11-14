import React, { useState, useEffect, useRef } from 'react';
import { onValue, ref, update } from 'firebase/database';
import { rtdb, FIREBASE_DB_URL } from '../../lib/firebase';
import { LIVE_EVENT_CONFIG, WORKSHOP_TEAMS } from '../../config/workshopConfig';
import { normalizeTeamId, sanitizeFirebaseKey } from '../../utils/scoreCalculator';
import { fireConfetti } from '../../lib/confetti';

interface StepEnergyMissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamId: string;
  participantName: string | null;
  onMissionUpdated?: () => void;
}

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

  const targetSteps = Math.max(10, Number(LIVE_EVENT_CONFIG.stepMissionTarget) || 300);
  const rewardPoints = Number(LIVE_EVENT_CONFIG.stepMissionPoints) || 100;
  const missionTitle = LIVE_EVENT_CONFIG.stepMissionTitle || '실내 만보기 에너지 게이지';

  const [teamData, setTeamData] = useState<{
    totalSteps: number;
    memberSteps: Record<string, number>;
    completed: boolean;
    completedAt?: string;
  }>({
    totalSteps: 0,
    memberSteps: {},
    completed: false,
  });

  const [sensorActive, setSensorActive] = useState<boolean>(false);
  const [sensorStatusMsg, setSensorStatusMsg] = useState<string>('스마트폰 흔들기 센서 또는 아래 터치 버튼으로 걸음을 채워주세요!');
  const [pulseEffect, setPulseEffect] = useState<boolean>(false);
  const lastStepTimeRef = useRef<number>(0);
  const celebratedRef = useRef<boolean>(false);

  // 실시간 Firebase RTDB 구독 + 폴링
  useEffect(() => {
    if (!isOpen) return;

    const parseSnapshot = (val: any) => {
      if (!val || typeof val !== 'object') {
        setTeamData({ totalSteps: 0, memberSteps: {}, completed: false });
        return;
      }
      const memberSteps: Record<string, number> =
        val.memberSteps && typeof val.memberSteps === 'object' ? val.memberSteps : {};
      const sumFromMembers = Object.values(memberSteps).reduce(
        (acc, n) => acc + (Number(n) || 0),
        0
      );
      const totalSteps = Math.max(Number(val.totalSteps) || 0, sumFromMembers);
      const completed = Boolean(val.completed) || totalSteps >= targetSteps;

      setTeamData({
        totalSteps,
        memberSteps,
        completed,
        completedAt: val.completedAt,
      });

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
        const res = await fetch(
          `${FIREBASE_DB_URL}/sessions/trekking2026/stepMissions/${normTeamId}.json?t=${Date.now()}`,
          { cache: 'no-store' }
        );
        if (res.ok) {
          const data = await res.json();
          parseSnapshot(data);
        }
      } catch {}
    };

    fetchLatest();
    const poll = setInterval(fetchLatest, 2000);

    let unsubscribe = () => {};
    try {
      const stepRef = ref(rtdb, `sessions/trekking2026/stepMissions/${normTeamId}`);
      unsubscribe = onValue(stepRef, snap => {
        parseSnapshot(snap.val());
      });
    } catch {}

    return () => {
      clearInterval(poll);
      unsubscribe();
    };
  }, [isOpen, normTeamId, targetSteps]);

  // 걸음 수 추가 함수 (개인 기여도 + 팀 합산 동시 업데이트)
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
    const isNowCompleted = teamData.completed || nextTotal >= targetSteps;
    const nowIso = new Date().toISOString();

    setTeamData(prev => ({
      ...prev,
      totalSteps: nextTotal,
      memberSteps: nextMemberSteps,
      completed: isNowCompleted,
    }));

    const payload: Record<string, any> = {
      teamId: normTeamId,
      teamName: teamObj?.name || normTeamId,
      totalSteps: nextTotal,
      [`memberSteps/${memberKey}`]: nextMySteps,
      completed: isNowCompleted,
      updatedAt: nowIso,
      updatedBy: participantName || '참가자',
    };
    if (isNowCompleted && !teamData.completedAt) {
      payload.completedAt = nowIso;
    }

    try {
      if (FIREBASE_DB_URL) {
        await fetch(`${FIREBASE_DB_URL}/sessions/trekking2026/stepMissions/${normTeamId}.json`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            teamId: normTeamId,
            teamName: teamObj?.name || normTeamId,
            totalSteps: nextTotal,
            memberSteps: nextMemberSteps,
            completed: isNowCompleted,
            completedAt: teamData.completedAt || (isNowCompleted ? nowIso : undefined),
            updatedAt: nowIso,
            updatedBy: participantName || '참가자',
          }),
        });
      }
      try {
        await update(ref(rtdb, `sessions/trekking2026/stepMissions/${normTeamId}`), payload);
      } catch {}
      onMissionUpdated?.();
    } catch {}
  };

  // 스마트폰 가속도 센서(DeviceMotionEvent) 활성화 및 흔들기 감지
  const enableMotionSensor = async () => {
    try {
      const dm = window.DeviceMotionEvent as any;
      if (dm && typeof dm.requestPermission === 'function') {
        const permission = await dm.requestPermission();
        if (permission !== 'granted') {
          setSensorStatusMsg('센서 권한이 거부되었습니다. 아래 터치 버튼으로 걸음을 올려주세요!');
          return;
        }
      }
      setSensorActive(true);
      setSensorStatusMsg('🔥 모션 센서 작동 중! 휴대폰을 들고 걷거나 위아래로 흔들어 주세요!');
    } catch {
      setSensorActive(true);
      setSensorStatusMsg('🔥 모션 센서 작동 중! 휴대폰을 흔들거나 터치 버튼을 눌러주세요.');
    }
  };

  useEffect(() => {
    if (!isOpen || !sensorActive) return;

    const handleMotion = (event: DeviceMotionEvent) => {
      const acc = event.accelerationIncludingGravity || event.acceleration;
      if (!acc) return;
      const x = acc.x || 0;
      const y = acc.y || 0;
      const z = acc.z || 0;
      const magnitude = Math.sqrt(x * x + y * y + z * z);

      const now = Date.now();
      if (magnitude > 13.8 && now - lastStepTimeRef.current > 260) {
        lastStepTimeRef.current = now;
        addSteps(2);
      }
    };

    window.addEventListener('devicemotion', handleMotion);
    return () => window.removeEventListener('devicemotion', handleMotion);
  }, [isOpen, sensorActive, teamData]);

  if (!isOpen) return null;

  const progressPct = Math.min(100, Math.round((teamData.totalSteps / targetSteps) * 100));
  const mySteps = Number(teamData.memberSteps?.[memberKey]) || 0;
  const memberEntries = Object.entries(teamData.memberSteps || {}).sort(
    (a, b) => Number(b[1]) - Number(a[1])
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-['Noto_Sans_KR']">
      <div className="bg-[#121826] border border-cyan-500/40 rounded-3xl max-w-[410px] w-full overflow-hidden shadow-2xl">
        {/* 상단 헤더 */}
        <div className="bg-gradient-to-r from-cyan-950/90 via-sky-900/60 to-slate-900 px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
              INDOOR & HYBRID MISSION BLOCK 1
            </span>
            <h2 className="text-[18px] font-black text-white mt-1 flex items-center gap-1.5">
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

        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* 완료 배너 */}
          {teamData.completed ? (
            <div className="bg-gradient-to-r from-emerald-500/25 to-teal-500/20 border border-emerald-400/60 rounded-2xl p-3.5 text-center shadow-lg">
              <div className="text-2xl mb-0.5">🎉</div>
              <h3 className="text-[16px] font-black text-emerald-300">
                우리 조 목표 에너지 100% 충전 완료! (+{rewardPoints}pt 획득)
              </h3>
              <p className="text-[12.5px] text-slate-300 mt-0.5">
                조원 모두가 힘을 합쳐 미션 게이지를 돌파했습니다!
              </p>
            </div>
          ) : (
            <div className="bg-[#1A2235] border border-white/10 rounded-2xl p-3.5 text-xs text-slate-300 leading-relaxed">
              💡 <strong>미션 방법:</strong> 조원들이 각자 스마트폰을 들고 제자리 걸음/흔들기를 하거나 아래 에너지 스텝 버튼을 연타하면 <strong>우리 조 합산 게이지</strong>가 실시간으로 올라갑니다! ({targetSteps}보 달성 시 <strong>+{rewardPoints}pt</strong> 즉시 획득)
            </div>
          )}

          {/* 실시간 팀 에너지 게이지 */}
          <div className="bg-[#0B0F19] border border-cyan-500/30 rounded-2xl p-4 text-center relative overflow-hidden">
            <p className="text-xs font-bold text-cyan-300 mb-1">
              {teamObj?.name || '우리 조'} 실시간 합산 걸음 에너지
            </p>
            <div className="flex items-baseline justify-center gap-1.5 my-1">
              <span
                className={`font-['Bebas_Neue'] text-5xl tracking-wider transition-transform ${
                  pulseEffect ? 'scale-110 text-cyan-300' : 'text-white'
                }`}
              >
                {teamData.totalSteps}
              </span>
              <span className="text-slate-400 text-lg font-bold">/ {targetSteps}보</span>
            </div>

            {/* 프로그레스 바 */}
            <div className="w-full h-5 bg-slate-800/90 rounded-full overflow-hidden border border-white/10 mt-2 p-0.5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-sky-400 to-emerald-400 transition-all duration-300 flex items-center justify-end pr-2"
                style={{ width: `${ Math.max(6, progressPct) }%` }}
              >
                <span className="text-[10px] font-black text-slate-950">{progressPct}%</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[12px] text-slate-400 mt-2.5 pt-2 border-t border-white/5">
              <span>내 기여 걸음: <strong className="text-cyan-300">{mySteps}보</strong></span>
              <span>보상 점수: <strong className="text-amber-300">+{rewardPoints}pt</strong></span>
            </div>
          </div>

          {/* 액션 컨트롤 (모션 센서 + 수동 스텝 버튼) */}
          <div className="space-y-2.5">
            {!sensorActive && (
              <button
                type="button"
                onClick={enableMotionSensor}
                className="w-full py-2.5 px-4 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/40 text-cyan-200 text-xs font-bold flex items-center justify-center gap-2 active:scale-98 transition-all"
              >
                📱 스마트폰 흔들기(만보기 센서) 켜기
              </button>
            )}
            <p className="text-[11.5px] text-center text-slate-400">{sensorStatusMsg}</p>

            <button
              type="button"
              onClick={() => addSteps(5)}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-[16px] shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              👟 파워 스텝! 걸음 에너지 충전 (+5보)
            </button>
          </div>

          {/* 우리 조 팀원별 실시간 기여도 */}
          <div className="bg-[#1A2235] border border-white/10 rounded-2xl p-3.5">
            <h4 className="text-xs font-bold text-slate-300 mb-2 flex items-center justify-between">
              <span>🔥 우리 조원 실시간 스텝 기여 현황</span>
              <span className="text-cyan-300">{memberEntries.length}명 참여 중</span>
            </h4>
            {memberEntries.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-2">
                아직 기록된 걸음이 없습니다. 첫 스텝을 밟아보세요!
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {memberEntries.map(([nameKey, steps]) => (
                  <span
                    key={nameKey}
                    className="text-xs px-2.5 py-1 rounded-lg bg-black/40 border border-white/10 text-slate-200 font-medium"
                  >
                    {nameKey.replace(/_/g, ' ')}: <strong className="text-cyan-300">{steps}보</strong>
                  </span>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 font-bold text-sm"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
