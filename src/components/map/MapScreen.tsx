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
// ─────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────
// 코스별 실제 GPS 정밀 좌표 트랙 (기점: 위도 37.434610, 경도 127.009518 빵명장 서울대공원점 집결지)
// - LAKE_TRACK: 청계저수지 파란 호수 수변 테두리를 100% 따르는 2.8km 순환선
// - ZOO_TRACK: 서울대공원 동물원 시설 외곽과 산림 경계를 완벽히 도는 4.5km 순환선
// ─────────────────────────────────────────────────────────────────
const LAKE_TRACK: [number, number][] = [
  [
    37.434610,
    127.009518
  ],
  [
    37.4350,
    127.0120
  ],
  [
    37.43525,
    127.0152
  ],
  [
    37.4356,
    127.0163
  ],
  [
    37.43555,
    127.0175
  ],
  [
    37.4352,
    127.0188
  ],
  [
    37.4345,
    127.0201
  ],
  [
    37.4335,
    127.0214
  ],
  [
    37.4323,
    127.0222
  ],
  [
    37.4315,
    127.0225
  ],
  [
    37.4312,
    127.0215
  ],
  [
    37.43105,
    127.0202
  ],
  [
    37.431,
    127.0185
  ],
  [
    37.4305,
    127.0179
  ],
  [
    37.4299,
    127.0174
  ],
  [
    37.4292,
    127.0171
  ],
  [
    37.4285,
    127.0167
  ],
  [
    37.428,
    127.0162
  ],
  [
    37.42765,
    127.0154
  ],
  [
    37.4275,
    127.0146
  ],
  [
    37.4276,
    127.0138
  ],
  [
    37.428,
    127.0131
  ],
  [
    37.4286,
    127.0126
  ],
  [
    37.4294,
    127.01225
  ],
  [
    37.4304,
    127.01205
  ],
  [
    37.4315,
    127.01195
  ],
  [
    37.4326,
    127.01205
  ],
  [
    37.4336,
    127.01235
  ],
  [
    37.4343,
    127.0128
  ],
  [
    37.4348,
    127.0110
  ],
  [
    37.434610,
    127.009518
  ]
];

const ZOO_TRACK: [number, number][] = [
  [
    37.434610,
    127.009518
  ],
  [
    37.4350,
    127.0120
  ],
  [
    37.4352,
    127.0152
  ],
  [
    37.4357,
    127.0165
  ],
  [
    37.4358,
    127.0178
  ],
  [
    37.4354,
    127.0192
  ],
  [
    37.4346,
    127.0205
  ],
  [
    37.4334,
    127.0216
  ],
  [
    37.4322,
    127.0223
  ],
  [
    37.4315,
    127.0225
  ],
  [
    37.4308,
    127.022
  ],
  [
    37.4298,
    127.0215
  ],
  [
    37.429,
    127.0182
  ],
  [
    37.429002,
    127.01822
  ],
  [
    37.428864,
    127.01821
  ],
  [
    37.428544,
    127.018306
  ],
  [
    37.428321,
    127.018442
  ],
  [
    37.428145,
    127.018589
  ],
  [
    37.428083,
    127.018699
  ],
  [
    37.428082,
    127.01875
  ],
  [
    37.428083,
    127.018963
  ],
  [
    37.428098,
    127.019124
  ],
  [
    37.428064,
    127.019326
  ],
  [
    37.427998,
    127.019462
  ],
  [
    37.42788,
    127.019738
  ],
  [
    37.427567,
    127.020467
  ],
  [
    37.427475,
    127.02082
  ],
  [
    37.427498,
    127.021192
  ],
  [
    37.427558,
    127.021882
  ],
  [
    37.42752,
    127.022077
  ],
  [
    37.427457,
    127.022138
  ],
  [
    37.427374,
    127.022165
  ],
  [
    37.426795,
    127.022283
  ],
  [
    37.426604,
    127.02245
  ],
  [
    37.426437,
    127.022601
  ],
  [
    37.426291,
    127.022796
  ],
  [
    37.426205,
    127.023048
  ],
  [
    37.426141,
    127.023378
  ],
  [
    37.426084,
    127.023631
  ],
  [
    37.425964,
    127.023814
  ],
  [
    37.425776,
    127.023925
  ],
  [
    37.425511,
    127.024016
  ],
  [
    37.425259,
    127.024114
  ],
  [
    37.425179,
    127.024145
  ],
  [
    37.425098,
    127.024165
  ],
  [
    37.425061,
    127.024162
  ],
  [
    37.42481,
    127.024141
  ],
  [
    37.424539,
    127.024098
  ],
  [
    37.42433,
    127.024104
  ],
  [
    37.424114,
    127.024359
  ],
  [
    37.423978,
    127.024635
  ],
  [
    37.423885,
    127.025177
  ],
  [
    37.4237,
    127.026128
  ],
  [
    37.423647,
    127.026317
  ],
  [
    37.423553,
    127.026514
  ],
  [
    37.423475,
    127.026609
  ],
  [
    37.423329,
    127.026694
  ],
  [
    37.423079,
    127.026807
  ],
  [
    37.422927,
    127.026835
  ],
  [
    37.422775,
    127.026853
  ],
  [
    37.422598,
    127.026829
  ],
  [
    37.422502,
    127.026816
  ],
  [
    37.422388,
    127.026758
  ],
  [
    37.422286,
    127.026592
  ],
  [
    37.422282,
    127.026513
  ],
  [
    37.422281,
    127.026091
  ],
  [
    37.422311,
    127.025702
  ],
  [
    37.422249,
    127.02532
  ],
  [
    37.422097,
    127.025124
  ],
  [
    37.421902,
    127.024954
  ],
  [
    37.421622,
    127.024761
  ],
  [
    37.421477,
    127.02467
  ],
  [
    37.421311,
    127.024584
  ],
  [
    37.421219,
    127.0246
  ],
  [
    37.421093,
    127.024625
  ],
  [
    37.420994,
    127.024634
  ],
  [
    37.420848,
    127.024628
  ],
  [
    37.420708,
    127.024562
  ],
  [
    37.420566,
    127.024364
  ],
  [
    37.420484,
    127.02433
  ],
  [
    37.420385,
    127.024325
  ],
  [
    37.420234,
    127.024401
  ],
  [
    37.420118,
    127.024528
  ],
  [
    37.420017,
    127.024673
  ],
  [
    37.419598,
    127.025365
  ],
  [
    37.419076,
    127.026166
  ],
  [
    37.419,
    127.02627
  ],
  [
    37.418885,
    127.026383
  ],
  [
    37.418763,
    127.026329
  ],
  [
    37.418498,
    127.026083
  ],
  [
    37.418395,
    127.025987
  ],
  [
    37.418358,
    127.025639
  ],
  [
    37.41833,
    127.025389
  ],
  [
    37.418219,
    127.025321
  ],
  [
    37.418079,
    127.025355
  ],
  [
    37.417921,
    127.025455
  ],
  [
    37.417729,
    127.02556
  ],
  [
    37.417589,
    127.025516
  ],
  [
    37.417433,
    127.025422
  ],
  [
    37.417362,
    127.025082
  ],
  [
    37.41735,
    127.024824
  ],
  [
    37.417369,
    127.02457
  ],
  [
    37.41738,
    127.024065
  ],
  [
    37.417317,
    127.023881
  ],
  [
    37.417239,
    127.023704
  ],
  [
    37.416958,
    127.023442
  ],
  [
    37.416439,
    127.023084
  ],
  [
    37.416241,
    127.022817
  ],
  [
    37.416089,
    127.022493
  ],
  [
    37.416016,
    127.022288
  ],
  [
    37.415943,
    127.02203
  ],
  [
    37.415941,
    127.0219
  ],
  [
    37.41594,
    127.021867
  ],
  [
    37.415965,
    127.021689
  ],
  [
    37.416055,
    127.021464
  ],
  [
    37.416291,
    127.02109
  ],
  [
    37.416326,
    127.020858
  ],
  [
    37.416291,
    127.020528
  ],
  [
    37.416303,
    127.020295
  ],
  [
    37.41641,
    127.020081
  ],
  [
    37.416787,
    127.019705
  ],
  [
    37.416982,
    127.019601
  ],
  [
    37.417308,
    127.019638
  ],
  [
    37.417469,
    127.019727
  ],
  [
    37.41761,
    127.019917
  ],
  [
    37.417764,
    127.020198
  ],
  [
    37.41807,
    127.020437
  ],
  [
    37.418385,
    127.020595
  ],
  [
    37.418562,
    127.020679
  ],
  [
    37.418743,
    127.020723
  ],
  [
    37.418945,
    127.020702
  ],
  [
    37.419121,
    127.02064
  ],
  [
    37.419347,
    127.020456
  ],
  [
    37.419849,
    127.020017
  ],
  [
    37.420078,
    127.019817
  ],
  [
    37.420273,
    127.019676
  ],
  [
    37.420418,
    127.019658
  ],
  [
    37.420551,
    127.019806
  ],
  [
    37.420711,
    127.019997
  ],
  [
    37.420841,
    127.020044
  ],
  [
    37.421193,
    127.020025
  ],
  [
    37.421397,
    127.020002
  ],
  [
    37.421527,
    127.019909
  ],
  [
    37.421805,
    127.019149
  ],
  [
    37.421924,
    127.018713
  ],
  [
    37.422005,
    127.018414
  ],
  [
    37.42215,
    127.018246
  ],
  [
    37.422287,
    127.018209
  ],
  [
    37.422429,
    127.018214
  ],
  [
    37.422601,
    127.018335
  ],
  [
    37.422711,
    127.018452
  ],
  [
    37.423054,
    127.0188
  ],
  [
    37.42316,
    127.018896
  ],
  [
    37.423531,
    127.018902
  ],
  [
    37.423975,
    127.018765
  ],
  [
    37.42415,
    127.018709
  ],
  [
    37.424323,
    127.01863
  ],
  [
    37.424378,
    127.018563
  ],
  [
    37.42449,
    127.018427
  ],
  [
    37.424692,
    127.018105
  ],
  [
    37.424996,
    127.017446
  ],
  [
    37.4253,
    127.01673
  ],
  [
    37.425319,
    127.016691
  ],
  [
    37.425367,
    127.016596
  ],
  [
    37.425445,
    127.016482
  ],
  [
    37.425558,
    127.016413
  ],
  [
    37.425716,
    127.016466
  ],
  [
    37.42633,
    127.016751
  ],
  [
    37.426543,
    127.016759
  ],
  [
    37.426656,
    127.016714
  ],
  [
    37.42674,
    127.016625
  ],
  [
    37.426915,
    127.016338
  ],
  [
    37.427258,
    127.015714
  ],
  [
    37.427373,
    127.015502
  ],
  [
    37.427433,
    127.015348
  ],
  [
    37.427482,
    127.015233
  ],
  [
    37.427536,
    127.015062
  ],
  [
    37.42763,
    127.014697
  ],
  [
    37.427662,
    127.014596
  ],
  [
    37.427804,
    127.014076
  ],
  [
    37.427739,
    127.014287
  ],
  [
    37.427684,
    127.014505
  ],
  [
    37.427662,
    127.014596
  ],
  [
    37.4285,
    127.0138
  ],
  [
    37.4298,
    127.0135
  ],
  [
    37.4312,
    127.0132
  ],
  [
    37.4328,
    127.013
  ],
  [
    37.434,
    127.013
  ],
  [
    37.4348,
    127.0110
  ],
  [
    37.434610,
    127.009518
  ]
];

const MapScreen: React.FC = () => {
  const navigate = useNavigate();
  const { myTeam, myLocation, setMyLocation, selectedCourse, setCourse } = useAppStore();

  const [selectedQuizId, setSelectedQuizId] = useState<string>('dq_elephant');
  const [isLocating, setIsLocating] = useState(false);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [copiedGps, setCopiedGps] = useState<boolean>(false);

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

  const handleCopyCoords = () => {
    if (myLocation) {
      const coordText = `${myLocation.lat.toFixed(6)}, ${myLocation.lng.toFixed(6)}`;
      navigator.clipboard?.writeText(coordText);
      setCopiedGps(true);
      setTimeout(() => setCopiedGps(false), 2000);
    }
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

    // 2) 빵명장 서울대공원점 [첫 집결지 · 출발 & 도착] 기점 마커
    const departureIcon = L.divIcon({
      className: 'custom-departure-pin',
      html: `
        <div style="
          background: rgba(15, 23, 42, 0.95);
          color: #FACC15;
          border: 2px solid #FACC15;
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
          <span>🥖</span>
          <span>빵명장 [첫 집결지/출발]</span>
        </div>
      `,
      iconSize: [165, 32],
      iconAnchor: [82, 16],
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
            <p className="text-[10px] text-slate-400">빵명장 첫 집결지 순환 회귀 코스 지도</p>
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

          {/* 실시간 GPS 좌표 정보 (현장 점검용) */}
          <div className="bg-black/40 border border-white/5 p-2 rounded-xl text-[10.5px] space-y-0.5">
            <div className="flex justify-between items-center text-slate-300">
              <span>내 GPS: <strong className="text-sky-300 font-mono">{myLocation ? `${myLocation.lat.toFixed(6)}, ${myLocation.lng.toFixed(6)}` : '수신 대기'}</strong></span>
              <button
                onClick={handleCopyCoords}
                className="text-[10px] bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 px-2 py-0.5 rounded-md transition-all active:scale-95"
              >
                {copiedGps ? '✅ 복사됨' : '📋 좌표 복사'}
              </button>
            </div>
            <div className="text-slate-400">
              스팟: <span className="text-slate-300 font-mono">{selectedQuiz?.coords.lat.toFixed(6)}, {selectedQuiz?.coords.lng.toFixed(6)}</span>
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
