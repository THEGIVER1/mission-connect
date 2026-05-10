import React from 'react';

// ─── 라이브 배지 ──────────────────────────────────────────────
export const LiveBadge: React.FC<{ label?: string }> = ({ label = 'LIVE SESSION' }) => (
  <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/30 rounded-full px-3 py-1">
    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
    <span className="text-xs font-bold text-red-400 tracking-wide">{label}</span>
  </div>
);

// ─── 미션 상태 배지 ───────────────────────────────────────────
type StatusType = 'completed' | 'active' | 'in_progress' | 'locked';
const STATUS_STYLES: Record<StatusType, string> = {
  completed:   'bg-green-500/15 text-green-400 border-green-500/25',
  active:      'bg-red-500/15 text-red-400 border-red-500/25',
  in_progress: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
  locked:      'bg-white/5 text-slate-500 border-white/10',
};
const STATUS_LABELS: Record<StatusType, string> = {
  completed:'완료', active:'활성화', in_progress:'진행중', locked:'잠금',
};
export const MissionStatusBadge: React.FC<{ status: StatusType }> = ({ status }) => (
  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${STATUS_STYLES[status]}`}>
    {STATUS_LABELS[status]}
  </span>
);

// ─── 팀 아바타 ────────────────────────────────────────────────
export const TeamAvatar: React.FC<{ shortCode: string; color?: string; size?: 'sm' | 'md' | 'lg' }> = ({
  shortCode, color = '#E31837', size = 'md',
}) => {
  const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-14 h-14 text-base' };
  return (
    <div className={`${sizes[size]} rounded-xl flex items-center justify-center font-bold text-white flex-shrink-0`}
         style={{ backgroundColor: color }}>
      {shortCode}
    </div>
  );
};

// ─── 점수 바 ──────────────────────────────────────────────────
export const ScoreBar: React.FC<{ value: number; max: number; color?: string }> = ({
  value, max, color = '#E31837',
}) => (
  <div className="h-1 bg-white/8 rounded-full overflow-hidden">
    <div className="h-full rounded-full transition-all duration-700"
         style={{ width: `${Math.min((value / max) * 100, 100)}%`, backgroundColor: color }} />
  </div>
);

// ─── 섹션 타이틀 ─────────────────────────────────────────────
export const SectionTitle: React.FC<{ children: React.ReactNode; action?: React.ReactNode }> = ({ children, action }) => (
  <div className="flex items-center justify-between mb-2 px-4">
    <h2 className="text-[11px] font-bold text-slate-400 tracking-widest uppercase">{children}</h2>
    {action}
  </div>
);

// ─── 카드 래퍼 ────────────────────────────────────────────────
export const Card: React.FC<{ children: React.ReactNode; className?: string; accent?: string }> = ({
  children, className = '', accent,
}) => (
  <div className={`bg-[#1A2235] border border-white/8 rounded-2xl relative overflow-hidden ${className}`}
       style={accent ? { borderLeftColor: accent, borderLeftWidth: 3 } : {}}>
    {children}
  </div>
);

// ─── 포인트 배지 ─────────────────────────────────────────────
export const PointsBadge: React.FC<{ points: number }> = ({ points }) => (
  <span className="text-[10px] font-bold text-amber-400 bg-amber-400/12 px-1.5 py-0.5 rounded">
    +{points.toLocaleString()}pt
  </span>
);

// ─── 알림 레벨 스타일 ────────────────────────────────────────
export const ALERT_STYLES = {
  sos:     { border: '#E31837', icon: '🆘', bg: 'rgba(227,24,55,0.08)', label: 'SOS',  labelCls: 'bg-red-500/15 text-red-400' },
  warning: { border: '#F5A623', icon: '⚠️', bg: 'rgba(245,166,35,0.06)', label: '경고', labelCls: 'bg-amber-500/12 text-amber-400' },
  info:    { border: '#00B4D8', icon: '💬', bg: 'rgba(0,180,216,0.06)', label: '문의', labelCls: 'bg-cyan-500/12 text-cyan-400' },
};
