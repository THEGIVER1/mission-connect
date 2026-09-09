import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAppStore } from '../../store/useAppStore';
import { BottomNav } from '../dashboard/Dashboard';
import {
  DISCOVERY_QUIZZES,
  ACTIVE_VENUE,
  WORKSHOP_TEAMS,
  CourseKey,
} from '../../config/workshopConfig';

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

// ─────────────────────────────────────────────────────────────────
// 코스별 실제 GPS 좌표 트랙 (코끼리열차 매표소 기점 순환 회귀 동선)
// ─────────────────────────────────────────────────────────────────
const LAKE_TRACK: [number, number][] = [
  [37.4347, 127.0132], // 1. 코끼리열차 매표소 [출발]
  [37.4342, 127.0160], // 호수 북측 산책로
  [37.4315, 127.0225], // 2. 국립현대미술관 과천 [공통 경유지]
  [37.4310, 127.0185], // 3. 호수 브릿지 전망 데크 [호수길 전용]
  [37.4285, 127.0170], // 테마가든 장미원 수변길
  [37.4288, 127.0145], // 호수 남측 둑길
  [37.4312, 127.0125], // 호수 서측 메타세쿼이아길
  [37.4347, 127.0132], // 4. 코끼리열차 매표소 [도착/회귀]
];

const FOREST_TRACK: [number, number][] = [
  [37.4347, 127.0132], // 1. 코끼리열차 매표소 [출발]
  [37.4358, 127.0178], // 대공원 정문 및 미술관 셔틀도로
  [37.4315, 127.0225], // 2. 국립현대미술관 과천 [공통 경유지]
  [37.4292, 127.0245], // 산림욕장 트레킹길 입구
  [37.4270, 127.0250], // 3. 산림욕장 생각하는 숲 쉼터 [산림길 전용]
  [37.4248, 127.0215], // 다람쥐광장 숲길
  [37.4265, 127.0185], // 동물원 후문 방면 숲길
  [37.4285, 127.0170], // 테마가든 외곽 둘레길
  [37.4315, 127.0130], // 수변 숲길
  [37.4347, 127.0132], // 4. 코끼리열차 매표소 [도착/회귀]
];

const MapScreen: React.FC = () => {
  const navigate = useNavigate();
  const { myTeam, myLocation, setMyLocation, selectedCourse, setCourse } = useAppStore();

  const [selectedQuizId, setSelectedQuizId] = useState<string>('dq_elephant');
  const [isLocating, setIsLocating] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const elementsLayerRef = useRef<L.LayerGroup | null>(null);

  const activeCourse = selectedCourse;

  // 현재 선택된 코스에 해당하는 3개 퀴즈만 필터링
  const courseQuizzes = useMemo(() => {
    return DISCOVERY_QUIZZES.filter(q => q.courseKey === 'all' || q.courseKey === activeCourse);
  }, [activeCourse]);

  const selectedQuiz = courseQuizzes.find(q => q.id === selectedQuizId) || courseQuizzes[0];

  // 현재 위치와의 거리 계산
  const distance = useMemo(() => {
    if (!myLocation || !selectedQuiz) return null;
    return haversine(myLocation, selectedQuiz.coords);
  }, [myLocation, selectedQuiz]);

  // 1. GPS 위치 측정 함수
  const fetchMyLocation = () => {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        const coord = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setMyLocation(coord);
        setIsLocating(false);
        if (mapRef.current) {
          mapRef.current.flyTo([coord.lat, coord.lng], 16, { duration: 1.2 });
        }
      },
      () => {
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // 2. Leaflet 고해상도 위성 지도 초기화
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [37.4315, 127.0180],
      zoom: 15,
      zoomControl: false,
      attributionControl: false,
    });

    // 고해상도 항공 위성사진 베이스 타일
    const satelliteTileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
    L.tileLayer(satelliteTileUrl, {
      maxZoom: 19,
    }).addTo(map);

    // 지명 및 도로 투명 오버레이 타일
    const labelsTileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}';
    L.tileLayer(labelsTileUrl, {
      maxZoom: 19,
      opacity: 0.85,
    }).addTo(map);

    const elementsLayer = L.layerGroup().addTo(map);
    elementsLayerRef.current = elementsLayer;

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // 3. 코스 트랙선, 출발/도착점, 퀴즈 핀(3개), 내 위치 마커 렌더링
  useEffect(() => {
    if (!mapRef.current || !elementsLayerRef.current) return;
    elementsLayerRef.current.clearLayers();

    const layer = elementsLayerRef.current;

    // 1) 코스 경로선 (원점 순환 Polyline)
    const trackCoords = activeCourse === 'lake' ? LAKE_TRACK : FOREST_TRACK;
    const trackColor = activeCourse === 'lake' ? '#38BDF8' : '#34D399';

    // 트랙 외곽선 (블랙 섀도우)
    L.polyline(trackCoords, {
      color: '#000000',
      weight: 7,
      opacity: 0.6,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(layer);

    // 실제 트랙 발광선
    L.polyline(trackCoords, {
      color: trackColor,
      weight: 4.5,
      opacity: 1,
      dashArray: '8, 6',
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(layer);

    // 2) 코끼리열차 매표소 [출발 & 도착] 기점 마커
    const departureIcon = L.divIcon({
      className: 'custom-departure-pin',
      html: `
        <div style="
          background: rgba(15, 23, 42, 0.95);
          color: #38BDF8;
          border: 2px solid #38BDF8;
          padding: 5px 10px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: bold;
          white-space: nowrap;
          box-shadow: 0 4px 14px rgba(0,0,0,0.8);
          display: flex;
          align-items: center;
          gap: 5px;
        ">
          <span>🚊</span>
          <span>코끼리열차 매표소 [출발/도착]</span>
        </div>
      `,
      iconSize: [170, 32],
      iconAnchor: [85, 16],
    });

    L.marker([ACTIVE_VENUE.departurePoint.coords.lat, ACTIVE_VENUE.departurePoint.coords.lng], {
      icon: departureIcon,
    }).addTo(layer);

    // 3) Discovery Quiz 마커 (선택된 코스에 해당하는 3개 핀만 노출)
    courseQuizzes.forEach((quiz, i) => {
      const isSelected = selectedQuizId === quiz.id;
      const markerBg = isSelected ? '#E31837' : '#0F172A';
      const markerBorder = isSelected ? '#FFFFFF' : '#38BDF8';
      const markerText = isSelected ? '#FFFFFF' : '#38BDF8';

      const quizIcon = L.divIcon({
        className: 'custom-quiz-pin',
        html: `
          <div style="
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
          ">
            ${isSelected ? '<div style="position:absolute; width:48px; height:48px; border-radius:50%; background:rgba(227,24,55,0.45); animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>' : ''}
            <div style="
              width: 34px;
              height: 34px;
              border-radius: 50%;
              background: ${markerBg};
              border: 2.5px solid ${markerBorder};
              color: ${markerText};
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 11px;
              font-weight: 900;
              box-shadow: 0 4px 16px rgba(0,0,0,0.8);
            ">
              Q${i + 1}
            </div>
          </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });

      const marker = L.marker([quiz.coords.lat, quiz.coords.lng], { icon: quizIcon }).addTo(layer);
      marker.on('click', () => {
        setSelectedQuizId(quiz.id);
        if (mapRef.current) {
          mapRef.current.panTo([quiz.coords.lat, quiz.coords.lng], { animate: true, duration: 0.8 });
        }
      });

      // 퀴즈 활성화 반경 원형 표시
      L.circle([quiz.coords.lat, quiz.coords.lng], {
        radius: quiz.radiusMeters,
        color: isSelected ? '#E31837' : '#38BDF8',
        fillColor: isSelected ? '#E31837' : '#38BDF8',
        fillOpacity: isSelected ? 0.25 : 0.12,
        weight: 2,
        dashArray: '4, 4',
      }).addTo(layer);
    });

    // 4) 내 실시간 위치 마커 (GPS)
    if (myLocation) {
      const myIcon = L.divIcon({
        className: 'custom-my-location-pin',
        html: `
          <div style="position:relative; width:26px; height:26px; display:flex; align-items:center; justify-content:center;">
            <div style="position:absolute; width:26px; height:26px; border-radius:50%; background:rgba(56,189,248,0.5); animation:ping 1.2s infinite;"></div>
            <div style="width:14px; height:14px; border-radius:50%; background:#0284C7; border:2.5px solid #FFFFFF; box-shadow:0 0 10px rgba(56,189,248,0.9);"></div>
          </div>
        `,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });

      L.marker([myLocation.lat, myLocation.lng], { icon: myIcon }).addTo(layer);
    }
  }, [activeCourse, courseQuizzes, selectedQuizId, myLocation]);

  return (
    <div className="max-w-[390px] mx-auto bg-[#0D1117] min-h-screen pb-24 font-['Noto_Sans_KR'] flex flex-col text-slate-100 select-none">
      {/* 상단 헤더 */}
      <header className="bg-[#13192A] border-b border-white/8 px-4 pt-3 pb-3 relative flex-shrink-0 z-10">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-red-600 to-orange-500" />
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="w-9 h-9 rounded-xl bg-[#1A2235] border border-white/8 flex items-center justify-center text-white text-base active:scale-95"
          >
            ←
          </button>
          <div className="text-center">
            <span className="font-bebas text-xl tracking-widest text-white">
              SATELLITE <span className="text-sky-400">TREKKING MAP</span>
            </span>
            <p className="text-[10px] text-slate-400">매표소 기점 순환 회귀 코스 지도</p>
          </div>
          <span className="text-[11px] bg-amber-500/15 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
            🛰️ 위성지도
          </span>
        </div>
      </header>

      {/* 코스 선택 탭 바 */}
      <div className="bg-[#101626] border-b border-white/8 px-3 py-2 flex items-center justify-between gap-2 z-10">
        <div className="flex bg-[#1A2235] p-1 rounded-xl gap-1.5 w-full">
          <button
            onClick={() => {
              setCourse('lake');
              setSelectedQuizId('dq_elephant');
            }}
            className={`flex-1 py-2 rounded-lg text-[12px] font-bold transition-all flex items-center justify-center gap-1 ${
              activeCourse === 'lake'
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🌊 호수둘레길 순환 (4~6조)
          </button>
          <button
            onClick={() => {
              setCourse('forest');
              setSelectedQuizId('dq_elephant');
            }}
            className={`flex-1 py-2 rounded-lg text-[12px] font-bold transition-all flex items-center justify-center gap-1 ${
              activeCourse === 'forest'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🌲 산림욕장길 순환 (1~3조)
          </button>
        </div>
      </div>

      {/* 실제 Leaflet 위성 지도 뷰포트 */}
      <div className="relative w-full h-[350px] border-b border-white/8 overflow-hidden bg-[#0A0F1A]">
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* 플로팅 컨트롤 */}
        <div className="absolute right-3 bottom-3 flex flex-col gap-2 z-[400]">
          <button
            onClick={fetchMyLocation}
            disabled={isLocating}
            className="w-10 h-10 rounded-xl bg-[#1A2235]/95 border border-white/20 text-white shadow-xl flex items-center justify-center text-lg active:scale-95 transition-all"
            title="내 현재 GPS 위치로 이동"
          >
            {isLocating ? '⏳' : '📍'}
          </button>
          <button
            onClick={() => {
              if (mapRef.current) {
                mapRef.current.flyTo([37.4315, 127.0180], 15, { duration: 1 });
              }
            }}
            className="w-10 h-10 rounded-xl bg-[#1A2235]/95 border border-white/20 text-white shadow-xl flex items-center justify-center text-xs font-bold active:scale-95 transition-all"
            title="전체 코스 보기"
          >
            전체
          </button>
        </div>
      </div>

      {/* 선택된 퀴즈 스팟 정보 카드 */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div className="bg-[#1A2235] border border-white/10 rounded-2xl p-4 space-y-2.5 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-bold text-sky-400 bg-sky-500/15 border border-sky-500/30 px-2.5 py-0.5 rounded-full">
              📍 Discovery Quiz {courseQuizzes.findIndex(q => q.id === selectedQuiz?.id) + 1}번째 스팟
            </span>
            <span className="text-[12px] text-amber-400 font-bold">
              +{selectedQuiz?.points}pt
            </span>
          </div>

          <div>
            <h3 className="text-[16px] font-bold text-white mb-1">
              {selectedQuiz?.title}
            </h3>
            <p className="text-[12px] text-slate-300">
              위치: <strong className="text-white">{selectedQuiz?.locationLabel}</strong>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="bg-black/40 p-2 rounded-xl text-[11px] text-slate-400 flex flex-col">
              <span>인증 반경</span>
              <strong className="text-white text-[12px] mt-0.5">{selectedQuiz?.radiusMeters}m 이내</strong>
            </div>
            <div className="bg-black/40 p-2 rounded-xl text-[11px] text-slate-400 flex flex-col">
              <span>내 위치로부터 거리</span>
              <strong className="text-amber-400 text-[12px] mt-0.5">
                {distance !== null ? `약 ${distance}m` : 'GPS 측정 중'}
              </strong>
            </div>
          </div>
        </div>

        {/* 퀴즈 풀러 가기 버튼 */}
        <div className="pt-3">
          <button
            onClick={() => navigate('/discovery-quiz')}
            className="w-full py-3.5 bg-sky-500 hover:bg-sky-600 text-white font-bold text-[15px] rounded-xl active:scale-98 transition-all shadow-lg shadow-sky-500/20 flex items-center justify-center gap-2"
          >
            <span>🧭 Discovery Quiz 화면으로 이동 (총 3문항)</span>
          </button>
        </div>
      </div>

      <BottomNav active="/map" />
    </div>
  );
};

export default MapScreen;
