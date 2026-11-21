import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CanvasRecord,
  LearningSubject,
  SubjectData,
  getTopWallPosts,
  getLikeCount,
  getFrameworkMeta,
  shortText,
  compressImageFile,
  normalizeCanvas,
} from '../../config/learningConfig';
import { learningPatch } from './learningDb';
import { InsightCard, StepBadge, PhotoZoomOverlay, getTeamCfg } from './LearningShared';
import { fireConfetti } from '../../lib/confetti';

const MAX_ANSWER = 200;
const MAX_TAGS = 3;
const MAX_HASHTAGS = 3;
const STEP_COLORS = ['#F59E0B', '#38BDF8', '#34D399'];

/** 앞 단계 답변을 다음 단계 질문의 "꼬리"로 이어주는 연결 문구 */
function bridgeText(subject: LearningSubject, stepIdx: number, answers: string[]): string | null {
  if (stepIdx === 0) return null;
  const prev = shortText(answers[stepIdx - 1], 40);
  if (!prev) return null;
  const prevLabel = subject.steps[stepIdx - 1]?.label || `STEP ${stepIdx}`;
  if (subject.framework === 'case') {
    return stepIdx === 1
      ? `방금 진단한 쟁점 "${prev}" — 우리 조라면 어떻게 결정할까요?`
      : `"${prev}" 라는 결정에서 얻은 우리의 배움은?`;
  }
  if (subject.framework === 'value') {
    return stepIdx === 1
      ? `"${prev}" 를 향해 가려면 무엇을 버리고 무엇을 채워야 할까요?`
      : `지금까지의 이야기를 우리 조의 한 줄 다짐으로 모아볼까요?`;
  }
  return stepIdx === 1
    ? `방금 꼽은 [${prevLabel}] "${prev}" — 이걸 풀기 위한 우리 조의 묘수는?`
    : `"${prev}" 를 현업에서 바로 실천한다면, 가장 먼저 할 1가지는?`;
}

export const DiscussionCanvas: React.FC<{
  subject: LearningSubject;
  data: SubjectData;
  me: { pid: string; name: string; teamId: string };
  onGoShowcase: () => void;
  onRefresh: () => void;
}> = ({ subject, data, me, onGoShowcase, onRefresh }) => {
  const server: CanvasRecord = useMemo(
    () => data.canvas[me.teamId] || normalizeCanvas({}, me.teamId),
    [data.canvas, me.teamId]
  );
  const submitted = server.status === 'submitted';
  const team = getTeamCfg(me.teamId);
  const fw = getFrameworkMeta(subject.framework);

  const [answers, setAnswers] = useState<string[]>(['', '', '']);
  const [tags, setTags] = useState<string[][]>([[], [], []]);
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [notePhotoUrl, setNotePhotoUrl] = useState<string>('');
  const [step, setStep] = useState(0); // 0,1,2 = 단계, 3 = 최종 검토
  const [editing, setEditing] = useState(false);
  const [hashInput, setHashInput] = useState('');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [zoomUrl, setZoomUrl] = useState<string | null>(null);
  const dirtyRef = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initializedRef = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // 서버 → 로컬 동기화 (내가 편집 중이 아닐 때만, 조원 동시 작성 반영)
  useEffect(() => {
    if (dirtyRef.current) return;
    setAnswers([...(server.answers || ['', '', ''])]);
    setTags((server.tags || [[], [], []]).map(t => [...t]));
    setHashtags([...(server.hashtags || [])]);
    setNotePhotoUrl(server.notePhotoUrl || '');
    if (!initializedRef.current) {
      initializedRef.current = true;
      const firstEmpty = (server.answers || []).findIndex(a => !String(a || '').trim());
      setStep(server.status === 'submitted' ? 3 : firstEmpty === -1 ? 3 : firstEmpty);
    }
  }, [server]);

  // 과목 변경 시 초기화
  useEffect(() => {
    initializedRef.current = false;
    dirtyRef.current = false;
  }, [subject.id]);

  const persist = async (patch: Partial<CanvasRecord>) => {
    setSaveState('saving');
    await learningPatch(`${subject.id}/canvas/${me.teamId}`, {
      teamId: me.teamId,
      ...patch,
      status: submitted ? 'submitted' : 'draft',
      updatedAt: new Date().toISOString(),
      updatedBy: me.name,
      [`contributors/${me.pid}`]: me.name,
    });
    dirtyRef.current = false;
    setSaveState('saved');
    setTimeout(() => setSaveState('idle'), 1500);
  };

  const scheduleSave = (patch: Partial<CanvasRecord>) => {
    dirtyRef.current = true;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => persist(patch), 900);
  };

  useEffect(() => () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
  }, []);

  const updateAnswer = (i: number, v: string) => {
    const next = [...answers];
    next[i] = v.slice(0, MAX_ANSWER);
    setAnswers(next);
    scheduleSave({ answers: next, tags, hashtags });
  };

  const toggleTag = (i: number, tag: string) => {
    const curr = tags[i] || [];
    let nextList: string[];
    if (curr.includes(tag)) nextList = curr.filter(t => t !== tag);
    else if (curr.length >= MAX_TAGS) return;
    else nextList = [...curr, tag];
    const next = tags.map((t, idx) => (idx === i ? nextList : t));
    setTags(next);
    scheduleSave({ answers, tags: next, hashtags });
  };

  const appendFromWall = (txt: string) => {
    const base = answers[0].trim();
    updateAnswer(0, base ? `${base} / ${txt}` : txt);
  };

  const addHashtag = (raw: string) => {
    const h = raw.replace(/^#/, '').replace(/\s+/g, '').trim();
    if (!h || hashtags.includes(h) || hashtags.length >= MAX_HASHTAGS) return;
    const next = [...hashtags, h.slice(0, 12)];
    setHashtags(next);
    setHashInput('');
    scheduleSave({ answers, tags, hashtags: next });
  };

  const removeHashtag = (h: string) => {
    const next = hashtags.filter(x => x !== h);
    setHashtags(next);
    scheduleSave({ answers, tags, hashtags: next });
  };

  const handlePhoto = async (file?: File | null) => {
    if (!file) return;
    try {
      const url = await compressImageFile(file, 1100, 0.78);
      setNotePhotoUrl(url);
      dirtyRef.current = true;
      await persist({ answers, tags, hashtags, notePhotoUrl: url });
    } catch {
      alert('사진을 불러오지 못했습니다. 다시 시도해 주세요.');
    }
  };

  const removePhoto = async () => {
    setNotePhotoUrl('');
    dirtyRef.current = true;
    await learningPatch(`${subject.id}/canvas/${me.teamId}`, { notePhotoUrl: null });
    dirtyRef.current = false;
  };

  const handleSubmit = async () => {
    if (answers.some(a => !a.trim())) {
      alert('3단계를 모두 작성해야 제출할 수 있어요!');
      const idx = answers.findIndex(a => !a.trim());
      setStep(idx);
      return;
    }
    if (!submitted && !window.confirm(`${team.name} 인사이트 카드를 제출할까요?\n제출 즉시 전 조 쇼케이스에 전시됩니다.`)) return;
    setIsSubmitting(true);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    const nowIso = new Date().toISOString();
    await learningPatch(`${subject.id}/canvas/${me.teamId}`, {
      teamId: me.teamId,
      answers,
      tags,
      hashtags,
      status: 'submitted',
      submittedAt: submitted ? server.submittedAt || nowIso : nowIso,
      submittedBy: submitted ? server.submittedBy || me.name : me.name,
      updatedAt: nowIso,
      updatedBy: me.name,
      [`contributors/${me.pid}`]: me.name,
    });
    dirtyRef.current = false;
    setIsSubmitting(false);
    setEditing(false);
    try {
      fireConfetti({ count: 110, spread: 90 });
    } catch {}
    onRefresh();
    if (!submitted) setTimeout(onGoShowcase, 900);
  };

  // 다른 조원이 방금 작성 중인지 표시
  const othersTyping =
    server.updatedBy &&
    server.updatedBy !== me.name &&
    server.updatedAt &&
    Date.now() - new Date(server.updatedAt).getTime() < 25000;

  const topWall = getTopWallPosts(data.wall, 3);
  const doneCount = answers.filter(a => a.trim()).length;
  const contributors = Object.values(server.contributors || {});

  const localCanvas: CanvasRecord = { ...server, answers, tags, hashtags, notePhotoUrl };

  // ── 제출 완료 & 보기 모드 ─────────────────────────────
  if (submitted && !editing) {
    return (
      <div className="space-y-4">
        <div className="rounded-3xl bg-gradient-to-br from-emerald-500/25 to-teal-600/10 border border-emerald-400/50 p-4 text-center shadow-xl">
          <p className="text-[34px] leading-none">🎉</p>
          <p className="text-[18px] font-black text-white mt-2">{team.name} 인사이트 카드 제출 완료!</p>
          <p className="text-[13px] text-emerald-100/80 mt-1">
            쇼케이스에서 다른 조의 카드를 둘러보고 공감 스탬프를 보내주세요.
          </p>
          <div className="flex gap-2 mt-3.5">
            <button
              type="button"
              onClick={() => {
                setEditing(true);
                setStep(0);
              }}
              className="flex-1 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white font-bold text-[13.5px]"
            >
              ✏️ 내용 수정
            </button>
            <button
              type="button"
              onClick={onGoShowcase}
              className="flex-[1.6] py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-black text-[14px] shadow-lg"
            >
              🏆 쇼케이스 보러가기 →
            </button>
          </div>
        </div>
        <InsightCard subject={subject} teamId={me.teamId} canvas={localCanvas} highlightMine onPhotoClick={setZoomUrl} />
        {contributors.length > 0 && (
          <p className="text-center text-[12px] text-slate-400">
            ✍️ 함께 작성한 조원: <b className="text-slate-200">{contributors.join(', ')}</b>
          </p>
        )}
        <PhotoZoomOverlay url={zoomUrl} onClose={() => setZoomUrl(null)} />
      </div>
    );
  }

  const stepDef = subject.steps[Math.min(step, 2)];
  const bridge = step < 3 ? bridgeText(subject, step, answers) : null;

  return (
    <div className="space-y-3.5">
      {/* 토의 주제 */}
      <div className="rounded-3xl border border-sky-400/35 bg-gradient-to-br from-[#0E2338] via-[#122033] to-[#111827] p-4 shadow-xl">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-sky-400 text-slate-950">
            {team.name} 토의 캔버스
          </span>
          <span className="text-[11px] font-bold text-sky-200/80">
            {fw.icon} {fw.name}
          </span>
        </div>
        <p className="text-[18px] font-black text-white leading-snug mt-2" style={{ wordBreak: 'keep-all' }}>
          {subject.canvasTopic}
        </p>
        {editing && (
          <p className="text-[12px] text-amber-200 mt-2 font-bold">✏️ 수정 모드 · 다시 제출하면 쇼케이스 카드가 업데이트됩니다</p>
        )}
      </div>

      {/* 스테퍼 */}
      <div className="rounded-2xl bg-[#151C2C] border border-white/10 p-3">
        <div className="flex items-center">
          {[0, 1, 2, 3].map(i => {
            const isDone = i < 3 ? !!answers[i].trim() : false;
            return (
              <React.Fragment key={i}>
                <button type="button" onClick={() => setStep(i)} className="flex flex-col items-center gap-1 min-w-[56px]">
                  {i < 3 ? (
                    <StepBadge n={i + 1} active={step === i} done={isDone && step !== i} />
                  ) : (
                    <span
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-[14px] ${
                        step === 3 ? 'bg-gradient-to-br from-fuchsia-400 to-purple-600 shadow-lg' : 'bg-white/10 border border-white/15'
                      }`}
                    >
                      🚀
                    </span>
                  )}
                  <span className={`text-[10.5px] font-bold ${step === i ? 'text-white' : 'text-slate-500'}`}>
                    {i < 3 ? subject.steps[i].label : '최종 제출'}
                  </span>
                </button>
                {i < 3 && (
                  <div className="flex-1 h-1 rounded-full mx-0.5 mb-4 bg-white/10 overflow-hidden">
                    <div
                      className="h-full transition-all duration-500"
                      style={{ width: answers[i].trim() ? '100%' : '0%', background: STEP_COLORS[i] }}
                    />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
        <div className="flex items-center justify-between mt-1 text-[11.5px]">
          <span className="text-slate-400">
            진행 <b className="text-white">{doneCount}/3</b> 단계
          </span>
          <span className={`font-bold ${saveState === 'saving' ? 'text-amber-300' : saveState === 'saved' ? 'text-emerald-300' : 'text-slate-500'}`}>
            {saveState === 'saving' ? '● 자동 저장 중…' : saveState === 'saved' ? '✓ 조원과 실시간 공유됨' : '☁️ 자동 저장'}
          </span>
        </div>
        {othersTyping && (
          <p className="mt-2 text-[12px] font-bold text-sky-200 bg-sky-500/10 border border-sky-400/25 rounded-lg px-2.5 py-1.5">
            ✍️ {server.updatedBy}님이 함께 작성 중이에요 · 화면이 자동으로 맞춰집니다
          </p>
        )}
      </div>

      {/* 단계 작성 */}
      {step < 3 && stepDef && (
        <div className="rounded-3xl bg-[#151C2C] border-2 p-4 space-y-3 shadow-xl" style={{ borderColor: `${STEP_COLORS[step]}88` }}>
          {bridge && (
            <div className="rounded-2xl bg-white/5 border border-white/10 px-3 py-2.5">
              <p className="text-[12.5px] font-bold text-slate-300 leading-snug" style={{ wordBreak: 'keep-all' }}>
                👉 {bridge}
              </p>
            </div>
          )}

          <div className="flex items-start gap-2.5">
            <StepBadge n={step + 1} active size={34} />
            <div>
              <p className="text-[11.5px] font-black uppercase tracking-wide" style={{ color: STEP_COLORS[step] }}>
                STEP {step + 1} · {stepDef.label}
              </p>
              <p className="text-[17px] font-black text-white leading-snug mt-0.5" style={{ wordBreak: 'keep-all' }}>
                {stepDef.question}
              </p>
            </div>
          </div>

          {/* STEP 1: 전체 포스트잇 TOP 의견에서 출발 */}
          {step === 0 && topWall.length > 0 && (
            <div className="rounded-2xl bg-amber-500/10 border border-amber-400/30 p-2.5 space-y-1.5">
              <p className="text-[12px] font-black text-amber-200">💡 전체 교육생 공감 TOP 의견에서 출발하기 (탭하면 추가)</p>
              {topWall.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => appendFromWall(p.text)}
                  className="w-full text-left text-[13px] font-bold text-white bg-black/30 hover:bg-black/45 rounded-xl px-2.5 py-2 flex items-center justify-between gap-2 active:scale-98"
                >
                  <span className="truncate">“{p.text}”</span>
                  <span className="text-[11px] text-rose-300 shrink-0">🔥{getLikeCount(p)} ＋</span>
                </button>
              ))}
            </div>
          )}

          {/* 키워드 칩 */}
          {stepDef.tags.length > 0 && (
            <div>
              <p className="text-[12px] font-bold text-slate-400 mb-1.5">
                🏷️ 키워드로 먼저 골라보세요 <span className="text-slate-500">(최대 {MAX_TAGS}개)</span>
              </p>
              <div className="flex flex-wrap gap-1.5">
                {stepDef.tags.map(t => {
                  const on = (tags[step] || []).includes(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => toggleTag(step, t)}
                      className={`px-3 py-1.5 rounded-full text-[13px] font-bold border transition-all active:scale-95 ${
                        on ? 'text-slate-950 border-transparent shadow' : 'bg-white/5 text-slate-200 border-white/15'
                      }`}
                      style={on ? { background: STEP_COLORS[step] } : undefined}
                    >
                      {on ? '✓ ' : ''}
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <textarea
              value={answers[step]}
              onChange={e => updateAnswer(step, e.target.value)}
              rows={4}
              placeholder={stepDef.placeholder || '조원들과 이야기 나눈 내용을 정리해 주세요'}
              className="w-full bg-[#0D1220] border border-white/15 rounded-2xl p-3.5 text-[15.5px] text-white leading-relaxed placeholder-slate-600 focus:outline-none focus:border-amber-400 resize-none"
            />
            <div className="flex justify-between text-[11px] text-slate-500 mt-1 px-1">
              <span>조원 누구나 함께 작성할 수 있어요</span>
              <span>
                {answers[step].length}/{MAX_ANSWER}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="px-4 py-3 rounded-xl bg-white/10 border border-white/15 text-slate-300 font-bold text-[14px]"
              >
                ← 이전
              </button>
            )}
            <button
              type="button"
              disabled={!answers[step].trim()}
              onClick={() => setStep(step + 1)}
              className="flex-1 py-3 rounded-xl font-black text-[15px] text-slate-950 shadow-lg disabled:opacity-35 active:scale-98 transition-all"
              style={{ background: STEP_COLORS[step] }}
            >
              {step < 2 ? `다음: ${subject.steps[step + 1].label} →` : '최종 검토로 →'}
            </button>
          </div>
        </div>
      )}

      {/* 최종 검토 & 제출 */}
      {step === 3 && (
        <div className="space-y-3.5">
          <div className="rounded-3xl bg-[#151C2C] border border-fuchsia-400/40 p-4 space-y-3 shadow-xl">
            <p className="text-[16px] font-black text-white">🚀 마지막 터치: 해시태그 & 노트 사진</p>

            {/* 해시태그 */}
            <div>
              <p className="text-[12.5px] font-bold text-slate-300 mb-1.5">
                # 우리 조 인사이트를 대표하는 해시태그 <span className="text-slate-500">(최대 {MAX_HASHTAGS}개)</span>
              </p>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {hashtags.map(h => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => removeHashtag(h)}
                    className="px-2.5 py-1 rounded-full bg-amber-400 text-slate-950 text-[13px] font-black"
                  >
                    #{h} ✕
                  </button>
                ))}
                {hashtags.length === 0 && <span className="text-[12px] text-slate-500">아래 추천을 탭하거나 직접 입력하세요</span>}
              </div>
              {hashtags.length < MAX_HASHTAGS && (
                <>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {Array.from(new Set(tags.flat()))
                      .filter(t => !hashtags.includes(t.replace(/\s+/g, '')))
                      .slice(0, 8)
                      .map(t => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => addHashtag(t)}
                          className="px-2.5 py-1 rounded-full bg-white/5 border border-amber-400/40 text-amber-200 text-[12.5px] font-bold"
                        >
                          ＋#{t.replace(/\s+/g, '')}
                        </button>
                      ))}
                  </div>
                  <div className="flex gap-1.5">
                    <input
                      value={hashInput}
                      onChange={e => setHashInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addHashtag(hashInput);
                        }
                      }}
                      placeholder="#직접 입력"
                      className="flex-1 bg-[#0D1220] border border-white/15 rounded-xl px-3 py-2 text-[14px] text-white focus:outline-none focus:border-amber-400"
                    />
                    <button
                      type="button"
                      onClick={() => addHashtag(hashInput)}
                      className="px-3.5 rounded-xl bg-white/10 text-white font-bold text-[13px]"
                    >
                      추가
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* 노트 사진 */}
            <div className="pt-1">
              <p className="text-[12.5px] font-bold text-slate-300 mb-1.5">
                📝 (선택) 책상 위 포스트잇·교재 필기 사진 1장 — 버려져도 영구 보존돼요
              </p>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={e => handlePhoto(e.target.files?.[0])}
              />
              {notePhotoUrl ? (
                <div className="relative rounded-2xl overflow-hidden border border-white/15">
                  <img src={notePhotoUrl} alt="노트" className="w-full h-40 object-cover" />
                  <div className="absolute right-2 top-2 flex gap-1.5">
                    <button type="button" onClick={() => fileRef.current?.click()} className="px-2.5 py-1 rounded-lg bg-black/70 text-white text-[12px] font-bold">
                      다시 찍기
                    </button>
                    <button type="button" onClick={removePhoto} className="px-2.5 py-1 rounded-lg bg-black/70 text-rose-300 text-[12px] font-bold">
                      삭제
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="w-full py-4 rounded-2xl border-2 border-dashed border-white/15 text-slate-300 text-[13.5px] font-bold hover:border-white/30"
                >
                  📸 노트·포스트잇 사진 찍어 첨부하기
                </button>
              )}
            </div>
          </div>

          <p className="text-[12.5px] font-black text-slate-300 px-1">👀 쇼케이스에 이렇게 전시돼요</p>
          <InsightCard subject={subject} teamId={me.teamId} canvas={localCanvas} highlightMine onPhotoClick={setZoomUrl} />

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-4 py-3.5 rounded-xl bg-white/10 border border-white/15 text-slate-300 font-bold text-[14px]"
            >
              ← 이전
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSubmit}
              className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-fuchsia-500 via-purple-500 to-indigo-500 text-white font-black text-[15.5px] shadow-xl shadow-purple-500/25 disabled:opacity-50 active:scale-98"
            >
              {isSubmitting ? '제출 중…' : submitted ? '💾 수정 내용 다시 제출' : '🚀 인사이트 카드 제출 & 쇼케이스 오픈'}
            </button>
          </div>
          {editing && (
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                dirtyRef.current = false;
              }}
              className="w-full text-[12.5px] text-slate-400 underline"
            >
              수정 취소하고 돌아가기
            </button>
          )}
        </div>
      )}
      <PhotoZoomOverlay url={zoomUrl} onClose={() => setZoomUrl(null)} />
    </div>
  );
};
