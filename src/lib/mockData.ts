import type { Team, Mission, Alert, Notice, CoreValue, Session } from '../types';
import { ACTIVE_VENUE, WORKSHOP_TEAMS } from '../config/workshopConfig';

// ─── 세션 ──────────────────────────────────────────────────────
export const MOCK_SESSION: Session = {
  id: ACTIVE_VENUE.sessionKey,
  name: ACTIVE_VENUE.eventName,
  venue: `${ACTIVE_VENUE.venueName} · ${ACTIVE_VENUE.venueSubtitle}`,
  startedAt: new Date(Date.now() - 90 * 60 * 1000),
  endsAt:    new Date(Date.now() + 134 * 60 * 1000),
  isLive: true,
  teams: WORKSHOP_TEAMS.map((t) => t.id),
};

// ─── 5개 팀 ────────────────────────────────────────────────────
export const MOCK_TEAMS: Team[] = WORKSHOP_TEAMS.map((t, i) => ({
  id: t.id,
  name: t.name,
  shortCode: t.shortCode,
  color: t.color,
  memberCount: 10,
  score: 0,
  rank: i + 1,
  missionsCompleted: 0,
  totalMissions: ACTIVE_VENUE.posts.length,
  lastActivity: new Date(),
  status: 'active' as const,
}));

// ─── 미션 포스트 ───────────────────────────────────────────────
export const MOCK_MISSIONS: Mission[] = ACTIVE_VENUE.posts.map((p, i) => ({
  id: p.id,
  postId: p.postId,
  name: p.name,
  description: p.description,
  type: p.type === 'match' ? 'gps' : p.type,
  points: p.points,
  status: (i === 0 ? 'active' : 'locked') as Mission['status'],
  location: p.coords,
  locationLabel: p.locationLabel,
  radiusMeters: p.radiusMeters,
  unlocksAfter: i > 0 ? ACTIVE_VENUE.posts[i - 1].id : undefined,
}));

// ─── 긴급 신고 ─────────────────────────────────────────────────
export const MOCK_ALERTS: Alert[] = [
  {
    id: 'al1', level: 'sos', teamId: 'team1', teamName: '1조', participantName: '김지훈',
    message: '참가자가 산책로에서 발목을 삐었습니다. P2 포스트 근처에 있습니다.',
    location: { lat: 37.5408, lng: 127.1382 }, locationLabel: '산책로 (P2 인근)',
    deviceInfo: 'GPS 정확도 양호',
    createdAt: new Date(Date.now() - 1 * 60 * 1000), status: 'pending',
  },
  {
    id: 'al2', level: 'warning', teamId: 'team2', teamName: '2조',
    message: 'P3 포스트 GPS 인증이 안 됩니다.',
    locationLabel: '저수지 입구 (P3)', missionId: 'm3',
    createdAt: new Date(Date.now() - 4 * 60 * 1000), status: 'pending',
  },
  {
    id: 'al3', level: 'info', teamId: 'team3', teamName: '3조',
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