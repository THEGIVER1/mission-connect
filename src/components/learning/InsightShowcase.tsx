import React, { useMemo, useState } from 'react';
import {
  LearningSubject,
  SubjectData,
  SHOWCASE_STAMPS,
  StampKey,
  countStampsForTeam,
  isCanvasSubmitted,
  canvasProgress,
  newId,
} from '../../config/learningConfig';
import { WORKSHOP_TEAMS } from '../../config/workshopConfig';
import { learningPatch, learningPut } from './learningDb';
import { InsightCard, PhotoZoomOverlay, TeamChip, getTeamCfg } from './LearningShared';

const MAX_COMMENT = 60;

export const InsightShowcase: React.FC<{
  subject: LearningSubject;
  data: SubjectData;
  me: { pid: string; name: string; teamId: string };
  stampPoints: number;
  onGoCanvas: () => void;
  onRefresh: () => void;
}> = ({ subject, data, me, stampPoints, onGoCanvas, onRefresh }) => {
  const [view, setView] = useState<'gallery' | 'ranking'>('gallery');
  const [zoomUrl, setZoomUrl] = useState<string | null>(null);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});

  const myCanvas = data.canvas[me.teamId];
  const mySubmitted = isCanvasSubmitted(myCanvas);
  const myVote = data.votes[me.teamId] || {};
  const submittedTeams = WORKSHOP_TEAMS.filter(t => isCanvasSubmitted(data.canvas[t.id]));
  const pendingTeams = WORKSHOP_TEAMS.filter(t => !isCanvasSubmitted(data.canvas[t.id]));

  const stampsByTeam = useMemo(() => {
    const m: Record<string, ReturnType<typeof countStampsForTeam>> = {};
    WORKSHOP_TEAMS.forEach(t => (m[t.id] = countStampsForTeam(data.votes, t.id)));
    return m;
  }, [data.votes]);

  const ranking = useMemo(
    () =>
      [...submittedTeams].sort(
        (a, b) =>
          stampsByTeam[b.id].total - stampsByTeam[a.id].total ||
          stampsByTeam[b.id].insight - stampsByTeam[a.id].insight ||
          a.id.localeCompare(b.id)
      ),
    [submittedTeams, stampsByTeam]
  );

  const castStamp = async (stamp: StampKey, targetTeamId: string) => {
    if (targetTeamId === me.teamId) return;
    const already = myVote[stamp] === targetTeamId;
    await learningPatch(`${subject.id}/votes/${me.teamId}`, {
      [stamp]: already ? null : targetTeamId,
      votedBy: me.name,
      updatedAt: new Date().toISOString(),
    });
    onRefresh();
  };

  const sendComment = async (targetTeamId: string) => {
    const text = (commentDrafts[targetTeamId] || '').trim();
    if (!text) return;
    const id = newId('c');
    await learningPut(`${subject.id}/comments/${targetTeamId}/${id}`, {
      id,
      text: text.slice(0, MAX_COMMENT),
      authorName: me.name,
      authorTeamId: me.teamId,
      createdAt: new Date().toISOString(),
    });
    setCommentDrafts(d => ({ ...d, [targetTeamId]: '' }));
    setOpenComments(o => ({ ...o, [targetTeamId]: true }));
    onRefresh();
  };

  // ── 잠금 화면 (우리 조 미제출) ─────────────────────────
  if (!mySubmitted) {
    const prog = canvasProgress(myCanvas);
    return (
      <div className="space-y-4">
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#1E1633] to-[#111827] p-6 text-center shadow-xl">
          <p className="text-[44px] leading-none">🔒</p>
          <p className="text-[18px] font-black text-white mt-3">우리 조 카드를 제출하면 쇼케이스가 열려요!</p>
          <p className="text-[13px] text-slate-400 mt-1.5" style={{ wordBreak: 'keep-all' }}>
            먼저 토의 캔버스 3단계를 완성하고 제출하면, 다른 조의 인사이트 카드를 둘러보고 공감 스탬프를 보낼 수 있어요.
          </p>
          <div className="mt-4 mx-auto max-w-[240px]">
            <div className="flex justify-between text-[12px] font-bold text-slate-300 mb-1">
              <span>우리 조 진행</span>
              <span>{prog}/3 단계</span>
            </div>
            <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all" style={{ width: `${(prog / 3) * 100}%` }} />
            </div>
          </div>
          <button
            type="button"
            onClick={onGoCanvas}
            className="mt-5 w-full py-3 rounded-xl bg-gradient-to-r from-sky-400 to-blue-500 text-slate-950 font-black text-[15px] shadow-lg"
          >
            🧩 토의 캔버스 이어서 작성하기 →
          </button>
        </div>
        <div className="rounded-2xl bg-[#151C2C] border border-white/10 p-3.5">
          <p className="text-[13px] font-black text-white mb-2">📡 지금 제출 현황 {submittedTeams.length}/{WORKSHOP_TEAMS.length}조</p>
          <div className="grid grid-cols-3 gap-1.5">
            {WORKSHOP_TEAMS.map(t => {
              const done = isCanvasSubmitted(data.canvas[t.id]);
              return (
                <div
                  key={t.id}
                  className={`rounded-xl py-2 text-center border text-[12.5px] font-black ${
                    done ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-200' : 'border-white/10 bg-black/20 text-slate-500'
                  }`}
                >
                  {t.name} {done ? '✓' : '…'}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  const stampSlot = (key: StampKey) => {
    const s = SHOWCASE_STAMPS.find(x => x.key === key)!;
    const target = myVote[key];
    const isInsight = key === 'insight';
    return (
      <div
        className={`flex-1 rounded-2xl p-2.5 border ${
          target
            ? isInsight
              ? 'bg-amber-500/20 border-amber-400/60'
              : 'bg-sky-500/20 border-sky-400/60'
            : 'bg-black/25 border-dashed border-white/20'
        }`}
      >
        <p className={`text-[11px] font-black ${isInsight ? 'text-amber-200' : 'text-sky-200'}`}>
          {s.icon} {s.short} 스탬프
        </p>
        <p className="text-[14px] font-black text-white mt-0.5">
          {target ? <>→ {getTeamCfg(target).name}에게 전달!</> : <span className="text-slate-400 font-bold text-[12.5px]">아직 미사용</span>}
        </p>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* 상단 안내 & 우리 조 스탬프 현황 */}
      <div className="rounded-3xl border border-fuchsia-400/35 bg-gradient-to-br from-[#2A1238] via-[#1A1530] to-[#111827] p-4 shadow-xl">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-fuchsia-400 text-slate-950">INSIGHT SHOWCASE</span>
          <span className="text-[11.5px] font-bold text-fuchsia-100/80">
            제출 {submittedTeams.length}/{WORKSHOP_TEAMS.length}조
          </span>
        </div>
        <p className="text-[17px] font-black text-white mt-2 leading-snug">
          다른 조 카드를 둘러보고 우리 조의 공감 스탬프 2개를 보내주세요!
        </p>
        <p className="text-[12px] text-slate-300 mt-1">
          스탬프 1개당 받은 조에 <b className="text-amber-300">+{stampPoints}pt</b> · 조당 💡 1개 + 🚀 1개 · 언제든 변경 가능
        </p>
        <div className="flex gap-2 mt-3">
          {stampSlot('insight')}
          {stampSlot('action')}
        </div>
      </div>

      {/* 보기 전환 */}
      <div className="flex items-center gap-1.5 bg-[#151C2C] p-1 rounded-2xl border border-white/10">
        {[
          { k: 'gallery' as const, l: '🖼️ 카드 갤러리' },
          { k: 'ranking' as const, l: '📊 실시간 공감 랭킹' },
        ].map(t => (
          <button
            key={t.k}
            type="button"
            onClick={() => setView(t.k)}
            className={`flex-1 py-2 rounded-xl text-[13px] font-black transition-all ${view === t.k ? 'bg-white text-slate-950 shadow' : 'text-slate-400'}`}
          >
            {t.l}
          </button>
        ))}
      </div>

      {view === 'ranking' ? (
        <div className="space-y-2">
          {ranking.map((t, idx) => {
            const st = stampsByTeam[t.id];
            const maxTotal = Math.max(1, ...ranking.map(r => stampsByTeam[r.id].total));
            return (
              <div
                key={t.id}
                className={`rounded-2xl p-3 border ${t.id === me.teamId ? 'border-amber-400/60 bg-amber-500/10' : 'border-white/10 bg-[#151C2C]'}`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-8 text-center text-[20px] font-black">
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : <span className="text-slate-400 text-[15px]">{idx + 1}</span>}
                  </span>
                  <TeamChip teamId={t.id} size="md" />
                  {t.id === me.teamId && <span className="text-[11px] font-black text-amber-300">우리 조</span>}
                  <span className="ml-auto text-[13px] font-black text-amber-200">💡 {st.insight}</span>
                  <span className="text-[13px] font-black text-sky-200">🚀 {st.action}</span>
                </div>
                <div className="h-2 rounded-full bg-white/10 overflow-hidden mt-2 flex">
                  <div className="h-full bg-amber-400" style={{ width: `${(st.insight / maxTotal) * 100}%` }} />
                  <div className="h-full bg-sky-400" style={{ width: `${(st.action / maxTotal) * 100}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-5">
          {/* 우리 조 카드 먼저, 이후 다른 조 */}
          {[...submittedTeams].sort((a, b) => (a.id === me.teamId ? -1 : b.id === me.teamId ? 1 : 0)).map(t => {
            const isMine = t.id === me.teamId;
            const st = stampsByTeam[t.id];
            const comments = data.comments[t.id] || [];
            const showAll = !!openComments[t.id];
            const visibleComments = showAll ? comments : comments.slice(-2);
            return (
              <div key={t.id}>
                {isMine && <p className="text-[12.5px] font-black text-amber-300 mb-1.5 px-1">⭐ 우리 조 카드</p>}
                <InsightCard
                  subject={subject}
                  teamId={t.id}
                  canvas={data.canvas[t.id]}
                  stamps={{ insight: st.insight, action: st.action }}
                  commentCount={comments.length}
                  highlightMine={isMine}
                  onPhotoClick={setZoomUrl}
                  footer={
                    <div className="mt-2.5 space-y-2.5">
                      {!isMine && (
                        <div className="grid grid-cols-2 gap-2">
                          {SHOWCASE_STAMPS.map(s => {
                            const on = myVote[s.key] === t.id;
                            const isInsight = s.key === 'insight';
                            return (
                              <button
                                key={s.key}
                                type="button"
                                onClick={() => castStamp(s.key, t.id)}
                                className={`py-2.5 rounded-xl text-[12.5px] font-black border transition-all active:scale-95 ${
                                  on
                                    ? isInsight
                                      ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-lg shadow-amber-500/30'
                                      : 'bg-sky-400 text-slate-950 border-sky-300 shadow-lg shadow-sky-500/30'
                                    : isInsight
                                    ? 'bg-amber-500/10 text-amber-200 border-amber-400/40'
                                    : 'bg-sky-500/10 text-sky-200 border-sky-400/40'
                                }`}
                              >
                                {on ? `✓ ${s.icon} ${s.short} 보냄` : `${s.icon} ${s.short} 스탬프`}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* 응원 코멘트 */}
                      {comments.length > 0 && (
                        <div className="space-y-1">
                          {visibleComments.map(c => (
                            <div key={c.id} className="flex items-start gap-1.5 text-[12.5px]">
                              <TeamChip teamId={c.authorTeamId} size="xs" />
                              <span className="font-bold text-slate-300 shrink-0">{c.authorName}</span>
                              <span className="text-white" style={{ wordBreak: 'keep-all' }}>
                                {c.text}
                              </span>
                            </div>
                          ))}
                          {comments.length > 2 && (
                            <button
                              type="button"
                              onClick={() => setOpenComments(o => ({ ...o, [t.id]: !showAll }))}
                              className="text-[11.5px] text-slate-400 underline"
                            >
                              {showAll ? '접기' : `응원 ${comments.length}개 모두 보기`}
                            </button>
                          )}
                        </div>
                      )}
                      {!isMine && (
                        <div className="flex gap-1.5">
                          <input
                            value={commentDrafts[t.id] || ''}
                            onChange={e => setCommentDrafts(d => ({ ...d, [t.id]: e.target.value.slice(0, MAX_COMMENT) }))}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                sendComment(t.id);
                              }
                            }}
                            placeholder={`${t.name}에게 한 줄 응원 💬`}
                            className="flex-1 min-w-0 bg-[#0D1220] border border-white/15 rounded-xl px-3 py-2 text-[13px] text-white placeholder-slate-500 focus:outline-none focus:border-fuchsia-400"
                          />
                          <button
                            type="button"
                            disabled={!(commentDrafts[t.id] || '').trim()}
                            onClick={() => sendComment(t.id)}
                            className="px-3 rounded-xl bg-fuchsia-500 text-white text-[13px] font-black disabled:opacity-35"
                          >
                            전송
                          </button>
                        </div>
                      )}
                    </div>
                  }
                />
              </div>
            );
          })}

          {pendingTeams.length > 0 && (
            <div className="rounded-2xl border-2 border-dashed border-white/10 p-3">
              <p className="text-[12.5px] font-black text-slate-400 mb-2">✍️ 아직 토의 중인 조</p>
              <div className="flex flex-wrap gap-1.5">
                {pendingTeams.map(t => (
                  <span key={t.id} className="text-[12px] font-bold px-2.5 py-1 rounded-full bg-white/5 text-slate-300 border border-white/10">
                    {t.name} · {canvasProgress(data.canvas[t.id])}/3단계
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      <PhotoZoomOverlay url={zoomUrl} onClose={() => setZoomUrl(null)} />
    </div>
  );
};
