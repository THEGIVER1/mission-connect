/**
 * =====================================================================
 * Workshop & Venue Configuration (2026 CHRO Trekking)
 * =====================================================================
 * 2026 CHRO 부문 트레킹 워크샵 (약 50명 대상)
 * - Version: 2026.10.10 (첫 집결지: 세븐일레븐 앞 테이블 / 종료 및 단체사진: 빵명장 앞)
 * - 공통 첫 집결지: 세븐일레븐 앞 야외 테이블 (1:30~2:00 오프닝 및 출발 기점)
 * - 공통 도착/단체사진: 빵명장 서울대공원점 앞 (트레킹 완료 후 단체사진 촬영 후 실내 입장)
 * - 코스 구성 (2개 분리 코스):
 *    • 1~3조: 동물원둘레길 (약 4.5km 순환)
 *    • 4~6조: 호수둘레길 (약 2.8km 순환)
 * - 2대 핵심 Activity (스팟 퀴즈 제외):
 *    1) 테마가든 시그니처 단체사진 미션 (2:00~4:30, 힌트 스팟 찾기 & 단체사진 업로드, +100pt)
 *    2) People Quest (대화 및 최고의 스토리 동료 추천, +100pt)
 */

import {
  MyInfoQuestion,
  DiscoveryQuizItem,
  PreRegisteredPerson,
} from '../types';

export type CourseKey = 'forest' | 'lake';

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
// 2. 6개 조 구성 (1~3조: 동물원둘레길 순환 / 4~6조: 호수둘레길 순환)
// ─────────────────────────────────────────────────────────────────
export const WORKSHOP_TEAMS: WorkshopTeamConfig[] = [
  { id: 'team1', name: '1조', shortCode: '1', color: '#E31837', emoji: '🦁', assignedCourse: 'forest', courseName: '동물원둘레길 (순환)', courseDistance: '4.5km' },
  { id: 'team2', name: '2조', shortCode: '2', color: '#E67E22', emoji: '🦁', assignedCourse: 'forest', courseName: '동물원둘레길 (순환)', courseDistance: '4.5km' },
  { id: 'team3', name: '3조', shortCode: '3', color: '#F39C12', emoji: '🦁', assignedCourse: 'forest', courseName: '동물원둘레길 (순환)', courseDistance: '4.5km' },
  { id: 'team4', name: '4조', shortCode: '4', color: '#27AE60', emoji: '🌊', assignedCourse: 'lake', courseName: '호수둘레길 (순환)', courseDistance: '2.8km' },
  { id: 'team5', name: '5조', shortCode: '5', color: '#2980B9', emoji: '🌊', assignedCourse: 'lake', courseName: '호수둘레길 (순환)', courseDistance: '2.8km' },
  { id: 'team6', name: '6조', shortCode: '6', color: '#8E44AD', emoji: '🌊', assignedCourse: 'lake', courseName: '호수둘레길 (순환)', courseDistance: '2.8km' },
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
// 4. Activity 1: People Quest (단일 통합 조별 대화 & 추천 미션)
// ─────────────────────────────────────────────────────────────────
export const PEOPLE_QUEST_MISSION_TITLE = "우리 조가 발견한 '최고의 스토리 동료' 추천";
export const PEOPLE_QUEST_MISSION_GUIDE = "트레킹을 함께하며 조원들과 4가지 주제(취미, 버킷리스트, 다른 직업, 의외의 사실 등)에 대해 자유롭게 대화해 보세요. 대화 중 가장 인상 깊었던 동료 1명을 선택하고 나누었던 스토리를 작성해 주세요. (저녁 퀴즈 및 네트워킹에 활용됩니다)";
export const PEOPLE_QUEST_POINTS_PER_MEMBER = 100; // 조원당 100pt

// ─────────────────────────────────────────────────────────────────
// 5. Activity 2: 테마가든 메인 미션 (2:00~4:30 진행 중)
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

export const THEME_GARDEN_MISSION: ThemeGardenMissionConfig = {
  id: 'theme_garden_photo',
  title: '🌹 테마가든 시그니처 스팟 찾기 & 조별 단체사진',
  timeRange: '2:00 ~ 4:30 (트레킹 중)',
  locationName: '서울대공원 테마가든 (장미원 & 호수 수변 테라스)',
  coords: { lat: 37.4310, lng: 127.0185 },
  hintTitle: '테마가든 지정 장소 힌트',
  hintDescription: '테마가든 내 장미원 분수대 및 호수가 한눈에 내려다보이는 수변 데크/풍차 쉼터 주변을 찾아보세요!',
  guideLines: [
    '테마가든 내 힌트 사진 속 지정 장소를 찾아냅니다.',
    '조원 전원이 모여 개성 넘치고 재미있는 단체 시그니처 포즈를 취합니다.',
    '사진을 촬영하여 조별 대표 1명이 업로드하면 조원 전원에게 미션 점수가 부여됩니다!',
    '업로드된 사진은 종료 후 빵명장 빔프로젝터 갤러리 및 우수 포즈 조 시상에 반영됩니다.',
  ],
  pointsPerMember: 100,
};

// ─────────────────────────────────────────────────────────────────
// 6. 오프닝 & 튜토리얼 퀴즈 (1:30~2:00 @ 세븐일레븐 앞 테이블)
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

export const TUTORIAL_QUIZ: TutorialQuizConfig = {
  id: 'tutorial_bbang_price',
  title: '🥐 오프닝 튜토리얼 퀴즈: 빵명장 빵 가격 맞히기',
  itemTitle: '빵명장 No.1 시그니처 빵 (육쪽마늘빵)',
  questionText: '빵명장 서울대공원점의 대표 1위 시그니처 메뉴인 "육쪽마늘빵"의 판매 가격은 얼마일까요? (매장 진열대 확인!)',
  options: ['5,500원', '6,500원', '7,000원', '7,800원'],
  correctIndex: 1, // 6,500원
  explanation: '정답입니다! 빵명장의 대표 베스트셀러 육쪽마늘빵의 가격은 6,500원입니다. 앱 작동 및 퀴즈 제출 튜토리얼이 완료되었습니다.',
  hintText: '💡 빵명장 매장 앞/내부 쇼케이스의 인기 빵 가격표를 가볍게 확인해 보세요!',
};

// ─────────────────────────────────────────────────────────────────
// 7. 조별 그라운드룰 & 역할 분담 (출발 전 1:30~2:00 의논)
// ─────────────────────────────────────────────────────────────────
export interface RoleOption {
  id: string;
  title: string;
  icon: string;
  description: string;
}

export const GROUND_RULE_ROLE_OPTIONS: RoleOption[] = [
  { id: 'timekeeper', title: '타임키퍼', icon: '⏱️', description: '트레킹 페이스와 4:30 빵명장 복귀 시간을 챙기는 일정 매니저' },
  { id: 'pacemaker', title: '페이스메이커', icon: '🚶', description: '가장 편안한 템포로 걸으며 조원들의 무리 없는 걷기를 리드' },
  { id: 'photographer', title: '전속 포토그래퍼', icon: '📸', description: '테마가든 미션 사진 및 조원들의 인생샷과 웃는 순간을 포착' },
  { id: 'vitamin', title: '비타민/리액션 캡틴', icon: '💊', description: '지치지 않는 긍정 에너지와 리액션으로 조의 활력을 불어넣음' },
];

export interface GroundRulePreset {
  id: string;
  icon: string;
  text: string;
}

export const GROUND_RULE_PRESETS: GroundRulePreset[] = [
  { id: 'rule_healing', icon: '🌿', text: '트레킹 중간에 30분은 온전히 개인 힐링·자유 쉼 시간 갖기' },
  { id: 'rule_slow', icon: '🐢', text: '가장 천천히 걷는 조원의 걸음 속도에 맞춰 도란도란 걷기' },
  { id: 'rule_smile_photo', icon: '📸', text: '테마가든 미션 사진은 전원 빠짐없이 환하게 웃으며 찍기' },
  { id: 'rule_talk', icon: '💬', text: '이동 중 모든 조원과 최소 1회 이상 취미·버킷리스트 대화 나누기' },
  { id: 'rule_rest', icon: '☕', text: '발이 아프거나 힘들 땐 주저 없이 벤치와 카페에서 쉬어가기' },
  { id: 'rule_no_work', icon: '📵', text: '트레킹 중에는 업무 이야기 대신 일상과 관심사에 집중하기' },
];

// ─────────────────────────────────────────────────────────────────
// 8. 코스별 스팟 퀴즈 (사용자 요청으로 제거됨 - 빈 배열 유지)
// ─────────────────────────────────────────────────────────────────
export const DISCOVERY_QUIZZES: DiscoveryQuizItem[] = [];

// ─────────────────────────────────────────────────────────────────
// 9. 점수 동적 계산 헬퍼 함수 (점수 변경 시 자동 반영)
// ─────────────────────────────────────────────────────────────────
export function getCourseQuizTotalPoints(_courseKey: CourseKey = 'lake'): number {
  return 0;
}

export function getCourseTotalMaxPoints(_courseKey: CourseKey = 'lake'): number {
  return PEOPLE_QUEST_POINTS_PER_MEMBER + THEME_GARDEN_MISSION.pointsPerMember; // 200pt
}

// ─────────────────────────────────────────────────────────────────
// 10. 참가자 명단 및 베뉴 설정
// ─────────────────────────────────────────────────────────────────
export const PRE_REGISTERED_PARTICIPANTS: PreRegisteredPerson[] = [];

export const ACTIVE_VENUE = {
  venueName: '서울대공원',
  eventName: '2026 CHRO Trekking',
  sessionKey: 'trekking2026',
  departurePoint: {
    name: '세븐일레븐 앞 테이블 [첫 집결지/출발]',
    coords: { lat: 37.434610, lng: 127.009518 },
  },
  photoSpot: {
    name: '빵명장 서울대공원점 앞 [📸 트레킹 완료 후 단체사진]',
    coords: { lat: 37.434610, lng: 127.009518 },
  },
  themeGardenSpot: {
    name: '테마가든 장미원/호수 수변 [🌹 테마가든 미션]',
    coords: { lat: 37.4310, lng: 127.0185 },
  },
  mapLabel: '서울대공원 (동물원둘레길 4.5km / 호수둘레길 2.8km 순환)',
};

export const DEFAULT_COURSE: CourseKey = 'lake';
