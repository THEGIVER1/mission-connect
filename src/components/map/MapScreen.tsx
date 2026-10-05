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
// ─────────────────────────────────────────────────────────────────
// 코스별 실제 GPS 정밀 좌표 트랙 (호수 수변길 및 동물원 외곽 숲길 100% 곡선 순환 동선)
// ─────────────────────────────────────────────────────────────────
const LAKE_TRACK: [number, number][] = [
  [37.4347, 127.0132], // 1. 코끼리열차 매표소 [출발 기점]
  [37.4349, 127.0140], // 호수 북측 광장 연결로
  [37.4353, 127.0152], // 분수대 북측 산책로
  [37.4355, 127.0163], // 호수 북단 수변길
  [37.4354, 127.0177], // 대공원 정문 진입로 외곽
  [37.4351, 127.0190], // 북동측 미술관 진입 수변로
  [37.4344, 127.0203], // 미술관 셔틀도로 합류점
  [37.4334, 127.0215], // 미술관 진입 오르막길
  [37.4324, 127.0222], // 미술관 조각공원 입구
  [37.4315, 127.0225], // 2. 국립현대미술관 과천관 앞 [📸 단체사진 촬영지]
  [37.4312, 127.0215], // 미술관 연결로 하향길
  [37.4310, 127.0202], // 호수교 동단
  [37.4310, 127.0185], // 3. 호수 브릿지 전망 데크 [호수길 전용 퀴즈]
  [37.4305, 127.0178], // 테마가든(장미원) 북동측 수변
  [37.4298, 127.0173], // 테마가든 동측 수변 산책로
  [37.4290, 127.0170], // 장미원 외곽 수변로
  [37.4284, 127.0165], // 호수 남동측 수변길
  [37.4280, 127.0158], // 호수 남단 제방(둑길) 진입
  [37.4278, 127.0150], // 청계저수지 남측 제방길
  [37.4278, 127.0140], // 남측 제방길 서단
  [37.4282, 127.0132], // 호수 남서측 수변 쉼터
  [37.4288, 127.0128], // 호수 서편 메타세쿼이아길 진입
  [37.4298, 127.0125], // 서편 수변 숲길
  [37.4310, 127.0123], // 서편 산책로 중앙 벤치구간
  [37.4322, 127.0124], // 서편 수변로 북상
  [37.4335, 127.0127], // 매표소 광장 진입 서측로
  [37.4342, 127.0129], // 광장 서측 정문 연결로
  [37.4347, 127.0132], // 4. 코끼리열차 매표소 [도착/회귀 완료]
];

const ZOO_TRACK: [number, number][] = [
  [37.4347, 127.0132], // 1. 코끼리열차 매표소 [출발 기점]
  [37.4349, 127.0140], // 호수 북측 광장 연결로
  [37.4353, 127.0152], // 분수대 북측 산책로
  [37.4355, 127.0163], // 호수 북단 수변길
  [37.4354, 127.0177], // 대공원 정문 진입로 외곽
  [37.4351, 127.0190], // 북동측 미술관 진입 수변로
  [37.4344, 127.0203], // 미술관 셔틀도로 합류점
  [37.4334, 127.0215], // 미술관 진입 오르막길
  [37.4324, 127.0222], // 미술관 조각공원 입구
  [37.4315, 127.0225], // 2. 국립현대미술관 과천관 앞 [📸 단체사진 촬영지]
  [37.4308, 127.0235], // 동물원둘레길 동편 산림욕장길 진입
  [37.4298, 127.0245], // 동편 숲길 외곽 능선로
  [37.4288, 127.0255], // 동편 완만한 흙길 코스
  [37.4278, 127.0262], // 피톤치드 숲길 진입로
  [37.4265, 127.0268], // 3. 동물원둘레길 피톤치드 숲길 쉼터 [1~3조 전용 퀴즈]
  [37.4255, 127.0272], // 동남측 외곽 숲길 (산림욕장길)
  [37.4242, 127.0275], // 동남단 능선 쉼터
  [37.4230, 127.0273], // 남동측 외곽 둘레길
  [37.4218, 127.0268], // 동물원 남측 산림욕장길
  [37.4208, 127.0258], // 남측 외곽 숲길 벤치
  [37.4198, 127.0245], // 동물원 남단 숲길 (조절저수지 상류)
  [37.4190, 127.0232], // 조절저수지 상류 외곽 능선
  [37.4183, 127.0218], // 남측 외곽 최남단 둘레길
  [37.4178, 127.0202], // 남측 완만한 숲길
  [37.4176, 127.0185], // 남측 둘레길 중앙 지점
  [37.4178, 127.0170], // 남서측 둘레길 곡선로
  [37.4183, 127.0158], // 남서측 능선 숲길
  [37.4192, 127.0148], // 서남측 외곽 숲길 코너
  [37.4205, 127.0140], // 서측 순환 둘레길 진입
  [37.4218, 127.0135], // 서측 외곽 숲길 북상
  [37.4232, 127.0132], // 동물원 서편 관리도로 외곽
  [37.4248, 127.0131], // 서편 평탄 숲길 구간
  [37.4262, 127.0132], // 동물원 서측 쉼터
  [37.4278, 127.0135], // 동물원 정문 인근 서측로
  [37.4292, 127.0138], // 테마가든 서측 외곽 연결로
  [37.4308, 127.0136], // 서편 메타세쿼이아길 합류로
  [37.4322, 127.0132], // 대공원 광장 남서 진입로
  [37.4335, 127.0130], // 매표소 광장 서측 진입로
  [37.4347, 127.0132], // 4. 코끼리열차 매표소 [도착/회귀 완료]
];

const MapScreen: React.FC = () => {
  const navigate = useNavigate();
  const { myTeam, myLocation, setMyLocation, selectedCourse, setCourse } = useAppStore();

  const [selectedQuizId, setSelectedQuizId] = useState<string>('dq_elephant');
  const [isLocating, setIsLocating] = useState(false);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);

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

  const allowedRadius = useMemo(() => {
    const base = selectedQuiz?.radiusMeters ?? 60;
    const accuracyBuffer = gpsAccuracy ? Math.min(gpsAccuracy, 30) : 15;
    return base + accuracyBuffer;
  }, [selectedQuiz, gpsAccuracy]);

  const isInRangeOfSelected = distance !== null && distance <= allowedRadius;

  // 1. GPS 위치 측정 함수
  const fetchMyLocation = () => {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        const coord = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setMyLocation(coord);
        setGpsAccuracy(pos.coords.accuracy || null);
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

  useEffect(() => {
    fetchMyLocation();
  }, []);

  // 햅틱 진동 피드백
  const prevSelectedInRange = useRef(false);
  useEffect(() => {
    if (isInRangeOfSelected && !prevSelectedInRange.current) {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        try { navigator.vibrate([200, 100, 200]); } catch (e) {}
      }
    }
    prevSelectedInRange.current = Boolean(isInRangeOfSelected);
  }, [isInRangeOfSelected]);

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

  // 3. 코스 트랙선, 출발/도착점, 단체사진 스팟, 퀴즈 핀(3개), 내 위치 마커 렌더링
  useEffect(() => {
    if (!mapRef.current || !elementsLayerRef.current) return;
    elementsLayerRef.current.clearLayers();

    const layer = elementsLayerRef.current;

    // 1) 코스 경로선 (원점 순환 Polyline)
    const trackCoords = activeCourse === 'lake' ? LAKE_TRACK : ZOO_TRACK;
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

    // 3) 단체사진 촬영지 배지 (국립현대미술관 과천관 앞)
    const photoSpotIcon = L.divIcon({
      className: 'custom-photo-spot-pin',
      html: `
        <div style="
          background: rgba(227, 24, 55, 0.95);
          color: #FFFFFF;
          border: 2px solid #FFFFFF;
          padding: 4px 9px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 800;
          white-space: nowrap;
          box-shadow: 0 4px 14px rgba(227, 24, 55, 0.6);
          display: flex;
          align-items: center;
          gap: 4px;
        ">
          <span>📸</span>
          <span>단체사진 촬영지 (미술관 앞)</span>
        </div>
      `,
      iconSize: [180, 28],
      iconAnchor: [90, 42],
    });

    L.marker([ACTIVE_VENUE.photoSpot.coords.lat, ACTIVE_VENUE.photoSpot.coords.lng], {
      icon: photoSpotIcon,
    }).addTo(layer);

    // 4) Discovery Quiz 마커 (선택된 코스에 해당하는 3개 핀만 노출)
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

    // 5) 내 실시간 위치 마커 (GPS)
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
          <span className="text-[11px] bg-sky-500/15 text-sky-300 border border-sky-500/30 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
            {gpsAccuracy !== null ? `±${Math.round(gpsAccuracy)}m` : '🛰️ 위성지도'}
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
            🦁 동물원둘레길 순환 (1~3조)
          </button>
        </div>
      </div>

      {/* 실제 Leaflet 위성 지도 뷰포트 */}
      <div className="relative w-full h-[340px] border-b border-white/8 overflow-hidden bg-[#0A0F1A]">
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* 도착 알림 플로팅 오버레이 */}
        {isInRangeOfSelected && (
          <div className="absolute top-3 left-3 right-3 z-[400] bg-emerald-950/90 border border-emerald-500/50 backdrop-blur-md px-3 py-2 rounded-xl text-center shadow-2xl animate-fade-in flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base animate-bounce">🎉</span>
              <span className="text-[12px] font-bold text-emerald-300">
                [{selectedQuiz?.title}] 반경 도착!
              </span>
            </div>
            <button
              onClick={() => navigate('/discovery-quiz')}
              className="text-[11px] bg-emerald-500 text-slate-900 font-extrabold px-2.5 py-1 rounded-lg shadow active:scale-95"
            >
              문제 풀기 →
            </button>
          </div>
        )}

        {/* 플로팅 컨트롤 */}
        <div className="absolute right-3 bottom-3 flex flex-col gap-2 z-[400]">
          <button
            onClick={fetchMyLocation}
            disabled={isLocating}
            className="w-10 h-10 rounded-xl bg-[#1A2235]/95 border border-white/20 text-white shadow-xl flex items-center justify-center text-lg active:scale-95 transition-all"
            title="내 현재 GPS 위치로 이동"
          >
            {isLocating ? '🔄' : '📍'}
          </button>
          <button
            onClick={() => {
              if (mapRef.current) {
                const trackCoords = activeCourse === 'lake' ? LAKE_TRACK : ZOO_TRACK;
                const polyline = L.polyline(trackCoords);
                mapRef.current.fitBounds(polyline.getBounds(), { padding: [35, 35], animate: true, duration: 1 });
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
        <div className={`border rounded-2xl p-4 space-y-2.5 shadow-xl transition-all ${
          isInRangeOfSelected
            ? 'bg-emerald-950/25 border-emerald-500/40 ring-1 ring-emerald-500/20'
            : 'bg-[#1A2235] border-white/10'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-[12px] font-bold px-2.5 py-0.5 rounded-full border ${
              isInRangeOfSelected
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 animate-pulse'
                : 'bg-sky-500/15 text-sky-400 border-sky-500/30'
            }`}>
              {isInRangeOfSelected ? '📍 현장 반경 진입 완료!' : `스팟 ${courseQuizzes.findIndex(q => q.id === selectedQuiz?.id) + 1} / ${courseQuizzes.length}`}
            </span>
            <span className="text-[12px] text-amber-400 font-bold">
              +{selectedQuiz?.points}pt
            </span>
          </div>

          <div>
            <h3 className="text-[16px] font-bold text-white mb-1 flex items-center gap-1.5">
              <span>{selectedQuiz?.title}</span>
              {selectedQuiz?.id === 'dq_museum' && (
                <span className="text-[10px] bg-red-500/20 text-red-300 border border-red-500/30 px-1.5 py-0.5 rounded font-bold">
                  📸 단체사진
                </span>
              )}
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
              <strong className={`text-[12px] mt-0.5 ${isInRangeOfSelected ? 'text-emerald-400 font-bold' : 'text-amber-400'}`}>
                {distance !== null ? `약 ${distance}m` : 'GPS 측정 중'}
              </strong>
            </div>
          </div>
        </div>

        {/* 퀴즈 풀러 가기 버튼 */}
        <div className="pt-3">
          <button
            onClick={() => navigate('/discovery-quiz')}
            className="w-full py-3.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-bold text-[15px] rounded-xl active:scale-98 transition-all shadow-lg shadow-sky-500/20 flex items-center justify-center gap-2"
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
