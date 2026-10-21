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
// 코스별 실제 GPS 정밀 좌표 트랙 및 영역 (기점: 위도 37.434610, 경도 127.009518 빵명장)
// - ZOO_TRACK: 동물원둘레길 코스 (빨간색 #EF4444, 1~3조) - 호수 아래쪽 수변길 및 동물원 외곽 둘레길 순환
// - LAKE_TRACK: 미술관 코스 (파란색 #38BDF8, 4~6조) - 호수 북단 → 현대미술관 진입로 → 테마가든 동·남단 → 미리내다리 → 호수 서측 순환
// - THEME_GARDEN_POLYGON: 서울대공원 테마가든 (노란색 다각형 영역 - 호수 남동측 반도)
// ─────────────────────────────────────────────────────────────────
const THEME_GARDEN_POLYGON: [number, number][] = [
  [37.43250, 127.01694], // 북단 (제1호교 / 기린나라)
  [37.43241, 127.01573], // 북서 수변 (고향정원)
  [37.43207, 127.01494], // 서북 코너
  [37.43140, 127.01475], // 서측 수변 (장미원)
  [37.43078, 127.01432], // 서남 수변
  [37.43065, 127.01355], // 남서 돌출부
  [37.43005, 127.01298], // 남서단 (미리내다리 동측)
  [37.42965, 127.01428], // 남측 도로변 (어린이동물원)
  [37.42932, 127.01528], // 남단 코너
  [37.42961, 127.01637], // 남동 도로변 (테마가든 정문)
  [37.43019, 127.01717], // 동측 도로변 (모란작약원)
  [37.43063, 127.01725], // 동측 수변로
  [37.43171, 127.01706], // 북동 도로변
];

const LAKE_TRACK: [number, number][] = [
  [37.434610, 127.009518], // 빵명장 출발
  [37.434380, 127.010034],
  [37.434136, 127.011736], // 코끼리열차 탑승장 앞
  [37.434469, 127.011859],
  [37.434875, 127.012093],
  [37.435452, 127.012543],
  [37.435830, 127.012880],
  [37.435946, 127.013164],
  [37.435955, 127.013437], // 호수 북단
  [37.435883, 127.013873],
  [37.435782, 127.014174],
  [37.435407, 127.014871],
  [37.434909, 127.015772],
  [37.434524, 127.016129], // 서울랜드 정문 / 제2호교
  [37.433915, 127.016512],
  [37.433421, 127.016764],
  [37.432812, 127.016866], // 제1호교 (테마가든 북단)
  [37.432184, 127.017081],
  [37.431722, 127.017151],
  [37.431510, 127.017609], // 스카이리프트 중간도착지 / 현대미술관 진입로
  [37.431694, 127.018148], // 현대미술관 입구 경유
  [37.431264, 127.017463],
  [37.430631, 127.017247], // 동물원 북문 / 테마가든 동측 도로
  [37.430188, 127.017172],
  [37.429783, 127.016721],
  [37.429473, 127.015986], // 테마가든 정문 앞
  [37.429315, 127.015278],
  [37.429485, 127.014645],
  [37.429758, 127.013991],
  [37.430034, 127.013141], // 미리내다리 동단
  [37.430389, 127.011709], // 미리내다리 서단 (호수 남서측 다리 건너기)
  [37.430650, 127.010650],
  [37.430996, 127.010116],
  [37.431395, 127.009954],
  [37.431690, 127.010047],
  [37.432761, 127.010670],
  [37.433246, 127.011163],
  [37.434136, 127.011736],
  [37.434269, 127.009960],
  [37.434120, 127.009650], // 세븐일레븐 앞 공터 도착
];

const ZOO_TRACK: [number, number][] = [
  [37.434610, 127.009518], // 빵명장 출발
  [37.434520, 127.010100],
  [37.434268, 127.011791],
  [37.434980, 127.012020],
  [37.435580, 127.012460],
  [37.435960, 127.012820],
  [37.436080, 127.013390], // 호수 북단 외곽 도로
  [37.435920, 127.014170],
  [37.435540, 127.014920],
  [37.435020, 127.015860],
  [37.434620, 127.016240], // 서울랜드 정문 앞
  [37.433980, 127.016606],
  [37.433365, 127.016894],
  [37.432818, 127.016988],
  [37.431725, 127.017474], // 현대미술관 진입로
  [37.430929, 127.017604],
  [37.430383, 127.018307], // 산림욕장 출입구 진입
  [37.429576, 127.018363],
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
  [37.427828, 127.014218],
  [37.427953, 127.014038],
  [37.428140, 127.013739],
  [37.428338, 127.013335],
  [37.428409, 127.013004],
  [37.428365, 127.012854], // 호수 아래쪽(최남단) 수변길
  [37.428537, 127.012452],
  [37.428789, 127.012117],
  [37.429135, 127.011883],
  [37.429552, 127.011644],
  [37.430084, 127.011530],
  [37.430389, 127.011709], // 스카이리프트 출발지 / 미리내다리 서단
  [37.430634, 127.010711],
  [37.430843, 127.010272],
  [37.431238, 127.009966],
  [37.431690, 127.010047],
  [37.432761, 127.010670],
  [37.433246, 127.011163],
  [37.434136, 127.011736],
  [37.434269, 127.009960],
  [37.434120, 127.009650], // 세븐일레븐 앞 공터 도착
];

const MapScreen: React.FC = () => {
  const navigate = useNavigate();
  const { myLocation, setMyLocation } = useAppStore();

  const [selectedSpotId, setSelectedSpotId] = useState<'themeGarden' | 'start' | 'finishPhoto'>('themeGarden');
  const [focusedCourse, setFocusedCourse] = useState<'all' | 'forest' | 'lake'>('all');
  const [isLocating, setIsLocating] = useState(false);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [copiedGps, setCopiedGps] = useState<boolean>(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const elementsLayerRef = useRef<L.LayerGroup | null>(null);

  // 3대 핵심 거점 스팟 정의
  const venueSpots = useMemo(() => [
    {
      id: 'start' as const,
      title: '빵명장',
      badge: '🚩 1:30~2:00 첫 집결지 / 출발',
      subtitle: '빵명장에서 조별 그라운드룰 의논 및 몸풀기 Quiz 진행 후 출발',
      coords: ACTIVE_VENUE.departurePoint.coords,
      emoji: '🥐',
      color: '#FACC15',
    },
    {
      id: 'themeGarden' as const,
      title: '서울대공원 테마가든',
      badge: '🌹 2:00~4:30 메인 단체사진 미션 (+100pt)',
      subtitle: '노란색 표시 영역(테마가든) 안에 숨어있는 포토 스팟을 찾아 조원 전원이 보이도록 사진 촬영',
      coords: ACTIVE_VENUE.themeGardenSpot.coords,
      emoji: '🌹',
      color: '#FACC15',
    },
    {
      id: 'finishPhoto' as const,
      title: '세븐일레븐 앞 공터',
      badge: '📸 4:30 최종 집결 / 전체 단체사진',
      subtitle: '빵명장 길 건너편 세븐일레븐 앞 공터로 4:30까지 최종 집결 후 전체 단체사진 촬영',
      coords: ACTIVE_VENUE.photoSpot.coords,
      emoji: '📸',
      color: '#E31837',
    },
  ], []);

  const selectedSpot = venueSpots.find(s => s.id === selectedSpotId) || venueSpots[1];

  // 현재 위치와의 거리 계산
  const distance = useMemo(() => {
    if (!myLocation || !selectedSpot) return null;
    return haversine(myLocation, selectedSpot.coords);
  }, [myLocation, selectedSpot]);

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

  // 2. Leaflet 고해상도 위성 지도 초기화
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [37.4298, 127.0175],
      zoom: 14,
      zoomControl: false,
      attributionControl: false,
    });

    const satelliteTileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
    L.tileLayer(satelliteTileUrl, {
      maxZoom: 19,
    }).addTo(map);

    const labelsTileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}';
    L.tileLayer(labelsTileUrl, {
      maxZoom: 19,
      opacity: 0.85,
    }).addTo(map);

    const elementsLayer = L.layerGroup().addTo(map);
    elementsLayerRef.current = elementsLayer;

    // 초기 로드 시 두 코스가 모두 한눈에 들어오도록 영역 맞춤
    const allBounds = L.polyline([...ZOO_TRACK, ...LAKE_TRACK]).getBounds();
    map.fitBounds(allBounds, { padding: [28, 28] });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // 3. 단일 지도 위에 두 코스(동물원둘레길 코스 = 빨간색, 미술관 코스 = 파란색), 노란색 테마가든 영역, 거점 마커 동시 렌더링
  useEffect(() => {
    if (!mapRef.current || !elementsLayerRef.current) return;
    elementsLayerRef.current.clearLayers();

    const layer = elementsLayerRef.current;

    // 1) 테마가든 노란색 영역 다각형 (참조 이미지의 호수 남동측 반도 노란 영역)
    const themePolygon = L.polygon(THEME_GARDEN_POLYGON, {
      color: '#FACC15',
      fillColor: '#FACC15',
      fillOpacity: 0.32,
      weight: 3,
      lineJoin: 'round',
    }).addTo(layer);

    themePolygon.on('click', () => {
      setSelectedSpotId('themeGarden');
    });

    // 2) 동물원둘레길 코스 (1~3조, 빨간색 #EF4444)
    L.polyline(ZOO_TRACK, {
      color: '#000000',
      weight: focusedCourse === 'forest' ? 8.5 : 7,
      opacity: 0.65,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(layer);

    L.polyline(ZOO_TRACK, {
      color: '#EF4444',
      weight: focusedCourse === 'forest' ? 5.5 : 4.5,
      opacity: focusedCourse === 'lake' ? 0.75 : 1,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(layer);

    // 3) 미술관 코스 (4~6조, 파란색 #38BDF8)
    L.polyline(LAKE_TRACK, {
      color: '#0F172A',
      weight: focusedCourse === 'lake' ? 8.5 : 7,
      opacity: 0.75,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(layer);

    L.polyline(LAKE_TRACK, {
      color: '#38BDF8',
      weight: focusedCourse === 'lake' ? 5.5 : 4.5,
      opacity: focusedCourse === 'forest' ? 0.85 : 1,
      dashArray: '10, 6',
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(layer);

    // 4) 국립현대미술관 랜드마크 라벨 (미술관 코스 경유 지점)
    const museumIcon = L.divIcon({
      className: 'custom-museum-pin',
      html: `
        <div style="
          background: rgba(30, 58, 138, 0.92);
          color: #BAE6FD;
          border: 1.5px solid #38BDF8;
          padding: 3px 8px;
          border-radius: 12px;
          font-size: 11.5px;
          font-weight: 700;
          white-space: nowrap;
          box-shadow: 0 2px 8px rgba(0,0,0,0.6);
          display: flex;
          align-items: center;
          gap: 3px;
        ">
          <span>🏛️</span>
          <span>현대미술관</span>
        </div>
      `,
      iconSize: [96, 24],
      iconAnchor: [10, 12],
    });
    L.marker([37.431694, 127.018148], { icon: museumIcon, interactive: false }).addTo(layer);

    // 5) 빵명장 [첫 집결지 · 출발 기점] 마커 (길 북서측 위치, 라벨을 위쪽으로 배치하여 길 건너편 마커와 겹침 방지)
    const startIcon = L.divIcon({
      className: 'custom-start-pin',
      html: `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
          <div style="
            background: rgba(15, 23, 42, 0.95);
            color: #FACC15;
            border: 2px solid #FACC15;
            padding: 4px 10px;
            border-radius: 16px;
            font-size: 12.5px;
            font-weight: 800;
            white-space: nowrap;
            box-shadow: 0 4px 12px rgba(0,0,0,0.85);
            display: flex;
            align-items: center;
            gap: 4px;
            cursor: pointer;
          ">
            <span>🥐</span>
            <span>빵명장 [출발]</span>
          </div>
          <div style="width: 10px; height: 10px; border-radius: 50%; background: #FACC15; border: 2px solid #0F172A; margin-top: 2px; box-shadow: 0 0 6px rgba(0,0,0,0.8);"></div>
        </div>
      `,
      iconSize: [120, 42],
      iconAnchor: [60, 38],
    });

    const startMarker = L.marker([ACTIVE_VENUE.departurePoint.coords.lat, ACTIVE_VENUE.departurePoint.coords.lng], {
      icon: startIcon,
    }).addTo(layer);

    startMarker.on('click', () => {
      setSelectedSpotId('start');
      mapRef.current?.panTo([ACTIVE_VENUE.departurePoint.coords.lat, ACTIVE_VENUE.departurePoint.coords.lng], { animate: true });
    });

    // 6) 세븐일레븐 앞 공터 [빵명장 길 건너편 · 4:30 최종 집결] 마커 (점 위치를 먼저 찍고 라벨을 아래쪽으로 배치)
    const finishIcon = L.divIcon({
      className: 'custom-finish-pin',
      html: `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
          <div style="width: 10px; height: 10px; border-radius: 50%; background: #EF4444; border: 2px solid #FFFFFF; margin-bottom: 2px; box-shadow: 0 0 6px rgba(0,0,0,0.8);"></div>
          <div style="
            background: rgba(227, 24, 55, 0.95);
            color: #FFFFFF;
            border: 2px solid #FFFFFF;
            padding: 4px 10px;
            border-radius: 16px;
            font-size: 12.5px;
            font-weight: 800;
            white-space: nowrap;
            box-shadow: 0 4px 12px rgba(227, 24, 55, 0.65);
            display: flex;
            align-items: center;
            gap: 4px;
            cursor: pointer;
          ">
            <span>📸</span>
            <span>세븐일레븐 앞 공터 [4:30 집결]</span>
          </div>
        </div>
      `,
      iconSize: [200, 42],
      iconAnchor: [100, 5],
    });

    const finishMarker = L.marker([ACTIVE_VENUE.photoSpot.coords.lat, ACTIVE_VENUE.photoSpot.coords.lng], {
      icon: finishIcon,
    }).addTo(layer);

    finishMarker.on('click', () => {
      setSelectedSpotId('finishPhoto');
      mapRef.current?.panTo([ACTIVE_VENUE.photoSpot.coords.lat, ACTIVE_VENUE.photoSpot.coords.lng], { animate: true });
    });

    // 7) 테마가든 단체사진 미션 스팟 마커 (노란색 영역 중앙)
    const themeGardenIcon = L.divIcon({
      className: 'custom-theme-garden-pin',
      html: `
        <div style="
          background: rgba(250, 204, 21, 0.96);
          color: #0F172A;
          border: 2px solid #FFFFFF;
          padding: 5px 11px;
          border-radius: 18px;
          font-size: 13px;
          font-weight: 900;
          white-space: nowrap;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.75);
          display: flex;
          align-items: center;
          gap: 4px;
          cursor: pointer;
        ">
          <span>🌹</span>
          <span>테마가든</span>
        </div>
      `,
      iconSize: [105, 32],
      iconAnchor: [52, 16],
    });

    const themeMarker = L.marker([ACTIVE_VENUE.themeGardenSpot.coords.lat, ACTIVE_VENUE.themeGardenSpot.coords.lng], {
      icon: themeGardenIcon,
    }).addTo(layer);

    themeMarker.on('click', () => {
      setSelectedSpotId('themeGarden');
      mapRef.current?.panTo([ACTIVE_VENUE.themeGardenSpot.coords.lat, ACTIVE_VENUE.themeGardenSpot.coords.lng], { animate: true });
    });

    // 8) 내 실시간 위치 마커 (GPS)
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
  }, [focusedCourse, selectedSpotId, myLocation]);

  return (
    <div className="max-w-[430px] mx-auto bg-[#0D1117] min-h-screen pb-24 font-['Noto_Sans_KR'] flex flex-col text-slate-100 select-none">
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
            <p className="text-[12.5px] text-slate-400">동물원둘레길 코스 · 미술관 코스 통합 지도</p>
          </div>
          <span className="text-[13.5px] bg-sky-500/15 text-sky-300 border border-sky-500/30 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
            {gpsAccuracy !== null ? `±${Math.round(gpsAccuracy)}m` : '🛰️ 위성지도'}
          </span>
        </div>
      </header>

      {/* 단일 지도 색상 범례 바 (클릭 시 해당 코스로 줌 이동, 지도에는 두 코스 모두 상시 표시) */}
      <div className="bg-[#101626] border-b border-white/8 px-3 py-2 flex flex-col gap-1.5 z-10">
        <div className="flex items-center gap-1.5 w-full">
          <button
            onClick={() => {
              setFocusedCourse('forest');
              if (mapRef.current) {
                mapRef.current.fitBounds(L.polyline(ZOO_TRACK).getBounds(), { padding: [28, 28], animate: true });
              }
            }}
            className={`flex-1 py-2 px-2 rounded-xl text-[13.5px] font-bold transition-all flex items-center justify-center gap-1.5 border ${
              focusedCourse === 'forest'
                ? 'bg-red-500/20 text-white border-red-500 shadow-md shadow-red-500/15'
                : 'bg-[#1A2235] text-slate-200 border-white/10 hover:border-red-400/50'
            }`}
          >
            <span className="w-3.5 h-1.5 rounded-full bg-[#EF4444] inline-block shadow-sm shadow-red-500" />
            <span>동물원둘레길 코스 (1~3조)</span>
          </button>
          <button
            onClick={() => {
              setFocusedCourse('lake');
              if (mapRef.current) {
                mapRef.current.fitBounds(L.polyline(LAKE_TRACK).getBounds(), { padding: [32, 32], animate: true });
              }
            }}
            className={`flex-1 py-2 px-2 rounded-xl text-[13.5px] font-bold transition-all flex items-center justify-center gap-1.5 border ${
              focusedCourse === 'lake'
                ? 'bg-sky-500/20 text-white border-sky-400 shadow-md shadow-sky-500/15'
                : 'bg-[#1A2235] text-slate-200 border-white/10 hover:border-sky-400/50'
            }`}
          >
            <span className="w-3.5 h-1.5 rounded-full bg-[#38BDF8] inline-block shadow-sm shadow-sky-400" />
            <span>미술관 코스 (4~6조)</span>
          </button>
        </div>
      </div>

      {/* 거점 스팟 퀵 선택 바 */}
      <div className="bg-[#0E1422] border-b border-white/5 px-3 py-1.5 flex gap-1.5 overflow-x-auto z-10">
        {venueSpots.map(spot => (
          <button
            key={spot.id}
            onClick={() => {
              setSelectedSpotId(spot.id);
              mapRef.current?.flyTo([spot.coords.lat, spot.coords.lng], spot.id === 'themeGarden' ? 16 : 17, { duration: 0.9 });
            }}
            className={`px-2.5 py-1 rounded-lg text-[13.5px] font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
              selectedSpotId === spot.id
                ? 'bg-white/15 text-white border border-white/30 shadow'
                : 'bg-black/30 text-slate-400 border border-white/5'
            }`}
          >
            <span>{spot.emoji}</span>
            <span>{spot.id === 'themeGarden' ? '테마가든 (노란영역)' : spot.title}</span>
          </button>
        ))}
      </div>

      {/* 실제 Leaflet 위성 지도 뷰포트 */}
      <div className="relative w-full h-[380px] border-b border-white/8 overflow-hidden bg-[#0A0F1A]">
        <div ref={mapContainerRef} className="w-full h-full z-0" />

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
              setFocusedCourse('all');
              if (mapRef.current) {
                const allBounds = L.polyline([...ZOO_TRACK, ...LAKE_TRACK]).getBounds();
                mapRef.current.fitBounds(allBounds, { padding: [28, 28], animate: true, duration: 1 });
              }
            }}
            className="w-10 h-10 rounded-xl bg-[#1A2235]/95 border border-white/20 text-white shadow-xl flex items-center justify-center text-xs font-bold active:scale-95 transition-all"
            title="전체 코스 한눈에 보기"
          >
            전체
          </button>
        </div>
      </div>

      {/* 선택된 거점 스팟 정보 카드 */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div className="bg-[#1A2235] border border-white/10 rounded-2xl p-4 space-y-2.5 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-[14px] font-bold px-2.5 py-0.5 rounded-full border bg-amber-500/15 text-amber-300 border-amber-500/30">
              {selectedSpot.badge}
            </span>
            <span className="text-[13.5px] text-slate-400">
              {distance !== null ? `약 ${distance}m 거리` : '거리 계산 중'}
            </span>
          </div>

          <div>
            <h3 className="text-[18px] font-bold text-white mb-0.5 flex items-center gap-1.5">
              <span>{selectedSpot.emoji}</span>
              <span>{selectedSpot.title}</span>
            </h3>
            <p className="text-[14px] text-slate-300">
              {selectedSpot.subtitle}
            </p>
          </div>

          {/* 실시간 GPS 좌표 정보 */}
          <div className="bg-black/40 border border-white/5 p-2 rounded-xl text-[13px] space-y-0.5">
            <div className="flex justify-between items-center text-slate-300">
              <span>내 위치: <strong className="text-sky-300 font-mono">{myLocation ? `${myLocation.lat.toFixed(6)}, ${myLocation.lng.toFixed(6)}` : 'GPS 대기'}</strong></span>
              <button
                onClick={handleCopyCoords}
                className="text-[12.5px] bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 px-2 py-0.5 rounded-md transition-all active:scale-95"
              >
                {copiedGps ? '✅ 복사됨' : '📋 좌표 복사'}
              </button>
            </div>
            <div className="text-slate-400">
              스팟: <span className="text-slate-300 font-mono">{selectedSpot.coords.lat.toFixed(6)}, {selectedSpot.coords.lng.toFixed(6)}</span>
            </div>
          </div>
        </div>

        {/* 하단 미션 이동 버튼 (순서: 1. 피플퀘스트 추천 -> 2. 테마가든 사진 올리기) */}
        <div className="pt-3 flex gap-2">
          <button
            onClick={() => navigate('/people-quest')}
            className="flex-1 py-3.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-bold text-[16px] rounded-xl active:scale-98 transition-all shadow-lg shadow-sky-500/20 flex items-center justify-center gap-1.5"
          >
            <span>💬 피플퀘스트 추천</span>
          </button>
          <button
            onClick={() => navigate('/')}
            className="flex-1 py-3.5 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white font-bold text-[16px] rounded-xl active:scale-98 transition-all shadow-lg shadow-pink-500/20 flex items-center justify-center gap-1.5"
          >
            <span>🌹 테마가든 사진 올리기</span>
          </button>
        </div>
      </div>

      <BottomNav active="/map" />
    </div>
  );
};

export default MapScreen;


