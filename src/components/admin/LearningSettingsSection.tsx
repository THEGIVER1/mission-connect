import React, { useState } from 'react';
import type { RemoteEventConfig } from '../../config/workshopConfig';
import {
  DISCUSSION_FRAMEWORKS,
  CUSTOM_FRAMEWORK_META,
  DiscussionFrameworkKey,
  LearningSubject,
  LearningDisplayMode,
  cloneSteps,
  createLearningSubject,
  getFrameworkPreset,
} from '../../config/learningConfig';

const DISPLAY_OPTIONS: { key: LearningDisplayMode; title: string; desc: string }[] = [
  { key: 'off', title: '⏸️ 사용 안 함', desc: '참가자 화면에 학습 모듈 숨김 (팀빌딩만 진행)' },
  { key: 'with-teambuilding', title: '🤝 팀빌딩 + 학습 병행', desc: 'STEP 1~4 아래에 LEARNING LAB 함께 노출' },
  { key: 'learning-only', title: '📚 과목별 토의·학습 전용', desc: '팀빌딩 STEP 숨김 · 학습 모듈만 최상단 노출' },
];

export const LearningSettingsSection: React.FC<{
  form: RemoteEventConfig;
  setForm: (f: RemoteEventConfig) => void;
}> = ({ form, setForm }) => {
  const subjects = form.learningSubjects || [];
  const [editId, setEditId] = useState<string>(form.activeLearningSubjectId || subjects[0]?.id || '');
  const editing = subjects.find(s => s.id === editId) || subjects[0];
  const [tagDrafts, setTagDrafts] = useState<Record<number, string>>({});

  const updateSubject = (id: string, patch: Partial<LearningSubject>) => {
    setForm({
      ...form,
      learningSubjects: subjects.map(s => (s.id === id ? { ...s, ...patch } : s)),
    });
  };

  const updateStep = (stepIdx: number, patch: Partial<LearningSubject['steps'][number]>) => {
    if (!editing) return;
    const steps = editing.steps.map((st, i) => (i === stepIdx ? { ...st, ...patch } : st));
    updateSubject(editing.id, { steps, framework: 'custom' });
  };

  const applyFramework = (key: DiscussionFrameworkKey) => {
    if (!editing) return;
    if (key === 'custom') {
      updateSubject(editing.id, { framework: 'custom' });
      return;
    }
    const preset = getFrameworkPreset(key);
    if (!preset) return;
    if (
      editing.framework === 'custom' &&
      !window.confirm(`직접 수정한 3단계 질문이 [${preset.name}] 프리셋으로 바뀝니다. 계속할까요?`)
    )
      return;
    updateSubject(editing.id, { framework: key, steps: cloneSteps(preset.steps) });
  };

  const addSubject = () => {
    const n = subjects.length + 1;
    const s = createLearningSubject({ title: `[Session ${n}] 새 과목`, canvasTopic: '이번 과목의 조별 토의 주제를 입력하세요' });
    setForm({ ...form, learningSubjects: [...subjects, s] });
    setEditId(s.id);
  };

  const removeSubject = (id: string) => {
    if (subjects.length <= 1) {
      alert('과목은 최소 1개 이상 필요합니다.');
      return;
    }
    if (!window.confirm('이 과목 설정을 삭제할까요?\n(이미 수집된 학습 데이터는 DB에 그대로 보존됩니다)')) return;
    const next = subjects.filter(s => s.id !== id);
    setForm({
      ...form,
      learningSubjects: next,
      activeLearningSubjectId: form.activeLearningSubjectId === id ? next[0].id : form.activeLearningSubjectId,
    });
    if (editId === id) setEditId(next[0].id);
  };

  const addTag = (stepIdx: number) => {
    const t = (tagDrafts[stepIdx] || '').trim();
    if (!t || !editing) return;
    if (editing.steps[stepIdx].tags.includes(t)) return;
    updateStep(stepIdx, { tags: [...editing.steps[stepIdx].tags, t] });
    setTagDrafts(d => ({ ...d, [stepIdx]: '' }));
  };

  const stepColors = ['#F59E0B', '#38BDF8', '#34D399'];
  const display = form.learningDisplay || 'off';

  return (
    <div className="bg-gradient-to-br from-[#1E1A33] via-[#161A2E] to-[#101625] border border-fuchsia-500/40 rounded-2xl p-4 space-y-4 shadow-2xl">
      <div className="border-b border-white/10 pb-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-400/40">
            LEARNING LAB
          </span>
          <span
            className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
              display === 'off'
                ? 'bg-white/5 text-slate-400 border-white/15'
                : 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
            }`}
          >
            {DISPLAY_OPTIONS.find(o => o.key === display)?.title}
          </span>
        </div>
        <h4 className="text-[15.5px] font-black text-white mt-1">📚 과목별 학습 토의 모듈 설정</h4>
        <p className="text-xs text-slate-400 mt-0.5">
          모듈 1 💬 전체 교육생 라이브 포스트잇 월 · 모듈 2 🧩 조별 3단계 토의 캔버스 → 🏆 전 조 인사이트 쇼케이스 & 공감 투표
        </p>
      </div>

      {/* 노출 모드 */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-300 block">① 참가자 화면 노출 방식</label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {DISPLAY_OPTIONS.map(o => {
            const sel = display === o.key;
            return (
              <button
                key={o.key}
                type="button"
                onClick={() => setForm({ ...form, learningDisplay: o.key })}
                className={`text-left p-3 rounded-xl border transition-all ${
                  sel ? 'bg-gradient-to-br from-fuchsia-500/25 to-indigo-500/20 border-fuchsia-400 shadow-lg' : 'bg-black/35 border-white/10 hover:border-white/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-white">{o.title}</span>
                  {sel && <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-fuchsia-400 text-slate-950">선택됨</span>}
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-snug">{o.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* 진행 과목 선택 */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-300">② 과목 목록 & 지금 진행할 과목 (참가자에게 노출)</label>
          <button
            type="button"
            onClick={addSubject}
            className="px-2.5 py-1 rounded-lg bg-fuchsia-500/20 border border-fuchsia-400/40 text-fuchsia-200 text-[11.5px] font-bold"
          >
            ＋ 과목 추가
          </button>
        </div>
        <div className="space-y-1.5">
          {subjects.map(s => {
            const isActive = form.activeLearningSubjectId === s.id;
            const isEditing = editing?.id === s.id;
            const fw = getFrameworkPreset(s.framework) || CUSTOM_FRAMEWORK_META;
            return (
              <div
                key={s.id}
                className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all ${
                  isEditing ? 'border-sky-400/70 bg-sky-500/10' : 'border-white/10 bg-black/30'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setForm({ ...form, activeLearningSubjectId: s.id })}
                  className={`shrink-0 px-2.5 py-1.5 rounded-lg text-[11px] font-black border ${
                    isActive ? 'bg-emerald-400 text-slate-950 border-emerald-300' : 'bg-white/5 text-slate-400 border-white/15 hover:text-white'
                  }`}
                  title="참가자에게 이 과목을 오픈"
                >
                  {isActive ? '🟢 진행 중' : '▶ 진행하기'}
                </button>
                <button type="button" onClick={() => setEditId(s.id)} className="flex-1 min-w-0 text-left">
                  <p className="text-[13px] font-bold text-white truncate">{s.title}</p>
                  <p className="text-[11px] text-slate-400 truncate">
                    {fw.icon} {fw.name} · {s.canvasTopic}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setEditId(s.id)}
                  className={`shrink-0 px-2 py-1 rounded-lg text-[11px] font-bold ${isEditing ? 'bg-sky-400 text-slate-950' : 'bg-white/10 text-slate-300'}`}
                >
                  ✏️ 편집
                </button>
                <button
                  type="button"
                  onClick={() => removeSubject(s.id)}
                  className="shrink-0 px-2 py-1 rounded-lg text-[11px] font-bold bg-white/5 text-rose-300"
                >
                  삭제
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* 과목 편집기 */}
      {editing && (
        <div className="rounded-2xl border border-sky-400/40 bg-black/30 p-3.5 space-y-3">
          <p className="text-[13px] font-black text-sky-200">③ 과목 편집 · {editing.title}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
            <div>
              <label className="text-slate-400 block mb-0.5">과목명</label>
              <input
                value={editing.title}
                onChange={e => updateSubject(editing.id, { title: e.target.value })}
                className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white text-[13px]"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-0.5">💬 모듈 1 · 전체 교육생 포스트잇 질문</label>
              <input
                value={editing.wallQuestion}
                onChange={e => updateSubject(editing.id, { wallQuestion: e.target.value })}
                className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white text-[13px]"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-slate-400 block mb-0.5">🧩 모듈 2 · 조별 토의 주제</label>
              <input
                value={editing.canvasTopic}
                onChange={e => updateSubject(editing.id, { canvasTopic: e.target.value })}
                className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white text-[13px]"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5">토의 프레임워크 (1-Click 프리셋)</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
              {[...DISCUSSION_FRAMEWORKS, CUSTOM_FRAMEWORK_META].map(f => {
                const sel = editing.framework === f.key;
                return (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => applyFramework(f.key)}
                    className={`text-left p-2 rounded-xl border ${
                      sel ? 'bg-sky-500/20 border-sky-400 shadow' : 'bg-black/30 border-white/10 hover:border-white/30'
                    }`}
                  >
                    <p className="text-[12px] font-black text-white">
                      {f.icon} {f.name}
                    </p>
                    <p className="text-[10.5px] text-slate-400 mt-0.5 leading-snug">{f.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            {editing.steps.map((st, i) => (
              <div key={i} className="rounded-xl border bg-black/25 p-2.5 space-y-1.5" style={{ borderColor: `${stepColors[i]}66` }}>
                <div className="flex items-center gap-2">
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-black text-slate-950 shrink-0"
                    style={{ background: stepColors[i] }}
                  >
                    {i + 1}
                  </span>
                  <input
                    value={st.label}
                    onChange={e => updateStep(i, { label: e.target.value })}
                    placeholder="단계 라벨"
                    className="w-32 bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-white text-[12px] font-bold"
                  />
                  <input
                    value={st.question}
                    onChange={e => updateStep(i, { question: e.target.value })}
                    placeholder="참가자에게 보일 질문"
                    className="flex-1 bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-white text-[12px]"
                  />
                </div>
                <input
                  value={st.placeholder}
                  onChange={e => updateStep(i, { placeholder: e.target.value })}
                  placeholder="입력창 예시 문구"
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-slate-300 text-[11.5px]"
                />
                <div className="flex flex-wrap items-center gap-1">
                  {st.tags.map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => updateStep(i, { tags: st.tags.filter(x => x !== t) })}
                      className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-white/10 text-slate-200 hover:bg-rose-500/30"
                      title="클릭하여 삭제"
                    >
                      {t} ✕
                    </button>
                  ))}
                  <input
                    value={tagDrafts[i] || ''}
                    onChange={e => setTagDrafts(d => ({ ...d, [i]: e.target.value }))}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag(i);
                      }
                    }}
                    placeholder="+ 키워드 칩 (Enter)"
                    className="w-32 bg-black/40 border border-white/10 rounded-full px-2 py-0.5 text-white text-[11px]"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 점수 */}
      <div className="grid grid-cols-2 gap-2.5 text-xs">
        <div>
          <label className="text-slate-400 block mb-0.5">토의 캔버스 제출 보상 (조별, 과목당 pt)</label>
          <input
            type="number"
            value={form.learningCanvasPoints}
            onChange={e => setForm({ ...form, learningCanvasPoints: Number(e.target.value) || 0 })}
            className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white"
          />
        </div>
        <div>
          <label className="text-slate-400 block mb-0.5">받은 공감 스탬프 1개당 보너스 (pt)</label>
          <input
            type="number"
            value={form.learningStampPoints}
            onChange={e => setForm({ ...form, learningStampPoints: Number(e.target.value) || 0 })}
            className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white"
          />
        </div>
      </div>
      <p className="text-[11px] text-slate-500">
        ※ 변경 후 하단 [행사 설정 저장]을 눌러야 참가자 화면에 반영됩니다. 과목을 전환해도 이전 과목의 학습 데이터는 DB에 그대로 보존됩니다.
      </p>
    </div>
  );
};
