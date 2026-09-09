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
 *    1) People Quest (통합 1개 조별 대화 & 동료 추천 미션 - 200pt)
 *    2) Discovery Quiz (조당 3문항: 공통 2개 + 코스 전용 1개 - 문항당 100pt, 총 300pt)
 * - 총 만점: 500pt
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
// 3. 플랫폼 입장: 「나의 정보 입력」 7개 질문
// ─────────────────────────────────────────────────────────────────
export const MY_INFO_QUESTIONS: MyInfoQuestion[] = [
  {
    id: 'q1_passion',
    title: '최근 가장 푹 빠져 있는 것은?',
    placeholder: '예: 러닝, 드라마, 골프, 특정 유튜브 채널, 투자 공부, 베이킹, 독서, AI 활용 등',
    category: 'life',
  },
  {
    id: 'q2_vacation',
    title: '나 혼자만의 자유시간이 5일 생긴다면 가장 먼저 하고 싶은 것은?',
    placeholder: '예: 해외여행 가기, 집에서 푹 쉬기, 캠핑 떠나기, 가족과 시간 보내기, 맛집 투어 등',
    category: 'life',
  },
  {
    id: 'q3_dreamJob',
    title: '다시 태어난다면 해보고 싶은 직업은?',
    placeholder: '예: 셰프, 운동선수, 교사, 작가, 파일럿, 건축가, 여행 유튜버 등',
    category: 'life',
  },
  {
    id: 'q4_bucketList',
    title: '향후 3년 내 꼭 이루고 싶은 버킷리스트가 있다면?',
    placeholder: '예: 하프마라톤 완주, 가족 해외여행, 자격증 취득, 악기 배우기, 체중 감량 등',
    category: 'life',
  },
  {
    id: 'q5_unexpectedFact',
    title: '동료들이 들으면 의외라고 생각할 나만의 사실은?',
    placeholder: '예: 마라톤 완주 경험, 바리스타 자격증, 밴드 활동, 20개국 이상 여행, 악기 연주 등',
    category: 'life',
  },
  {
    id: 'q6_growthExperience',
    title: '지금까지 회사생활이나 사회생활을 하면서 나를 가장 많이 성장하게 한 경험은?',
    placeholder: '예: 새로운 직무로의 이동, 첫 프로젝트 리딩, 어려운 과제 수행, 실패 후 재도전, 타 조직 협업 등',
    category: 'career',
  },
  {
    id: 'q7_careerChallenge',
    title: '앞으로 업무나 커리어에서 새롭게 도전해보고 싶은 것은?',
    placeholder: '예: 새로운 직무&프로젝트, 다른 조직과의 협업, 글로벌 업무, 전문자격 취득, AI 활용 등',
    category: 'career',
  },
];

// ─────────────────────────────────────────────────────────────────
// 4. Activity 1: People Quest (단일 통합 조별 대화 & 추천 미션)
// ─────────────────────────────────────────────────────────────────
export const PEOPLE_QUEST_MISSION_TITLE = "우리 조가 발견한 '최고의 스토리 동료' 추천";
export const PEOPLE_QUEST_MISSION_GUIDE = "트레킹을 함께하며 조원들과 7가지 주제(취미, 버킷리스트, 성장 경험 등)에 대해 자유롭게 대화해 보세요. 대화 중 가장 인상 깊었던 동료 1명을 선택하고 나누었던 스토리를 작성해 주세요. (저녁 퀴즈 및 네트워킹에 활용됩니다)";
export const PEOPLE_QUEST_POINTS_PER_MEMBER = 200;

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
    coords: { lat: 37.4347, lng: 127.0132 },
    radiusMeters: 60,
    points: 100,
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
    points: 100,
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
    coords: { lat: 37.4265, lng: 127.0255 },
    radiusMeters: 70,
    points: 100,
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
    points: 100,
    locationLabel: '호수 브릿지 전망 데크 (4~6조 전용)',
    courseKey: 'lake',
  },
];

// ─────────────────────────────────────────────────────────────────
// 6. 사전 등록된 50명 참가자 명단 풀
// ─────────────────────────────────────────────────────────────────
export const PRE_REGISTERED_PARTICIPANTS: PreRegisteredPerson[] = [
  // 1조 (동물원둘레길)
  { id: 'p01', name: '김민준', company: '㈜두산', teamId: 'team1', teamName: '1조' },
  { id: 'p02', name: '이서연', company: '두산경영연구원', teamId: 'team1', teamName: '1조' },
  { id: 'p03', name: '박도윤', company: '㈜두산', teamId: 'team1', teamName: '1조' },
  { id: 'p04', name: '최지우', company: '두산경영연구원', teamId: 'team1', teamName: '1조' },
  { id: 'p05', name: '정도현', company: '㈜두산', teamId: 'team1', teamName: '1조' },
  { id: 'p06', name: '강예은', company: '두산경영연구원', teamId: 'team1', teamName: '1조' },
  { id: 'p07', name: '조현우', company: '㈜두산', teamId: 'team1', teamName: '1조' },
  { id: 'p08', name: '윤하은', company: '두산경영연구원', teamId: 'team1', teamName: '1조' },

  // 2조 (동물원둘레길)
  { id: 'p09', name: '장시우', company: '㈜두산', teamId: 'team2', teamName: '2조' },
  { id: 'p10', name: '임수아', company: '두산경영연구원', teamId: 'team2', teamName: '2조' },
  { id: 'p11', name: '한지호', company: '㈜두산', teamId: 'team2', teamName: '2조' },
  { id: 'p12', name: '오서아', company: '두산경영연구원', teamId: 'team2', teamName: '2조' },
  { id: 'p13', name: '서유준', company: '㈜두산', teamId: 'team2', teamName: '2조' },
  { id: 'p14', name: '신지아', company: '두산경영연구원', teamId: 'team2', teamName: '2조' },
  { id: 'p15', name: '권예준', company: '㈜두산', teamId: 'team2', teamName: '2조' },
  { id: 'p16', name: '황나은', company: '두산경영연구원', teamId: 'team2', teamName: '2조' },

  // 3조 (동물원둘레길)
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
    name: '코끼리열차 매표소 앞 광장 [출발/도착]',
    coords: { lat: 37.4347, lng: 127.0132 },
  },
  photoSpot: {
    name: '국립현대미술관 과천관 앞 [📸 단체사진]',
    coords: { lat: 37.4315, lng: 127.0225 },
  },
  mapLabel: '서울대공원 · 국립현대미술관 (순환 동선)',
};

export const DEFAULT_COURSE: CourseKey = 'lake';
