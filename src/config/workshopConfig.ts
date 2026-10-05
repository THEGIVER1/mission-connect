/**
 * =====================================================================
 * Workshop & Venue Configuration (2026 CHRO Trekking)
 * =====================================================================
 * 2026 CHRO 부문 트레킹 워크샵 (약 50명 대상)
 * - 공통 출발/도착: 코끼리열차 매표소 앞 종합광장 (원점 회귀 순환 코스)
 * - 공통 단체사진 촬영지: 국립현대미술관 과천관 앞
 * - 코스:
 *    • 1~3조: 동물원둘레길 (약 4.5km 순환)
 *    • 4~6조: 호수둘레길 코스 (약 2.8km 순환)
 * - 2대 핵심 Activity:
 *    1) People Quest (통합 1개 조별 대화 & 동료 추천 미션)
 *    2) Discovery Quiz (조당 3문항: 공통 2개 + 코스 전용 1개)
 * - 모든 배점은 config 변수로 유연하게 중앙 집중 관리됩니다.
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
// ─────────────────────────────────────────────────────────────────
// 3. 플랫폼 입장: 「나의 정보 입력」 6개 질문 (1단계: 일상·취향·버킷 / 2단계: 상상·반전·슈퍼파워)
// ─────────────────────────────────────────────────────────────────
export const MY_INFO_QUESTIONS: MyInfoQuestion[] = [
  {
    id: 'q1_passion',
    title: '요즘 시간 가는 줄 모르고 푹 빠져 있는 취미나 관심사는?',
    placeholder: '예: 러닝, 골프/테니스, 유튜브 몰아보기, 캠핑, 베이킹, 투자/재테크 공부, AI 툴 활용 등',
    category: 'life',
  },
  {
    id: 'q2_vacation',
    title: '나 혼자만의 5일 자유시간이 생긴다면 가장 먼저 하고 싶은 것은?',
    placeholder: '예: 짐 싸서 유럽/제주도 훌쩍 떠나기, 집에서 넷플릭스 정주행, 호텔 호캉스, 맛집 투어 등',
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
  {
    id: 'q6_superpower',
    title: '나를 가장 잘 표현하는 한 마디 키워드 (또는 나만의 강력한 슈퍼파워)는?',
    placeholder: '예: 인간 내비게이션, 친절한 해결사, 강철 멘탈, 프로 공감러, 조용한 뚝심, 분위기 메이커, 아이디어 뱅크 등',
    category: 'life',
  },
];

export const PEOPLE_QUEST_TOPIC_OPTIONS = [
  '최근 가장 푹 빠진 취미/관심사',
  '5일 자유시간에 하고 싶은 일',
  '3년 내 꼭 이루고 싶은 버킷리스트',
  '해보고 싶은 다른 직업',
  '의외의 특별한 사실이나 숨은 이력',
  '나를 표현하는 키워드/슈퍼파워',
];

// ─────────────────────────────────────────────────────────────────
// 4. Activity 1: People Quest (단일 통합 조별 대화 & 추천 미션)
// ─────────────────────────────────────────────────────────────────
export const PEOPLE_QUEST_MISSION_TITLE = "우리 조가 발견한 '최고의 스토리 동료' 추천";
export const PEOPLE_QUEST_MISSION_GUIDE = "트레킹을 함께하며 조원들과 6가지 주제(취미, 5일 휴가, 버킷리스트, 다른 직업, 의외의 사실, 슈퍼파워 등)에 대해 자유롭게 대화해 보세요. 대화 중 가장 인상 깊었던 동료 1명을 선택하고 나누었던 스토리를 작성해 주세요. (저녁 퀴즈 및 네트워킹에 활용됩니다)";
export const PEOPLE_QUEST_POINTS_PER_MEMBER = 100; // 배점 변경 시 이 값만 수정하면 전역 연동 (조원당 100pt)

// ─────────────────────────────────────────────────────────────────
// 5. Activity 2: Discovery Quiz (조당 3문항: 공통 2개 + 코스 전용 1개)
// ─────────────────────────────────────────────────────────────────
export const DISCOVERY_QUIZZES: DiscoveryQuizItem[] = [
  // [공통 1] 코끼리열차 매표소 앞 광장 (출발 및 도착 기점)
  {
    id: 'dq_elephant',
    title: '코끼리열차의 역사',
    questionText: '서울대공원의 상징인 코끼리열차가 최초로 개통 및 운행을 시작한 연도는 언제일까요? (매표소 안내판 참고)',
    options: ['1984년', '1988년', '1992년', '1996년'],
    correctIndex: 0,
    explanation: '서울대공원 코끼리열차는 서울대공원 개원과 함께 1984년 첫 운행을 시작했습니다.',
    coords: { lat: 37.4357, lng: 127.0062 },
    radiusMeters: 60,
    points: 100, // 문항별 배점
    locationLabel: '코끼리열차 매표소 앞 광장 [출발/도착]',
    courseKey: 'all',
  },
  // [공통 2] 국립현대미술관 과천관 앞 (📸 단체사진 촬영지 & 공통 퀴즈)
  {
    id: 'dq_museum',
    title: '노래하는 거인상',
    questionText: '국립현대미술관 과천관 야외조각공원의 대표 상징 조형물로, 실제 턱을 움직이며 노래를 부르는 거대한 거인상의 명칭은?',
    options: ['생각하는 사람', '노래하는 사람 (Singing Man)', '바람의 탑', '달빛 소나타'],
    correctIndex: 1,
    explanation: '미국 조각가 조나단 보로프스키의 작품으로 실제 턱을 움직이며 잔잔한 노래를 부르는 "노래하는 사람"입니다.',
    coords: { lat: 37.4315, lng: 127.0225 },
    radiusMeters: 70,
    points: 100, // 문항별 배점
    locationLabel: '국립현대미술관 앞 [📸 단체사진 촬영지]',
    courseKey: 'all',
  },
  // [동물원둘레길 전용 1] 1~3조: 동물원둘레길 피톤치드 숲길 쉼터
  {
    id: 'dq_zoo',
    title: '동물원둘레길 피톤치드 숲',
    questionText: '동물원둘레길을 걸을 때 나무들이 해충과 균으로부터 스스로를 보호하기 위해 내뿜는 천연 숲의 항균 물질은?',
    options: ['피톤치드(Phytoncide)', '플라보노이드', '카테킨', '글루코사민'],
    correctIndex: 0,
    explanation: '피톤치드는 숲속 나무들이 방출하는 천연 물질로, 스트레스 완화와 면역력 증진에 탁월합니다.',
    coords: { lat: 37.4265, lng: 127.0268 },
    radiusMeters: 70,
    points: 100, // 문항별 배점
    locationLabel: '동물원둘레길 숲길 쉼터 (1~3조 전용)',
    courseKey: 'forest',
  },
  // [호수둘레길 전용 1] 4~6조: 대공원 호수 브릿지 전망 데크
  {
    id: 'dq_lake',
    title: '대공원 호수와 청계저수지',
    questionText: '서울대공원 호수둘레길이 둘러싸고 있는 이 거대한 호수의 공식 명칭은 무엇일까요?',
    options: ['과천호', '청계저수지', '대공원호', '관악호'],
    correctIndex: 1,
    explanation: '청계산 자락의 물이 모여 형성된 서울대공원 호수의 공식 하천 명칭은 "청계저수지"입니다.',
    coords: { lat: 37.4310, lng: 127.0185 },
    radiusMeters: 60,
    points: 100, // 문항별 배점
    locationLabel: '호수 브릿지 전망 데크 (4~6조 전용)',
    courseKey: 'lake',
  },
];

// ─────────────────────────────────────────────────────────────────
// 6. 점수 동적 계산 헬퍼 함수 (점수 변경 시 자동 반영)
// ─────────────────────────────────────────────────────────────────
export function getCourseQuizTotalPoints(courseKey: CourseKey = 'lake'): number {
  return DISCOVERY_QUIZZES
    .filter(q => q.courseKey === 'all' || q.courseKey === courseKey)
    .reduce((sum, q) => sum + (q.points || 0), 0);
}

export function getCourseTotalMaxPoints(courseKey: CourseKey = 'lake'): number {
  return PEOPLE_QUEST_POINTS_PER_MEMBER + getCourseQuizTotalPoints(courseKey);
}

// ─────────────────────────────────────────────────────────────────
// 7. 참가자 명단 (실제 참여자 실시간 동적 등록 모드)
// ─────────────────────────────────────────────────────────────────
export const PRE_REGISTERED_PARTICIPANTS: PreRegisteredPerson[] = [];

export const ACTIVE_VENUE = {
  venueName: '서울대공원',
  eventName: '2026 CHRO Trekking',
  sessionKey: 'trekking2026',
  departurePoint: {
    name: '코끼리열차 매표소 앞 광장 [출발/도착]',
    coords: { lat: 37.4357, lng: 127.0062 },
  },
  photoSpot: {
    name: '국립현대미술관 과천관 앞 [📸 단체사진]',
    coords: { lat: 37.4315, lng: 127.0225 },
  },
  mapLabel: '서울대공원 · 국립현대미술관 (순환 동선)',
};

export const DEFAULT_COURSE: CourseKey = 'lake';
