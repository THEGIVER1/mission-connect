import React, { useState, useMemo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { LiveBadge, TeamAvatar, ALERT_STYLES } from '../shared';
import type { Alert, Mission, Team } from '../../types';

// ─────────────────────────────────────────────────────────────────
// 탭
// ─────────────────────────────────────────────────────────────────
type TabKey = 'alert' | 'teams' | 'missions' | 'notice' | 'settings';

// ─────────────────────────────────────────────────────────────────
// 세션 타이머 (어드민용)
// ─────────────────────────────────────────────────────────────────
function useAdminTimer() {
  const session = useAppStore((s) => s.session);
  const [now, setNow] = React.useState(Date.now());
  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!session) return { label: '--:--:--', urgent: false };
  const left    = Math.max(0, session.endsAt.getTime() - now);
  const h = String(Math.floor(left / 3600000)).padStart(2, '0');
  const m = String(Math.floor((left % 3600000) / 60000)).padStart(2, '0');
  const s = String(Math.floor((left % 60000) / 1000)).padStart(2, '0');
  return { label: `${h}:${m}:${s}`, urgent: left < 15 * 60 * 1000 };
}

// ─────────────────────────────────────────────────────────────────
// 상단 헤더
// ─────────────────────────────────────────────────────────────────
const AdminHeader: React.FC = () => {
  const { teams, session } = useAppStore();
  const timer = useAdminTimer();
  const pendingAlerts = useAppStore((s) => s.alerts.filter((a) => a.status === 'pending').length);

  return (
    <header className="bg-[#0F1623] border-b border-white/10 px-5 pt-3 pb-3 relative flex-shrink-0">
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-red-600 to-orange-500" />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="font-bebas text-2xl tracking-widest text-white leading-none">
            MISSION<span className="text-red-500">.</span>CONNECT
          </span>
          <span className="text-[10px] font-bold bg-red-500/15 border border-red-500/35 text-red-400
                           px-2 py-0.5 rounded tracking-widest">ADMIN</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-green-500/12 border border-green-500/30
                          rounded-full px-2.5 py-1">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[11px] font-bold text-green-400">세션 진행중</span>
          </div>
          <div className={`font-bebas text-2xl tracking-widest ${timer.urgent ? 'text-red-400 animate-pulse' : 'text-white'}`}>
            {timer.label}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-500">
        <span>⚾ {session?.venue ?? '—'}</span>
        <span>·</span>
        <span>👥 {teams.reduce((a, t) => a + t.memberCount, 0)}명</span>
        <span>·</span>
        <span>{teams.length}팀</span>
        {pendingAlerts > 0 && (
          <>
            <span>·</span>
            <span className="text-red-400 font-bold animate-pulse">🆘 미처리 신고 {pendingAlerts}건</span>
          </>
        )}
      </div>
    </header>
  );
};

// ─────────────────────────────────────────────────────────────────
// 요약 통계 행
// ─────────────────────────────────────────────────────────────────
const SummaryRow: React.FC = () => {
  const { teams, missions, alerts } = useAppStore();
  const pending    = alerts.filter((a) => a.status === 'pending').length;
  const online     = teams.filter((t) => t.status !== 'inactive').length;
  const completed  = teams.reduce((a, t) => a + t.missionsCompleted, 0);
  const totalMiss  = teams.length * (missions.length || 1);

  return (
    <div className="grid grid-cols-4 gap-2 px-4 py-3 flex-shrink-0">
      {[
        { val: pending,   label: '미처리 신고', color: pending > 0 ? 'text-red-400' : 'text-green-400',   sub: pending > 0 ? '즉시 대응' : '이상 없음' },
        { val: online,    label: '접속중 팀',   color: 'text-white',    sub: `/ ${teams.length}팀` },
        { val: completed, label: '완료 미션',   color: 'text-green-400', sub: `/ ${totalMiss}개` },
        { val: teams.filter((t) => t.status === 'sos' || t.status === 'warning').length,
          label: '주의 팀',  color: 'text-amber-400', sub: '모니터링' },
      ].map(({ val, label, color, sub }) => (
        <div key={label} className="bg-[#141C2E] border border-white/8 rounded-xl p-2.5 text-center">
          <div className={`font-bebas text-2xl leading-none ${color}`}>{val}</div>
          <div className="text-[9px] text-slate-500 mt-0.5">{label}</div>
          <div className="text-[9px] text-slate-600">{sub}</div>
        </div>
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// 탭: 긴급 대응
// ─────────────────────────────────────────────────────────────────
const AlertTab: React.FC = () => {
  const { alerts, resolveAlert, addNotice } = useAppStore();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const sorted = useMemo(() =>
    [...alerts].sort((a, b) => {
      const order = { sos: 0, warning: 1, info: 2 };
      if (a.status === 'resolved' && b.status !== 'resolved') return 1;
      if (b.status === 'resolved' && a.status !== 'resolved') return -1;
      return order[a.level] - order[b.level];
    }),
  [alerts]);

  const handleResolve = (id: string) => {
    setProcessingId(id);
    setTimeout(() => {
      resolveAlert(id);
      setProcessingId(null);
    }, 600);
  };

  const handleBroadcast = (alert: Alert) => {
    addNotice({
      id: `n-${Date.now()}`,
      message: `[운영본부] ${alert.teamName} 관련 안내: 운영팀이 현장 지원 중입니다.`,
      target: 'all',
      sentAt: new Date(),
      sentBy: '운영본부',
    });
  };

  const timeAgo = (d: Date) => {
    const min = Math.floor((Date.now() - d.getTime()) / 60000);
    return min === 0 ? '방금 전' : `${min}분 전`;
  };

  return (
    <div className="px-4 pb-28 pt-2 space-y-3">
      {sorted.map((alert) => {
        const cfg = ALERT_STYLES[alert.level];
        const isDone = alert.status === 'resolved';
        return (
          <div key={alert.id}
               className={`rounded-2xl border overflow-hidden transition-opacity ${isDone ? 'opacity-40' : ''}`}
               style={{ background: cfg.bg, borderColor: cfg.border + '55' }}>
            {/* 상단 레벨 바 */}
            <div className="h-0.5 w-full" style={{ background: cfg.border }} />

            <div className="p-4">
              <div className="flex items-start gap-3">
                {/* 아이콘 */}
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                     style={{ background: `${cfg.border}20` }}>
                  {cfg.icon}
                </div>

                {/* 본문 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${cfg.labelCls}`}>
                      {cfg.label}
                    </span>
                    <span className="text-[12px] font-bold text-white">{alert.teamName}</span>
                    {alert.participantName && (
                      <span className="text-[11px] text-slate-500">· {alert.participantName}</span>
                    )}
                    <span className="text-[10px] text-slate-500 ml-auto">{timeAgo(alert.createdAt)}</span>
                  </div>

                  <p className="text-[13px] text-white leading-relaxed mb-2">{alert.message}</p>

                  <div className="flex gap-3 text-[11px] text-slate-500 mb-3 flex-wrap">
                    {alert.locationLabel && <span>📍 {alert.locationLabel}</span>}
                    {alert.deviceInfo    && <span>📱 {alert.deviceInfo}</span>}
                  </div>

                  {/* 액션 버튼 */}
                  {!isDone ? (
                    <div className="flex gap-2 flex-wrap">
                      {alert.level === 'sos' && (
                        <button className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-red-600 text-white">
                          📞 전화 연결
                        </button>
                      )}
                      {alert.locationLabel && (
                        <button className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-[#212C42] text-slate-300 border border-white/8">
                          📍 지도 보기
                        </button>
                      )}
                      <button onClick={() => handleBroadcast(alert)}
                              className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-[#212C42] text-slate-300 border border-white/8">
                        📢 공지 발송
                      </button>
                      <button onClick={() => handleResolve(alert.id)}
                              disabled={processingId === alert.id}
                              className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-green-500/15 text-green-400 border border-green-500/25 ml-auto">
                        {processingId === alert.id
                          ? <span className="flex items-center gap-1"><div className="w-3 h-3 border border-green-400 border-t-transparent rounded-full animate-spin" />처리중</span>
                          : '✓ 처리 완료'}
                      </button>
                    </div>
                  ) : (
                    <span className="text-[11px] text-green-400 font-bold">✓ 처리 완료
                      {alert.resolvedAt && ` · ${timeAgo(alert.resolvedAt)}`}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {sorted.every((a) => a.status === 'resolved') && (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <span className="text-4xl">✅</span>
          <p className="text-[15px] font-bold text-white">모든 신고 처리 완료</p>
          <p className="text-[12px] text-slate-500">현재 미처리 신고가 없습니다</p>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// 탭: 팀 현황
// ─────────────────────────────────────────────────────────────────
const TeamsTab: React.FC = () => {
  const { teams } = useAppStore();
  const maxScore = teams[0]?.score ?? 1;

  const statusCfg = {
    active:   { cls: 'bg-green-500/12 text-green-400  border-green-500/20',  label: '정상'  },
    sos:      { cls: 'bg-red-500/12   text-red-400    border-red-500/20',    label: 'SOS'   },
    warning:  { cls: 'bg-amber-500/12 text-amber-400  border-amber-500/20',  label: '경고'  },
    inactive: { cls: 'bg-white/5      text-slate-500  border-white/10',      label: '비활성' },
  };

  return (
    <div className="px-4 pb-28 pt-2 space-y-2">
      {/* 테이블 헤더 */}
      <div className="grid grid-cols-[28px_1fr_64px_56px_52px] gap-2 px-2 py-2
                      text-[10px] font-bold text-slate-500 tracking-widest uppercase border-b border-white/8">
        <span>#</span><span>팀명</span><span>점수</span><span>진행률</span><span>상태</span>
      </div>

      {teams.map((team) => {
        const sc = statusCfg[team.status];
        return (
          <div key={team.id}
               className={`grid grid-cols-[28px_1fr_64px_56px_52px] gap-2 items-center
                           px-2 py-2.5 rounded-xl border
                           ${team.status === 'sos'     ? 'bg-red-500/5   border-red-500/20'   :
                             team.status === 'warning' ? 'bg-amber-500/5 border-amber-500/15' :
                             'bg-[#141C2E] border-white/6'}`}>
            {/* 순위 */}
            <span className={`font-bebas text-lg text-center
              ${team.rank === 1 ? 'text-amber-400' : team.rank === 2 ? 'text-slate-300' : team.rank === 3 ? 'text-amber-700' : 'text-slate-500'}`}>
              {team.rank}
            </span>

            {/* 팀명 */}
            <div className="flex items-center gap-2 min-w-0">
              <TeamAvatar shortCode={team.shortCode} color={team.color} size="sm" />
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-white truncate">{team.name}</p>
                <p className="text-[10px] text-slate-500">
                  {team.missionsCompleted}/{team.totalMissions} · {team.memberCount}명
                </p>
              </div>
            </div>

            {/* 점수 */}
            <div>
              <span className="font-bebas text-[15px] text-white">{team.score.toLocaleString()}</span>
              {/* 미니 바 */}
              <div className="h-1 bg-white/8 rounded-full overflow-hidden mt-0.5">
                <div className="h-full rounded-full bg-red-500 transition-all duration-700"
                     style={{ width: `${(team.score / maxScore) * 100}%` }} />
              </div>
            </div>

            {/* 진행률 */}
            <div className="text-[11px] text-slate-400 text-center">
              {Math.round((team.missionsCompleted / team.totalMissions) * 100)}%
            </div>

            {/* 상태 */}
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border text-center ${sc.cls}`}>
              {sc.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// 탭: 미션 ON/OFF 제어
// ─────────────────────────────────────────────────────────────────
const Toggle: React.FC<{ on: boolean; onChange: (v: boolean) => void }> = ({ on, onChange }) => (
  <button onClick={() => onChange(!on)}
          className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0
            ${on ? 'bg-green-500' : 'bg-[#212C42] border border-white/10'}`}>
    <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all shadow
      ${on ? 'left-[22px]' : 'left-0.5'}`} />
  </button>
);

const MissionsTab: React.FC = () => {
  const { missions, unlockMission } = useAppStore();
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});

  const getOn = (m: Mission) =>
    overrides[m.id] !== undefined ? overrides[m.id] : m.status !== 'locked';

  const typeIcon: Record<string, string> = {
    gps:'📍', ar:'📷', quiz:'🎯', challenge:'🎯',
  };

  const warnMissions = missions.filter(
    (m) => m.status === 'active' || m.status === 'in_progress'
  );

  return (
    <div className="px-4 pb-28 pt-2 space-y-3">
      {warnMissions.length > 0 && (
        <div className="bg-amber-500/8 border border-amber-500/25 rounded-xl px-4 py-3">
          <p className="text-[11px] font-bold text-amber-400">⚠️ 현재 진행중 미션 — 토글 OFF 시 즉시 중단됩니다</p>
        </div>
      )}

      {missions.map((m) => {
        const isOn = getOn(m);
        const isProb = m.status === 'warning' as any;
        return (
          <div key={m.id}
               className={`bg-[#141C2E] border rounded-2xl p-4 flex items-center gap-3
                 ${m.status === 'active' ? 'border-red-500/30' :
                   m.status === 'locked' ? 'border-white/6 opacity-70' :
                   'border-white/8'}`}>
            {/* 아이콘 */}
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0
              ${m.status === 'completed'   ? 'bg-green-500/15' :
                m.status === 'active'      ? 'bg-red-500/15'   :
                m.status === 'locked'      ? 'bg-white/5'      : 'bg-amber-500/12'}`}>
              {m.status === 'completed' ? '✅' : typeIcon[m.type]}
            </div>

            {/* 정보 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-bold text-white">{m.postId} · {m.name}</span>
                <span className="text-[10px] font-bold text-amber-400">+{m.points}pt</span>
              </div>
              <p className="text-[11px] text-slate-500">{m.locationLabel}</p>
              {isProb && (
                <p className="text-[10px] text-red-400 font-bold mt-0.5">⚠️ QR 훼손 신고됨</p>
              )}
            </div>

            {/* 수동 잠금 해제 버튼 (locked 상태) */}
            {m.status === 'locked' && (
              <button onClick={() => unlockMission(m.id)}
                      className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg
                                 bg-amber-500/12 text-amber-400 border border-amber-500/25 flex-shrink-0">
                🔓 해제
              </button>
            )}

            {/* 토글 */}
            <Toggle on={isOn}
                    onChange={(v) => setOverrides((prev) => ({ ...prev, [m.id]: v }))} />
          </div>
        );
      })}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// 탭: 공지 발송
// ─────────────────────────────────────────────────────────────────
const NoticeTab: React.FC = () => {
  const { teams, notices, addNotice } = useAppStore();
  const [msg,    setMsg]    = useState('');
  const [target, setTarget] = useState<'all' | string>('all');
  const [sending, setSending] = useState(false);
  const [sent,    setSent]    = useState(false);

  const MAX = 200;

  const handleSend = () => {
    if (!msg.trim() || sending) return;
    setSending(true);
    setTimeout(() => {
      addNotice({
        id:     `n-${Date.now()}`,
        message: msg.trim(),
        target,
        sentAt:  new Date(),
        sentBy:  '운영본부',
      });
      setMsg('');
      setSending(false);
      setSent(true);
      setTimeout(() => setSent(false), 2500);
    }, 700);
  };

  const QUICK = [
    '잠시 후 전체 집결 미션이 시작됩니다. 준비해주세요! 💪',
    '현재 포스트 위치가 일부 변경되었습니다. 지도를 다시 확인해주세요.',
    '안전을 위해 뛰지 말고 걸어서 이동해주세요. 🚶',
    '수분 보충 시간입니다. 잠시 휴식을 취해주세요. 💧',
  ];

  return (
    <div className="px-4 pb-28 pt-2 space-y-4">

      {/* 발송 대상 */}
      <div>
        <p className="text-[11px] font-bold text-slate-400 tracking-widest uppercase mb-2">발송 대상</p>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setTarget('all')}
                  className={`text-[12px] font-bold px-3 py-1.5 rounded-lg border transition-all
                    ${target === 'all' ? 'bg-red-500/15 border-red-500/40 text-red-400' : 'bg-[#141C2E] border-white/8 text-slate-400'}`}>
            📢 전체 공지
          </button>
          {teams.slice(0, 6).map((t) => (
            <button key={t.id} onClick={() => setTarget(t.id)}
                    className={`text-[12px] font-bold px-3 py-1.5 rounded-lg border transition-all
                      ${target === t.id ? 'bg-red-500/15 border-red-500/40 text-red-400' : 'bg-[#141C2E] border-white/8 text-slate-400'}`}>
              {t.shortCode}
            </button>
          ))}
        </div>
      </div>

      {/* 빠른 메시지 */}
      <div>
        <p className="text-[11px] font-bold text-slate-400 tracking-widest uppercase mb-2">빠른 메시지</p>
        <div className="space-y-2">
          {QUICK.map((q) => (
            <button key={q} onClick={() => setMsg(q)}
                    className="w-full text-left px-3 py-2.5 bg-[#141C2E] border border-white/8
                               rounded-xl text-[12px] text-slate-300 hover:border-white/20 transition-all">
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* 직접 입력 */}
      <div>
        <p className="text-[11px] font-bold text-slate-400 tracking-widest uppercase mb-2">직접 입력</p>
        <textarea
          value={msg}
          onChange={(e) => setMsg(e.target.value.slice(0, MAX))}
          rows={3}
          placeholder="참가자에게 전달할 공지 내용을 입력하세요..."
          className="w-full bg-[#141C2E] border border-white/10 rounded-xl px-4 py-3
                     text-[13px] text-white placeholder-slate-600 resize-none outline-none
                     focus:border-red-500/40 transition-colors"
        />
        <div className="flex justify-between items-center mt-1.5">
          <span className="text-[10px] text-slate-600">{msg.length} / {MAX}자</span>
          <button onClick={handleSend} disabled={!msg.trim() || sending}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-[13px]
                    relative overflow-hidden transition-all
                    ${msg.trim() && !sending
                      ? 'bg-red-600 text-white'
                      : 'bg-[#212C42] text-slate-500 cursor-not-allowed'}`}>
            {sending ? (
              <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />전송 중</>
            ) : sent ? (
              <>✅ 발송 완료</>
            ) : (
              <>📢 즉시 발송</>
            )}
            {msg.trim() && !sending && !sent && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[shimmer_2s_infinite]" />
            )}
          </button>
        </div>
      </div>

      {/* 발송 내역 */}
      {notices.length > 0 && (
        <div>
          <p className="text-[11px] font-bold text-slate-400 tracking-widest uppercase mb-2">최근 발송 내역</p>
          <div className="space-y-2">
            {[...notices].reverse().slice(0, 5).map((n) => {
              const min = Math.floor((Date.now() - n.sentAt.getTime()) / 60000);
              return (
                <div key={n.id} className="bg-[#141C2E] border border-white/8 rounded-xl px-3 py-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-red-400">
                      {n.target === 'all' ? '전체' : teams.find((t) => t.id === n.target)?.name ?? n.target}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {min === 0 ? '방금 전' : `${min}분 전`}
                    </span>
                  </div>
                  <p className="text-[12px] text-white leading-snug">{n.message}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// 탭: 세션 설정
// ─────────────────────────────────────────────────────────────────
const SettingsTab: React.FC = () => {
  const session = useAppStore((s) => s.session);
  const [demoMode,   setDemoMode]   = useState(true);
  const [autoUnlock, setAutoUnlock] = useState(true);
  const [sosAlert,   setSosAlert]   = useState(true);

  return (
    <div className="px-4 pb-28 pt-2 space-y-4">

      {/* 세션 정보 */}
      <div className="bg-[#141C2E] border border-white/8 rounded-2xl p-4 space-y-2">
        <p className="text-[11px] font-bold text-slate-400 tracking-widest uppercase mb-3">세션 정보</p>
        {[
          { label: '세션명',   value: session?.name  ?? '—' },
          { label: '장소',     value: session?.venue ?? '—' },
          { label: '시작',     value: session?.startedAt.toLocaleTimeString('ko-KR', { hour:'2-digit', minute:'2-digit' }) ?? '—' },
          { label: '종료',     value: session?.endsAt.toLocaleTimeString('ko-KR',   { hour:'2-digit', minute:'2-digit' }) ?? '—' },
        ].map(({ label, value }) => (
          <div key={label} className="flex justify-between items-center py-1.5 border-b border-white/6 last:border-0">
            <span className="text-[12px] text-slate-500">{label}</span>
            <span className="text-[13px] font-bold text-white">{value}</span>
          </div>
        ))}
      </div>

      {/* 운영 옵션 */}
      <div className="bg-[#141C2E] border border-white/8 rounded-2xl p-4 space-y-1">
        <p className="text-[11px] font-bold text-slate-400 tracking-widest uppercase mb-3">운영 옵션</p>
        {[
          { label: '데모 모드', sub: 'AR 자동 감지 활성화', val: demoMode,   set: setDemoMode   },
          { label: '자동 잠금 해제', sub: '선행 미션 완료 시 자동 해제', val: autoUnlock, set: setAutoUnlock },
          { label: 'SOS 진동 알림', sub: '신고 접수 시 기기 진동', val: sosAlert,   set: setSosAlert   },
        ].map(({ label, sub, val, set }) => (
          <div key={label} className="flex items-center justify-between py-2.5 border-b border-white/6 last:border-0">
            <div>
              <p className="text-[13px] font-bold text-white">{label}</p>
              <p className="text-[11px] text-slate-500">{sub}</p>
            </div>
            <Toggle on={val} onChange={set} />
          </div>
        ))}
      </div>

      {/* 위험 구역 */}
      <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-4 space-y-2">
        <p className="text-[11px] font-bold text-red-400 tracking-widest uppercase mb-3">위험 구역</p>
        <button className="w-full py-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 font-bold text-[13px]">
          ⏸ 세션 일시 정지
        </button>
        <button className="w-full py-3 rounded-xl bg-red-500/8 border border-red-500/20 text-red-500/70 font-bold text-[13px]">
          ⏹ 세션 강제 종료
        </button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// AdminScreen 메인
// ─────────────────────────────────────────────────────────────────
const AdminScreen: React.FC = () => {
  const [tab, setTab] = useState<TabKey>('alert');
  const pendingCount = useAppStore((s) => s.alerts.filter((a) => a.status === 'pending').length);

  const TABS: { key: TabKey; label: string; icon: string }[] = [
    { key: 'alert',    label: '긴급 대응', icon: '🆘'  },
    { key: 'teams',    label: '팀 현황',   icon: '👥'  },
    { key: 'missions', label: '미션 제어', icon: '🎯'  },
    { key: 'notice',   label: '공지',      icon: '📢'  },
    { key: 'settings', label: '설정',      icon: '⚙️'  },
  ];

  return (
    <div className="max-w-[900px] mx-auto bg-[#0D1117] min-h-screen flex flex-col">
      <AdminHeader />
      <SummaryRow />

      {/* 탭 바 */}
      <div className="flex bg-[#0F1623] border-b border-white/10 flex-shrink-0 overflow-x-auto">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-[12px] font-bold
                              border-b-2 transition-all whitespace-nowrap flex-shrink-0 relative
                    ${tab === t.key ? 'text-red-400 border-red-500' : 'text-slate-500 border-transparent'}`}>
            <span>{t.icon}</span>
            <span>{t.label}</span>
            {t.key === 'alert' && pendingCount > 0 && (
              <span className="ml-1 text-[10px] font-bold bg-red-600 text-white
                               w-4 h-4 rounded-full flex items-center justify-center">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 콘텐츠 */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'alert'    && <AlertTab />}
        {tab === 'teams'    && <TeamsTab />}
        {tab === 'missions' && <MissionsTab />}
        {tab === 'notice'   && <NoticeTab />}
        {tab === 'settings' && <SettingsTab />}
      </div>

      <style>{`
        @keyframes shimmer {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(200%);  }
        }
      `}</style>
    </div>
  );
};

export default AdminScreen;
