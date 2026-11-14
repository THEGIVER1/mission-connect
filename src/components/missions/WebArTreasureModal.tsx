import React, { useState, useEffect, useRef } from 'react';
import { onValue, ref, set } from 'firebase/database';
import { rtdb, FIREBASE_DB_URL } from '../../lib/firebase';
import { LIVE_EVENT_CONFIG, WORKSHOP_TEAMS } from '../../config/workshopConfig';
import { normalizeTeamId } from '../../utils/scoreCalculator';
import { fireConfetti } from '../../lib/confetti';

interface WebArTreasureModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamId: string;
  participantName: string | null;
  onMissionUpdated?: () => void;
}

interface ArTreasureItem {
  id: string;
  name: string;
  emoji: string;
  targetYaw: number; // 0 ~ 360도 방위각
  badgeColor: string;
  desc: string;
}

const AR_TREASURES: ArTreasureItem[] = [
  {
    id: 'crystal_core',
    name: '핵심가치 크리스탈',
    emoji: '💎',
    targetYaw: 60,
    badgeColor: 'from-cyan-400 to-sky-500',
    desc: '60° 방향 상공에 떠 있는 시너지 크리스탈',
  },
  {
    id: 'golden_key',
    name: '이노베이션 황금열쇠',
    emoji: '🔑',
    targetYaw: 180,
    badgeColor: 'from-amber-400 to-orange-500',
    desc: '180° 정반대 방향의 혁신 마스터키',
  },
  {
    id: 'oneteam_trophy',
    name: '원팀 시너지 트로피',
    emoji: '🏆',
    targetYaw: 300,
    badgeColor: 'from-purple-400 to-pink-500',
    desc: '300° 방향에 숨겨진 최종 원팀 트로피',
  },
];

function angleDiff(a: number, b: number): number {
  let diff = ((a - b + 540) % 360) - 180;
  return diff;
}

export const WebArTreasureModal: React.FC<WebArTreasureModalProps> = ({
  isOpen,
  onClose,
  teamId,
  participantName,
  onMissionUpdated,
}) => {
  const normTeamId = normalizeTeamId(teamId);
  const teamObj = WORKSHOP_TEAMS.find(t => t.id === normTeamId);

  const rewardPoints = Number(LIVE_EVENT_CONFIG.arMissionPoints) || 100;
  const missionTitle = LIVE_EVENT_CONFIG.arMissionTitle || '웹 AR 360° 실내 보물찾기';

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraReady, setCameraReady] = useState<boolean>(false);
  const [cameraFallback, setCameraFallback] = useState<boolean>(false);
  const [yaw, setYaw] = useState<number>(60); // 기본 시작 각도
  const [capturedIds, setCapturedIds] = useState<string[]>([]);
  const [completed, setCompleted] = useState<boolean>(false);
  const [captureFlash, setCaptureFlash] = useState<string | null>(null);

  const dragStartXRef = useRef<number | null>(null);
  const dragStartYawRef = useRef<number>(60);
  const celebratedRef = useRef<boolean>(false);

  // 1. 후면 카메라(WebRTC) 연결 및 해제
  useEffect(() => {
    if (!isOpen) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      setCameraReady(false);
      return;
    }

    let cancelled = false;
    const startCamera = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraFallback(true);
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setCameraReady(true);
        setCameraFallback(false);
      } catch {
        if (!cancelled) {
          setCameraFallback(true);
        }
      }
    };

    startCamera();

    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    };
  }, [isOpen]);

  // 2. 스마트폰 자이로/방위각(DeviceOrientationEvent) 연동
  useEffect(() => {
    if (!isOpen) return;

    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (typeof e.alpha === 'number' && !Number.isNaN(e.alpha)) {
        // alpha: 0 ~ 360
        setYaw(Math.round((360 - e.alpha) % 360));
      }
    };

    window.addEventListener('deviceorientation', handleOrientation);
    return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, [isOpen]);

  // 3. Firebase RTDB 실시간 동기화
  useEffect(() => {
    if (!isOpen) return;

    const parseData = (val: any) => {
      if (!val || typeof val !== 'object') {
        setCapturedIds([]);
        setCompleted(false);
        return;
      }
      const list = Array.isArray(val.capturedIds)
        ? Array.from(new Set(val.capturedIds.map(String)))
        : [];
      const isDone = Boolean(val.completed) || list.length >= AR_TREASURES.length;
      setCapturedIds(list);
      setCompleted(isDone);

      if (isDone && !celebratedRef.current) {
        celebratedRef.current = true;
        try {
          fireConfetti();
        } catch {}
      }
    };

    const fetchAr = async () => {
      if (!FIREBASE_DB_URL) return;
      try {
        const res = await fetch(
          `${FIREBASE_DB_URL}/sessions/trekking2026/arMissions/${normTeamId}.json?t=${Date.now()}`,
          { cache: 'no-store' }
        );
        if (res.ok) {
          const data = await res.json();
          parseData(data);
        }
      } catch {}
    };

    fetchAr();
    const poll = setInterval(fetchAr, 2000);

    let unsubscribe = () => {};
    try {
      const arRef = ref(rtdb, `sessions/trekking2026/arMissions/${normTeamId}`);
      unsubscribe = onValue(arRef, snap => parseData(snap.val()));
    } catch {}

    return () => {
      clearInterval(poll);
      unsubscribe();
    };
  }, [isOpen, normTeamId]);

  // 터치/마우스 좌우 드래그로 360도 시야 회전
  const handlePointerDown = (clientX: number) => {
    dragStartXRef.current = clientX;
    dragStartYawRef.current = yaw;
  };

  const handlePointerMove = (clientX: number) => {
    if (dragStartXRef.current === null) return;
    const deltaX = clientX - dragStartXRef.current;
    const nextYaw = (dragStartYawRef.current - deltaX * 0.65 + 3600) % 360;
    setYaw(Math.round(nextYaw));
  };

  const handlePointerUp = () => {
    dragStartXRef.current = null;
  };

  // 현재 조준선(±26도 이내)에 들어온 미획득 보물 찾기
  const activeTarget = AR_TREASURES.find(
    item => !capturedIds.includes(item.id) && Math.abs(angleDiff(item.targetYaw, yaw)) <= 26
  );

  // 보물 캡처 저장
  const handleCapture = async (item: ArTreasureItem) => {
    if (capturedIds.includes(item.id)) return;
    const nextCaptured = Array.from(new Set([...capturedIds, item.id]));
    const isNowCompleted = nextCaptured.length >= AR_TREASURES.length;
    const nowIso = new Date().toISOString();

    setCapturedIds(nextCaptured);
    setCompleted(isNowCompleted);
    setCaptureFlash(`${item.emoji} ${item.name} 캡처 성공!`);
    setTimeout(() => setCaptureFlash(null), 1800);

    const payload = {
      teamId: normTeamId,
      teamName: teamObj?.name || normTeamId,
      capturedIds: nextCaptured,
      completed: isNowCompleted,
      completedAt: isNowCompleted ? nowIso : undefined,
      updatedAt: nowIso,
      submittedBy: participantName || '참가자',
    };

    try {
      if (FIREBASE_DB_URL) {
        await fetch(`${FIREBASE_DB_URL}/sessions/trekking2026/arMissions/${normTeamId}.json`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      try {
        await set(ref(rtdb, `sessions/trekking2026/arMissions/${normTeamId}`), payload);
      } catch {}
      onMissionUpdated?.();
    } catch {}
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 font-['Noto_Sans_KR']">
      <div className="bg-[#0E1320] border border-purple-500/45 rounded-3xl max-w-[420px] w-full overflow-hidden shadow-2xl flex flex-col">
        {/* 상단 헤더 */}
        <div className="bg-gradient-to-r from-purple-950/90 via-indigo-950/80 to-slate-900 px-4 py-3.5 border-b border-white/10 flex items-center justify-between">
          <div>
            <span className="text-[10.5px] font-extrabold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/30">
              WEB AR 360° SPACE SCANNER
            </span>
            <h2 className="text-[17px] font-black text-white mt-0.5 flex items-center gap-1.5">
              🔮 {missionTitle}
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

        {/* 360도 AR 뷰파인더 영역 */}
        <div
          className="relative w-full h-[320px] bg-slate-950 overflow-hidden select-none cursor-grab active:cursor-grabbing"
          onMouseDown={e => handlePointerDown(e.clientX)}
          onMouseMove={e => handlePointerMove(e.clientX)}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerUp}
          onTouchStart={e => e.touches[0] && handlePointerDown(e.touches[0].clientX)}
          onTouchMove={e => e.touches[0] && handlePointerMove(e.touches[0].clientX)}
          onTouchEnd={handlePointerUp}
        >
          {/* 후면 카메라 비디오 스트림 */}
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className={`absolute inset-0 w-full h-full object-cover ${
              cameraReady && !cameraFallback ? 'opacity-90' : 'opacity-0'
            }`}
          />

          {/* 카메라 미허용 또는 PC 환경 시 사이버 AR 그리드 배경 */}
          {(!cameraReady || cameraFallback) && (
            <div
              className="absolute inset-0 bg-[radial-gradient(circle_at_center,#1e1b4b_0%,#090d16_100%)]"
              style={{
                backgroundImage:
                  'linear-gradient(rgba(139,92,246,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.12) 1px, transparent 1px)',
                backgroundSize: '28px 28px',
                backgroundPosition: `${-yaw * 2}px center`,
              }}
            />
          )}

          {/* 상단 360도 레이더 컴퍼스 바 */}
          <div className="absolute top-3 left-3 right-3 bg-black/65 backdrop-blur-md border border-white/15 rounded-xl px-3 py-1.5 flex items-center justify-between text-xs">
            <span className="text-purple-300 font-bold">🧭 스캔 방위각: {yaw}°</span>
            <div className="flex items-center gap-1.5">
              {AR_TREASURES.map(item => {
                const isFound = capturedIds.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      setYaw(item.targetYaw);
                    }}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-bold border transition-all ${
                      isFound
                        ? 'bg-emerald-500/30 border-emerald-400 text-emerald-200'
                        : 'bg-white/10 border-white/20 text-slate-200 hover:border-purple-400'
                    }`}
                    title="클릭 시 해당 보물 방위각으로 즉시 회전"
                  >
                    {item.emoji} {isFound ? '완료' : `${item.targetYaw}°`}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 360도 공간 내 부유하는 AR 보물 렌더링 */}
          {AR_TREASURES.map(item => {
            const diff = angleDiff(item.targetYaw, yaw);
            if (Math.abs(diff) > 65) return null; // 시야각 밖이면 숨김
            const offsetPercent = 50 + (diff / 55) * 50;
            const isFound = capturedIds.includes(item.id);
            const isLockedOn = Math.abs(diff) <= 26;

            return (
              <div
                key={item.id}
                style={{ left: `${offsetPercent}%` }}
                className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-auto"
              >
                <button
                  type="button"
                  onClick={() => handleCapture(item)}
                  className={`w-20 h-20 rounded-3xl flex flex-col items-center justify-center shadow-2xl border-2 transition-transform ${
                    isFound
                      ? 'bg-emerald-950/80 border-emerald-400/70 scale-90 opacity-75'
                      : isLockedOn
                      ? `bg-gradient-to-br ${item.badgeColor} border-white scale-110 animate-bounce`
                      : 'bg-black/70 border-purple-400/50 scale-95'
                  }`}
                >
                  <span className="text-3xl">{item.emoji}</span>
                  <span className="text-[10px] font-black text-white mt-0.5 px-1 truncate max-w-full">
                    {isFound ? '캡처됨' : '터치!'}
                  </span>
                </button>
                <span className="mt-1.5 px-2.5 py-0.5 rounded-full bg-black/80 border border-white/20 text-[11px] font-bold text-white whitespace-nowrap">
                  {item.name}
                </span>
              </div>
            );
          })}

          {/* 중앙 AR 타겟팅 조준선 (Reticle) */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div
              className={`w-36 h-36 rounded-full border-2 transition-all flex items-center justify-center ${
                activeTarget
                  ? 'border-amber-400 shadow-[0_0_30px_rgba(251,191,36,0.5)] scale-105'
                  : 'border-white/25 border-dashed'
              }`}
            >
              <div className="w-2 h-2 rounded-full bg-amber-400/80" />
            </div>
          </div>

          {/* 캡처 성공 토스트 */}
          {captureFlash && (
            <div className="absolute bottom-14 left-1/2 -translate-x-1/2 bg-emerald-500 text-slate-950 font-black text-xs px-4 py-2 rounded-full shadow-xl animate-bounce">
              {captureFlash}
            </div>
          )}

          {/* 하단 스캔 조작 힌트 */}
          <div className="absolute bottom-2.5 left-3 right-3 bg-black/65 backdrop-blur-md rounded-xl px-3 py-1.5 text-center text-[11.5px] text-slate-200 border border-white/10">
            👆 화면을 좌우로 드래그하거나 몸을 돌려 <strong>60° · 180° · 300°</strong>의 AR 보물 3개를 캡처하세요!
          </div>
        </div>

        {/* 하단 상태 및 캡처 버튼 패널 */}
        <div className="p-4 space-y-3">
          {completed ? (
            <div className="bg-gradient-to-r from-emerald-500/25 to-teal-500/20 border border-emerald-400/60 rounded-2xl p-3 text-center">
              <h3 className="text-[15px] font-black text-emerald-300">
                🎉 우리 조 AR 보물 3종 모두 캡처 완료! (+{rewardPoints}pt 획득)
              </h3>
            </div>
          ) : activeTarget ? (
            <button
              type="button"
              onClick={() => handleCapture(activeTarget)}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-pink-500 text-slate-950 font-black text-[15px] shadow-xl animate-pulse"
            >
              ✨ [{activeTarget.emoji} {activeTarget.name}] 타겟 포착! 지금 캡처하기
            </button>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setYaw((yaw - 30 + 360) % 360)}
                className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold"
              >
                ◀ 좌측 30° 회전
              </button>
              <button
                type="button"
                onClick={() => setYaw((yaw + 30) % 360)}
                className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold"
              >
                우측 30° 회전 ▶
              </button>
            </div>
          )}

          {/* 수집 인벤토리 슬롯 */}
          <div className="grid grid-cols-3 gap-2">
            {AR_TREASURES.map(item => {
              const isFound = capturedIds.includes(item.id);
              return (
                <div
                  key={item.id}
                  onClick={() => setYaw(item.targetYaw)}
                  className={`cursor-pointer rounded-xl p-2 text-center border transition-all ${
                    isFound
                      ? 'bg-emerald-500/15 border-emerald-400/50 text-emerald-200'
                      : 'bg-[#171F32] border-white/10 text-slate-400 hover:border-purple-400/40'
                  }`}
                >
                  <div className="text-xl">{item.emoji}</div>
                  <div className="text-[11px] font-bold truncate mt-0.5">{item.name}</div>
                  <div className="text-[10px] mt-0.5">
                    {isFound ? '✅ 획득 완료' : `📍 ${item.targetYaw}° 이동`}
                  </div>
                </div>
              );
            })}
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
