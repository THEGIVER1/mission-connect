/**
 * =====================================================================
 * Workshop & Venue Configuration (워크샵 & 장소 중앙 설정)
 * =====================================================================
 * 장소가 변경되거나 미션/좌표가 수정될 때 이 파일 하나만 수정하면
 * 전체 애플리케이션(UI 텍스트, GPS 인증, 지도, AR 보물찾기)에 자동 반영됩니다.
 */

export interface GpsLocation {
  lat: number;
  lng: number;
}

export interface TrekkingPostConfig {
  id: string;             // 'm1', 'm2' ...
  postId: string;         // 'P1', 'P2' ...
  name: string;           // 미션명
  locationLabel: string;  // 장소 명칭 (예: '분수대 광장', '호수 둘레길 입구')
  coords: GpsLocation;    // 실제 위도/경도
  radiusMeters: number;   // 인증 허용 반경 (기본 30~50m)
  points: number;         // 획득 점수
  type: 'gps' | 'ar' | 'match' | 'challenge' | 'quiz';
  description: string;    // 미션 상세 설명
  svgPos: { cx: number; cy: number }; // SVG 맵 내 시각화 좌표
}

export interface ExplorationTargetConfig {
  id: string;
  name: string;
  emoji: string;
  points: number;
  coords: GpsLocation;
  radiusMeters: number;
}

export interface VenueConfig {
  id: string;
  venueName: string;         // '서울대공원'
  venueSubtitle: string;     // '호수둘레길 트레킹 코스'
  eventName: string;         // '두산 HR 트레킹 워크샵'
  sessionKey: string;        // Firebase 세션 키 ('trekking2026')
  centerCoords: GpsLocation; // 중심 좌표
  mapLabel: string;          // 지도 상단 라벨
  lakeOrLandmarkName: string;// '대공원 호수'
  posts: TrekkingPostConfig[];
  explorationTargets: ExplorationTargetConfig[];
}

/**
 * ─────────────────────────────────────────────────────────────────
 * [장소 1] 서울대공원 (기본 활성 장소)
 * - 코스 기준: 서울대공원 만남의 광장 ~ 호수둘레길 (약 2.8km)
 * ─────────────────────────────────────────────────────────────────
 */
export const SEOUL_GRAND_PARK_CONFIG: VenueConfig = {
  id: 'seoul_grand_park',
  venueName: '서울대공원',
  venueSubtitle: '호수둘레길 트레킹 코스',
  eventName: '두산 HR 트레킹 워크샵 2026',
  sessionKey: 'trekking2026',
  centerCoords: { lat: 37.4315, lng: 127.0165 },
  mapLabel: '서울대공원 · 호수둘레길',
  lakeOrLandmarkName: '대공원 호수',
  posts: [
    {
      id: 'm1',
      postId: 'P1',
      name: '우리 팀 첫 만남',
      locationLabel: '만남의 광장 (분수대)',
      coords: { lat: 37.4345, lng: 127.0135 },
      radiusMeters: 50,
      points: 200,
      type: 'gps',
      description: '팀원 모두 모여 소개 카드를 작성하세요.\n• 이름 / 소속 / 맡은 업무\n• 오늘 가장 기대하는 점\n\n작성 후 단체 사진을 찍으면 미션 완료!',
      svgPos: { cx: 140, cy: 50 },
    },
    {
      id: 'm2',
      postId: 'P2',
      name: '호수둘레길 자연 탐험',
      locationLabel: '둘레길 입구 숲길',
      coords: { lat: 37.4330, lng: 127.0175 },
      radiusMeters: 50,
      points: 500,
      type: 'ar',
      description: '호수둘레길 곳곳에 숨겨진 보물 6가지를 카메라로 찾아보세요!\n\n🌸 무궁화\n🍐 산사나무\n🍊 모과나무\n🫐 산딸기\n🌿 느티나무\n🏛️ 쉼터 정자\n\n많이 찾을수록 높은 점수!',
      svgPos: { cx: 230, cy: 110 },
    },
    {
      id: 'm3',
      postId: 'P3',
      name: '같은 고민, 다른 회사',
      locationLabel: '호수 브릿지 전망대',
      coords: { lat: 37.4305, lng: 127.0185 },
      radiusMeters: 50,
      points: 300,
      type: 'match',
      description: 'HR 담당자로서의 고민을 입력하고 다른 자회사 동료와 자동 매칭됩니다.\n서로를 찾아 5분간 대화를 나눈 뒤 투샷 인증을 완료하세요!',
      svgPos: { cx: 260, cy: 195 },
    },
    {
      id: 'm4',
      postId: 'P4',
      name: '두산 HR로 산다는 것',
      locationLabel: '테마가든 메타세쿼이아길',
      coords: { lat: 37.4285, lng: 127.0170 },
      radiusMeters: 50,
      points: 400,
      type: 'challenge',
      description: '다른 팀 1개와 마주쳐 서로의 HR 성공 경험담을 공유하세요.\n서로의 이야기를 경청하면 두 팀 모두 미션 완료!',
      svgPos: { cx: 275, cy: 270 },
    },
    {
      id: 'm5',
      postId: 'P5',
      name: '오늘의 연결 선언',
      locationLabel: '동물원 정문 만남의 숲',
      coords: { lat: 37.4280, lng: 127.0145 },
      radiusMeters: 50,
      points: 800,
      type: 'quiz',
      description: '오늘 가장 인상 깊었던 타 자회사 대화 상대에게 감사의 메시지를 보내세요.\n상대방이 수락하면 두 사람 모두 최고 점수 획득!',
      svgPos: { cx: 195, cy: 310 },
    },
  ],
  explorationTargets: [
    { id: 'dusanhibiscus', name: '두산 무궁화', emoji: '🌸', points: 150, coords: { lat: 37.4340, lng: 127.0140 }, radiusMeters: 50 },
    { id: 'pear',          name: '산사나무',    emoji: '🍐', points: 100, coords: { lat: 37.4332, lng: 127.0168 }, radiusMeters: 50 },
    { id: 'persimmon',     name: '모과나무',    emoji: '🍊', points: 100, coords: { lat: 37.4315, lng: 127.0182 }, radiusMeters: 50 },
    { id: 'blueberry',     name: '산딸기',      emoji: '🫐', points: 100, coords: { lat: 37.4300, lng: 127.0178 }, radiusMeters: 50 },
    { id: 'aralia',        name: '느티나무',    emoji: '🌿', points: 100, coords: { lat: 37.4288, lng: 127.0162 }, radiusMeters: 50 },
    { id: 'prayerhouse',   name: '쉼터 정자',    emoji: '🏛️', points: 150, coords: { lat: 37.4282, lng: 127.0148 }, radiusMeters: 50 },
  ],
};

/**
 * ─────────────────────────────────────────────────────────────────
 * [장소 2] 연강원 (백업 보존용 프리셋)
 * ─────────────────────────────────────────────────────────────────
 */
export const YONKANG_CONFIG: VenueConfig = {
  id: 'yonkang',
  venueName: '두산경영연구원(연강원)',
  venueSubtitle: '연강원 산책로 및 저수지 코스',
  eventName: '두산 HR 트레킹 워크샵 2026',
  sessionKey: 'trekking2026',
  centerCoords: { lat: 37.5415, lng: 127.1368 },
  mapLabel: '두산경영연구원 · 두산저수지',
  lakeOrLandmarkName: '두산저수지',
  posts: [
    {
      id: 'm1', postId: 'P1', name: '우리 팀 첫 만남', locationLabel: '연구원 광장',
      coords: { lat: 37.5415, lng: 127.1368 }, radiusMeters: 80, points: 200, type: 'gps',
      description: '팀원 모두 모여 소개 카드를 작성하세요.', svgPos: { cx: 155, cy: 60 },
    },
    {
      id: 'm2', postId: 'P2', name: '연강원 AR 탐험', locationLabel: '산책로',
      coords: { lat: 37.5408, lng: 127.1382 }, radiusMeters: 80, points: 500, type: 'ar',
      description: 'AR 카메라로 숨어있는 식물을 찾아보세요.', svgPos: { cx: 240, cy: 120 },
    },
    {
      id: 'm3', postId: 'P3', name: '같은 고민, 다른 회사', locationLabel: '저수지 입구',
      coords: { lat: 37.5398, lng: 127.1390 }, radiusMeters: 80, points: 300, type: 'match',
      description: '타 팀 담당자와 매칭 후 대화를 나누세요.', svgPos: { cx: 260, cy: 200 },
    },
    {
      id: 'm4', postId: 'P4', name: '두산 HR로 산다는 것', locationLabel: '저수지 둘레길',
      coords: { lat: 37.5388, lng: 127.1398 }, radiusMeters: 80, points: 400, type: 'challenge',
      description: '다른 팀 1개와 마주쳐 HR 경험담을 공유하세요.', svgPos: { cx: 280, cy: 275 },
    },
    {
      id: 'm5', postId: 'P5', name: '오늘의 연결 선언', locationLabel: '저수지 전망대',
      coords: { lat: 37.5380, lng: 127.1385 }, radiusMeters: 80, points: 800, type: 'quiz',
      description: '가장 인상 깊었던 대화 상대에게 메시지를 보내세요.', svgPos: { cx: 200, cy: 310 },
    },
  ],
  explorationTargets: [
    { id: 'dusanhibiscus', name: '두산 무궁화', emoji: '🌸', points: 150, coords: { lat: 37.542577, lng: 127.149285 }, radiusMeters: 30 },
    { id: 'pear',          name: '배나무',      emoji: '🍐', points: 100, coords: { lat: 37.542698, lng: 127.150787 }, radiusMeters: 30 },
    { id: 'persimmon',     name: '감나무',      emoji: '🍊', points: 100, coords: { lat: 37.541608, lng: 127.152408 }, radiusMeters: 30 },
    { id: 'blueberry',     name: '블루베리',    emoji: '🫐', points: 100, coords: { lat: 37.541951, lng: 127.151330 }, radiusMeters: 30 },
    { id: 'aralia',        name: '두릅나무',    emoji: '🌿', points: 100, coords: { lat: 37.543243, lng: 127.150170 }, radiusMeters: 30 },
    { id: 'prayerhouse',   name: '기도원',      emoji: '⛪', points: 150, coords: { lat: 37.543406, lng: 127.149597 }, radiusMeters: 30 },
  ],
};

/**
 * ─────────────────────────────────────────────────────────────────
 * 현재 활성화된 장소 설정 (ACTIVE VENUE)
 * 👉 장소를 바꿀 때는 아래 변수만 SEOUL_GRAND_PARK_CONFIG 또는 YONKANG_CONFIG로 변경하면 됩니다.
 * ─────────────────────────────────────────────────────────────────
 */
export const ACTIVE_VENUE: VenueConfig = SEOUL_GRAND_PARK_CONFIG;

// 참가 회사 목록
export const WORKSHOP_COMPANIES = [
  '㈜두산',
  '두산경영연구원',
];

// 팀 목록
export const WORKSHOP_TEAMS = [
  { id: 'team1', name: '1조', shortCode: '1', color: '#E31837', emoji: '🔴' },
  { id: 'team2', name: '2조', shortCode: '2', color: '#2980B9', emoji: '🔵' },
  { id: 'team3', name: '3조', shortCode: '3', color: '#27AE60', emoji: '🟢' },
  { id: 'team4', name: '4조', shortCode: '4', color: '#F39C12', emoji: '🟡' },
  { id: 'team5', name: '5조', shortCode: '5', color: '#8E44AD', emoji: '🟣' },
];
