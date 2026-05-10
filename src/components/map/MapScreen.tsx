import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { BottomNav } from '../dashboard/Dashboard';
import { MissionStatusBadge, PointsBadge } from '../shared';
import type { Mission } from '../../types';

// ─── 두산경영연구원 트레킹 포스트 위치 (GPS 좌표) ───────────────
export const TREKKING_POSTS: Record<string, { lat: number; lng: number; label: string }> = {
  m1: { lat: 37.5415, lng: 127.1368, label: '연구원 광장' },
  m2: { lat: 37.5408, lng: 127.1382, label: '산책로 입구' },
  m3: { lat: 37.5398, lng: 127.1390, label: '저수지 입구' },
  m4: { lat: 37.5388, lng: 127.1398, label: '저수지 둘레길' },
  m5: { lat: 37.5380, lng: 127.1385, label: '저수지 전망대' },
};

// ─── SVG 지도 내 포스트 위치 (픽셀) ────────────────────────────
const POST_POS: Record<string, { cx: number; cy: number }> = {
  m1: { cx: 155, cy: 60  },
  m2: { cx: 240, cy: 120 },
  m3: { cx: 260, cy: 200 },
  m4: { cx: 280, cy: 275 },
  m5: { cx: 200, cy: 310 },
};
const MY_POS = { cx: 170, cy: 160 };

const markerColor = (status: Mission['status']) => {
  switch (status) {
    case 'completed':   return '#27AE60';
    case 'active':      return '#E31837';
    case 'in_progress': return '#F5A623';
    case 'locked':      return '#4A5568';
  }
};

function haversine(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const φ1 = (a.lat * Math.PI) / 180;
  const φ2 = (b.lat * Math.PI) / 180;
  const Δφ = ((b.lat - a.lat) * Math.PI) / 180;
  const Δλ = ((b.lng - a.lng) * Math.PI) / 180;
  const x  = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x)));
}

// ─── 두산경영연구원 + 저수지 지형 SVG 지도 ─────────────────────
const TrekkingMap: React.FC<{
  missions: Mission[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}> = ({ missions, selectedId, onSelect }) => (
  <svg width="390" height="340" viewBox="0 0 390 340" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
    {/* 배경 */}
    <rect width="390" height="340" fill="#1A2E1A" />

    {/* 숲/녹지 */}
    <ellipse cx="200" cy="160" rx="185" ry="155" fill="#1E3A1E" />

    {/* 산책로 메인 경로 */}
    <path d="M155 60 Q200 90 240 120 Q255 160 260 200 Q270 240 280 275 Q240 300 200 310"
          fill="none" stroke="#8B7355" strokeWidth="8" strokeLinecap="round" opacity=".6" />
    <path d="M155 60 Q200 90 240 120 Q255 160 260 200 Q270 240 280 275 Q240 300 200 310"
          fill="none" stroke="#C4A96B" strokeWidth="3" strokeLinecap="round" strokeDasharray="6,4" opacity=".8" />

    {/* 두산경영연구원 건물 */}
    <rect x="100" y="35" width="80" height="50" rx="4" fill="#2A3F5C" stroke="#4A7AB5" strokeWidth="1.5" />
    <rect x="108" y="42" width="16" height="16" rx="2" fill="#3A5A8C" opacity=".8" />
    <rect x="130" y="42" width="16" height="16" rx="2" fill="#3A5A8C" opacity=".8" />
    <rect x="152" y="42" width="16" height="16" rx="2" fill="#3A5A8C" opacity=".8" />
    <rect x="108" y="62" width="16" height="16" rx="2" fill="#3A5A8C" opacity=".8" />
    <rect x="130" y="62" width="16" height="16" rx="2" fill="#3A5A8C" opacity=".8" />
    <rect x="152" y="62" width="16" height="16" rx="2" fill="#3A5A8C" opacity=".8" />
    <text x="140" y="30" textAnchor="middle" fontSize="8" fill="#7AB5E8" fontFamily="sans-serif" fontWeight="bold">두산경영연구원</text>

    {/* 저수지 */}
    <ellipse cx="215" cy="295" rx="80" ry="38" fill="#1A3A5C" stroke="#2980B9" strokeWidth="1.5" opacity=".9" />
    <ellipse cx="215" cy="295" rx="65" ry="28" fill="#1E4A70" opacity=".7" />
    {/* 물결 효과 */}
    <path d="M155 292 Q175 288 195 292 Q215 296 235 292 Q255 288 275 292" fill="none" stroke="#4A90C4" strokeWidth="1" opacity=".5" />
    <path d="M160 300 Q180 296 200 300 Q220 304 240 300 Q260 296 278 300" fill="none" stroke="#4A90C4" strokeWidth="1" opacity=".4" />
    <text x="215" y="298" textAnchor="middle" fontSize="9" fill="#7AB5E8" fontFamily="sans-serif" fontWeight="bold">두산저수지</text>

    {/* 나무들 */}
    {[[60,80],[80,140],[60,220],[90,280],[330,100],[350,180],[320,260],[340,300]].map(([x,y], i) => (
      <g key={i}>
        <circle cx={x} cy={y} r={12} fill="#2D5A2D" opacity=".8" />
        <circle cx={x} cy={y-4} r={9} fill="#3D7A3D" opacity=".9" />
      </g>
    ))}

    {/* 완료 포스트 연결선 */}
    {missions.filter(m => m.status === 'completed').map((m, i, arr) => {
      if (i === 0) return null;
      const a = POST_POS[arr[i-1].id];
      const b = POST_POS[m.id];
      if (!a || !b) return null;
      return <line key={m.id} x1={a.cx} y1={a.cy} x2={b.cx} y2={b.cy}
                   stroke="#27AE60" strokeWidth="2" strokeDasharray="5,3" opacity=".7" />;
    })}

    {/* 현재 미션 방향선 */}
    {(() => {
      const active = missions.find(m => m.status === 'active');
      if (!active) return null;
      const p = POST_POS[active.id];
      if (!p) return null;
      return <line x1={MY_POS.cx} y1={MY_POS.cy} x2={p.cx} y2={p.cy}
                   stroke="#E31837" strokeWidth="1.5" strokeDasharray="5,3" opacity=".6" />;
    })()}

    {/* 포스트 마커 */}
    {missions.map(m => {
      const pos = POST_POS[m.id];
      if (!pos) return null;
      const color = markerColor(m.status);
      const isSel = m.id === selectedId;
      return (
        <g key={m.id} onClick={() => onSelect(m.id)} style={{ cursor: 'pointer' }}>
          {m.status === 'active' && (
            <circle cx={pos.cx} cy={pos.cy} r={28} fill="rgba(227,24,55,0.1)"
                    stroke="rgba(227,24,55,0.4)" strokeWidth="1">
              <animate attributeName="r" values="20;30" dur="1.5s" repeatCount="indefinite" />
              <animate attributeName="opacity" values=".5;0" dur="1.5s" repeatCount="indefinite" />
            </circle>
          )}
          {isSel && <circle cx={pos.cx} cy={pos.cy} r={22} fill="none" stroke="white" strokeWidth="2" opacity=".6" />}
          <circle cx={pos.cx} cy={pos.cy} r={isSel ? 14 : 11} fill={color}
                  stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
          <text x={pos.cx} y={pos.cy + 4} textAnchor="middle" fontSize="9"
                fill="white" fontWeight="bold" fontFamily="sans-serif">
            {m.status === 'completed' ? '✓' : m.status === 'locked' ? '🔒' : m.postId}
          </text>
          <rect x={pos.cx - 32} y={pos.cy + 16} width={64} height={14} rx={4} fill="rgba(13,17,23,0.85)" />
          <text x={pos.cx} y={pos.cy + 26} textAnchor="middle" fontSize="8"
                fill={color} fontFamily="sans-serif" fontWeight="bold">
            {TREKKING_POSTS[m.id]?.label ?? m.postId}
          </text>
        </g>
      );
    })}

    {/* 내 위치 */}
    <circle cx={MY_POS.cx} cy={MY_POS.cy} r={10} fill="none" stroke="rgba(41,128,185,0.25)" strokeWidth="1">
      <animate attributeName="r" values="10;26" dur="2s" repeatCount="indefinite" />
      <animate attributeName="opacity" values=".5;0" dur="2s" repeatCount="indefinite" />
    </circle>
    <circle cx={MY_POS.cx} cy={MY_POS.cy} r={8} fill="rgba(41,128,185,0.2)" stroke="#2980B9" strokeWidth="1.5" />
    <circle cx={MY_POS.cx} cy={MY_POS.cy} r={5} fill="#2980B9" />
    <rect x={MY_POS.cx - 20} y={MY_POS.cy - 22} width={40} height={13} rx={4} fill="rgba(13,17,23,0.85)" />
    <text x={MY_POS.cx} y={MY_POS.cy - 12} textAnchor="middle" fontSize="8"
          fill="#2980B9" fontFamily="sans-serif" fontWeight="bold">📍 내 위치</text>

    {/* 범례 */}
    <rect x="6" y="290" width="90" height="44" rx="6" fill="rgba(13,17,23,0.85)" />
    {[
      { color: '#27AE60', label: '완료', y: 302 },
      { color: '#E31837', label: '현재 목표', y: 314 },
      { color: '#4A5568', label: '잠금', y: 326 },
    ].map(({ color, label, y }) => (
      <g key={label}>
        <circle cx={16} cy={y} r={4} fill={color} />
        <text x={24} y={y + 4} fontSize="8" fill="#8EA0C0" fontFamily="sans-serif">{label}</text>
      </g>
    ))}
  </svg>
);

// ─── 포스트 카드 ────────────────────────────────────────────────
const PostCard: React.FC<{
  mission: Mission;
  isSelected: boolean;
  distanceMeters: number;
  onClick: () => void;
}> = ({ mission, isSelected, distanceMeters, onClick }) => {
  const isDone   = mission.status === 'completed';
  const isActive = mission.status === 'active';
  const isLocked = mission.status === 'locked';
  const distLabel = isDone ? '완료'
    : distanceMeters === Infinity ? '—'
    : distanceMeters >= 1000 ? `${(distanceMeters / 1000).toFixed(1)}km`
    : `${distanceMeters}m`;
  const distColor = isDone ? 'text-slate-500 line-through'
    : distanceMeters < 30 ? 'text-green-400'
    : distanceMeters < 200 ? 'text-amber-400'
    : 'text-slate-400';
  return (
    <button onClick={onClick}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all active:scale-95 w-full text-left
              ${isSelected ? isActive ? 'bg-red-500/10 border-red-500/40' : 'bg-white/8 border-white/20' : 'bg-[#1A2235] border-white/6'}
              ${isLocked ? 'opacity-50' : ''}`}>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0
        ${isDone ? 'bg-green-500/15' : isActive ? 'bg-red-500/15' : isLocked ? 'bg-white/5' : 'bg-amber-500/12'}`}>
        {isDone ? '✅' : isLocked ? '🔒' : isActive ? '📍' : '🎯'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-bold text-white truncate">
          {mission.postId} · {TREKKING_POSTS[mission.id]?.label ?? mission.locationLabel}
        </p>
        <p className="text-[11px] text-slate-500">{mission.name}</p>
      </div>
      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
        <span className={`text-[13px] font-bold ${distColor}`}>{distLabel}</span>
        <PointsBadge points={mission.points} />
        <MissionStatusBadge status={mission.status} />
      </div>
    </button>
  );
};

// ─── 도착 인증 버튼 ─────────────────────────────────────────────
const ArrivalButton: React.FC<{ mission: Mission }> = ({ mission }) => {
  const { completeMission, myLocation } = useAppStore();
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState(false);

  const postCoords = TREKKING_POSTS[mission.id];
  const distance = myLocation && postCoords ? haversine(myLocation, postCoords) : Infinity;
  const inRange  = distance <= mission.radiusMeters;

  const handlePress = () => {
    if (!inRange || confirming || done) return;
    setConfirming(true);
    setTimeout(() => {
      completeMission(mission.id, mission.points);
      setConfirming(false);
      setDone(true);
    }, 1000);
  };

  if (done) return (
    <div className="mx-4 mb-3 py-4 rounded-2xl bg-green-600/20 border border-green-500/30 flex items-center justify-center">
      <span className="text-green-400 font-bold text-[15px]">✅ 도착 인증 완료! +{mission.points}pt</span>
    </div>
  );

  return (
    <div className="px-4 mb-3">
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-[11px] text-slate-500">
          {TREKKING_POSTS[mission.id]?.label ?? mission.locationLabel}까지
        </span>
        <span className={`text-[13px] font-bold ${inRange ? 'text-green-400' : distance < 200 ? 'text-amber-400' : 'text-slate-400'}`}>
          {distance === Infinity ? 'GPS 확인중...' : inRange ? '✅ 범위 안에 있어요!' : `약 ${distance}m 남음`}
        </span>
      </div>
      <button onClick={handlePress} disabled={!inRange || confirming}
              className={`w-full py-4 rounded-2xl font-bold text-[15px] flex items-center justify-center gap-2
                relative overflow-hidden transition-all
                ${inRange ? 'bg-green-600 text-white active:scale-98' : 'bg-[#1A2235] text-slate-500 border border-white/8 cursor-not-allowed'}`}>
        {confirming
          ? <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />인증 중...</>
          : inRange
          ? <>📍 도착 확인 — 지금 인증하기!</>
          : <>🔒 포스트 위치에 가까이 다가가세요</>}
        {inRange && !confirming && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[shimmer_2s_infinite]" />
        )}
      </button>
    </div>
  );
};

// ─── 메인 화면 ──────────────────────────────────────────────────
const MapScreen: React.FC = () => {
  const navigate = useNavigate();
  const { missions, myLocation } = useAppStore();
  const [selectedId, setSelectedId] = useState<string | null>(
    missions.find(m => m.status === 'active')?.id ?? null
  );
  const [gpsAccuracy, setGpsAccuracy] = useState(0);
  const activeMission = missions.find(m => m.status === 'active');

  useEffect(() => {
    if (!navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      p => setGpsAccuracy(p.coords.accuracy),
      () => {},
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  const gpsLabel = gpsAccuracy === 0 ? 'GPS 대기중'
    : gpsAccuracy < 15 ? `✅ GPS ±${Math.round(gpsAccuracy)}m`
    : gpsAccuracy < 40 ? `⚠️ GPS ±${Math.round(gpsAccuracy)}m`
    : `❌ GPS ±${Math.round(gpsAccuracy)}m`;
  const gpsColor = gpsAccuracy === 0 ? 'text-slate-500'
    : gpsAccuracy < 15 ? 'text-green-400'
    : gpsAccuracy < 40 ? 'text-amber-400'
    : 'text-red-400';

  return (
    <div className="max-w-[390px] mx-auto bg-[#0D1117] min-h-screen flex flex-col">
      <header className="bg-[#13192A] border-b border-white/8 px-4 pt-3 pb-3 relative flex-shrink-0">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-red-600 to-orange-500" />
        <div className="flex items-center justify-between">
          <button onClick={() => navigate('/')}
                  className="w-9 h-9 rounded-xl bg-[#1A2235] border border-white/8 flex items-center justify-center text-white text-base">
            ←
          </button>
          <div className="text-center">
            <span className="font-bebas text-xl tracking-widest text-white">
              트레킹 <span className="text-red-500">MAP</span>
            </span>
            <p className="text-[9px] text-slate-500 tracking-widest">두산경영연구원 · 두산저수지</p>
          </div>
          <span className={`text-[11px] font-bold ${gpsColor}`}>{gpsLabel}</span>
        </div>
      </header>

      <div className="relative flex-shrink-0 bg-[#1A2E1A]">
        <TrekkingMap missions={missions} selectedId={selectedId} onSelect={setSelectedId} />
        {activeMission && (
          <div className="absolute bottom-3 left-3 bg-black/80 border border-white/10 rounded-xl px-3 py-1.5">
            <span className="text-[11px] text-slate-400">
              {TREKKING_POSTS[activeMission.id]?.label}까지{' '}
            </span>
            <span className="text-[13px] font-bold text-green-400">
              {myLocation && TREKKING_POSTS[activeMission.id]
                ? `약 ${haversine(myLocation, TREKKING_POSTS[activeMission.id])}m`
                : '위치 확인중...'}
            </span>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto bg-[#1A2235] border-t border-white/8">
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-9 h-1 rounded-full bg-white/15" />
        </div>
        <div className="flex items-center justify-between px-4 mb-3">
          <span className="text-[11px] font-bold text-slate-400 tracking-widest uppercase">미션 포스트</span>
          <span className="text-[12px] text-slate-500">
            {missions.length}개 · {missions.filter(m => m.status === 'completed').length}완료
          </span>
        </div>
        {activeMission && <ArrivalButton mission={activeMission} />}
        <div className="px-4 pb-28 space-y-2">
          {missions.map(m => (
            <PostCard key={m.id} mission={m} isSelected={m.id === selectedId}
                      distanceMeters={myLocation && TREKKING_POSTS[m.id]
                        ? haversine(myLocation, TREKKING_POSTS[m.id])
                        : Infinity}
                      onClick={() => setSelectedId(m.id)} />
          ))}
        </div>
      </div>

      <BottomNav active="/map" />
      <style>{`@keyframes shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(200%)}}`}</style>
    </div>
  );
};

export default MapScreen;