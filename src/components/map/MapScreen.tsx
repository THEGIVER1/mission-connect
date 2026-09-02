import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { BottomNav } from '../dashboard/Dashboard';
import { MissionStatusBadge, PointsBadge } from '../shared';
import { ACTIVE_VENUE, WORKSHOP_COURSES, CourseKey } from '../../config/workshopConfig';
import type { Mission } from '../../types';

// ─── 트레킹 포스트 위치 조회 헬퍼 ─────────────────────────────
export const getTrekkingPosts = (courseKey: CourseKey = 'lake'): Record<string, { lat: number; lng: number; label: string }> => {
  const course = ACTIVE_VENUE.courses[courseKey] || ACTIVE_VENUE.courses.lake;
  return course.posts.reduce((acc, p) => {
    acc[p.id] = { lat: p.coords.lat, lng: p.coords.lng, label: p.locationLabel };
    return acc;
  }, {} as Record<string, { lat: number; lng: number; label: string }>);
};

export const getPostPos = (courseKey: CourseKey = 'lake'): Record<string, { cx: number; cy: number }> => {
  const course = ACTIVE_VENUE.courses[courseKey] || ACTIVE_VENUE.courses.lake;
  return course.posts.reduce((acc, p) => {
    acc[p.id] = p.svgPos;
    return acc;
  }, {} as Record<string, { cx: number; cy: number }>);
};

export const TREKKING_POSTS = getTrekkingPosts('lake');

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

// ─── 서울대공원 지형 SVG 지도 ─────────────────────
const TrekkingMap: React.FC<{
  missions: Mission[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  courseKey: CourseKey;
}> = ({ missions, selectedId, onSelect, courseKey }) => {
  const postPos = useMemo(() => getPostPos(courseKey), [courseKey]);
  const postCoords = useMemo(() => getTrekkingPosts(courseKey), [courseKey]);

  return (
    <svg viewBox="0 0 390 340" className="w-full h-auto select-none" style={{ background: '#132115' }}>
      {/* 배경 */}
      <rect width="390" height="340" fill="#132115" />

      {/* 숲/녹지 구역 */}
      <ellipse cx="200" cy="160" rx="185" ry="155" fill="#1B331D" />

      {/* 코스별 트레킹 산책 경로 */}
      {courseKey === 'lake' ? (
        // 호수 둘레 순환 코스
        <>
          <path d="M140 50 Q200 70 230 110 Q255 150 260 195 Q270 240 275 270 Q240 300 195 310 Q150 280 140 180 Z"
                fill="none" stroke="#8B7355" strokeWidth="8" strokeLinecap="round" opacity=".5" />
          <path d="M140 50 Q200 70 230 110 Q255 150 260 195 Q270 240 275 270 Q240 300 195 310 Q150 280 140 180 Z"
                fill="none" stroke="#38BDF8" strokeWidth="3" strokeLinecap="round" strokeDasharray="6,4" opacity=".8" />
        </>
      ) : (
        // 산림욕장 깊은 숲길 코스
        <>
          <path d="M140 50 Q210 60 280 90 Q325 140 310 190 Q305 240 280 280 Q240 300 195 310"
                fill="none" stroke="#8B7355" strokeWidth="8" strokeLinecap="round" opacity=".5" />
          <path d="M140 50 Q210 60 280 90 Q325 140 310 190 Q305 240 280 280 Q240 300 195 310"
                fill="none" stroke="#10B981" strokeWidth="3" strokeLinecap="round" strokeDasharray="6,4" opacity=".9" />
        </>
      )}

      {/* 코끼리열차 매표소 (출발점) */}
      <rect x="85" y="30" width="110" height="38" rx="6" fill="#1E293B" stroke="#38BDF8" strokeWidth="1.5" />
      <text x="140" y="46" textAnchor="middle" fontSize="9" fill="#38BDF8" fontFamily="sans-serif" fontWeight="bold">
        🚊 코끼리열차 매표소
      </text>
      <text x="140" y="58" textAnchor="middle" fontSize="8" fill="#94A3B8" fontFamily="sans-serif">
        [공통 출발지점]
      </text>

      {/* 대공원 호수 */}
      <ellipse cx="205" cy="200" rx="75" ry="50" fill="#0F2840" stroke="#0284C7" strokeWidth="1.5" opacity=".9" />
      <ellipse cx="205" cy="200" rx="60" ry="38" fill="#0C4A6E" opacity=".7" />
      <path d="M160 195 Q180 190 200 195 Q220 200 240 195" fill="none" stroke="#38BDF8" strokeWidth="1" opacity=".5" />
      <path d="M170 205 Q190 200 210 205 Q230 210 250 205" fill="none" stroke="#38BDF8" strokeWidth="1" opacity=".4" />
      <text x="205" y="203" textAnchor="middle" fontSize="10" fill="#7DD3FC" fontFamily="sans-serif" fontWeight="bold">
        대공원 청계호수
      </text>

      {/* 나무 / 숲 그래픽 */}
      {[[40,90],[60,150],[45,230],[70,290],[330,60],[355,130],[340,220],[350,290]].map(([x,y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={12} fill="#14532D" opacity=".8" />
          <circle cx={x} cy={y-4} r={9} fill="#166534" opacity=".9" />
        </g>
      ))}

      {/* 완료 포스트 연결선 */}
      {missions.filter(m => m.status === 'completed').map((m, i, arr) => {
        if (i === 0) return null;
        const a = postPos[arr[i-1].id];
        const b = postPos[m.id];
        if (!a || !b) return null;
        return <line key={m.id} x1={a.cx} y1={a.cy} x2={b.cx} y2={b.cy}
                     stroke="#27AE60" strokeWidth="2" strokeDasharray="5,3" opacity=".7" />;
      })}

      {/* 현재 미션 방향선 */}
      {(() => {
        const active = missions.find(m => m.status === 'active');
        if (!active) return null;
        const p = postPos[active.id];
        if (!p) return null;
        return <line x1={MY_POS.cx} y1={MY_POS.cy} x2={p.cx} y2={p.cy}
                     stroke="#E31837" strokeWidth="1.5" strokeDasharray="5,3" opacity=".6" />;
      })()}

      {/* 포스트 마커 */}
      {missions.map(m => {
        const pos = postPos[m.id];
        if (!pos) return null;
        const color = markerColor(m.status);
        const isSel = m.id === selectedId;
        const label = postCoords[m.id]?.label ?? m.locationLabel;

        return (
          <g key={m.id} onClick={() => onSelect(m.id)} style={{ cursor: 'pointer' }}>
            {m.status === 'active' && (
              <circle cx={pos.cx} cy={pos.cy} r={28} fill="rgba(227,24,55,0.15)"
                      stroke="rgba(227,24,55,0.5)" strokeWidth="1.5">
                <animate attributeName="r" values="20;32" dur="1.5s" repeatCount="indefinite" />
                <animate attributeName="opacity" values=".6;0" dur="1.5s" repeatCount="indefinite" />
              </circle>
            )}
            {isSel && <circle cx={pos.cx} cy={pos.cy} r={22} fill="none" stroke="white" strokeWidth="2" opacity=".7" />}
            <circle cx={pos.cx} cy={pos.cy} r={isSel ? 14 : 11} fill={color}
                    stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
            <text x={pos.cx} y={pos.cy + 4} textAnchor="middle" fontSize="9"
                  fill="white" fontWeight="bold" fontFamily="sans-serif">
              {m.status === 'completed' ? '✓' : m.status === 'locked' ? '🔒' : m.postId}
            </text>
            <rect x={pos.cx - 36} y={pos.cy + 16} width={72} height={14} rx={4} fill="rgba(13,17,23,0.85)" />
            <text x={pos.cx} y={pos.cy + 26} textAnchor="middle" fontSize="8"
                  fill={color} fontFamily="sans-serif" fontWeight="bold">
              {label.slice(0, 8)}
            </text>
          </g>
        );
      })}

      {/* 내 위치 마커 */}
      <circle cx={MY_POS.cx} cy={MY_POS.cy} r={10} fill="none" stroke="rgba(56,189,248,0.3)" strokeWidth="1">
        <animate attributeName="r" values="8;16" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="1;0" dur="2s" repeatCount="indefinite" />
      </circle>
      <circle cx={MY_POS.cx} cy={MY_POS.cy} r={6} fill="#38BDF8" stroke="white" strokeWidth="1.5" />
      <text x={MY_POS.cx} y={MY_POS.cy - 10} textAnchor="middle" fontSize="8" fill="#38BDF8" fontWeight="bold">
        내 위치
      </text>
    </svg>
  );
};

// ─── 미션 포스트 카드 ───────────────────────────────────────────
const PostCard: React.FC<{
  mission: Mission;
  isSelected: boolean;
  distanceMeters: number;
  onClick: () => void;
}> = ({ mission, isSelected, distanceMeters, onClick }) => {
  const isLocked = mission.status === 'locked';

  return (
    <div onClick={onClick}
         className={`rounded-2xl border p-4 cursor-pointer transition-all active:scale-98 ${
           isSelected
             ? 'bg-[#1A2235] border-red-500/60 shadow-lg shadow-red-500/10'
             : isLocked
             ? 'bg-[#0f172a]/50 border-white/5 opacity-55'
             : 'bg-[#0f172a] border-white/10 hover:border-white/20'
         }`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-xl bg-white/10 flex items-center justify-center text-xs font-bold text-white">
            {mission.postId}
          </span>
          <div>
            <p className="text-[14px] font-bold text-white">{mission.name}</p>
            <p className="text-[11px] text-slate-400">📍 {mission.locationLabel}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <MissionStatusBadge status={mission.status} />
          <PointsBadge points={mission.points} />
        </div>
      </div>

      <p className="text-[12px] text-slate-400 whitespace-pre-line line-clamp-2 mb-3">
        {mission.description}
      </p>

      <div className="flex items-center justify-between text-[11px] pt-2 border-t border-white/5">
        <span className="text-slate-500">
          인증 반경 {mission.radiusMeters}m 이내
        </span>
        <span className={`font-bold ${
          distanceMeters <= mission.radiusMeters ? 'text-green-400'
          : distanceMeters < 200 ? 'text-amber-400'
          : 'text-slate-500'
        }`}>
          {distanceMeters === Infinity ? 'GPS 확인중'
           : distanceMeters <= mission.radiusMeters ? '✅ 인증 가능'
           : `약 ${distanceMeters}m`}
        </span>
      </div>
    </div>
  );
};

// ─── 도착 인증 버튼 ─────────────────────────────────────────────
const ArrivalButton: React.FC<{ mission: Mission; postCoords: { lat: number; lng: number; label: string } }> = ({ mission, postCoords }) => {
  const { completeMission, myLocation, myTeam, participantName, participantCompany, updateTeamScore, selectedCourse } = useAppStore();
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState(false);

  const participantId = participantName && participantCompany
    ? `${participantName}_${participantCompany}`.replace(/\s/g, '_')
    : myTeam?.id ?? 'anonymous';

  const distance = myLocation && postCoords ? haversine(myLocation, postCoords) : Infinity;
  const inRange  = distance <= mission.radiusMeters;

  const handlePress = async () => {
    if (!inRange || confirming || done) return;
    setConfirming(true);

    // 로컬 스토어 완료 처리
    completeMission(mission.id, mission.points);

    // Firebase RTDB REST API 저장
    const dbUrl = import.meta.env.VITE_FIREBASE_DATABASE_URL || 'https://doosan-teambuilding-default-rtdb.firebaseio.com';
    const nowIso = new Date().toISOString();
    try {
      const checkRes = await fetch(`${dbUrl}/sessions/${ACTIVE_VENUE.sessionKey}/participants/${encodeURIComponent(participantId)}.json`);
      const existing = checkRes.ok ? await checkRes.json() : null;
      const prevScore = Number(existing?.score ?? 0);
      const prevCompleted = Number(existing?.missionsCompleted ?? 0);
      const nextScore = prevScore + mission.points;

      await fetch(`${dbUrl}/sessions/${ACTIVE_VENUE.sessionKey}/participants/${encodeURIComponent(participantId)}.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          score: nextScore,
          missionsCompleted: prevCompleted + 1,
          lastMissionAt: nowIso,
          teamId: myTeam?.id ?? '',
          teamName: myTeam?.name ?? '',
          course: selectedCourse,
        }),
      });

      if (myTeam?.id) {
        updateTeamScore(myTeam.id, nextScore);
      }
    } catch (e) {
      console.warn('GPS 미션 완료 저장 실패:', e);
    }

    setConfirming(false);
    setDone(true);
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
          {postCoords?.label ?? mission.locationLabel}까지
        </span>
        <span className={`text-[13px] font-bold ${inRange ? 'text-green-400' : distance < 200 ? 'text-amber-400' : 'text-slate-400'}`}>
          {distance === Infinity ? 'GPS 확인중...' : inRange ? '✅ 범위 안에 있어요!' : `약 ${distance}m 남음`}
        </span>
      </div>
      <button onClick={handlePress} disabled={!inRange || confirming}
              className={`w-full py-4 rounded-2xl font-bold text-[15px] flex items-center justify-center gap-2
                relative overflow-hidden transition-all
                ${inRange ? 'bg-green-600 text-white active:scale-98 shadow-lg shadow-green-600/20' : 'bg-[#1A2235] text-slate-500 border border-white/8 cursor-not-allowed'}`}>
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
  const { missions, myLocation, selectedCourse, setCourse } = useAppStore();
  const [selectedId, setSelectedId] = useState<string | null>(
    missions.find(m => m.status === 'active')?.id ?? null
  );
  const [gpsAccuracy, setGpsAccuracy] = useState(0);

  const postCoordsMap = useMemo(() => getTrekkingPosts(selectedCourse), [selectedCourse]);
  const activeMission = missions.find(m => m.status === 'active');
  const activePostCoords = activeMission ? postCoordsMap[activeMission.id] : undefined;

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
            <p className="text-[9px] text-slate-400 tracking-widest">
              🚊 코끼리열차 매표소 출발
            </p>
          </div>
          <span className={`text-[11px] font-bold ${gpsColor}`}>{gpsLabel}</span>
        </div>
      </header>

      {/* 코스 전환 탭 */}
      <div className="flex bg-[#13192A] border-b border-white/8 px-3 py-2 gap-2">
        {WORKSHOP_COURSES.map(c => {
          const isSel = selectedCourse === c.id;
          return (
            <button
              key={c.id}
              onClick={() => setCourse(c.id)}
              className={`flex-1 py-1.5 px-2 rounded-xl text-[12px] font-bold flex items-center justify-center gap-1.5 transition-all ${
                isSel
                  ? 'bg-red-500 text-white shadow-md shadow-red-500/20'
                  : 'bg-[#1A2235] text-slate-400 border border-white/5 hover:text-white'
              }`}>
              <span>{c.emoji}</span>
              <span>{c.name}</span>
              <span className={`text-[10px] ${isSel ? 'text-red-100' : 'text-slate-500'}`}>({c.distance})</span>
            </button>
          );
        })}
      </div>

      <div className="relative flex-shrink-0 bg-[#132115]">
        <TrekkingMap
          missions={missions}
          selectedId={selectedId}
          onSelect={setSelectedId}
          courseKey={selectedCourse}
        />
        {activeMission && activePostCoords && (
          <div className="absolute bottom-3 left-3 bg-black/80 border border-white/10 rounded-xl px-3 py-1.5">
            <span className="text-[11px] text-slate-400">
              {activePostCoords.label}까지{' '}
            </span>
            <span className="text-[13px] font-bold text-green-400">
              {myLocation
                ? `약 ${haversine(myLocation, activePostCoords)}m`
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
          <span className="text-[11px] font-bold text-slate-400 tracking-widest uppercase">
            {ACTIVE_VENUE.courses[selectedCourse].name} 포스트
          </span>
          <span className="text-[12px] text-slate-500">
            {missions.length}개 · {missions.filter(m => m.status === 'completed').length}완료
          </span>
        </div>
        {activeMission && activePostCoords && (
          <ArrivalButton mission={activeMission} postCoords={activePostCoords} />
        )}
        <div className="px-4 pb-28 space-y-2">
          {missions.map(m => (
            <PostCard key={m.id} mission={m} isSelected={m.id === selectedId}
                      distanceMeters={myLocation && postCoordsMap[m.id]
                        ? haversine(myLocation, postCoordsMap[m.id])
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
