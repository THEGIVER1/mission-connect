// ─── 팀 & 참가자 ───────────────────────────────────────────────
export interface Team {
  id: string;
  name: string;
  shortCode: string;       // "A3", "B1" 등
  color: string;           // tailwind bg class or hex
  memberCount: number;
  score: number;
  rank: number;
  missionsCompleted: number;
  totalMissions: number;
  lastActivity: Date;
  status: 'active' | 'sos' | 'warning' | 'inactive';
}

export interface Participant {
  id: string;
  name: string;
  teamId: string;
  role: 'member' | 'leader';
  deviceToken?: string;
}

// ─── 미션 & 포스트 ─────────────────────────────────────────────
export type MissionType = 'gps' | 'ar' | 'quiz' | 'challenge';
export type MissionStatus = 'locked' | 'active' | 'in_progress' | 'completed';

export interface GpsCoord {
  lat: number;
  lng: number;
}

export interface Mission {
  id: string;
  postId: string;          // "P1" ~ "P5"
  name: string;
  description: string;
  type: MissionType;
  points: number;
  status: MissionStatus;
  location: GpsCoord;
  locationLabel: string;   // "3루 하단 관중석"
  radiusMeters: number;    // GPS 인증 반경
  arItemKey?: string;      // AR 미션일 때 핵심가치 키
  unlocksAfter?: string;   // 선행 미션 ID
}

export interface TeamMissionProgress {
  teamId: string;
  missionId: string;
  status: MissionStatus;
  completedAt?: Date;
  pointsEarned: number;
}

// ─── AR 핵심가치 ───────────────────────────────────────────────
export interface CoreValue {
  key: string;
  name: string;            // "도전정신"
  nameEn: string;          // "Challenge Spirit"
  emoji: string;
  points: number;
  found: boolean;
}

// ─── 공지 & 신고 ───────────────────────────────────────────────
export type NoticeTarget = 'all' | string;  // 'all' or teamId
export type AlertLevel = 'sos' | 'warning' | 'info';

export interface Notice {
  id: string;
  message: string;
  target: NoticeTarget;
  sentAt: Date;
  sentBy: string;
}

export interface Alert {
  id: string;
  level: AlertLevel;
  teamId: string;
  teamName: string;
  participantName?: string;
  message: string;
  location?: GpsCoord;
  locationLabel?: string;
  deviceInfo?: string;
  missionId?: string;
  createdAt: Date;
  resolvedAt?: Date;
  status: 'pending' | 'in_progress' | 'resolved';
}

// ─── 세션 ──────────────────────────────────────────────────────
export interface Session {
  id: string;
  name: string;            // "두산경영연구원 HR 트레킹 워크샵"
  venue: string;
  startedAt: Date;
  endsAt: Date;
  isLive: boolean;
  teams: string[];         // team ids
}

// ─── 앱 전역 상태 (Zustand) ─────────────────────────────────────
export interface AppState {
  session: Session | null;
  myTeam: Team | null;
  myLocation: GpsCoord | null;
  teams: Team[];
  missions: Mission[];
  alerts: Alert[];
  notices: Notice[];
  coreValues: CoreValue[];
  isAdmin: boolean;
}
