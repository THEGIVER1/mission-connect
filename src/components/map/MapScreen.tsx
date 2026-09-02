import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { BottomNav } from '../dashboard/Dashboard';
import {
  DISCOVERY_QUIZZES,
  ACTIVE_VENUE,
  WORKSHOP_TEAMS,
  CourseKey,
} from '../../config/workshopConfig';
import { DiscoveryQuizItem } from '../../types';

function haversine(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return Math.round(R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x)));
}

const QUIZ_SVG_POS: Record<string, { cx: number; cy: number }> = {
  dq1: { cx: 140, cy: 50 },  // 매표소
  dq2: { cx: 245, cy: 150 }, // 호수 브릿지
  dq3: { cx: 260, cy: 235 }, // 테마가든
  dq4: { cx: 290, cy: 110 }, // 현대미술관
  dq5: { cx: 310, cy: 210 }, // 산림욕장
};

const MapScreen: React.FC = () => {
  const navigate = useNavigate();
  const { myTeam, myLocation, selectedCourse, setCourse } = useAppStore();
  const [selectedQuizId, setSelectedQuizId] = useState<string>('dq1');

  const teamConfig = WORKSHOP_TEAMS.find(t => t.id === myTeam?.id);
  const activeCourse = selectedCourse;

  // 선택된 퀴즈 객체
  const selectedQuiz = DISCOVERY_QUIZZES.find(q => q.id === selectedQuizId) || DISCOVERY_QUIZZES[0];

  // 현재 위치와의 거리
  const distance = useMemo(() => {
    if (!myLocation || !selectedQuiz) return null;
    return haversine(myLocation, selectedQuiz.coords);
  }, [myLocation, selectedQuiz]);

  return (
    <div className="max-w-[390px] mx-auto bg-[#0D1117] min-h-screen pb-24 font-['Noto_Sans_KR'] flex flex-col text-slate-100">
      {/* 헤더 */}
      <header className="bg-[#13192A] border-b border-white/8 px-4 pt-3 pb-3 relative flex-shrink-0">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-red-600 to-orange-500" />
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="w-9 h-9 rounded-xl bg-[#1A2235] border border-white/8 flex items-center justify-center text-white text-base"
          >
            ←
          </button>
          <div className="text-center">
            <span className="font-bebas text-xl tracking-widest text-white">
              TREKKING <span className="text-sky-400">MAP</span>
            </span>
            <p className="text-[10px] text-slate-400">서울대공원 · 국립현대미술관 일대</p>
          </div>
          <span className="text-[11px] bg-sky-500/15 text-sky-400 border border-sky-500/30 px-2 py-0.5 rounded-full font-bold">
            퀴즈 5개소
          </span>
        </div>
      </header>

      {/* 코스 선택 탭 */}
      <div className="flex bg-[#101626] border-b border-white/8 p-1.5 gap-1.5">
        <button
          onClick={() => setCourse('lake')}
          className={`flex-1 py-2 rounded-xl text-[12px] font-bold transition-all flex items-center justify-center gap-1 ${
            activeCourse === 'lake'
              ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          🌊 호수둘레길 (4~6조)
        </button>
        <button
          onClick={() => setCourse('forest')}
          className={`flex-1 py-2 rounded-xl text-[12px] font-bold transition-all flex items-center justify-center gap-1 ${
            activeCourse === 'forest'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          🌲 산림욕장길 (1~3조)
        </button>
      </div>

      {/* SVG 지도 뷰포트 */}
      <div className="relative w-full border-b border-white/8 overflow-hidden bg-[#132115]">
        <svg viewBox="0 0 390 330" className="w-full h-auto select-none">
          <rect width="390" height="330" fill="#132115" />
          <ellipse cx="200" cy="160" rx="185" ry="150" fill="#1B331D" />

          {/* 산책 경로선 */}
          {activeCourse === 'lake' ? (
            <path
              d="M140 50 Q200 70 230 110 Q255 150 260 195 Q270 240 275 270 Q240 300 195 310 Q150 280 140 180 Z"
              fill="none" stroke="#38BDF8" strokeWidth="4" strokeLinecap="round" strokeDasharray="6,4" opacity=".85"
            />
          ) : (
            <path
              d="M140 50 Q210 60 280 90 Q325 140 310 190 Q305 240 280 280 Q240 300 195 310"
              fill="none" stroke="#10B981" strokeWidth="4" strokeLinecap="round" strokeDasharray="6,4" opacity=".9"
            />
          )}

          {/* 출발점 (코끼리열차 매표소) */}
          <rect x="85" y="32" width="110" height="36" rx="6" fill="#1E293B" stroke="#38BDF8" strokeWidth="1.5" />
          <text x="140" y="48" textAnchor="middle" fontSize="9" fill="#38BDF8" fontFamily="sans-serif" fontWeight="bold">
            🚊 코끼리열차 매표소
          </text>
          <text x="140" y="60" textAnchor="middle" fontSize="8" fill="#94A3B8" fontFamily="sans-serif">
            [공통 출발지]
          </text>

          {/* 대공원 호수 */}
          <ellipse cx="205" cy="200" rx="75" ry="50" fill="#0F2840" stroke="#0284C7" strokeWidth="1.5" opacity=".9" />
          <text x="205" y="203" textAnchor="middle" fontSize="10" fill="#7DD3FC" fontFamily="sans-serif" fontWeight="bold">
            대공원 청계호수
          </text>

          {/* 퀴즈 핀 렌더링 */}
          {DISCOVERY_QUIZZES.map((quiz, i) => {
            const pos = QUIZ_SVG_POS[quiz.id] || { cx: 200, cy: 150 };
            const isSelected = selectedQuizId === quiz.id;

            return (
              <g
                key={quiz.id}
                onClick={() => setSelectedQuizId(quiz.id)}
                className="cursor-pointer"
              >
                {isSelected && (
                  <circle cx={pos.cx} cy={pos.cy} r={18} fill="#38BDF8" opacity=".25" className="animate-ping" />
                )}
                <circle
                  cx={pos.cx}
                  cy={pos.cy}
                  r={isSelected ? 13 : 10}
                  fill={isSelected ? '#38BDF8' : '#1E293B'}
                  stroke={isSelected ? '#FFFFFF' : '#38BDF8'}
                  strokeWidth="2"
                />
                <text
                  x={pos.cx}
                  y={pos.cy + 3.5}
                  textAnchor="middle"
                  fontSize="9"
                  fill={isSelected ? '#0D1117' : '#FFFFFF'}
                  fontFamily="sans-serif"
                  fontWeight="bold"
                >
                  Q{i + 1}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* 선택된 퀴즈 스팟 정보 카드 */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div className="bg-[#1A2235] border border-white/10 rounded-2xl p-4 space-y-2.5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-bold text-sky-400 bg-sky-500/15 border border-sky-500/30 px-2 py-0.5 rounded-full">
              📍 Discovery Quiz 스팟
            </span>
            <span className="text-[11px] text-amber-400 font-bold">
              +{selectedQuiz.points}pt
            </span>
          </div>

          <div>
            <h3 className="text-[16px] font-bold text-white mb-1">
              {selectedQuiz.title}
            </h3>
            <p className="text-[12px] text-slate-300">
              장소: <strong className="text-white">{selectedQuiz.locationLabel}</strong>
            </p>
          </div>

          <div className="bg-black/30 p-2.5 rounded-xl text-[12px] text-slate-400 flex justify-between items-center">
            <span>인증 반경</span>
            <span className="text-white font-medium">{selectedQuiz.radiusMeters}m 이내</span>
          </div>

          {distance !== null && (
            <div className="bg-black/30 p-2.5 rounded-xl text-[12px] text-slate-400 flex justify-between items-center">
              <span>내 위치로부터 거리</span>
              <span className="text-amber-400 font-bold">약 {distance}m</span>
            </div>
          )}
        </div>

        {/* 퀴즈 풀러 가기 버튼 */}
        <div className="pt-4">
          <button
            onClick={() => navigate('/discovery-quiz')}
            className="w-full py-3.5 bg-sky-500 text-white font-bold text-[15px] rounded-xl active:scale-98 transition-all shadow-lg shadow-sky-500/20 flex items-center justify-center gap-2"
          >
            <span>🧭 Discovery Quiz 화면으로 이동</span>
          </button>
        </div>
      </div>

      <BottomNav active="/map" />
    </div>
  );
};

export default MapScreen;
