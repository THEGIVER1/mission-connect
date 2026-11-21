import React, { useEffect, useMemo, useState } from 'react';
import { WORKSHOP_TEAMS } from '../../config/workshopConfig';
import { useEventConfig } from '../../hooks/useEventConfig';
import {
  LearningSubject,
  parseSubjectData,
  getTopWallPosts,
  sortWallByLikes,
  getLikeCount,
  countStampsForTeam,
  isCanvasSubmitted,
  canvasProgress,
  normalizeCanvas,
  getFrameworkMeta,
} from '../../config/learningConfig';
import { useAllLearningData, learningPatch, learningPut } from '../learning/learningDb';
import { exportLearningCsv } from '../learning/learningExport';
import { InsightCard, PostitNote, TeamChip, PhotoZoomOverlay, getTeamCfg } from '../learning/LearningShared';

type StageView = 'wall' | 'showcase' | 'ranking';

export const LearningAdminPanel: React.FC<{ onGoSettings: () => void }> = ({ onGoSettings }) => {
  const eventConfig = useEventConfig();
  const { raw, refresh } = useAllLearningData();
  const subjects = eventConfig.learningSubjects;
  const [selectedId, setSelectedId] = useState<string>(eventConfig.activeLearningSubjectId);
  const [section, setSection] = useState<'wall' | 'canvas'>('canvas');
  const [stage, setStage] = useState<StageView | null>(null);
  const [stageFocusTeam, setStageFocusTeam] = useState<string | null>(null);
  const [zoomUrl, setZoomUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!subjects.some(s => s.id === selectedId)) setSelectedId(eventConfig.activeLearningSubjectId);
  }, [subjects, selectedId, eventConfig.activeLearningSubjectId]);

  const subject: LearningSubject | undefined = subjects.find(s => s.id === selectedId) || subjects[0];
  const data = useMemo(() => parseSubjectData(raw?.[subject?.id || ''] || {}), [raw, subject?.id]);

  const stats = useMemo(() => {
    const likes = data.wall.reduce((s, p) => s + getLikeCount(p), 0);
    const posters = new Set(data.wall.map(p => p.authorPid)).size;
    const submitted = WORKSHOP_TEAMS.filter(t => isCanvasSubmitted(data.canvas[t.id])).length;
    const stampsCast = Object.values(data.votes).reduce((s, v) => s + (v?.insight ? 1 : 0) + (v?.action ? 1 : 0), 0);
    const comments = Object.values(data.comments).reduce((s, l) => s + l.length, 0);
    return { likes, posters, submitted, stampsCast, comments };
  }, [data]);

  const ranking = useMemo(
    () =>
      WORKSHOP_TEAMS.map(t => ({ t, st: countStampsForTeam(data.votes, t.id), submitted: isCanvasSubmitted(data.canvas[t.id]) }))
        .filter(r => r.submitted)
        .sort((a, b) => b.st.total - a.st.total || b.st.insight - a.st.insight),
    [data]
  );

  // 무대 모드 ESC 종료
  useEffect(() => {
    if (!stage) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (stageFocusTeam) setStageFocusTeam(null);
        else setStage(null);
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [stage, stageFocusTeam]);

  if (!subject) return null;
  const isActiveSubject = subject.id === eventConfig.activeLearningSubjectId;
  const fw = getFrameworkMeta(subject.framework);
  const top3 = getTopWallPosts(data.wall, 3);

  const handleDeletePost = async (id: string) => {
    if (!window.confirm('이 포스트잇을 삭제할까요? (부적절한 게시물 관리용)')) return;
    await learningPut(`${subject.id}/wall/${id}`, null);
    refresh();
  };

  const handleUnsubmit = async (teamId: string) => {
    if (!window.confirm(`${getTeamCfg(teamId).name}의 제출을 취소하고 작성 중 상태로 되돌릴까요?\n(작성 내용은 유지됩니다)`)) return;
    await learningPatch(`${subject.id}/canvas/${teamId}`, { status: 'draft' });
    refresh();
  };

  const handleClearSubject = async () => {
    if (!window.confirm(`⚠️ [${subject.title}] 과목의 포스트잇·토의 캔버스·스탬프·코멘트가 모두 삭제됩니다.\n먼저 엑셀을 내려받으셨나요?`)) return;
    if (window.prompt('확정하려면 "삭제"라고 입력하세요.') !== '삭제') return;
    await learningPut(subject.id, null);
    refresh();
  };

  const deleteComment = async (teamId: string, cid: string) => {
    if (!window.confirm('이 코멘트를 삭제할까요?')) return;
    await learningPut(`${subject.id}/comments/${teamId}/${cid}`, null);
    refresh();
  };

  // ───────────── 📽️ 빔프로젝터 무대 모드 ─────────────
  if (stage) {
    const focusCanvas = stageFocusTeam ? data.canvas[stageFocusTeam] : null;
    return (
      <div className="fixed inset-0 z-[9999] bg-gradient-to-br from-[#070A12] via-[#0C1120] to-[#120A1F] text-white flex flex-col font-['Noto_Sans_KR'] p-6 md:p-8 overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/10 pb-4 gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="font-['Bebas_Neue'] text-3xl tracking-[0.2em]">
              LEARNING <span className="text-amber-400">LAB</span>
            </span>
            <span className="h-7 w-px bg-white/20" />
            <span className="text-xl font-black truncate">{subject.title}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {(
              [
                { k: 'wall', l: '💬 포스트잇 월' },
                { k: 'showcase', l: '🏆 인사이트 쇼케이스' },
                { k: 'ranking', l: '📊 공감 랭킹' },
              ] as { k: StageView; l: string }[]
            ).map(b => (
              <button
                key={b.k}
                onClick={() => {
                  setStage(b.k);
                  setStageFocusTeam(null);
                }}
                className={`px-4 py-2 rounded-xl text-sm font-black border transition-all ${
                  stage === b.k ? 'bg-white text-slate-950 border-white' : 'bg-white/5 text-slate-300 border-white/15'
                }`}
              >
                {b.l}
              </button>
            ))}
            <button onClick={() => setStage(null)} className="px-4 py-2 rounded-xl bg-white/10 text-slate-300 text-sm font-bold">
              ✕ 종료 (ESC)
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pt-6">
          {stage === 'wall' && (
            <div className="space-y-7">
              <div className="flex items-end justify-between gap-6">
                <p className="text-[34px] font-black leading-tight" style={{ wordBreak: 'keep-all' }}>
                  Q. {subject.wallQuestion}
                </p>
                <div className="flex gap-3 shrink-0">
                  {[
                    ['참여', `${stats.posters}명`],
                    ['포스트잇', `${data.wall.length}장`],
                    ['공감', `🔥${stats.likes}`],
                  ].map(([l, v]) => (
                    <div key={l} className="bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-center">
                      <p className="text-3xl font-black text-amber-300">{v}</p>
                      <p className="text-sm text-slate-400 font-bold">{l}</p>
                    </div>
                  ))}
                </div>
              </div>
              {top3.length > 0 && (
                <div>
                  <p className="text-xl font-black text-rose-200 mb-4">👑 전체 교육생 베스트 공감 TOP 3</p>
                  <div className="grid grid-cols-3 gap-6">
                    {top3.map((p, i) => (
                      <PostitNote key={p.id} post={p} rank={i + 1} big />
                    ))}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-4 xl:grid-cols-5 gap-5 pb-8">
                {sortWallByLikes(data.wall)
                  .filter(p => !top3.some(t => t.id === p.id))
                  .map((p, i) => (
                    <PostitNote key={p.id} post={p} tilt={((i % 5) - 2) * 0.7} />
                  ))}
              </div>
            </div>
          )}

          {stage === 'showcase' && !stageFocusTeam && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <p className="text-[28px] font-black" style={{ wordBreak: 'keep-all' }}>
                  🧩 {subject.canvasTopic}
                </p>
                <span className="text-lg font-black text-emerald-300 shrink-0">
                  제출 {stats.submitted}/{WORKSHOP_TEAMS.length}조 · 카드를 클릭하면 크게 보기
                </span>
              </div>
              <div className="grid grid-cols-2 xl:grid-cols-3 gap-6 pb-8">
                {WORKSHOP_TEAMS.map(t => {
                  const c = data.canvas[t.id];
                  if (!isCanvasSubmitted(c)) {
                    return (
                      <div key={t.id} className="rounded-3xl border-2 border-dashed border-white/15 flex flex-col items-center justify-center min-h-[300px] gap-2">
                        <TeamChip teamId={t.id} size="md" />
                        <p className="text-xl font-black text-slate-400">✍️ 토의 중… {canvasProgress(c)}/3단계</p>
                      </div>
                    );
                  }
                  const st = countStampsForTeam(data.votes, t.id);
                  return (
                    <InsightCard
                      key={t.id}
                      subject={subject}
                      teamId={t.id}
                      canvas={c}
                      stamps={{ insight: st.insight, action: st.action }}
                      commentCount={(data.comments[t.id] || []).length}
                      onClick={() => setStageFocusTeam(t.id)}
                      onPhotoClick={setZoomUrl}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {stage === 'showcase' && stageFocusTeam && focusCanvas && (
            <div className="max-w-5xl mx-auto grid grid-cols-5 gap-6 pb-8">
              <div className="col-span-3">
                <InsightCard
                  subject={subject}
                  teamId={stageFocusTeam}
                  canvas={focusCanvas}
                  stamps={(() => {
                    const st = countStampsForTeam(data.votes, stageFocusTeam);
                    return { insight: st.insight, action: st.action };
                  })()}
                  size="lg"
                  onPhotoClick={setZoomUrl}
                />
              </div>
              <div className="col-span-2 space-y-4">
                <button onClick={() => setStageFocusTeam(null)} className="w-full py-3 rounded-2xl bg-white/10 font-black text-lg">
                  ← 전체 카드로 돌아가기
                </button>
                <div className="rounded-3xl bg-white/5 border border-white/10 p-5">
                  <p className="text-xl font-black mb-3">💬 동료들의 응원 코멘트</p>
                  <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                    {(data.comments[stageFocusTeam] || []).length === 0 && <p className="text-slate-500 text-lg">아직 코멘트가 없습니다.</p>}
                    {(data.comments[stageFocusTeam] || []).map(c => (
                      <div key={c.id} className="bg-black/30 rounded-2xl p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <TeamChip teamId={c.authorTeamId} size="sm" />
                          <span className="text-base font-bold text-slate-300">{c.authorName}</span>
                        </div>
                        <p className="text-xl font-bold" style={{ wordBreak: 'keep-all' }}>
                          {c.text}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {stage === 'ranking' && (
            <div className="max-w-5xl mx-auto space-y-4">
              <p className="text-[30px] font-black text-center mb-6">📊 인사이트 쇼케이스 실시간 공감 랭킹</p>
              {ranking.length === 0 && <p className="text-center text-2xl text-slate-500">아직 제출된 카드가 없습니다.</p>}
              {ranking.map((r, idx) => {
                const max = Math.max(1, ...ranking.map(x => x.st.total));
                return (
                  <div
                    key={r.t.id}
                    className={`rounded-3xl p-5 border flex items-center gap-5 ${
                      idx === 0 ? 'bg-amber-500/15 border-amber-400/60' : 'bg-white/5 border-white/10'
                    }`}
                  >
                    <span className="w-14 text-center text-4xl font-black">
                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                    </span>
                    <span
                      className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black"
                      style={{ background: r.t.color }}
                    >
                      {r.t.shortCode}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-2xl font-black">{r.t.name}</span>
                        <span className="text-xl font-black">
                          <span className="text-amber-300">💡 {r.st.insight}</span>
                          <span className="text-sky-300 ml-4">🚀 {r.st.action}</span>
                        </span>
                      </div>
                      <div className="h-4 rounded-full bg-white/10 overflow-hidden flex">
                        <div className="h-full bg-amber-400 transition-all duration-700" style={{ width: `${(r.st.insight / max) * 100}%` }} />
                        <div className="h-full bg-sky-400 transition-all duration-700" style={{ width: `${(r.st.action / max) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <PhotoZoomOverlay url={zoomUrl} onClose={() => setZoomUrl(null)} />
      </div>
    );
  }

  // ───────────── 일반 관리자 뷰 ─────────────
  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="bg-gradient-to-br from-[#1E1A33] via-[#171C30] to-[#111827] border border-fuchsia-500/35 rounded-2xl p-4 space-y-3 shadow-xl">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-400/40">
                LEARNING LAB
              </span>
              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                  eventConfig.learningDisplay === 'off'
                    ? 'bg-rose-500/15 text-rose-300 border-rose-400/40'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                }`}
              >
                {eventConfig.learningDisplay === 'off'
                  ? '⏸️ 참가자 화면 비노출'
                  : eventConfig.learningDisplay === 'learning-only'
                  ? '📚 학습 전용 모드'
                  : '🤝 팀빌딩 + 학습 병행'}
              </span>
            </div>
            <h3 className="text-[16.5px] font-black text-white mt-1.5">📚 과목별 토의 · 학습데이터 통합 현황</h3>
            <p className="text-[13px] text-slate-400 mt-0.5">
              전체 교육생 포스트잇 월과 조별 3단계 토의 결과·공감 스탬프·응원 코멘트를 한눈에 확인하고 HRD 학습 데이터로 내려받습니다.
            </p>
          </div>
          {eventConfig.learningDisplay === 'off' && (
            <button
              onClick={onGoSettings}
              className="px-3 py-2 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-[12.5px] font-black shadow"
            >
              ⚙️ 행사설정에서 학습 모듈 켜기
            </button>
          )}
        </div>

        {/* 과목 선택 */}
        <div className="flex flex-wrap gap-1.5">
          {subjects.map(s => (
            <button
              key={s.id}
              onClick={() => setSelectedId(s.id)}
              className={`px-3 py-1.5 rounded-xl text-[12.5px] font-bold border transition-all ${
                s.id === subject.id ? 'bg-white text-slate-950 border-white shadow' : 'bg-black/30 text-slate-300 border-white/15'
              }`}
            >
              {s.id === eventConfig.activeLearningSubjectId && '🟢 '}
              {s.title}
            </button>
          ))}
        </div>

        <div className="rounded-xl bg-black/30 border border-white/10 p-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-[13px]">
          <p className="text-slate-300">
            <b className="text-amber-300">💬 포스트잇 질문</b> · {subject.wallQuestion}
          </p>
          <p className="text-slate-300">
            <b className="text-sky-300">🧩 조별 토의 주제</b> · {subject.canvasTopic}{' '}
            <span className="text-slate-500">
              ({fw.icon} {fw.name})
            </span>
          </p>
          {!isActiveSubject && (
            <p className="md:col-span-2 text-[12px] text-amber-200">
              ⓘ 이 과목은 현재 참가자에게 오픈되지 않은 과목입니다 (지난 과목 데이터 조회 중).
            </p>
          )}
        </div>

        {/* KPI */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {[
            { l: '참여 교육생', v: `${stats.posters}명`, c: 'text-amber-300' },
            { l: '포스트잇', v: `${data.wall.length}장`, c: 'text-amber-300' },
            { l: '공감 🔥', v: stats.likes, c: 'text-rose-300' },
            { l: '캔버스 제출', v: `${stats.submitted}/${WORKSHOP_TEAMS.length}조`, c: 'text-sky-300' },
            { l: '보낸 스탬프', v: `${stats.stampsCast}개`, c: 'text-fuchsia-300' },
            { l: '응원 코멘트', v: `${stats.comments}개`, c: 'text-emerald-300' },
          ].map(k => (
            <div key={k.l} className="bg-black/35 border border-white/10 rounded-xl py-2.5 text-center">
              <p className={`text-[19px] font-black leading-none ${k.c}`}>{k.v}</p>
              <p className="text-[11px] text-slate-400 font-bold mt-1">{k.l}</p>
            </div>
          ))}
        </div>

        {/* 액션 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <button
            onClick={() => setStage('wall')}
            className="py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-[13px] shadow"
          >
            📽️ 포스트잇 월 무대 띄우기
          </button>
          <button
            onClick={() => setStage('showcase')}
            className="py-2.5 rounded-xl bg-gradient-to-r from-fuchsia-500 to-indigo-500 text-white font-black text-[13px] shadow"
          >
            📽️ 쇼케이스 무대 띄우기
          </button>
          <button
            onClick={() => exportLearningCsv(raw, [subject], eventConfig.brandTitle, subject.id)}
            className="py-2.5 rounded-xl bg-[#1F2C47] border border-sky-500/40 text-sky-200 font-bold text-[13px]"
          >
            📥 이 과목 학습데이터 엑셀
          </button>
          <button
            onClick={() => exportLearningCsv(raw, subjects, eventConfig.brandTitle)}
            className="py-2.5 rounded-xl bg-[#26283D] border border-amber-500/40 text-amber-200 font-bold text-[13px]"
          >
            📥 전체 과목 통합 엑셀
          </button>
        </div>
      </div>

      {/* 섹션 전환 */}
      <div className="flex gap-1.5 bg-[#151C2C] p-1 rounded-2xl border border-white/10">
        {[
          { k: 'canvas' as const, l: `🧩 조별 토의 캔버스 & 쇼케이스 (${stats.submitted}/${WORKSHOP_TEAMS.length})` },
          { k: 'wall' as const, l: `💬 전체 교육생 포스트잇 월 (${data.wall.length})` },
        ].map(t => (
          <button
            key={t.k}
            onClick={() => setSection(t.k)}
            className={`flex-1 py-2.5 rounded-xl text-[13px] font-black transition-all ${section === t.k ? 'bg-white text-slate-950 shadow' : 'text-slate-400'}`}
          >
            {t.l}
          </button>
        ))}
      </div>

      {section === 'wall' ? (
        <div className="space-y-4">
          <div className="bg-[#1A2235] border border-rose-400/30 rounded-2xl p-4">
            <p className="text-[14px] font-black text-white mb-3">👑 베스트 공감 TOP 3</p>
            {top3.length === 0 ? (
              <p className="text-[13px] text-slate-500">아직 공감을 받은 포스트잇이 없습니다.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                {top3.map((p, i) => (
                  <PostitNote key={p.id} post={p} rank={i + 1} />
                ))}
              </div>
            )}
          </div>
          <div className="bg-[#1A2235] border border-white/10 rounded-2xl overflow-hidden">
            <div className="grid grid-cols-[48px_1fr_110px_70px_44px] gap-2 px-3 py-2 bg-black/30 text-[11.5px] font-black text-slate-400">
              <span>순위</span>
              <span>포스트잇 내용</span>
              <span>작성자</span>
              <span className="text-center">공감</span>
              <span />
            </div>
            {data.wall.length === 0 && <p className="text-center text-slate-500 text-[13px] py-8">아직 포스트잇이 없습니다.</p>}
            {sortWallByLikes(data.wall).map((p, idx) => (
              <div key={p.id} className="grid grid-cols-[48px_1fr_110px_70px_44px] gap-2 px-3 py-2.5 border-t border-white/5 items-center text-[13px]">
                <span className="font-black text-slate-400">{idx + 1}</span>
                <span className="text-white font-medium" style={{ wordBreak: 'keep-all' }}>
                  {p.text}
                </span>
                <span className="flex items-center gap-1 min-w-0">
                  <TeamChip teamId={p.authorTeamId} size="xs" />
                  <span className="text-slate-300 truncate">{p.authorName}</span>
                </span>
                <span className="text-center font-black text-rose-300">🔥 {getLikeCount(p)}</span>
                <button onClick={() => handleDeletePost(p.id)} className="text-slate-500 hover:text-rose-400 text-[12px]" title="삭제">
                  🗑
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {ranking.length > 0 && (
            <div className="bg-[#1A2235] border border-white/10 rounded-2xl p-3.5">
              <p className="text-[13.5px] font-black text-white mb-2">📊 실시간 공감 스탬프 랭킹</p>
              <div className="flex flex-wrap gap-2">
                {ranking.map((r, i) => (
                  <span key={r.t.id} className="flex items-center gap-1.5 bg-black/30 border border-white/10 rounded-xl px-2.5 py-1.5 text-[12.5px]">
                    <b className="text-slate-300">{i + 1}위</b>
                    <TeamChip teamId={r.t.id} size="xs" />
                    <span className="text-amber-300 font-black">💡{r.st.insight}</span>
                    <span className="text-sky-300 font-black">🚀{r.st.action}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {WORKSHOP_TEAMS.map(t => {
              const c = data.canvas[t.id] || normalizeCanvas({}, t.id);
              const submitted = isCanvasSubmitted(c);
              const st = countStampsForTeam(data.votes, t.id);
              const myVote = data.votes[t.id] || {};
              const cmts = data.comments[t.id] || [];
              const prog = canvasProgress(c);
              return (
                <div key={t.id} className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <TeamChip teamId={t.id} size="md" />
                      <span
                        className={`text-[11.5px] font-black px-2 py-0.5 rounded-full border ${
                          submitted
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                            : prog > 0
                            ? 'bg-amber-500/20 text-amber-300 border-amber-400/40'
                            : 'bg-white/5 text-slate-400 border-white/10'
                        }`}
                      >
                        {submitted ? '✓ 제출 완료' : prog > 0 ? `작성 중 ${prog}/3` : '미작성'}
                      </span>
                    </div>
                    <span className="text-[11.5px] text-slate-400">
                      보낸 스탬프: 💡{myVote.insight ? getTeamCfg(myVote.insight).name : '-'} · 🚀
                      {myVote.action ? getTeamCfg(myVote.action).name : '-'}
                    </span>
                  </div>
                  <InsightCard
                    subject={subject}
                    teamId={t.id}
                    canvas={c}
                    stamps={{ insight: st.insight, action: st.action }}
                    commentCount={cmts.length}
                    onPhotoClick={setZoomUrl}
                    footer={
                      <div className="mt-2 space-y-1.5">
                        {cmts.map(cm => (
                          <div key={cm.id} className="flex items-start gap-1.5 text-[12px]">
                            <TeamChip teamId={cm.authorTeamId} size="xs" />
                            <span className="font-bold text-slate-300 shrink-0">{cm.authorName}</span>
                            <span className="text-white flex-1">{cm.text}</span>
                            <button onClick={() => deleteComment(t.id, cm.id)} className="text-slate-600 hover:text-rose-400">
                              ✕
                            </button>
                          </div>
                        ))}
                        <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
                          <span>
                            {Object.values(c.contributors || {}).length > 0 && `✍️ ${Object.values(c.contributors || {}).join(', ')}`}
                          </span>
                          {submitted && (
                            <button onClick={() => handleUnsubmit(t.id)} className="underline hover:text-rose-400">
                              제출 취소(수정 허용)
                            </button>
                          )}
                        </div>
                      </div>
                    }
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <button onClick={handleClearSubject} className="text-[12px] text-slate-500 hover:text-rose-400 underline">
          🗑 이 과목의 학습 데이터 전체 삭제
        </button>
      </div>
      <PhotoZoomOverlay url={zoomUrl} onClose={() => setZoomUrl(null)} />
    </div>
  );
};
