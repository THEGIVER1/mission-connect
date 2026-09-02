/**
 * =====================================================================
 * Workshop & Venue Configuration (2026 CHRO Trekking)
 * =====================================================================
 * 2026 CHRO 부문 트레킹 워크샵 (약 50명 대상)
 * - 공통 출발: 코끼리열차 매표소
 * - 코스: 1~3조(산림욕장 트레킹길) / 4~6조(호수둘레길 코스)
 * - 2대 핵심 Activity: People Quest & Discovery Quiz
 */

import {
  PeopleQuestQuestion,
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
// 1. 소속 회사 목록
// ─────────────────────────────────────────────────────────────────
export const WORKSHOP_COMPANIES = [
  '㈜두산',
  '두산경영연구원',
] as const;

// ─────────────────────────────────────────────────────────────────
// 2. 6개 조 구성 (1~3조: 산림욕장 / 4~6조: 호수둘레길)
// ─────────────────────────────────────────────────────────────────
export const WORKSHOP_TEAMS: WorkshopTeamConfig[] = [
  { id: 'team1', name: '1조', shortCode: '1', color: '#E31837', emoji: '🌲', assignedCourse: 'forest', courseName: '산림욕장 트레킹길', courseDistance: '4.5km' },
  { id: 'team2', name: '2조', shortCode: '2', color: '#E67E22', emoji: '🌲', assignedCourse: 'forest', courseName: '산림욕장 트레킹길', courseDistance: '4.5km' },
  { id: 'team3', name: '3조', shortCode: '3', color: '#F39C12', emoji: '🌲', assignedCourse: 'forest', courseName: '산림욕장 트레킹길', courseDistance: '4.5km' },
  { id: 'team4', name: '4조', shortCode: '4', color: '#27AE60', emoji: '🌊', assignedCourse: 'lake', courseName: '호수둘레길 코스', courseDistance: '2.8km' },
  { id: 'team5', name: '5조', shortCode: '5', color: '#2980B9', emoji: '🌊', assignedCourse: 'lake', courseName: '호수둘레길 코스', courseDistance: '2.8km' },
  { id: 'team6', name: '6조', shortCode: '6', color: '#8E44AD', emoji: '🌊', assignedCourse: 'lake', courseName: '호수둘레길 코스', courseDistance: '2.8km' },
];

// ─────────────────────────────────────────────────────────────────
// 3. Activity 1: People Quest 질문 목록 (모듈형 관리)
// ─────────────────────────────────────────────────────────────────
export const PEOPLE_QUEST_QUESTIONS: PeopleQuestQuestion[] = [
  {
    id: 'pq1',
    title: '가장 의외의 취미를 가지고 있을 것 같은 사람',
    instruction: '평소 모습에서는 예상하기 어려운 취미나 활동을 꾸준히 즐기는 사람을 찾아보세요.',
  },
  {
    id: 'pq2',
    title: '특별한 경험을 가지고 있을 것 같은 사람',
    instruction: '여행, 도전, 생활, 봉사 등 다른 구성원들이 흥미롭게 들을 만한 경험을 가진 사람을 찾아보세요.',
  },
];

// People Quest 완료 시 조원 1인당 부여 점수
export const PEOPLE_QUEST_POINTS_PER_MEMBER = 200;

// ─────────────────────────────────────────────────────────────────
// 4. Activity 2: Discovery Quiz 현장 객관식 문항 목록
// ─────────────────────────────────────────────────────────────────
export const DISCOVERY_QUIZZES: DiscoveryQuizItem[] = [
  {
    id: 'dq1',
    title: '코끼리열차 매표소의 비밀',
    questionText: '서울대공원의 명물인 코끼리열차가 최초로 운행을 시작한 연도는 언제일까요? (매표소 안내판 참고)',
    options: ['1984년', '1988년', '1992년', '1996년'],
    correctIndex: 0,
    explanation: '서울대공원 코끼리열차는 서울대공원 개원과 함께 1984년 첫 운행을 시작했습니다.',
    coords: { lat: 37.4347, lng: 127.0132 },
    radiusMeters: 60,
    points: 100,
    locationLabel: '코끼리열차 종합 매표소 앞',
    courseKey: 'all',
  },
  {
    id: 'dq2',
    title: '대공원 호수의 물줄기',
    questionText: '서울대공원 호수둘레길을 감싸고 있는 이 거대한 호수의 공식 명칭은 무엇일까요?',
    options: ['과천호', '청계저수지', '대공원호', '관악호'],
    correctIndex: 1,
    explanation: '서울대공원 중심에 위치한 호수의 공식 하천 명칭은 청계산 자락의 물이 모이는 "청계저수지"입니다.',
    coords: { lat: 37.4310, lng: 127.0185 },
    radiusMeters: 60,
    points: 100,
    locationLabel: '호수 브릿지 전망 데크',
    courseKey: 'lake',
  },
  {
    id: 'dq3',
    title: '테마가든 메타세쿼이아길',
    questionText: '테마가든 둘레길에 심어진 메타세쿼이아 나무의 원산지로 가장 알맞은 것은?',
    options: ['중국', '캐나다', '호주', '남아공'],
    correctIndex: 0,
    explanation: '살아있는 화석이라 불리는 메타세쿼이아의 원산지는 중국 양쯔강 상류 지역입니다.',
    coords: { lat: 37.4285, lng: 127.0170 },
    radiusMeters: 60,
    points: 100,
    locationLabel: '테마가든 장미원 산책로',
    courseKey: 'lake',
  },
  {
    id: 'dq4',
    title: '국립현대미술관 과천 조각공원',
    questionText: '국립현대미술관 과천관 야외조각공원의 대표 상징 조형물로, 노래하는 거대한 거인상의 명칭은?',
    options: ['생각하는 사람', '노래하는 사람 (Singing Man)', '바람의 탑', '달빛 소나타'],
    correctIndex: 1,
    explanation: '미국 조각가 조나단 보로프스키의 작품으로 실제 턱을 움직이며 노래를 부르는 "노래하는 사람"입니다.',
    coords: { lat: 37.4315, lng: 127.0225 },
    radiusMeters: 70,
    points: 100,
    locationLabel: '국립현대미술관 야외조각공원',
    courseKey: 'all',
  },
  {
    id: 'dq5',
    title: '청계산 산림욕장의 피톤치드',
    questionText: '산림욕장에서 우리 몸의 면역력을 높여주고 스트레스를 해소해 주는 숲의 천연 물질은?',
    options: ['피톤치드(Phytoncide)', '플라보노이드', '카테킨', '글루코사민'],
    correctIndex: 0,
    explanation: '피톤치드는 나무가 해충과 균으로부터 스스로를 보호하기 위해 내뿜는 천연 항균 물질입니다.',
    coords: { lat: 37.4270, lng: 127.0250 },
    radiusMeters: 70,
    points: 100,
    locationLabel: '산림욕장 생각하는 숲 쉼터',
    courseKey: 'forest',
  },
];

// ─────────────────────────────────────────────────────────────────
// 5. 사전 등록된 50명 참가자 명단 풀 (A방식 사전 등록)
// ─────────────────────────────────────────────────────────────────
export const PRE_REGISTERED_PARTICIPANTS: PreRegisteredPerson[] = [
  // 1조 (산림욕장)
  { id: 'p01', name: '김민준', company: '㈜두산', teamId: 'team1', teamName: '1조' },
  { id: 'p02', name: '이서연', company: '두산경영연구원', teamId: 'team1', teamName: '1조' },
  { id: 'p03', name: '박도윤', company: '㈜두산', teamId: 'team1', teamName: '1조' },
  { id: 'p04', name: '최지우', company: '두산경영연구원', teamId: 'team1', teamName: '1조' },
  { id: 'p05', name: '정도현', company: '㈜두산', teamId: 'team1', teamName: '1조' },
  { id: 'p06', name: '강예은', company: '두산경영연구원', teamId: 'team1', teamName: '1조' },
  { id: 'p07', name: '조현우', company: '㈜두산', teamId: 'team1', teamName: '1조' },
  { id: 'p08', name: '윤하은', company: '두산경영연구원', teamId: 'team1', teamName: '1조' },

  // 2조 (산림욕장)
  { id: 'p09', name: '장시우', company: '㈜두산', teamId: 'team2', teamName: '2조' },
  { id: 'p10', name: '임수아', company: '두산경영연구원', teamId: 'team2', teamName: '2조' },
  { id: 'p11', name: '한지호', company: '㈜두산', teamId: 'team2', teamName: '2조' },
  { id: 'p12', name: '오서아', company: '두산경영연구원', teamId: 'team2', teamName: '2조' },
  { id: 'p13', name: '서유준', company: '㈜두산', teamId: 'team2', teamName: '2조' },
  { id: 'p14', name: '신지아', company: '두산경영연구원', teamId: 'team2', teamName: '2조' },
  { id: 'p15', name: '권예준', company: '㈜두산', teamId: 'team2', teamName: '2조' },
  { id: 'p16', name: '황나은', company: '두산경영연구원', teamId: 'team2', teamName: '2조' },

  // 3조 (산림욕장)
  { id: 'p17', name: '안준우', company: '㈜두산', teamId: 'team3', teamName: '3조' },
  { id: 'p18', name: '송민서', company: '두산경영연구원', teamId: 'team3', teamName: '3조' },
  { id: 'p19', name: '전도경', company: '㈜두산', teamId: 'team3', teamName: '3조' },
  { id: 'p20', name: '홍채원', company: '두산경영연구원', teamId: 'team3', teamName: '3조' },
  { id: 'p21', name: '유건우', company: '㈜두산', teamId: 'team3', teamName: '3조' },
  { id: 'p22', name: '고다은', company: '두산경영연구원', teamId: 'team3', teamName: '3조' },
  { id: 'p23', name: '문태양', company: '㈜두산', teamId: 'team3', teamName: '3조' },
  { id: 'p24', name: '양소율', company: '두산경영연구원', teamId: 'team3', teamName: '3조' },

  // 4조 (호수둘레길)
  { id: 'p25', name: '손우진', company: '㈜두산', teamId: 'team4', teamName: '4조' },
  { id: 'p26', name: '배지안', company: '두산경영연구원', teamId: 'team4', teamName: '4조' },
  { id: 'p27', name: '조선우', company: '㈜두산', teamId: 'team4', teamName: '4조' },
  { id: 'p28', name: '백하윤', company: '두산경영연구원', teamId: 'team4', teamName: '4조' },
  { id: 'p29', name: '허도윤', company: '㈜두산', teamId: 'team4', teamName: '4조' },
  { id: 'p30', name: '노시아', company: '두산경영연구원', teamId: 'team4', teamName: '4조' },
  { id: 'p31', name: '심은우', company: '㈜두산', teamId: 'team4', teamName: '4조' },
  { id: 'p32', name: '하서윤', company: '두산경영연구원', teamId: 'team4', teamName: '4조' },

  // 5조 (호수둘레길)
  { id: 'p33', name: '곽시후', company: '㈜두산', teamId: 'team5', teamName: '5조' },
  { id: 'p34', name: '성아린', company: '두산경영연구원', teamId: 'team5', teamName: '5조' },
  { id: 'p35', name: '차민재', company: '㈜두산', teamId: 'team5', teamName: '5조' },
  { id: 'p36', name: '주아인', company: '두산경영연구원', teamId: 'team5', teamName: '5조' },
  { id: 'p37', name: '우현준', company: '㈜두산', teamId: 'team5', teamName: '5조' },
  { id: 'p38', name: '구지유', company: '두산경영연구원', teamId: 'team5', teamName: '5조' },
  { id: 'p39', name: '진이준', company: '㈜두산', teamId: 'team5', teamName: '5조' },
  { id: 'p40', name: '나수빈', company: '두산경영연구원', teamId: 'team5', teamName: '5조' },

  // 6조 (호수둘레길)
  { id: 'p41', name: '민정우', company: '㈜두산', teamId: 'team6', teamName: '6조' },
  { id: 'p42', name: '엄채아', company: '두산경영연구원', teamId: 'team6', teamName: '6조' },
  { id: 'p43', name: '채승우', company: '㈜두산', teamId: 'team6', teamName: '6조' },
  { id: 'p44', name: '원하은', company: '두산경영연구원', teamId: 'team6', teamName: '6조' },
  { id: 'p45', name: '천유찬', company: '㈜두산', teamId: 'team6', teamName: '6조' },
  { id: 'p46', name: '방서진', company: '두산경영연구원', teamId: 'team6', teamName: '6조' },
  { id: 'p47', name: '공동현', company: '㈜두산', teamId: 'team6', teamName: '6조' },
  { id: 'p48', name: '현소은', company: '두산경영연구원', teamId: 'team6', teamName: '6조' },
  { id: 'p49', name: '탁재윤', company: '㈜두산', teamId: 'team6', teamName: '6조' },
  { id: 'p50', name: '옥지민', company: '두산경영연구원', teamId: 'team6', teamName: '6조' },
];

export const ACTIVE_VENUE = {
  venueName: '서울대공원',
  eventName: '2026 CHRO Trekking',
  sessionKey: 'trekking2026',
  departurePoint: {
    name: '코끼리열차 매표소 앞 광장',
    coords: { lat: 37.4347, lng: 127.0132 },
  },
  mapLabel: '서울대공원 · 국립현대미술관',
};

export const DEFAULT_COURSE: CourseKey = 'lake';
