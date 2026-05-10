import type { Team, Mission, Alert, Notice, CoreValue, Session } from '../types';

// ─── 세션 ──────────────────────────────────────────────────────
export const MOCK_SESSION: Session = {
  id: 'trekking2026',
  name: '두산 HR 트레킹 워크샵 2026',
  venue: '두산경영연구원 · 두산저수지',
  startedAt: new Date(Date.now() - 90 * 60 * 1000),
  endsAt:    new Date(Date.now() + 134 * 60 * 1000),
  isLive: true,
  teams: ['alpha','beta','gamma','delta','omega'],
};

// ─── 5개 팀 ────────────────────────────────────────────────────
export const MOCK_TEAMS: Team[] = [
  { id:'alpha', name:'알파팀', shortCode:'A', color:'#E31837', memberCount:10, score:0, rank:1, missionsCompleted:0, totalMissions:5, lastActivity:new Date(), status:'active' },
  { id:'beta',  name:'베타팀', shortCode:'B', color:'#2980B9', memberCount:10, score:0, rank:2, missionsCompleted:0, totalMissions:5, lastActivity:new Date(), status:'active' },
  { id:'gamma', name:'감마팀', shortCode:'G', color:'#27AE60', memberCount:10, score:0, rank:3, missionsCompleted:0, totalMissions:5, lastActivity:new Date(), status:'active' },
  { id:'delta', name:'델타팀', shortCode:'D', color:'#F39C12', memberCount:10, score:0, rank:4, missionsCompleted:0, totalMissions:5, lastActivity:new Date(), status:'active' },
  { id:'omega', name:'오메가팀', shortCode:'O', color:'#8E44AD', memberCount:10, score:0, rank:5, missionsCompleted:0, totalMissions:5, lastActivity:new Date(), status:'active' },
];

// ─── 미션 포스트 ───────────────────────────────────────────────
export const MOCK_MISSIONS: Mission[] = [
  {
    id: 'm1',
    postId: 'P1',
    name: '우리 팀 첫 만남',
    description: '팀원 모두 모여 소개 카드를 작성하세요.\n• 이름 / 소속 / 맡은 업무\n• 요즘 가장 재미있는 것 한 가지\n\n작성 후 단체 사진을 찍으면 미션 완료!',
    type: 'gps',
    points: 200,
    status: 'active',
    location: { lat: 37.5415, lng: 127.1368 },
    locationLabel: '연구원 광장',
    radiusMeters: 80,
  },
  {
    id: 'm2',
    postId: 'P2',
    name: '연강원 AR 탐험',
    description: 'AR 카메라로 연강원 곳곳에 숨어있는 것들을 찾아보세요!\n\n🌸 두산 무궁화\n🍐 배나무\n🍊 감나무\n🫐 블루베리\n🌿 두릅나무\n⛪ 기도원\n\n많이 찾을수록 높은 점수!',
    type: 'ar',
    points: 500,
    status: 'locked',
    location: { lat: 37.5408, lng: 127.1382 },
    locationLabel: '산책로',
    radiusMeters: 80,
    arItemKey: 'nature',
    unlocksAfter: 'm1',
  },
  {
    id: 'm3',
    postId: 'P3',
    name: '같은 고민, 다른 회사',
    description: '아래 두 가지 질문에 솔직하게 답해보세요.\n\nQ1. HR 담당자로서 요즘 가장 보람 있는 순간과 가장 힘든 순간은?\n\nQ2. 우리 회사 구성원들이 지금 가장 필요로 하는 것이 뭐라고 생각하세요?\n\n입력 후 비슷한 고민의 타 팀 담당자와 매칭됩니다. 매칭된 상대를 찾아가 5분 대화 후 함께 사진을 찍으면 완료!',
    type: 'gps',
    points: 300,
    status: 'locked',
    location: { lat: 37.5398, lng: 127.1390 },
    locationLabel: '저수지 입구',
    radiusMeters: 80,
    unlocksAfter: 'm2',
  },
  {
    id: 'm4',
    postId: 'P4',
    name: '두산 HR로 산다는 것',
    description: '다른 팀 1개와 만나세요.\n\n각 팀에서 1명씩 이 질문에 답해주세요.\n\n"두산에서 HR로 일하면서 구성원이 변화하는 걸 느꼈던 순간이 있나요?"\n\n서로의 이야기를 듣고 나면 두 팀 모두 미션 완료!',
    type: 'challenge',
    points: 400,
    status: 'locked',
    location: { lat: 37.5388, lng: 127.1398 },
    locationLabel: '저수지 둘레길',
    radiusMeters: 80,
    unlocksAfter: 'm3',
  },
  {
    id: 'm5',
    postId: 'P5',
    name: '오늘의 연결 선언',
    description: '오늘 가장 인상 깊었던 대화 상대에게 메시지를 보내세요.\n\n"오늘 ___님과 나눈 ___가 기억에 남습니다"\n\n상대방이 수락하면 두 사람 모두 최고 점수 획득!\n오늘의 인연이 연결 리포트에 영구 기록됩니다.',
    type: 'quiz',
    points: 800,
    status: 'locked',
    location: { lat: 37.5380, lng: 127.1385 },
    locationLabel: '저수지 전망대',
    radiusMeters: 80,
    unlocksAfter: 'm4',
  },
];

// ─── 긴급 신고 ─────────────────────────────────────────────────
export const MOCK_ALERTS: Alert[] = [
  {
    id: 'al1', level: 'sos', teamId: 'alpha', teamName: '알파팀', participantName: '김지훈',
    message: '참가자가 산책로에서 발목을 삐었습니다. P2 포스트 근처에 있습니다.',
    location: { lat: 37.5408, lng: 127.1382 }, locationLabel: '산책로 (P2 인근)',
    deviceInfo: 'GPS 정확도 양호',
    createdAt: new Date(Date.now() - 1 * 60 * 1000), status: 'pending',
  },
  {
    id: 'al2', level: 'warning', teamId: 'beta', teamName: '베타팀',
    message: 'P3 포스트 GPS 인증이 안 됩니다.',
    locationLabel: '저수지 입구 (P3)', missionId: 'm3',
    createdAt: new Date(Date.now() - 4 * 60 * 1000), status: 'pending',
  },
  {
    id: 'al3', level: 'info', teamId: 'gamma', teamName: '감마팀',
    message: '매칭 미션에서 상대방 응답이 없습니다.',
    deviceInfo: 'iOS 17 · Safari', missionId: 'm3',
    createdAt: new Date(Date.now() - 11 * 60 * 1000), status: 'pending',
  },
];

// ─── 공지 ──────────────────────────────────────────────────────
export const MOCK_NOTICES: Notice[] = [
  {
    id: 'n1',
    message: '저수지 입구 집결 시간은 오후 2시입니다. 준비해주세요!',
    target: 'all', sentAt: new Date(Date.now() - 2 * 60 * 1000), sentBy: '운영본부',
  },
  {
    id: 'n2',
    message: '저수지 전망대에서 전체 마무리 미션이 시작됩니다. 💪',
    target: 'all', sentAt: new Date(Date.now() - 14 * 60 * 1000), sentBy: '운영본부',
  },
];

// ─── AR 연강원 탐험 대상 ────────────────────────────────────────
export const MOCK_CORE_VALUES: CoreValue[] = [
  { key: 'mugunghwa', name: '두산 무궁화', nameEn: 'Doosan Mugunghwa', emoji: '🌸', points: 150, found: false },
  { key: 'pear',      name: '배나무',      nameEn: 'Pear Tree',        emoji: '🍐', points: 100, found: false },
  { key: 'persimmon', name: '감나무',      nameEn: 'Persimmon Tree',   emoji: '🍊', points: 100, found: false },
  { key: 'blueberry', name: '블루베리',    nameEn: 'Blueberry',        emoji: '🫐', points: 100, found: false },
  { key: 'aralia',    name: '두릅나무',    nameEn: 'Aralia Tree',      emoji: '🌿', points: 100, found: false },
  { key: 'chapel',    name: '기도원',      nameEn: 'Chapel',           emoji: '⛪', points: 150, found: false },
];