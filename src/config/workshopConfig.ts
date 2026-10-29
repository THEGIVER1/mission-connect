/**
 * =====================================================================
 * Workshop & Venue Configuration (2026 CHRO Trekking)
 * =====================================================================
 * - Version: 2026.10.12 (첫 집결지 & 단체사진: 세븐일레븐 앞 공터 / 4:30 실내 행사: 빵명장 내부)
 * - 공통 첫 집결지: 세븐일레븐 앞 야외 테이블 (1:30~2:00 오프닝 및 출발 기점)
 * - 공통 도착/단체사진: 세븐일레븐 앞 공터 (4:15~4:30 전체 단체사진 촬영 후 빵명장 내부 입장)
 * - 코스 구성 (2개 분리 코스):
 *    • 1~3조: 동물원둘레길 (약 4.5km 순환)
 *    • 4~6조: 호수둘레길 (약 2.8km 순환)
 * - 2대 핵심 Activity (스팟 퀴즈 제외):
 *    1) 테마가든 시그니처 단체사진 미션 (2:00~4:15, 힌트 스팟 찾기 & 단체사진 업로드, +100pt)
 *    2) People Quest (대화 및 최고의 스토리 동료 추천, +100pt)
 */

import {
  MyInfoQuestion,
  DiscoveryQuizItem,
  PreRegisteredPerson,
} from '../types';

export type CourseKey = 'forest' | 'lake';

// ─────────────────────────────────────────────────────────────────
// 파일럿(두산연강원) 모드 자동 감지 (/pilot 경로 접속 시 활성화, 본행사 / 경로는 서울대공원 유지)
// ─────────────────────────────────────────────────────────────────
export const IS_PILOT_MODE: boolean = (() => {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname;
  const search = window.location.search;
  const host = window.location.hostname;
  return (
    path === '/pilot' ||
    path.startsWith('/pilot/') ||
    search.includes('mode=pilot') ||
    host.includes('pilot')
  );
})();

export interface GpsLocation {
  lat: number;
  lng: number;
}

export interface WorkshopTeamConfig {
  id: string;
  name: string;
  shortCode: string;
  color: string;
  emoji: string;
  assignedCourse: CourseKey;
  courseName: string;
  courseDistance: string;
}

// ─────────────────────────────────────────────────────────────────
// 0. 현장 비상 패스코드 (GPS 음영지역 / 권한 거부 시 운영진 안내용)
// ─────────────────────────────────────────────────────────────────
export const EMERGENCY_GPS_BYPASS_CODE = '2026';

// ─────────────────────────────────────────────────────────────────
// 1. 소속 회사 목록
// ─────────────────────────────────────────────────────────────────
export const WORKSHOP_COMPANIES = [
  '㈜두산',
  '두산경영연구원',
] as const;

// ─────────────────────────────────────────────────────────────────
// 2. 6개 조 구성 (본행사: 동물원둘레길·미술관 코스 / 연강원 파일럿: 단일 트레킹 코스)
// ─────────────────────────────────────────────────────────────────
export const WORKSHOP_TEAMS: WorkshopTeamConfig[] = IS_PILOT_MODE
  ? [
      { id: 'team1', name: '1조', shortCode: '1', color: '#E31837', emoji: '', assignedCourse: 'forest', courseName: '연강원 트레킹 코스', courseDistance: '' },
      { id: 'team2', name: '2조', shortCode: '2', color: '#E67E22', emoji: '', assignedCourse: 'forest', courseName: '연강원 트레킹 코스', courseDistance: '' },
      { id: 'team3', name: '3조', shortCode: '3', color: '#F39C12', emoji: '', assignedCourse: 'forest', courseName: '연강원 트레킹 코스', courseDistance: '' },
      { id: 'team4', name: '4조', shortCode: '4', color: '#27AE60', emoji: '', assignedCourse: 'forest', courseName: '연강원 트레킹 코스', courseDistance: '' },
      { id: 'team5', name: '5조', shortCode: '5', color: '#2980B9', emoji: '', assignedCourse: 'forest', courseName: '연강원 트레킹 코스', courseDistance: '' },
    ]
  : [
      { id: 'team1', name: '1조', shortCode: '1', color: '#E31837', emoji: '', assignedCourse: 'lake', courseName: '현대미술관 코스', courseDistance: '3km' },
      { id: 'team2', name: '2조', shortCode: '2', color: '#E67E22', emoji: '', assignedCourse: 'lake', courseName: '현대미술관 코스', courseDistance: '3km' },
      { id: 'team3', name: '3조', shortCode: '3', color: '#F39C12', emoji: '', assignedCourse: 'forest', courseName: '동물원 둘레길 코스', courseDistance: '7km' },
      { id: 'team4', name: '4조', shortCode: '4', color: '#27AE60', emoji: '', assignedCourse: 'forest', courseName: '동물원 둘레길 코스', courseDistance: '7km' },
      { id: 'team5', name: '5조', shortCode: '5', color: '#2980B9', emoji: '', assignedCourse: 'forest', courseName: '동물원 둘레길 코스', courseDistance: '7km' },
      { id: 'team6', name: '6조', shortCode: '6', color: '#8E44AD', emoji: '', assignedCourse: 'forest', courseName: '동물원 둘레길 코스', courseDistance: '7km' },
      { id: 'team7', name: '7조', shortCode: '7', color: '#16A085', emoji: '', assignedCourse: 'forest', courseName: '동물원 둘레길 코스', courseDistance: '7km' },
      { id: 'team8', name: '8조', shortCode: '8', color: '#D35400', emoji: '', assignedCourse: 'forest', courseName: '동물원 둘레길 코스', courseDistance: '7km' },
    ];

// ─────────────────────────────────────────────────────────────────
// 3. 플랫폼 입장: 「나의 정보 입력」 4개 질문 (1단계: 취미·버킷리스트 / 2단계: 다른직업·의외의사실)
// ─────────────────────────────────────────────────────────────────
export const MY_INFO_QUESTIONS: MyInfoQuestion[] = [
  {
    id: 'q1_passion',
    title: '요즘 시간 가는 줄 모르고 푹 빠져 있는 취미나 관심사는?',
    placeholder: '예: 러닝, 골프/테니스, 유튜브 몰아보기, 캠핑, 베이킹, 투자/재테크 공부, AI 툴 활용 등',
    category: 'life',
  },
  {
    id: 'q3_bucketList',
    title: '향후 3년 내에 꼭 이루고 싶은 나만의 가슴 뛰는 버킷리스트는?',
    placeholder: '예: 철인3종 완주, 책 1권 출판하기, 가족과 오로라 여행, 바디프로필 촬영, 자격증 취득 등',
    category: 'life',
  },
  {
    id: 'q4_dreamJob',
    title: '만약 지금의 직업이 아닌 전혀 다른 길을 걷는다면 해보고 싶은 직업은?',
    placeholder: '예: 셰프, 파일럿, 건축가, 여행 유튜버, 목수, 바리스타, 뮤지컬 배우, 야생동물 사진작가 등',
    category: 'life',
  },
  {
    id: 'q5_unexpectedFact',
    title: '동료들이 알면 "정말요?" 하고 깜짝 놀랄 나만의 의외의 사실이나 숨은 이력은?',
    placeholder: '예: 마라톤 풀코스 완주, 무술 유단자, 밴드 보컬 출신, 혼자 배낭여행 30개국, 조리기능사 자격증 등',
    category: 'life',
  },
];

export const PEOPLE_QUEST_TOPIC_OPTIONS = [
  '최근 가장 푹 빠진 취미/관심사',
  '3년 내 꼭 이루고 싶은 버킷리스트',
  '해보고 싶은 다른 직업',
  '의외의 특별한 사실이나 숨은 이력',
];

// ─────────────────────────────────────────────────────────────────
// 4. Activity 1: 최고의 스토리 동료 추천 (조별 대표 입력)
// ─────────────────────────────────────────────────────────────────
export const PEOPLE_QUEST_MISSION_TITLE = "최고의 스토리 동료 추천";
export const PEOPLE_QUEST_MISSION_GUIDE = "트레킹 중 조원들과 대화하며 가장 인상 깊었던 동료 1명을 추천해 주세요. (조 대표 1명 작성)";
export const PEOPLE_QUEST_POINTS_PER_MEMBER = 100; // 조별 100pt

// ─────────────────────────────────────────────────────────────────
// 5. Activity 2: 조별 단체사진 미션 (본행사: 테마가든 / 파일럿: 두산 저수지)
// ─────────────────────────────────────────────────────────────────
export interface ThemeGardenMissionConfig {
  id: string;
  title: string;
  timeRange: string;
  locationName: string;
  coords: { lat: number; lng: number };
  hintTitle: string;
  hintDescription: string;
  guideLines: string[];
  pointsPerMember: number;
}

export const THEME_GARDEN_MISSION: ThemeGardenMissionConfig = IS_PILOT_MODE
  ? {
      id: 'theme_garden_photo',
      title: '두산 저수지 조별 단체사진',
      timeRange: '1:30 ~ 2:20',
      locationName: '두산 저수지',
      coords: { lat: 37.541920, lng: 127.151580 },
      hintTitle: '단체사진 촬영 안내',
      hintDescription: '두산 저수지에서 조원 전원이 나오도록 촬영 후 업로드해 주세요.',
      guideLines: [
        '두산 저수지(지도 노란색 영역)에서 조원 전원 단체사진 촬영',
        '조 대표 1명이 업로드 시 우리 조 +100pt 획득',
      ],
      pointsPerMember: 100,
    }
  : {
      id: 'theme_garden_photo',
      title: '테마가든 조별 단체사진',
      timeRange: '2:00 ~ 4:30',
      locationName: '서울대공원 테마가든',
      coords: { lat: 37.430800, lng: 127.015500 },
      hintTitle: '단체사진 촬영 안내',
      hintDescription: '테마가든 포토 스팟에서 조원 전원이 나오도록 촬영 후 업로드해 주세요.',
      guideLines: [
        '테마가든 포토 스팟에서 조원 전원 단체사진 촬영',
        '조 대표 1명이 업로드 시 우리 조 +100pt 획득',
      ],
      pointsPerMember: 100,
    };

// ─────────────────────────────────────────────────────────────────
// 6. 몸풀기 Quiz (본행사: 빵명장 소보루 빵 3800원 / 파일럿: 카페쿰베오 베오라떼 6500원)
// ─────────────────────────────────────────────────────────────────
export interface TutorialQuizConfig {
  id: string;
  title: string;
  itemTitle: string;
  questionText: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  hintText: string;
}

export const TUTORIAL_QUIZ: TutorialQuizConfig = IS_PILOT_MODE
  ? {
      id: 'tutorial_bbang_price',
      title: '몸풀기 Quiz: 베오라떼 가격 맞히기',
      itemTitle: '카페쿰베오 베오라떼',
      questionText: '카페쿰베오 시그니처 메뉴 "베오라떼"의 가격은?',
      options: ['5,500원', '6,000원', '6,500원', '7,000원'],
      correctIndex: 2, // 6,500원
      explanation: '정답입니다! 베오라떼 가격은 6,500원입니다.',
      hintText: '카페쿰베오 메뉴판을 확인해 보세요.',
    }
  : {
      id: 'tutorial_bbang_price',
      title: '몸풀기 Quiz: 소보루 빵 가격 맞히기',
      itemTitle: '빵명장 소보루 빵',
      questionText: '빵명장 인기 메뉴 "소보루 빵"의 가격은?',
      options: ['3,200원', '3,800원', '4,300원', '4,800원'],
      correctIndex: 1, // 3,800원
      explanation: '정답입니다! 소보루 빵 가격은 3,800원입니다.',
      hintText: '매장 진열대 가격표를 확인해 보세요.',
    };

// ─────────────────────────────────────────────────────────────────
// 7. 조별 그라운드룰 & 역할 분담
// ─────────────────────────────────────────────────────────────────
export interface RoleOption {
  id: string;
  title: string;
  icon: string;
  description: string;
}

export const GROUND_RULE_ROLE_OPTIONS: RoleOption[] = [
  { id: 'leader', title: '조장', icon: '', description: '조원 의견 취합 및 트레킹 리드' },
  { id: 'app_manager', title: '어플담당', icon: '', description: '조 대표로 미션 입력 및 사진 업로드' },
  {
    id: 'timekeeper',
    title: '타임키퍼',
    icon: '',
    description: IS_PILOT_MODE
      ? '2:20 강의장 집결 시간 관리'
      : '4:30 최종 집결 시간 관리',
  },
  { id: 'pacemaker', title: '페이스메이커', icon: '', description: '편안한 걸음 속도 유지' },
  {
    id: 'photographer',
    title: '포토그래퍼',
    icon: '',
    description: '조별 미션 단체사진 촬영',
  },
  { id: 'vitamin', title: '리액션 캡틴', icon: '', description: '긍정 에너지와 분위기 메이커' },
];

export interface GroundRulePreset {
  id: string;
  icon: string;
  text: string;
}

export const GROUND_RULE_PRESETS: GroundRulePreset[] = [
  { id: 'rule_slow', icon: '', text: '가장 천천히 걷는 조원 속도에 맞춰 걷기' },
  {
    id: 'rule_smile_photo',
    icon: '',
    text: IS_PILOT_MODE
      ? '두산 저수지 단체사진은 전원 환하게 웃으며 찍기'
      : '테마가든 단체사진은 전원 환하게 웃으며 찍기',
  },
  { id: 'rule_talk', icon: '', text: '모든 조원과 최소 1회 이상 취미·버킷리스트 대화하기' },
  { id: 'rule_rest', icon: '', text: '힘들 땐 언제든 벤치와 쉼터에서 쉬어가기' },
  { id: 'rule_no_work', icon: '', text: '업무 이야기 대신 일상과 관심사 대화하기' },
];

// ─────────────────────────────────────────────────────────────────
// 8. 코스별 스팟 퀴즈 (빈 배열 유지)
// ─────────────────────────────────────────────────────────────────
export const DISCOVERY_QUIZZES: DiscoveryQuizItem[] = [];

// ─────────────────────────────────────────────────────────────────
// 9. 점수 및 최종 집결 시간 동적 계산 헬퍼 함수
// ─────────────────────────────────────────────────────────────────
export const PHOTO_VOTE_POINTS_PER_VOTE = 200; // STEP 4 단체사진 1표당 +200pt (조당 최대 2표)

// STEP 4 Q2 퀴즈 (모두 맞추기 · 개당 50점)
// - 연강원: 확정 문항 7개 / 대공원: 임시 문항 (추후 실제 내용으로 교체 예정)
export const YEONKANG_WRAPUP_QUIZ_OPTIONS: readonly string[] = IS_PILOT_MODE
  ? ['연꽃', '도토리나무', '무궁화', '두룹나무', '잔디깍기로봇', '감나무', '복숭아나무']
  : ['항목 1', '항목 2', '항목 3', '항목 4', '항목 5', '항목 6', '항목 7'];

export const WRAPUP_QUIZ_TITLE = IS_PILOT_MODE
  ? 'Q2. 연강원에 있는 것을 모두 선택하세요'
  : 'Q2. (퀴즈 문항 준비 중) 해당하는 것을 모두 선택하세요';

export const WRAPUP_QUIZ_ANSWER_TEXT = IS_PILOT_MODE
  ? '연강원에는 7가지가 모두 있습니다.'
  : `${7}가지 모두 정답입니다.`;

export const YEONKANG_WRAPUP_QUIZ_POINTS_PER_ITEM = 50; // 개당 50pt

export function getCourseQuizTotalPoints(_courseKey: CourseKey = 'lake'): number {
  return 0;
}

export function getCourseTotalMaxPoints(_courseKey: CourseKey = 'lake'): number {
  return PEOPLE_QUEST_POINTS_PER_MEMBER + THEME_GARDEN_MISSION.pointsPerMember; // 기본 미션 200pt (+ 투표 득표 시 표당 200pt 추가)
}

/** 최종 집결 시각 (연강원 14:20 / 대공원 16:30) 및 STEP 4 오픈 시각 (연강원 14:20 / 대공원 17:00) */
export const FINAL_GATHERING_HM: [number, number] = IS_PILOT_MODE ? [14, 20] : [16, 30];
export const STEP4_OPEN_HM: [number, number] = IS_PILOT_MODE ? [14, 20] : [17, 0];
export const FINAL_GATHERING_LABEL = IS_PILOT_MODE ? '2:20' : '4:30';
export const STEP4_OPEN_LABEL = IS_PILOT_MODE ? '2:20' : '5:00';

/**
 * 최종 집결 목표 시각 반환
 * - 남은 시간 = 당일 최종 집결 시각까지 남은 밀리초
 * - isStep3Completed = 집결 시각 도달 또는 운영진 강제 오픈
 * - isStep4Open = STEP 4 오픈 시각 도달 또는 운영진 강제 오픈
 */
export function getFinalGatheringInfo(nowMs: number = Date.now(), forceOpenStep4: boolean = false): {
  targetTimeMs: number;
  remainingMs: number;
  formattedTimeLeft: string;
  isStep3Completed: boolean;
  isStep4Open: boolean;
} {
  const nowDate = new Date(nowMs);
  const targetDate = new Date(
    nowDate.getFullYear(),
    nowDate.getMonth(),
    nowDate.getDate(),
    FINAL_GATHERING_HM[0],
    FINAL_GATHERING_HM[1],
    0,
    0
  );
  const step4Date = new Date(
    nowDate.getFullYear(),
    nowDate.getMonth(),
    nowDate.getDate(),
    STEP4_OPEN_HM[0],
    STEP4_OPEN_HM[1],
    0,
    0
  );
  const targetTimeMs = targetDate.getTime();
  const remainingMs = Math.max(0, targetTimeMs - nowMs);
  const h = String(Math.floor(remainingMs / 3600000)).padStart(2, '0');
  const m = String(Math.floor((remainingMs % 3600000) / 60000)).padStart(2, '0');
  const s = String(Math.floor((remainingMs % 60000) / 1000)).padStart(2, '0');

  return {
    targetTimeMs,
    remainingMs,
    formattedTimeLeft: `${h}:${m}:${s}`,
    isStep3Completed: forceOpenStep4 || remainingMs === 0,
    isStep4Open: forceOpenStep4 || nowMs >= step4Date.getTime(),
  };
}

// ─────────────────────────────────────────────────────────────────
// 10. 참가자 명단 및 베뉴 설정
// ─────────────────────────────────────────────────────────────────
export const PRE_REGISTERED_PARTICIPANTS: PreRegisteredPerson[] = [];

export const ACTIVE_VENUE = IS_PILOT_MODE
  ? {
      venueName: '두산연강원',
      eventName: '연강원 Team Activity',
      sessionKey: 'trekking2026',
      departurePoint: {
        name: '카페쿰베오 [첫 집결지/출발]',
        coords: { lat: 37.542580, lng: 127.148360 },
      },
      photoSpot: {
        name: '연강원 강의장 [🏫 2:20 최종 집결 / Wrap-up Quiz]',
        coords: { lat: 37.542660, lng: 127.149250 },
      },
      themeGardenSpot: {
        name: '두산 저수지 [📸 조별 단체사진 미션]',
        coords: { lat: 37.541920, lng: 127.151580 },
      },
      mapLabel: '두산연강원 트레킹 코스',
    }
  : {
      venueName: '서울대공원',
      eventName: '2026 CHRO Trekking',
      sessionKey: 'trekking2026',
      departurePoint: {
        name: '빵명장 [첫 집결지/출발]',
        coords: { lat: 37.434610, lng: 127.009518 },
      },
      photoSpot: {
        name: '세븐일레븐 앞 공터 [📸 4:30 최종 집결 / 단체사진]',
        coords: { lat: 37.434120, lng: 127.009650 },
      },
      themeGardenSpot: {
        name: '테마가든 [🌹 포토 스팟 / 단체사진 미션]',
        coords: { lat: 37.430800, lng: 127.015500 },
      },
      mapLabel: '서울대공원 (현대미술관 코스 / 동물원 둘레길 코스)',
    };

export const DEFAULT_COURSE: CourseKey = IS_PILOT_MODE ? 'forest' : 'lake';

