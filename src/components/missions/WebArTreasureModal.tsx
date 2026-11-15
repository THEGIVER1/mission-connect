import React, { useState, useEffect, useRef } from 'react';
import { onValue, ref, set, update } from 'firebase/database';
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
  id: 'crystal_core' | 'golden_key' | 'oneteam_trophy';
  stepNum: number;
  name: string;
  emoji: string;
  targetYaw: number;
  badgeColor: string;
  missionLabel: string;
}

const AR_TREASURES: ArTreasureItem[] = [
  {
    id: 'crystal_core',
    stepNum: 1,
    name: '소통의 크리스탈',
    emoji: '💎',
    targetYaw: 60,
    badgeColor: 'from-cyan-400 to-sky-500',
    missionLabel: '칭찬 릴레이 봉인 해제',
  },
  {
    id: 'golden_key',
    stepNum: 2,
    name: '이노베이션 황금열쇠',
    emoji: '🔑',
    targetYaw: 180,
    badgeColor: 'from-amber-400 to-orange-500',
    missionLabel: '팀 시너지 밸런스 선택',
  },
  {
    id: 'oneteam_trophy',
    stepNum: 3,
    name: '원팀 홀로그램 트로피',
    emoji: '🏆',
    targetYaw: 300,
    badgeColor: 'from-purple-400 to-pink-500',
    missionLabel: 'AR 홀로그램 단체 스냅샷',
  },
];

const SYNERGY_CHOICES = [
  '서로의 이야기를 끝까지 경청하고 공감할 때',
  '어려운 문제도 웃으며 긍정 에너지로 돌파할 때',
  '각자의 다른 강점을 하나로 모아 실행할 때',
  '작은 성공도 함께 축하하고 응원해 줄 때',
];

function angleDiff(a: number, b: number): number {
  return ((a - b + 540) % 360) - 180;
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
  const missionTitle =
    LIVE_EVENT_CONFIG.arMissionTitle || '웹 AR 360° 가치 캡처 & 홀로그램 스냅샷';

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [cameraReady, setCameraReady] = useState<boolean>(false);
  const [cameraFallback, setCameraFallback] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [yaw, setYaw] = useState<number>(60);
  const [gyroActive, setGyroActive] = useState<boolean>(false);
  const [needsGyroPermission, setNeedsGyroPermission] = useState<boolean>(false);
  const initialHeadingRef = useRef<number | null>(null);
  const manualOffsetRef = useRef<number>(0);
  const lastSensorHeadingRef = useRef<number | null>(null);
  const lastMotionTimeRef = useRef<number>(0);

  const [capturedIds, setCapturedIds] = useState<string[]>([]);
  const [completed, setCompleted] = useState<boolean>(false);
  const [praiseNote, setPraiseNote] = useState<string>('');
  const [synergyChoice, setSynergyChoice] = useState<string>(SYNERGY_CHOICES[0]);
  const [arPhotoUrl, setArPhotoUrl] = useState<string | null>(null);
  const [arCaption, setArCaption] = useState<string>('');

  // 현재 열린 봉인 해제 서브 모달
  const [selectedArtifact, setSelectedArtifact] = useState<ArTreasureItem | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const dragStartXRef = useRef<number | null>(null);
  const dragStartYawRef = useRef<number>(60);
  const celebratedRef = useRef<boolean>(false);

  // 1. 카메라 연결 (전면/후면 전환 지원)
  useEffect(() => {
    if (!isOpen) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      setCameraReady(false);
      setSelectedArtifact(null);
      return;
    }

    let cancelled = false;
    const startCamera = async () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraFallback(true);
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facingMode } },
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
        if (!cancelled) setCameraFallback(true);
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
  }, [isOpen, facingMode]);

  // 2. 스마트폰 360도 자이로 방위각 + 모션 회전 속도(rotationRate) 통합 연동 (iOS 권한 및 안드로이드 완벽 대응)
  const requestGyroPermission = async () => {
    try {
      const doe = window.DeviceOrientationEvent as any;
      if (doe && typeof doe.requestPermission === 'function') {
        const res = await doe.requestPermission();
        if (res !== 'granted') {
          showToast('방향 센서 권한이 거부되었습니다. 화면 터치 드래그를 이용해 주세요.');
          return;
        }
      }
      const dme = window.DeviceMotionEvent as any;
      if (dme && typeof dme.requestPermission === 'function') {
        await dme.requestPermission().catch(() => {});
      }
      setNeedsGyroPermission(false);
      setGyroActive(true);
      showToast('🧭 360° 공간 회전 센서가 활성화되었습니다!');
    } catch {
      setNeedsGyroPermission(false);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      initialHeadingRef.current = null;
      lastSensorHeadingRef.current = null;
      setGyroActive(false);
      return;
    }

    const doe = window.DeviceOrientationEvent as any;
    if (doe && typeof doe.requestPermission === 'function') {
      setNeedsGyroPermission(true);
    }

    const handleOrientation = (e: any) => {
      let heading: number | null = null;
      if (typeof e.webkitCompassHeading === 'number' && !Number.isNaN(e.webkitCompassHeading)) {
        heading = e.webkitCompassHeading;
      } else if (typeof e.alpha === 'number' && !Number.isNaN(e.alpha)) {
        heading = (360 - e.alpha) % 360;
      }

      if (heading !== null) {
        if (initialHeadingRef.current === null) {
          // 처음 모달을 열었을 때 정면을 60°(1단계 크리스탈 방향) 기준으로 캘리브레이션
          initialHeadingRef.current = heading;
        }
        lastSensorHeadingRef.current = heading;
        setGyroActive(true);
        const rel = (heading - initialHeadingRef.current + 60 + manualOffsetRef.current + 3600) % 360;
        setYaw(Math.round(rel));
      }
    };

    // 자력계가 없거나 alpha가 고정된 기기에서도 휴대폰을 좌우로 돌리는 각속도(rotationRate)로 즉시 회전 반영
    const handleMotion = (e: DeviceMotionEvent) => {
      if (lastSensorHeadingRef.current !== null) return; // 방향 센서가 작동 중이면 중복 계산 생략
      const rot = e.rotationRate;
      if (!rot) return;
      const now = Date.now();
      const dt = lastMotionTimeRef.current ? (now - lastMotionTimeRef.current) / 1000 : 0.05;
      lastMotionTimeRef.current = now;
      if (dt <= 0 || dt > 0.5) return;

      // 세로로 든 휴대폰을 좌우로 회전할 때 alpha 또는 gamma 축 각속도 발생
      const rate = (rot.alpha || 0) + (rot.gamma || 0) * 0.7;
      if (Math.abs(rate) > 4) {
        setGyroActive(true);
        setYaw(prev => Math.round((prev - rate * dt * 1.2 + 3600) % 360));
      }
    };

    window.addEventListener('deviceorientationabsolute', handleOrientation as any, true);
    window.addEventListener('deviceorientation', handleOrientation as any, true);
    window.addEventListener('devicemotion', handleMotion, true);

    return () => {
      window.removeEventListener('deviceorientationabsolute', handleOrientation as any, true);
      window.removeEventListener('deviceorientation', handleOrientation as any, true);
      window.removeEventListener('devicemotion', handleMotion, true);
    };
  }, [isOpen]);

  // 3. Firebase RTDB 실시간 동기화
  useEffect(() => {
    if (!isOpen) return;

    const parseData = (val: any) => {
      if (!val || typeof val !== 'object') return;
      const list = Array.isArray(val.capturedIds)
        ? Array.from(new Set(val.capturedIds.map(String)))
        : [];
      const isDone = Boolean(val.completed) || list.length >= 3;
      setCapturedIds(list);
      setCompleted(isDone);
      if (val.praiseNote) setPraiseNote(val.praiseNote);
      if (val.synergyChoice) setSynergyChoice(val.synergyChoice);
      if (val.arPhotoUrl) setArPhotoUrl(val.arPhotoUrl);
      if (val.arCaption) setArCaption(val.arCaption);

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
          if (data) parseData(data);
        }
      } catch {}
    };

    fetchAr();
    const poll = setInterval(fetchAr, 2500);

    let unsubscribe = () => {};
    try {
      const arRef = ref(rtdb, `sessions/trekking2026/arMissions/${normTeamId}`);
      unsubscribe = onValue(arRef, snap => {
        if (snap.exists()) parseData(snap.val());
      });
    } catch {}

    return () => {
      clearInterval(poll);
      unsubscribe();
    };
  }, [isOpen, normTeamId]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2200);
  };

  // 터치/마우스 드래그로 360도 시야 회전 (자이로 센서와 함께 써도 튕기지 않도록 오프셋 동기화)
  const setTargetYawSmooth = (targetAngle: number) => {
    if (lastSensorHeadingRef.current !== null && initialHeadingRef.current !== null) {
      const currentSensorRel = (lastSensorHeadingRef.current - initialHeadingRef.current + 60 + 3600) % 360;
      manualOffsetRef.current = (targetAngle - currentSensorRel + 3600) % 360;
    }
    setYaw((targetAngle + 3600) % 360);
  };

  const handlePointerDown = (clientX: number) => {
    dragStartXRef.current = clientX;
    dragStartYawRef.current = yaw;
  };
  const handlePointerMove = (clientX: number) => {
    if (dragStartXRef.current === null) return;
    const deltaX = clientX - dragStartXRef.current;
    const nextYaw = Math.round((dragStartYawRef.current - deltaX * 0.65 + 3600) % 360);
    setTargetYawSmooth(nextYaw);
  };
  const handlePointerUp = () => {
    dragStartXRef.current = null;
  };

  // 실시간 카메라 화면 + AR 홀로그램 프레임을 1장의 이미지로 합성 캡처
  const captureLiveArFrame = (): string => {
    const canvas = document.createElement('canvas');
    const W = 800;
    const H = 600;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // 1) 비디오 프레임 또는 사이버 배경 그리기
    if (videoRef.current && cameraReady && !cameraFallback && videoRef.current.videoWidth > 0) {
      ctx.drawImage(videoRef.current, 0, 0, W, H);
    } else {
      const grad = ctx.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, W / 1.2);
      grad.addColorStop(0, '#1e1b4b');
      grad.addColorStop(1, '#090d16');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    }

    // 2) AR 홀로그램 오버레이 프레임 합성
    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 6;
    ctx.strokeRect(20, 20, W - 40, H - 40);

    // 상단 홀로그램 배너
    ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
    ctx.fillRect(20, 20, W - 40, 64);
    ctx.fillStyle = '#38BDF8';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText(
      `🔮 WEB AR 360° SYNERGY CERTIFIED · ${teamObj?.name || normTeamId}`,
      42,
      60
    );

    // 하단 칭찬 & 시너지 요약 배너
    ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
    ctx.fillRect(20, H - 96, W - 40, 76);
    ctx.fillStyle = '#FBBF24';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(
      `🏆 ${arCaption || `${teamObj?.name || '우리 조'} 원팀 홀로그램 인증 완료!`}`,
      42,
      H - 58
    );
    ctx.fillStyle = '#E2E8F0';
    ctx.font = '16px sans-serif';
    ctx.fillText(
      `💎 칭찬: ${(praiseNote || '최고의 동료들').slice(0, 36)}`,
      42,
      H - 32
    );

    return canvas.toDataURL('image/jpeg', 0.84);
  };

  // 갤러리/카메라 파일 업로드 시 AR 홀로그램 프레임 합성
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const W = 800;
        const H = 600;
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, W, H);
          ctx.strokeStyle = '#A855F7';
          ctx.lineWidth = 6;
          ctx.strokeRect(18, 18, W - 36, H - 36);
          ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
          ctx.fillRect(18, H - 80, W - 36, 62);
          ctx.fillStyle = '#FBBF24';
          ctx.font = 'bold 20px sans-serif';
          ctx.fillText(
            `🔮 AR SYNERGY · ${teamObj?.name || normTeamId} (${LIVE_EVENT_CONFIG.brandTitle})`,
            36,
            H - 42
          );
          setArPhotoUrl(canvas.toDataURL('image/jpeg', 0.84));
        }
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // 아티팩트별 봉인 해제 저장
  const handleUnlockArtifact = async (item: ArTreasureItem) => {
    if (item.id === 'crystal_core' && !praiseNote.trim()) {
      alert('우리 조원에게 전할 칭찬과 이름을 한 줄로 입력해 주세요!');
      return;
    }

    let finalPhotoUrl = arPhotoUrl;
    if (item.id === 'oneteam_trophy' && !finalPhotoUrl) {
      finalPhotoUrl = captureLiveArFrame();
      setArPhotoUrl(finalPhotoUrl);
    }

    setIsSaving(true);
    const nextCaptured = Array.from(new Set([...capturedIds, item.id]));
    const isNowCompleted = nextCaptured.length >= AR_TREASURES.length;
    const nowIso = new Date().toISOString();

    const arPayload: Record<string, any> = {
      teamId: normTeamId,
      teamName: teamObj?.name || normTeamId,
      capturedIds: nextCaptured,
      praiseNote: praiseNote.trim(),
      synergyChoice,
      arPhotoUrl: finalPhotoUrl || null,
      arCaption: arCaption.trim() || `${teamObj?.name || normTeamId} AR 시너지 스냅샷`,
      completed: isNowCompleted,
      completedAt: isNowCompleted ? nowIso : undefined,
      updatedAt: nowIso,
      submittedBy: participantName || '참가자',
    };

    try {
      if (FIREBASE_DB_URL) {
        await fetch(`${FIREBASE_DB_URL}/sessions/trekking2026/arMissions/${normTeamId}.json`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(arPayload),
        });

        // 3단계 AR 스냅샷 완료 시 themeGardenPhotos 경로에도 자동 저장하여 STEP 4 사진투표에 100% 연동
        if (item.id === 'oneteam_trophy' && finalPhotoUrl) {
          const photoRecord = {
            teamId: normTeamId,
            teamName: teamObj?.name || normTeamId,
            photoUrl: finalPhotoUrl,
            uploadedBy: participantName || '참가자',
            uploadedCompany: LIVE_EVENT_CONFIG.venueName || '',
            uploadedAt: nowIso,
            status: 'submitted',
            caption:
              arCaption.trim() ||
              `[AR 홀로그램 인증] ${praiseNote.trim() ? `칭찬: ${praiseNote.trim()}` : ''}`,
          };
          await fetch(
            `${FIREBASE_DB_URL}/sessions/trekking2026/themeGardenPhotos/${normTeamId}.json`,
            {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(photoRecord),
            }
          );
          try {
            await set(
              ref(rtdb, `sessions/trekking2026/themeGardenPhotos/${normTeamId}`),
              photoRecord
            );
          } catch {}
        }
      }
      try {
        await update(ref(rtdb, `sessions/trekking2026/arMissions/${normTeamId}`), arPayload);
      } catch {}

      setCapturedIds(nextCaptured);
      setCompleted(isNowCompleted);
      setSelectedArtifact(null);
      showToast(`✨ [${item.emoji} ${item.name}] 봉인 해제 완료!`);
      if (isNowCompleted) {
        try {
          fireConfetti();
        } catch {}
      }
      onMissionUpdated?.();
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const activeTarget = AR_TREASURES.find(
    item => !capturedIds.includes(item.id) && Math.abs(angleDiff(item.targetYaw, yaw)) <= 26
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 font-['Noto_Sans_KR']">
      <div className="bg-[#0E1320] border border-purple-500/45 rounded-3xl max-w-[430px] w-full overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* 상단 헤더 */}
        <div className="bg-gradient-to-r from-purple-950/90 via-indigo-950/80 to-slate-900 px-4 py-3 border-b border-white/10 flex items-center justify-between shrink-0">
          <div>
            <span className="text-[10.5px] font-extrabold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/30">
              INDOOR TEAM SYNERGY MISSION 2
            </span>
            <h2 className="text-[16px] font-black text-white mt-0.5 flex items-center gap-1.5">
              🔮 {missionTitle}
            </h2>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setFacingMode(m => (m === 'environment' ? 'user' : 'environment'))}
              className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold text-purple-200"
              title="전면/후면 카메라 전환"
            >
              🔄 {facingMode === 'environment' ? '셀카전환' : '후면전환'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 flex items-center justify-center text-sm font-bold"
            >
              ✕
            </button>
          </div>
        </div>

        {/* 360도 AR 뷰파인더 영역 */}
        <div
          className="relative w-full h-[290px] bg-slate-950 overflow-hidden select-none cursor-grab active:cursor-grabbing shrink-0"
          onMouseDown={e => handlePointerDown(e.clientX)}
          onMouseMove={e => handlePointerMove(e.clientX)}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerUp}
          onTouchStart={e => e.touches[0] && handlePointerDown(e.touches[0].clientX)}
          onTouchMove={e => e.touches[0] && handlePointerMove(e.touches[0].clientX)}
          onTouchEnd={handlePointerUp}
        >
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className={`absolute inset-0 w-full h-full object-cover ${
              cameraReady && !cameraFallback ? 'opacity-90' : 'opacity-0'
            }`}
          />

          {(!cameraReady || cameraFallback) && (
            <div
              className="absolute inset-0 bg-[radial-gradient(circle_at_center,#1e1b4b_0%,#090d16_100%)]"
              style={{
                backgroundImage:
                  'linear-gradient(rgba(139,92,246,0.14) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.14) 1px, transparent 1px)',
                backgroundSize: '28px 28px',
                backgroundPosition: `${-yaw * 2}px center`,
              }}
            />
          )}

          {/* 상단 레이더 바 */}
          <div className="absolute top-2.5 left-2.5 right-2.5 bg-black/70 backdrop-blur-md border border-white/15 rounded-xl px-3 py-1.5 flex items-center justify-between text-xs z-20">
            <div className="flex items-center gap-1.5">
              <span className="text-purple-300 font-bold">🧭 {yaw}°</span>
              {needsGyroPermission ? (
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    requestGyroPermission();
                  }}
                  className="px-2 py-0.5 rounded-md bg-amber-400 text-slate-950 font-black text-[10.5px] animate-pulse"
                >
                  📱 공간회전 센서 켜기
                </button>
              ) : (
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                  gyroActive ? 'bg-emerald-500/25 text-emerald-300' : 'bg-white/10 text-slate-400'
                }`}>
                  {gyroActive ? '자이로 ON' : '터치/회전'}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {AR_TREASURES.map(item => {
                const isFound = capturedIds.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      setTargetYawSmooth(item.targetYaw);
                    }}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${
                      isFound
                        ? 'bg-emerald-500/30 border-emerald-400 text-emerald-200'
                        : 'bg-white/10 border-white/20 text-slate-200'
                    }`}
                  >
                    {item.emoji} {isFound ? '완료' : `${item.targetYaw}°`}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 시야 밖 아티팩트 방향 유도 인디케이터 (좌/우 화살표) */}
          {(() => {
            const nextUnfound = AR_TREASURES.find(t => !capturedIds.includes(t.id));
            if (!nextUnfound) return null;
            const d = angleDiff(nextUnfound.targetYaw, yaw);
            if (Math.abs(d) <= 45) return null;
            const isRight = d > 0;
            return (
              <div
                onClick={e => {
                  e.stopPropagation();
                  setTargetYawSmooth(nextUnfound.targetYaw);
                }}
                className={`absolute top-1/2 -translate-y-1/2 ${
                  isRight ? 'right-2.5' : 'left-2.5'
                } bg-amber-400/90 text-slate-950 font-black text-xs px-2.5 py-2 rounded-2xl shadow-xl cursor-pointer animate-pulse z-20 flex items-center gap-1`}
              >
                {!isRight && <span>◀</span>}
                <span>{nextUnfound.emoji} {nextUnfound.stepNum}단계</span>
                {isRight && <span>▶</span>}
              </div>
            );
          })()}

          {/* 360도 AR 오브젝트 */}
          {AR_TREASURES.map(item => {
            const diff = angleDiff(item.targetYaw, yaw);
            if (Math.abs(diff) > 65) return null;
            const offsetPercent = 50 + (diff / 55) * 50;
            const isFound = capturedIds.includes(item.id);
            const isLockedOn = Math.abs(diff) <= 26;

            return (
              <div
                key={item.id}
                style={{ left: `${offsetPercent}%` }}
                className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
              >
                <button
                  type="button"
                  onClick={() => setSelectedArtifact(item)}
                  className={`w-20 h-20 rounded-3xl flex flex-col items-center justify-center shadow-2xl border-2 transition-transform ${
                    isFound
                      ? 'bg-emerald-950/85 border-emerald-400 scale-95'
                      : isLockedOn
                      ? `bg-gradient-to-br ${item.badgeColor} border-white scale-110 animate-bounce`
                      : 'bg-black/70 border-purple-400/50 scale-95'
                  }`}
                >
                  <span className="text-3xl">{item.emoji}</span>
                  <span className="text-[10px] font-black text-white mt-0.5">
                    {isFound ? '해제됨' : '미션열기'}
                  </span>
                </button>
                <span className="mt-1 px-2.5 py-0.5 rounded-full bg-black/80 border border-white/20 text-[11px] font-bold text-white whitespace-nowrap">
                  {item.stepNum}. {item.name}
                </span>
              </div>
            );
          })}

          {/* 중앙 조준선 */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div
              className={`w-32 h-32 rounded-full border-2 transition-all flex items-center justify-center ${
                activeTarget
                  ? 'border-amber-400 shadow-[0_0_30px_rgba(251,191,36,0.5)] scale-105'
                  : 'border-white/25 border-dashed'
              }`}
            >
              <div className="w-2 h-2 rounded-full bg-amber-400/80" />
            </div>
          </div>

          {toastMsg && (
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 bg-emerald-500 text-slate-950 font-black text-xs px-4 py-1.5 rounded-full shadow-xl">
              {toastMsg}
            </div>
          )}

          <div className="absolute bottom-2 left-2.5 right-2.5 bg-black/70 backdrop-blur-md rounded-xl px-3 py-1 text-center text-[11px] text-slate-200 border border-white/10">
            👆 화면을 좌우로 드래그하거나 회전하여 3개의 AR 가치 아티팩트를 포착하고 봉인을 해제하세요!
          </div>
        </div>

        {/* 하단 봉인 해제 미션 패널 */}
        <div className="p-4 space-y-3 overflow-y-auto flex-1">
          {selectedArtifact ? (
            <div className="bg-[#181F36] border-2 border-amber-400/70 rounded-2xl p-3.5 space-y-2.5 animate-fade-in">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-black text-amber-300 flex items-center gap-1.5">
                  {selectedArtifact.emoji} {selectedArtifact.stepNum}단계: {selectedArtifact.name} 봉인 해제
                </h4>
                <button
                  type="button"
                  onClick={() => setSelectedArtifact(null)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  닫기 ✕
                </button>
              </div>

              {selectedArtifact.id === 'crystal_core' && (
                <div className="space-y-2">
                  <p className="text-xs text-slate-200">
                    💬 <strong>칭찬 릴레이 미션:</strong> 오늘 우리 조에서 가장 밝은 에너지를 준 동료의 이름과 칭찬 한마디를 남겨주세요!
                  </p>
                  <input
                    type="text"
                    value={praiseNote}
                    onChange={e => setPraiseNote(e.target.value)}
                    placeholder="예: 김OO님, 밝은 미소로 조 분위기를 이끌어주셔서 감사합니다!"
                    className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-2 text-xs text-white"
                  />
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => handleUnlockArtifact(selectedArtifact)}
                    className="w-full py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black text-xs"
                  >
                    💎 소통의 크리스탈 봉인 해제 완료
                  </button>
                </div>
              )}

              {selectedArtifact.id === 'golden_key' && (
                <div className="space-y-2">
                  <p className="text-xs text-slate-200">
                    🔑 <strong>팀 시너지 밸런스:</strong> 우리 조원들이 생각하는 "최고의 원팀 시너지가 나는 순간"을 함께 골라주세요!
                  </p>
                  <div className="space-y-1.5">
                    {SYNERGY_CHOICES.map(choice => (
                      <button
                        key={choice}
                        type="button"
                        onClick={() => setSynergyChoice(choice)}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                          synergyChoice === choice
                            ? 'bg-amber-400/20 border-amber-400 text-amber-200'
                            : 'bg-black/40 border-white/10 text-slate-300'
                        }`}
                      >
                        {synergyChoice === choice ? '✓ ' : '• '} {choice}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => handleUnlockArtifact(selectedArtifact)}
                    className="w-full py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs"
                  >
                    🔑 이노베이션 황금열쇠 봉인 해제 완료
                  </button>
                </div>
              )}

              {selectedArtifact.id === 'oneteam_trophy' && (
                <div className="space-y-2.5">
                  <p className="text-xs text-slate-200">
                    📸 <strong>AR 홀로그램 단체 스냅샷:</strong> 조원들과 함께 카메라를 보며 하이파이브/브이 포즈를 취하고 <strong>[AR 홀로그램 스냅샷 찍기]</strong> 또는 사진 업로드를 진행해 주세요! *(STEP 4 사진투표 갤러리에 자동 등록됩니다)*
                  </p>

                  {arPhotoUrl && (
                    <img
                      src={arPhotoUrl}
                      alt="AR 스냅샷"
                      className="w-full h-36 object-cover rounded-xl border border-purple-400/50"
                    />
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const snap = captureLiveArFrame();
                        if (snap) setArPhotoUrl(snap);
                      }}
                      className="py-2.5 rounded-xl bg-purple-500/25 hover:bg-purple-500/35 border border-purple-400 text-purple-200 text-xs font-black"
                    >
                      📸 현재 AR 화면 즉시 캡처
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="py-2.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/50 text-sky-200 text-xs font-bold"
                    >
                      🖼️ 휴대폰 사진에 AR 합성
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>

                  <input
                    type="text"
                    value={arCaption}
                    onChange={e => setArCaption(e.target.value)}
                    placeholder="사진 한 줄 메시지 (예: 우리 조 시너지 최고!)"
                    className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-2 text-xs text-white"
                  />

                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => handleUnlockArtifact(selectedArtifact)}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-400 to-pink-500 text-slate-950 font-black text-xs shadow-lg"
                  >
                    🏆 AR 스냅샷 저장 & 원팀 트로피 봉인 해제!
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              {completed ? (
                <div className="bg-gradient-to-r from-emerald-500/25 to-teal-500/20 border border-emerald-400/60 rounded-2xl p-3 text-center">
                  <h3 className="text-[14.5px] font-black text-emerald-300">
                    🎉 3대 가치 캡처 & AR 홀로그램 스냅샷 완료! (+{rewardPoints}pt 획득)
                  </h3>
                  <p className="text-[11.5px] text-slate-300 mt-0.5">
                    아래 카드를 눌러 언제든 답변이나 AR 사진을 수정할 수 있습니다.
                  </p>
                </div>
              ) : activeTarget ? (
                <button
                  type="button"
                  onClick={() => setSelectedArtifact(activeTarget)}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-pink-500 text-slate-950 font-black text-[14.5px] shadow-xl animate-pulse"
                >
                  ✨ [{activeTarget.emoji} {activeTarget.name}] 포착! 터치하여 봉인 해제 미션 열기
                </button>
              ) : null}

              {/* 3개 아티팩트 슬롯 */}
              <div className="grid grid-cols-3 gap-2">
                {AR_TREASURES.map(item => {
                  const isFound = capturedIds.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setTargetYawSmooth(item.targetYaw);
                        setSelectedArtifact(item);
                      }}
                      className={`rounded-xl p-2 text-center border transition-all ${
                        isFound
                          ? 'bg-emerald-500/15 border-emerald-400/50 text-emerald-200'
                          : 'bg-[#171F32] border-white/10 text-slate-300 hover:border-purple-400/50'
                      }`}
                    >
                      <div className="text-xl">{item.emoji}</div>
                      <div className="text-[11px] font-bold truncate mt-0.5">{item.name}</div>
                      <div className="text-[10px] text-slate-400 truncate">{item.missionLabel}</div>
                      <div className="text-[10px] font-extrabold mt-0.5 text-amber-300">
                        {isFound ? '✅ 해제 완료' : `🔓 ${item.targetYaw}° 열기`}
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}

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
