import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { BottomNav } from '../dashboard/Dashboard';

type ArTarget = {
  id: string;
  name: string;
  emoji: string;
  points: number;
  lat: number;
  lng: number;
};

const AR_TARGETS: ArTarget[] = [
  { id: 'dusanhibiscus', name: '두산 무궁화', emoji: '🌸', points: 150, lat: 37.542577, lng: 127.149285 },
  { id: 'pear', name: '배나무', emoji: '🍐', points: 100, lat: 37.542698, lng: 127.150787 },
  { id: 'persimmon', name: '감나무', emoji: '🍊', points: 100, lat: 37.541608, lng: 127.152408 },
  { id: 'blueberry', name: '블루베리', emoji: '🫐', points: 100, lat: 37.541951, lng: 127.15133 },
  { id: 'aralia', name: '두릅나무', emoji: '🌿', points: 100, lat: 37.543243, lng: 127.15017 },
  { id: 'prayerhouse', name: '기도원', emoji: '⛪', points: 150, lat: 37.543406, lng: 127.149597 },
];
const AR_RADIUS_METERS = 30;

type GeoCoord = { lat: number; lng: number };

function getDistanceMeters(from: GeoCoord, to: GeoCoord) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const earthRadius = 6371000;
  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(earthRadius * c);
}

function useCamera(videoRef: React.RefObject<HTMLVideoElement>) {
  const [ready, setReady] = useState(false);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
            setReady(true);
          };
        }
      } catch (err: any) {
        if (cancelled) return;
        if (err?.name === 'NotAllowedError') {
          setDenied(true);
          return;
        }
        setError(err?.message ?? '카메라를 열 수 없습니다.');
      }
    }

    startCamera();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [videoRef]);

  return { ready, denied, error };
}

const ARScreen: React.FC = () => {
  const navigate = useNavigate();
  const myTeam = useAppStore((s) => s.myTeam);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { ready: camReady, denied, error } = useCamera(videoRef);

  const [foundMap, setFoundMap] = useState<Record<string, boolean>>({});
  const [busyTargetId, setBusyTargetId] = useState<string | null>(null);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<GeoCoord | null>(null);
  const [gpsChecking, setGpsChecking] = useState(false);
  const [message, setMessage] = useState<string>('');
  const [retryKey, setRetryKey] = useState(0);

  const foundCount = useMemo(
    () => AR_TARGETS.filter((target) => foundMap[target.id]).length,
    [foundMap]
  );
  const totalPoints = useMemo(
    () =>
      AR_TARGETS.reduce(
        (acc, target) => acc + (foundMap[target.id] ? target.points : 0),
        0
      ),
    [foundMap]
  );

  const participantId = myTeam?.id
    ? `${myTeam.id}_${Date.now()}`
    : `anonymous_${Date.now()}`;
  const selectedTarget = useMemo(
    () => AR_TARGETS.find((target) => target.id === selectedTargetId) ?? null,
    [selectedTargetId]
  );
  const distanceToSelected = useMemo(() => {
    if (!selectedTarget || !currentLocation) return null;
    return getDistanceMeters(currentLocation, { lat: selectedTarget.lat, lng: selectedTarget.lng });
  }, [currentLocation, selectedTarget]);
  const canCaptureSelected =
    !!camReady &&
    !!selectedTarget &&
    distanceToSelected !== null &&
    distanceToSelected <= AR_RADIUS_METERS &&
    !busyTargetId;

  useEffect(() => {
    if (!navigator.geolocation) {
      setMessage('이 브라우저는 위치 서비스를 지원하지 않습니다.');
      return;
    }

    setGpsChecking(true);
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setCurrentLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsChecking(false);
      },
      () => {
        setGpsChecking(false);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 12000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  useEffect(() => {
    if (!selectedTarget) return;
    if (gpsChecking) {
      setMessage('위치 확인 중...');
      return;
    }
    if (distanceToSelected === null) {
      setMessage('위치 정보를 가져오지 못했습니다. 위치 권한을 확인해 주세요.');
      return;
    }
    if (distanceToSelected > AR_RADIUS_METERS) {
      setMessage(`해당 위치로 이동하세요 (약 ${distanceToSelected}m)`);
      return;
    }
    setMessage(`${selectedTarget.emoji} ${selectedTarget.name} 촬영 가능 구역입니다. 캡처 버튼을 눌러주세요.`);
  }, [distanceToSelected, gpsChecking, selectedTarget]);

  const capturePhotoDataUrl = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.videoWidth === 0 || video.videoHeight === 0) {
      throw new Error('카메라 화면이 아직 준비되지 않았습니다.');
    }

    const maxWidth = 640;
    const scale = Math.min(1, maxWidth / video.videoWidth);
    canvas.width = Math.floor(video.videoWidth * scale);
    canvas.height = Math.floor(video.videoHeight * scale);

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('캔버스 초기화에 실패했습니다.');

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.7);
  }, []);

  const handleSelectTarget = useCallback(
    (target: ArTarget) => {
      if (!camReady || busyTargetId || foundMap[target.id]) return;
      setSelectedTargetId(target.id);
      setMessage('위치 확인 중...');
    },
    [busyTargetId, camReady, foundMap]
  );

  const handleCaptureSelected = useCallback(
    async (target: ArTarget) => {
      if (!canCaptureSelected || !camReady || busyTargetId || foundMap[target.id]) return;
      setBusyTargetId(target.id);
      setMessage('');

      try {
        capturePhotoDataUrl();
        const nowIso = new Date().toISOString();
        const nextFoundMap = { ...foundMap, [target.id]: true };
        const nextFoundCount = AR_TARGETS.filter((item) => nextFoundMap[item.id]).length;
        const nextTotalPoints = AR_TARGETS.reduce(
          (acc, item) => acc + (nextFoundMap[item.id] ? item.points : 0),
          0
        );

        // Firebase 저장 생략 (오프라인 모드)

        setFoundMap(nextFoundMap);
        setSelectedTargetId(null);
        setMessage(`${target.emoji} ${target.name} 발견 완료! +${target.points}pt`);
      } catch (err: any) {
        setMessage(err?.message ?? '오류가 발생했습니다.');
      } finally {
        setBusyTargetId(null);
      }
    },
    [busyTargetId, camReady, canCaptureSelected, capturePhotoDataUrl, foundMap, participantId]
  );

  return (
    <div
      key={retryKey}
      className="max-w-[390px] mx-auto bg-black min-h-screen flex flex-col relative overflow-hidden"
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover"
        style={{ display: camReady && !denied && !error ? 'block' : 'none' }}
      />
      <canvas ref={canvasRef} className="hidden" />

      {!camReady && !denied && !error && (
        <div className="absolute inset-0 bg-[#0D1117] flex items-center justify-center z-10">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-[12px] text-cyan-400">카메라 시작 중...</span>
          </div>
        </div>
      )}

      {(denied || error) && (
        <div className="absolute inset-0 bg-[#0D1117] flex items-center justify-center px-6 z-20">
          <div className="w-full text-center bg-[#111827] border border-white/10 rounded-2xl p-5">
            <p className="text-3xl mb-2">📷</p>
            <p className="text-white font-bold mb-2">카메라를 사용할 수 없습니다</p>
            <p className="text-[12px] text-slate-400 mb-4">
              {denied ? '브라우저 설정에서 카메라 권한을 허용해 주세요.' : error}
            </p>
            <button
              onClick={() => setRetryKey((k) => k + 1)}
              className="w-full py-3 bg-red-600 text-white font-bold rounded-xl text-[14px]"
            >
              다시 시도
            </button>
          </div>
        </div>
      )}

      <div className="absolute top-0 left-0 right-0 z-30 bg-black/60 backdrop-blur-sm border-b border-white/10 px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="w-9 h-9 rounded-xl bg-black/70 border border-white/15 flex items-center justify-center text-white text-base"
          >
            ←
          </button>
          <div className="text-right">
            <p className="text-[11px] text-cyan-300">연강원 AR 탐험</p>
            <p className="text-[13px] text-white font-bold">
              발견 {foundCount} / {AR_TARGETS.length} · {totalPoints}pt
            </p>
          </div>
        </div>
      </div>

      <div
        className="absolute left-0 right-0 bottom-16 z-30 px-4 pb-3"
        style={{ background: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.92) 35%)' }}
      >
        <div className="bg-[#0f172a]/95 border border-white/10 rounded-2xl p-3 space-y-2">
          {AR_TARGETS.map((target) => {
            const found = !!foundMap[target.id];
            const loading = busyTargetId === target.id;
            const selected = selectedTargetId === target.id;
            return (
              <div
                key={target.id}
                className={`flex items-center justify-between rounded-xl px-3 py-2.5 ${
                  found
                    ? 'bg-emerald-500/15 border border-emerald-400/30'
                    : selected
                    ? 'bg-cyan-500/20 border border-cyan-400/40'
                    : 'bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">{target.emoji}</span>
                  <div>
                    <p className="text-[13px] font-semibold text-white">{target.name}</p>
                    <p className="text-[11px] text-amber-300">{target.points}pt</p>
                  </div>
                </div>
                <button
                  disabled={!camReady || found || !!busyTargetId}
                  onClick={() => handleSelectTarget(target)}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-bold ${
                    found
                      ? 'bg-emerald-500 text-white'
                      : !camReady || !!busyTargetId
                      ? 'bg-slate-700 text-slate-300'
                      : 'bg-red-600 text-white'
                  }`}
                >
                  {found ? '완료' : loading ? '촬영 중...' : selected ? '선택됨' : '발견!'}
                </button>
              </div>
            );
          })}
          <button
            disabled={!canCaptureSelected}
            onClick={() => selectedTarget && void handleCaptureSelected(selectedTarget)}
            className={`w-full mt-1 py-3 rounded-xl text-[14px] font-bold ${
              !canCaptureSelected
                ? 'bg-slate-700 text-slate-300'
                : 'bg-amber-500 text-black'
            }`}
          >
            {busyTargetId
              ? '사진 촬영 및 저장 중...'
              : gpsChecking && selectedTarget
              ? '위치 확인 중...'
              : selectedTarget && distanceToSelected !== null && distanceToSelected > AR_RADIUS_METERS
              ? `해당 위치로 이동하세요 (약 ${distanceToSelected}m)`
              : selectedTarget
              ? `📸 ${selectedTarget.name} 캡처`
              : '대상을 먼저 선택하세요'}
          </button>
          {message && <p className="text-[12px] text-cyan-300 px-1 pt-1">{message}</p>}
        </div>
      </div>

      <BottomNav active="/ar" />
    </div>
  );
};

export default ARScreen;
