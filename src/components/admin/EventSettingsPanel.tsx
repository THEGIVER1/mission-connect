import React, { useState, useEffect } from 'react';
import { ref, set } from 'firebase/database';
import { rtdb, FIREBASE_DB_URL } from '../../lib/firebase';
import {
  DEFAULT_EVENT_CONFIG,
  LIVE_EVENT_CONFIG,
  MASTER_PASSCODE,
  RemoteEventConfig,
  WrapupQuizItem,
  applyRemoteEventConfig,
} from '../../config/workshopConfig';

export const EventSettingsPanel: React.FC = () => {
  const [form, setForm] = useState<RemoteEventConfig>(() => ({
    ...LIVE_EVENT_CONFIG,
    tutorialOptions: [...LIVE_EVENT_CONFIG.tutorialOptions],
    wrapupQuizItems: LIVE_EVENT_CONFIG.wrapupQuizItems.map(i => ({ ...i })),
  }));
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isMasterUnlocked, setIsMasterUnlocked] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('master_blocks_unlocked') === 'true';
    } catch {
      return false;
    }
  });
  const [masterInput, setMasterInput] = useState<string>('');
  const [showMasterPrompt, setShowMasterPrompt] = useState<boolean>(false);

  const handleUnlockMaster = () => {
    if (masterInput.trim() === MASTER_PASSCODE) {
      setIsMasterUnlocked(true);
      setShowMasterPrompt(false);
      setMasterInput('');
      try {
        sessionStorage.setItem('master_blocks_unlocked', 'true');
      } catch {}
    } else {
      alert('마스터 보안코드가 일치하지 않습니다.');
    }
  };

  useEffect(() => {
    const syncFromLive = () => {
      setForm({
        ...LIVE_EVENT_CONFIG,
        tutorialOptions: [...LIVE_EVENT_CONFIG.tutorialOptions],
        wrapupQuizItems: LIVE_EVENT_CONFIG.wrapupQuizItems.map(i => ({ ...i })),
      });
    };
    window.addEventListener('mmazing-config-updated', syncFromLive);
    return () => window.removeEventListener('mmazing-config-updated', syncFromLive);
  }, []);

  const updateOption = (idx: number, val: string) => {
    const next = [...form.tutorialOptions];
    next[idx] = val;
    setForm({ ...form, tutorialOptions: next });
  };

  const updateWrapupItem = (idx: number, patch: Partial<WrapupQuizItem>) => {
    const next = form.wrapupQuizItems.map((item, i) => (i === idx ? { ...item, ...patch } : item));
    setForm({ ...form, wrapupQuizItems: next });
  };

  const addWrapupItem = () => {
    setForm({
      ...form,
      wrapupQuizItems: [
        ...form.wrapupQuizItems,
        { text: `항목 ${form.wrapupQuizItems.length + 1}`, correct: true },
      ],
    });
  };

  const removeWrapupItem = (idx: number) => {
    if (form.wrapupQuizItems.length <= 1) {
      alert('최소 1개 이상의 문항이 필요합니다.');
      return;
    }
    setForm({
      ...form,
      wrapupQuizItems: form.wrapupQuizItems.filter((_, i) => i !== idx),
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);
    const payload: RemoteEventConfig = {
      ...form,
      updatedAt: new Date().toISOString(),
    };

    try {
      applyRemoteEventConfig(payload);

      if (FIREBASE_DB_URL) {
        await fetch(`${FIREBASE_DB_URL}/sessions/trekking2026/eventConfig.json`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      try {
        const cfgRef = ref(rtdb, 'sessions/trekking2026/eventConfig');
        await set(cfgRef, payload);
      } catch {
        // ignore SDK fallback error
      }

      setSaveMessage('✅ 행사 설정이 저장되어 모든 참가자 화면에 즉시 반영되었습니다!');
      setTimeout(() => setSaveMessage(null), 4000);
    } catch (e) {
      alert('설정 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefault = () => {
    if (!window.confirm('행사 설정 입력값을 초기 기본값(mmazing / LG인화원)으로 되돌리시겠습니까?\n(되돌린 후 [행사 설정 저장]을 눌러야 최종 반영됩니다.)')) {
      return;
    }
    setForm({
      ...DEFAULT_EVENT_CONFIG,
      tutorialOptions: [...DEFAULT_EVENT_CONFIG.tutorialOptions],
      wrapupQuizItems: DEFAULT_EVENT_CONFIG.wrapupQuizItems.map(i => ({ ...i })),
    });
  };

  return (
    <div className="space-y-5">
      {/* 안내 배너 */}
      <div className="bg-gradient-to-r from-indigo-950/70 to-slate-900 border border-indigo-500/40 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-xl">
        <div>
          <h3 className="text-[16px] font-black text-white flex items-center gap-2">
            ⚙️ 행사 문구 · 시간 · 퀴즈 실시간 커스터마이징
          </h3>
          <p className="text-[13.5px] text-slate-300 mt-0.5">
            코드 수정 없이 아래 항목을 변경하고 <strong>[행사 설정 저장]</strong>을 누르면 모든 참가자 휴대폰에 즉시 반영됩니다.
          </p>
        </div>
        <button
          type="button"
          onClick={handleResetDefault}
          className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-bold border border-white/10"
        >
          🔄 기본값 불러오기
        </button>
      </div>

      {saveMessage && (
        <div className="bg-emerald-500/20 border border-emerald-400/50 text-emerald-200 px-4 py-3 rounded-xl text-sm font-bold text-center animate-fade-in">
          {saveMessage}
        </div>
      )}

      {/* 0. 🧩 모듈형 실내/하이브리드 미션 블록 설정 (마스터 스위치 잠금 보호) */}
      <div className="bg-gradient-to-br from-[#191E34] via-[#141A2C] to-[#101625] border border-cyan-500/40 rounded-2xl p-4 space-y-3.5 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2.5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/40">
                MODULAR MISSION BLOCKS
              </span>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                isMasterUnlocked
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                  : 'bg-amber-500/20 text-amber-300 border-amber-400/40'
              }`}>
                {isMasterUnlocked ? '🔓 마스터 스위치 해제됨' : '🔒 마스터 전용 잠금'}
              </span>
            </div>
            <h4 className="text-[15.5px] font-black text-white mt-1">
              🧩 실내 & 하이브리드 스페셜 미션 블록 조립 (ON / OFF)
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              우천 시 실내 전환이나 프리미엄 결합 교육 시, 원하는 미션 블록만 스위치로 켜서 STEP 2에 즉시 추가합니다.
            </p>
          </div>

          {!isMasterUnlocked ? (
            <button
              type="button"
              onClick={() => setShowMasterPrompt(v => !v)}
              className="px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-200 text-xs font-extrabold transition-all"
            >
              🔑 마스터 스위치 잠금 해제
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setIsMasterUnlocked(false);
                try {
                  sessionStorage.removeItem('master_blocks_unlocked');
                } catch {}
              }}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-bold"
            >
              🔒 다시 잠그기
            </button>
          )}
        </div>

        {/* 마스터 비밀번호 입력창 */}
        {!isMasterUnlocked && showMasterPrompt && (
          <div className="bg-black/50 border border-amber-400/40 rounded-xl p-3 flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-amber-300">마스터 보안코드 입력:</span>
            <input
              type="password"
              value={masterInput}
              onChange={e => setMasterInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleUnlockMaster()}
              placeholder="마스터 코드를 입력하세요"
              className="flex-1 min-w-[160px] bg-slate-900 border border-white/15 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-amber-400"
            />
            <button
              type="button"
              onClick={handleUnlockMaster}
              className="px-3.5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs"
            >
              잠금 해제
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* 블록 1: 실내 만보기 & 에너지 게이지 미션 */}
          <div className={`rounded-2xl p-3.5 border transition-all ${
            form.enableStepMission
              ? 'bg-cyan-950/35 border-cyan-400/60 shadow-lg'
              : 'bg-black/30 border-white/10 opacity-80'
          }`}>
            <div className="flex items-start justify-between gap-2 mb-2.5">
              <div>
                <span className="text-[11px] font-bold text-cyan-300">BLOCK 1 · 모션 센서 연동</span>
                <h5 className="text-sm font-black text-white flex items-center gap-1.5 mt-0.5">
                  👟 실내 만보기 & 팀 에너지 게이지
                </h5>
              </div>
              <button
                type="button"
                disabled={!isMasterUnlocked}
                onClick={() => setForm({ ...form, enableStepMission: !form.enableStepMission })}
                className={`px-3 py-1.5 rounded-xl text-xs font-black border transition-all ${
                  !isMasterUnlocked
                    ? 'bg-slate-800 text-slate-500 border-white/10 cursor-not-allowed'
                    : form.enableStepMission
                    ? 'bg-cyan-400 text-slate-950 border-cyan-300 shadow'
                    : 'bg-white/10 text-slate-300 border-white/15 hover:bg-white/20'
                }`}
              >
                {form.enableStepMission ? 'ON (사용 중)' : 'OFF (비활성)'}
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <label className="text-slate-400 block mb-0.5">미션 버튼 표시 제목</label>
                <input
                  type="text"
                  disabled={!isMasterUnlocked}
                  value={form.stepMissionTitle}
                  onChange={e => setForm({ ...form, stepMissionTitle: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white disabled:opacity-50"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-0.5">조별 목표 합산 걸음수</label>
                  <input
                    type="number"
                    disabled={!isMasterUnlocked}
                    value={form.stepMissionTarget}
                    onChange={e => setForm({ ...form, stepMissionTarget: Number(e.target.value) || 300 })}
                    className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-0.5">달성 시 보상 점수(pt)</label>
                  <input
                    type="number"
                    disabled={!isMasterUnlocked}
                    value={form.stepMissionPoints}
                    onChange={e => setForm({ ...form, stepMissionPoints: Number(e.target.value) || 100 })}
                    className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white disabled:opacity-50"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 블록 2: 웹 AR 360° 실내 보물찾기 미션 */}
          <div className={`rounded-2xl p-3.5 border transition-all ${
            form.enableArMission
              ? 'bg-purple-950/35 border-purple-400/60 shadow-lg'
              : 'bg-black/30 border-white/10 opacity-80'
          }`}>
            <div className="flex items-start justify-between gap-2 mb-2.5">
              <div>
                <span className="text-[11px] font-bold text-purple-300">BLOCK 2 · 카메라 & 360° 스캔</span>
                <h5 className="text-sm font-black text-white flex items-center gap-1.5 mt-0.5">
                  🔮 웹 AR 360° 실내 보물찾기
                </h5>
              </div>
              <button
                type="button"
                disabled={!isMasterUnlocked}
                onClick={() => setForm({ ...form, enableArMission: !form.enableArMission })}
                className={`px-3 py-1.5 rounded-xl text-xs font-black border transition-all ${
                  !isMasterUnlocked
                    ? 'bg-slate-800 text-slate-500 border-white/10 cursor-not-allowed'
                    : form.enableArMission
                    ? 'bg-purple-400 text-slate-950 border-purple-300 shadow'
                    : 'bg-white/10 text-slate-300 border-white/15 hover:bg-white/20'
                }`}
              >
                {form.enableArMission ? 'ON (사용 중)' : 'OFF (비활성)'}
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <label className="text-slate-400 block mb-0.5">미션 버튼 표시 제목</label>
                <input
                  type="text"
                  disabled={!isMasterUnlocked}
                  value={form.arMissionTitle}
                  onChange={e => setForm({ ...form, arMissionTitle: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white disabled:opacity-50"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-0.5">보물 3종 캡처 시 보상 점수(pt)</label>
                <input
                  type="number"
                  disabled={!isMasterUnlocked}
                  value={form.arMissionPoints}
                  onChange={e => setForm({ ...form, arMissionPoints: Number(e.target.value) || 100 })}
                  className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white disabled:opacity-50"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 1. 기본 행사 브랜딩 및 장소 */}
      <div className="bg-[#1A2235] border border-white/10 rounded-2xl p-4 space-y-3 shadow-xl">
        <h4 className="text-[15px] font-bold text-sky-400 border-b border-white/10 pb-2">
          1. 행사 타이틀 · 교육장 · 배지 문구
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-400 block mb-1">상단 메인 브랜드명</label>
            <input
              type="text"
              value={form.brandTitle}
              onChange={e => setForm({ ...form, brandTitle: e.target.value })}
              placeholder="예: mmazing"
              className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">상단 서브 타이틀</label>
            <input
              type="text"
              value={form.eventSubtitle}
              onChange={e => setForm({ ...form, eventSubtitle: e.target.value })}
              placeholder="예: TEAM ACTIVITY"
              className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">교육장 / 베뉴 명칭</label>
            <input
              type="text"
              value={form.venueName}
              onChange={e => setForm({ ...form, venueName: e.target.value })}
              placeholder="예: LG인화원"
              className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">트레킹 코스 표시명</label>
            <input
              type="text"
              value={form.courseName}
              onChange={e => setForm({ ...form, courseName: e.target.value })}
              placeholder="예: LG인화원 트레킹 코스"
              className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">대시보드 좌측 집결 배지</label>
            <input
              type="text"
              value={form.gatheringBadge}
              onChange={e => setForm({ ...form, gatheringBadge: e.target.value })}
              placeholder="예: 13시 집결"
              className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">첫 화면 일정 안내 배지</label>
            <input
              type="text"
              value={form.scheduleBadge}
              onChange={e => setForm({ ...form, scheduleBadge: e.target.value })}
              placeholder="예: 🕐 오후 1:00 ~ 3:00"
              className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>
      </div>

      {/* 2. 집결 카운트다운 및 STEP 4 오픈 시간 */}
      <div className="bg-[#1A2235] border border-white/10 rounded-2xl p-4 space-y-3 shadow-xl">
        <h4 className="text-[15px] font-bold text-amber-400 border-b border-white/10 pb-2">
          2. 최종 집결 타이머 & STEP 4 오픈 시각 (24시간 기준)
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-400 block mb-1">
              최종 집결 목표 시각 (상단 카운트다운 타이머 기준)
            </label>
            <input
              type="time"
              value={form.finalGatheringTime}
              onChange={e => setForm({ ...form, finalGatheringTime: e.target.value })}
              className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">
              STEP 4 (사진 투표 & Q2) 자동 오픈 시각
            </label>
            <input
              type="time"
              value={form.step4OpenTime}
              onChange={e => setForm({ ...form, step4OpenTime: e.target.value })}
              className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>
      </div>

      {/* 3. STEP 1 연습 Quiz 설정 */}
      <div className="bg-[#1A2235] border border-white/10 rounded-2xl p-4 space-y-3 shadow-xl">
        <h4 className="text-[15px] font-bold text-emerald-400 border-b border-white/10 pb-2">
          3. STEP 1 연습 Quiz 문항 및 정답 설정 (+50pt)
        </h4>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-400 block mb-1">연습 퀴즈 질문</label>
            <input
              type="text"
              value={form.tutorialQuestion}
              onChange={e => setForm({ ...form, tutorialQuestion: e.target.value })}
              className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs text-slate-400 block">
              4지선다 보기 입력 및 정답 선택 (우측 버튼 클릭 시 정답으로 지정)
            </label>
            {[0, 1, 2, 3].map(idx => {
              const isCorrect = form.tutorialCorrectIndex === idx;
              return (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 w-6 text-center">{idx + 1}번</span>
                  <input
                    type="text"
                    value={form.tutorialOptions[idx] || ''}
                    onChange={e => updateOption(idx, e.target.value)}
                    placeholder={`보기 ${idx + 1}`}
                    className="flex-1 bg-black/40 border border-white/10 rounded-xl p-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, tutorialCorrectIndex: idx })}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                      isCorrect
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black'
                        : 'bg-black/40 text-slate-400 border-white/10 hover:text-white'
                    }`}
                  >
                    {isCorrect ? '✓ 정답' : '정답 지정'}
                  </button>
                </div>
              );
            })}
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">정답 선택 시 해설 문구</label>
            <input
              type="text"
              value={form.tutorialExplanation}
              onChange={e => setForm({ ...form, tutorialExplanation: e.target.value })}
              className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* 4. STEP 3 단체사진 미션 설정 */}
      <div className="bg-[#1A2235] border border-white/10 rounded-2xl p-4 space-y-3 shadow-xl">
        <h4 className="text-[15px] font-bold text-pink-400 border-b border-white/10 pb-2">
          4. STEP 3 조별 단체사진 미션 안내 설정 (+100pt)
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-slate-400 block mb-1">단체사진 미션 제목</label>
            <input
              type="text"
              value={form.photoMissionTitle}
              onChange={e => setForm({ ...form, photoMissionTitle: e.target.value })}
              className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-sm text-white"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">촬영 스팟 장소명</label>
            <input
              type="text"
              value={form.photoLocationName}
              onChange={e => setForm({ ...form, photoLocationName: e.target.value })}
              className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-sm text-white"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">권장 촬영 시간 표시</label>
            <input
              type="text"
              value={form.photoTimeRange}
              onChange={e => setForm({ ...form, photoTimeRange: e.target.value })}
              className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-sm text-white"
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-slate-400 block mb-1">촬영 가이드 안내 설명</label>
          <input
            type="text"
            value={form.photoHintDescription}
            onChange={e => setForm({ ...form, photoHintDescription: e.target.value })}
            className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-sm text-white"
          />
        </div>
      </div>

      {/* 5. STEP 4 Q2 마무리 퀴즈 설정 */}
      <div className="bg-[#1A2235] border border-white/10 rounded-2xl p-4 space-y-3 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2">
          <h4 className="text-[15px] font-bold text-purple-400">
            5. STEP 4 Q2 마무리 퀴즈 문항 설정 (복수 선택 · 정답 개당 +50pt)
          </h4>
          <button
            type="button"
            onClick={addWrapupItem}
            className="px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold"
          >
            + 보기 문항 추가
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <label className="text-xs text-slate-400 block mb-1">Q2 질문 제목</label>
            <input
              type="text"
              value={form.wrapupQuizTitle}
              onChange={e => setForm({ ...form, wrapupQuizTitle: e.target.value })}
              className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-sm text-white"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">오답 선택 시 감점 여부</label>
            <select
              value={form.wrapupWrongPenalty}
              onChange={e => setForm({ ...form, wrapupWrongPenalty: Number(e.target.value) })}
              className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-sm text-white"
            >
              <option value={0}>감점 없음 (0pt)</option>
              <option value={50}>오답 선택 시 -50pt 감점</option>
            </select>
          </div>
        </div>

        <div className="space-y-2 pt-1">
          <label className="text-xs text-slate-400 block">
            보기 문항 목록 (각 문항의 정답/오답 여부를 클릭해 전환할 수 있습니다)
          </label>
          {form.wrapupQuizItems.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 w-6 text-center">{idx + 1}</span>
              <input
                type="text"
                value={item.text}
                onChange={e => updateWrapupItem(idx, { text: e.target.value })}
                placeholder={`보기 문항 ${idx + 1}`}
                className="flex-1 bg-black/40 border border-white/10 rounded-xl p-2 text-sm text-white"
              />
              <button
                type="button"
                onClick={() => updateWrapupItem(idx, { correct: !item.correct })}
                className={`px-3 py-2 rounded-xl text-xs font-bold border whitespace-nowrap ${
                  item.correct
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                }`}
              >
                {item.correct ? '⭕ 정답 (+50pt)' : '❌ 오답'}
              </button>
              <button
                type="button"
                onClick={() => removeWrapupItem(idx)}
                className="px-2.5 py-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-300 text-xs font-bold"
                title="문항 삭제"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 저장 버튼 */}
      <button
        type="button"
        disabled={isSaving}
        onClick={handleSave}
        className="w-full py-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 disabled:opacity-50 text-white font-black text-base rounded-2xl shadow-2xl active:scale-98 transition-all"
      >
        {isSaving ? '저장 중...' : '💾 행사 설정 저장 및 전체 참가자 화면 즉시 반영'}
      </button>
    </div>
  );
};
