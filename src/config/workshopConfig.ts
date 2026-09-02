/**
 * =====================================================================
 * Workshop & Venue Configuration (워크샵 & 장소 중앙 설정)
 * =====================================================================
 * 코키리열차 매표소를 공통 출발지로 하여,
 * 1) 호수둘레길 코스 (2.8km · 평지 산책형)
 * 2) 산림욕장 트레킹길 코스 (약 5km · 숲길 힐링형)
 * 중 선택하여 참가하며, 코스가 달라도 공통 미션 테마(P1~P5)를 수행합니다.
 */

export type CourseKey = 'lake' | 'forest';

export interface GpsLocation {
  lat: number;
  lng: number;
}

export interface TrekkingPostConfig {
  id: string;             // 'm1', 'm2' ...
  postId: string;         // 'P1', 'P2' ...
  name: string;           // 미션명
  themeTitle: string;     // 공통 미션 테마
  locationLabel: string;  // 코스별 세부 장소 명칭
  coords: GpsLocation;    // 실제 위도/경도
  radiusMeters: number;   // 인증 허용 반경 (기본 50m)
  points: number;         // 획득 점수
  type: 'gps' | 'ar' | 'match' | 'challenge' | 'quiz';
  description: string;    // 미션 상세 설명
  svgPos: { cx: number; cy: number }; // SVG 맵 내 시각화 좌표
}

export interface CourseDetail {
  id: CourseKey;
  name: string;
  tag: string;
  distance: string;
  duration: string;
  intensity: '쉬움 (평지)' | '보통 (숲길)';
  emoji: string;
  summary: string;
  posts: TrekkingPostConfig[];
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
  venueName: string;
  venueSubtitle: string;
  eventName: string;
  sessionKey: string;
  departurePoint: {
    name: string;
    coords: GpsLocation;
  };
  centerCoords: GpsLocation;
  mapLabel: string;
  lakeOrLandmarkName: string;
  courses: Record<CourseKey, CourseDetail>;
  explorationTargets: ExplorationTargetConfig[];
}

/**
 * ─────────────────────────────────────────────────────────────────
 * [장소] 서울대공원 (2가지 선택형 코스 탑재)
 * 공통 출발지: 코끼리열차 매표소 앞 종합광장
 * ─────────────────────────────────────────────────────────────────
 */
export const SEOUL_GRAND_PARK_CONFIG: VenueConfig = {
  id: 'seoul_grand_park',
  venueName: '서울대공원',
  venueSubtitle: '코끼리열차 매표소 출발 트레킹',
  eventName: '두산 HR 트레킹 워크샵 2026',
  sessionKey: 'trekking2026',
  departurePoint: {
    name: '코끼리열차 매표소 (종합안내소 앞 광장)',
    coords: { lat: 37.4347, lng: 127.0132 },
  },
  centerCoords: { lat: 37.4315, lng: 127.0165 },
  mapLabel: '서울대공원 트레킹 코스',
  lakeOrLandmarkName: '대공원 청계호수',
  courses: {
    // 🌊 코스 1: 호수둘레길 (평지 힐링 & 편안한 대화)
    lake: {
      id: 'lake',
      name: '호수둘레길 코스',
      tag: '가벼운 산책 & 힐링',
      distance: '2.8km',
      duration: '약 50분',
      intensity: '쉬움 (평지)',
      emoji: '🌊',
      summary: '잔잔한 호수 바람을 맞으며 걷는 평지 산책로, 편안하게 이야기 나누기 좋은 코스입니다.',
      posts: [
        {
          id: 'm1',
          postId: 'P1',
          name: '우리 팀 첫 만남 & 출발',
          themeTitle: '팀 빌딩',
          locationLabel: '코끼리열차 매표소 앞 광장',
          coords: { lat: 37.4347, lng: 127.0132 },
          radiusMeters: 50,
          points: 200,
          type: 'gps',
          description: '출발지에서 팀원 모두 모여 출발 전 소개 카드를 작성하고 활기찬 팀 단체 사진을 남겨주세요!',
          svgPos: { cx: 140, cy: 50 },
        },
        {
          id: 'm2',
          postId: 'P2',
          name: '호수둘레길 자연 탐험',
          themeTitle: '자연 & AR 탐색',
          locationLabel: '호수둘레길 입구 버드나무 쉼터',
          coords: { lat: 37.4335, lng: 127.0175 },
          radiusMeters: 50,
          points: 500,
          type: 'ar',
          description: '호숫가를 따라 걸으며 숨겨진 자연의 보물 6가지를 카메라로 찾아보세요!\n\n🌸 무궁화 🍐 산사나무 🍊 모과나무 🫐 산딸기 🌿 느티나무 🏛️ 쉼터 정자',
          svgPos: { cx: 230, cy: 110 },
        },
        {
          id: 'm3',
          postId: 'P3',
          name: '같은 고민, 다른 회사',
          themeTitle: '사람 연결 (네트워킹)',
          locationLabel: '호수 브릿지 전망 데크',
          coords: { lat: 37.4310, lng: 127.0185 },
          radiusMeters: 50,
          points: 300,
          type: 'match',
          description: '코스가 달라도 마음은 통합니다! 타 코스 또는 타 자회사 동료와 고민 매칭 후 온라인/오프라인 대화를 나누세요.',
          svgPos: { cx: 260, cy: 195 },
        },
        {
          id: 'm4',
          postId: 'P4',
          name: '두산 HR로 산다는 것',
          themeTitle: 'HR 스토리 공유',
          locationLabel: '테마가든 장미원 산책길',
          coords: { lat: 37.4285, lng: 127.0170 },
          radiusMeters: 50,
          points: 400,
          type: 'challenge',
          description: '둘레길에서 마주친 다른 팀과 함께 HR 담당자로서 가장 기억에 남는 경험담을 나누고 미션을 완료하세요.',
          svgPos: { cx: 275, cy: 270 },
        },
        {
          id: 'm5',
          postId: 'P5',
          name: '오늘의 연결 선언',
          themeTitle: '최종 연결 선언',
          locationLabel: '미리내다리 호수 종점 잔디마당',
          coords: { lat: 37.4305, lng: 127.0135 },
          radiusMeters: 50,
          points: 800,
          type: 'quiz',
          description: '완주를 축하합니다! 오늘 가장 인상 깊었던 대화 상대에게 감사의 연결 메시지를 보내 최고 점수를 획득하세요.',
          svgPos: { cx: 195, cy: 310 },
        },
      ],
    },

    // 🌲 코스 2: 산림욕장 트레킹길 (숲속 피톤치드 & 액티브 트레킹)
    forest: {
      id: 'forest',
      name: '산림욕장 트레킹길',
      tag: '숲길 트레킹 & 피톤치드',
      distance: '약 4.5km',
      duration: '약 1시간 20분',
      intensity: '보통 (숲길)',
      emoji: '🌲',
      summary: '울창한 숲속 흙길을 걸으며 맑은 공기를 마시는 본격 트레킹 코스, 에너지 넘치는 팀에게 추천합니다.',
      posts: [
        {
          id: 'm1',
          postId: 'P1',
          name: '우리 팀 첫 만남 & 출발',
          themeTitle: '팀 빌딩',
          locationLabel: '코끼리열차 매표소 앞 광장',
          coords: { lat: 37.4347, lng: 127.0132 },
          radiusMeters: 50,
          points: 200,
          type: 'gps',
          description: '출발지에서 팀원 모두 모여 안전 수칙을 확인하고 활기찬 트레킹 출발 단체 사진을 남겨주세요!',
          svgPos: { cx: 140, cy: 50 },
        },
        {
          id: 'm2',
          postId: 'P2',
          name: '산림욕장 숲속 자연 탐험',
          themeTitle: '자연 & AR 탐색',
          locationLabel: '산림욕장 입구 숲길 안내소',
          coords: { lat: 37.4320, lng: 127.0220 },
          radiusMeters: 60,
          points: 500,
          type: 'ar',
          description: '청계산 숲길을 걸으며 숲속에 숨겨진 자연의 보물 6가지를 찾아보세요!\n\n🌸 무궁화 🍐 산사나무 🍊 모과나무 🫐 산딸기 🌿 느티나무 🏛️ 쉼터 정자',
          svgPos: { cx: 280, cy: 90 },
        },
        {
          id: 'm3',
          postId: 'P3',
          name: '같은 고민, 다른 회사',
          themeTitle: '사람 연결 (네트워킹)',
          locationLabel: '생각하는 숲 / 다람쥐광장',
          coords: { lat: 37.4270, lng: 127.0250 },
          radiusMeters: 60,
          points: 300,
          type: 'match',
          description: '숲속 맑은 공기 속에서 깊은 나눔을! 호수 코스 또는 타 자회사 동료와 고민 매칭 후 소통을 인증하세요.',
          svgPos: { cx: 310, cy: 190 },
        },
        {
          id: 'm4',
          postId: 'P4',
          name: '두산 HR로 산다는 것',
          themeTitle: 'HR 스토리 공유',
          locationLabel: '독서하는 숲 피톤치드 쉼터',
          coords: { lat: 37.4230, lng: 127.0210 },
          radiusMeters: 60,
          points: 400,
          type: 'challenge',
          description: '숲속 쉼터에서 팀원들과 함께 HR 담당자로서 가슴 뛰었던 순간을 나누고 팀 미션을 완료하세요.',
          svgPos: { cx: 280, cy: 280 },
        },
        {
          id: 'm5',
          postId: 'P5',
          name: '오늘의 연결 선언',
          themeTitle: '최종 연결 선언',
          locationLabel: '산림욕장 출구 / 미술관 광장',
          coords: { lat: 37.4290, lng: 127.0160 },
          radiusMeters: 60,
          points: 800,
          type: 'quiz',
          description: '산림욕장 완주를 축하합니다! 오늘 가장 인상 깊었던 대화 상대에게 감사의 메시지를 전하며 피날레를 장식하세요.',
          svgPos: { cx: 195, cy: 310 },
        },
      ],
    },
  },
  explorationTargets: [
    { id: 'dusanhibiscus', name: '두산 무궁화', emoji: '🌸', points: 150, coords: { lat: 37.4340, lng: 127.0140 }, radiusMeters: 60 },
    { id: 'pear',          name: '산사나무',    emoji: '🍐', points: 100, coords: { lat: 37.4332, lng: 127.0168 }, radiusMeters: 60 },
    { id: 'persimmon',     name: '모과나무',    emoji: '🍊', points: 100, coords: { lat: 37.4315, lng: 127.0182 }, radiusMeters: 60 },
    { id: 'blueberry',     name: '산딸기',      emoji: '🫐', points: 100, coords: { lat: 37.4300, lng: 127.0178 }, radiusMeters: 60 },
    { id: 'aralia',        name: '느티나무',    emoji: '🌿', points: 100, coords: { lat: 37.4288, lng: 127.0162 }, radiusMeters: 60 },
    { id: 'prayerhouse',   name: '쉼터 정자',    emoji: '🏛️', points: 150, coords: { lat: 37.4282, lng: 127.0148 }, radiusMeters: 60 },
  ],
};

/**
 * ─────────────────────────────────────────────────────────────────
 * 현재 활성화된 장소 설정
 * ─────────────────────────────────────────────────────────────────
 */
export const ACTIVE_VENUE: VenueConfig = SEOUL_GRAND_PARK_CONFIG;

// 기본 코스
export const DEFAULT_COURSE: CourseKey = 'lake';

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

// 코스 목록 편의 배열
export const WORKSHOP_COURSES = [
  ACTIVE_VENUE.courses.lake,
  ACTIVE_VENUE.courses.forest,
];
