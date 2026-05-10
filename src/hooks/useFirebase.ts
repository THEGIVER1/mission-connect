import { useEffect, useRef } from 'react';
import { ref, onValue, set, serverTimestamp } from 'firebase/database';
import { rtdb } from '../lib/firebase';
import { useAppStore } from '../store/useAppStore';
import type { GpsCoord } from '../types';

// ─── GPS 위치를 Realtime DB에 업로드 (500ms 주기) ──────────────
export function useGpsUpload(teamId: string, participantId: string) {
  const setMyLocation = useAppStore((s) => s.setMyLocation);
  const watchId = useRef<number | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) return;

    const locationRef = ref(rtdb, `sessions/pilot-jamsil-2025/locations/${teamId}/${participantId}`);

    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const coord: GpsCoord = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setMyLocation(coord);
        set(locationRef, { ...coord, accuracy: pos.coords.accuracy, ts: serverTimestamp() });
      },
      (err) => console.error('GPS error:', err),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
    );

    return () => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    };
  }, [teamId, participantId, setMyLocation]);
}

// ─── 팀 점수 실시간 구독 ──────────────────────────────────────
export function useRealtimeScores(sessionId: string) {
  const updateTeamScore = useAppStore((s) => s.updateTeamScore);

  useEffect(() => {
    const scoresRef = ref(rtdb, `sessions/${sessionId}/scores`);
    const unsub = onValue(scoresRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) return;
      Object.entries(data).forEach(([teamId, score]) => {
        updateTeamScore(teamId, score as number);
      });
    });
    return () => unsub();
  }, [sessionId, updateTeamScore]);
}

// ─── GPS 범위 체크 유틸 ────────────────────────────────────────
export function useGpsProximity(missionId: string): { distanceMeters: number; isWithinRange: boolean } {
  const myLocation = useAppStore((s) => s.myLocation);
  const mission    = useAppStore((s) => s.missions.find((m) => m.id === missionId));

  if (!myLocation || !mission) return { distanceMeters: Infinity, isWithinRange: false };

  const dist = haversineDistance(myLocation, mission.location);
  return { distanceMeters: Math.round(dist), isWithinRange: dist <= mission.radiusMeters };
}

// Haversine 거리 계산 (미터)
function haversineDistance(a: GpsCoord, b: GpsCoord): number {
  const R = 6371000;
  const φ1 = (a.lat * Math.PI) / 180;
  const φ2 = (b.lat * Math.PI) / 180;
  const Δφ = ((b.lat - a.lat) * Math.PI) / 180;
  const Δλ = ((b.lng - a.lng) * Math.PI) / 180;
  const x  = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}
