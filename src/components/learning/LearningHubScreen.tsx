import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { useEventConfig } from '../../hooks/useEventConfig';
import { normalizeTeamId, createParticipantId } from '../../utils/scoreCalculator';
import { canvasProgress, isCanvasSubmitted, countStampsForTeam } from '../../config/learningConfig';
import { useLearningSubjectData } from './learningDb';
import { IdeaWall } from './IdeaWall';
import { DiscussionCanvas } from './DiscussionCanvas';
import { InsightShowcase } from './InsightShowcase';
import { getTeamCfg } from './LearningShared';

type HubTab = 'wall' | 'canvas' | 'showcase';

const LearningHubScreen: React.FC = () => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const eventConfig = useEventConfig();
  const { myTeam, participantName, participantCompany } = useAppStore();

  const teamId = normalizeTeamId(myTeam?.id);
  const me = useMemo(
    () => ({
      pid: createParticipantId(participantName || '익명', participantCompany),
      name: participantName || '익명',
      company: participantCompany || '',
      teamId,
    }),
    [participantName, participantCompany, teamId]
  );

  const subject =
    eventConfig.learningSubjects.find(s => s.id === eventConfig.activeLearningSubjectId) || eventConfig.learningSubjects[0];
  const { data, isLoaded, refresh } = useLearningSubjectData(subject?.id);

  const initialTab = (params.get('tab') as HubTab) || 'wall';
  const [tab, setTab] = useState<HubTab>(['wall', 'canvas', 'showcase'].includes(initialTab) ? initialTab : 'wall');

  useEffect(() => {
    setParams({ tab }, { replace: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const team = getTeamCfg(teamId);
  const myCanvas = data.canvas[teamId];
  const mySubmitted = isCanvasSubmitted(myCanvas);
  const myStamps = countStampsForTeam(data.votes, teamId);

  if (eventConfig.learningDisplay === 'off' || !subject) {
    return (
      <div className="max-w-[430px] mx-auto bg-[#0D1117] min-h-screen flex items-center justify-center p-6 font-['Noto_Sans_KR']">
        <div className="text-center space-y-3">
          <p className="text-5xl">📚</p>
          <p className="text-[18px] font-black text-white">학습 토의 모듈이 아직 열리지 않았어요</p>
          <p className="text-[13.5px] text-slate-400">강사님 안내에 따라 곧 오픈됩니다.</p>
          <button onClick={() => navigate('/')} className="mt-2 px-5 py-2.5 rounded-xl bg-white/10 text-white font-bold">
            ← 홈으로
          </button>
        </div>
      </div>
    );
  }

  const tabs: { key: HubTab; icon: string; label: string; sub: string; color: string }[] = [
    { key: 'wall', icon: '💬', label: '포스트잇 월', sub: `${data.wall.length}장`, color: '#F59E0B' },
    {
      key: 'canvas',
      icon: '🧩',
      label: '토의 캔버스',
      sub: mySubmitted ? '제출 ✓' : `${canvasProgress(myCanvas)}/3`,
      color: '#38BDF8',
    },
    {
      key: 'showcase',
      icon: '🏆',
      label: '쇼케이스',
      sub: mySubmitted ? `받은 ${myStamps.total}` : '🔒',
      color: '#E879F9',
    },
  ];

  return (
    <div className="max-w-[430px] mx-auto bg-[#0B0F19] min-h-screen pb-16 font-['Noto_Sans_KR']">
      {/* 헤더 */}
      <header className="relative bg-[#121829] border-b border-white/10 px-4 pt-3 pb-3 overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-400 via-sky-400 to-fuchsia-500" />
        <div className="absolute -right-10 -top-10 w-36 h-36 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="flex items-center justify-between relative">
          <button
            onClick={() => navigate('/')}
            className="px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-[12.5px] font-bold"
          >
            ← 홈
          </button>
          <span className="font-['Bebas_Neue'] text-[22px] tracking-[0.2em] text-white">
            LEARNING <span className="text-amber-400">LAB</span>
          </span>
          <span
            className="text-[11.5px] font-black px-2 py-1 rounded-lg text-white"
            style={{ background: team.color }}
          >
            {team.name} · {me.name}
          </span>
        </div>
        <div className="mt-2.5 relative">
          <p className="text-[11px] font-bold text-slate-400">📚 지금 진행 중인 과목</p>
          <p className="text-[17px] font-black text-white leading-tight" style={{ wordBreak: 'keep-all' }}>
            {subject.title}
          </p>
        </div>
      </header>

      {/* 패키지 흐름 탭 */}
      <div className="sticky top-0 z-30 bg-[#0B0F19]/95 backdrop-blur px-3 pt-2.5 pb-2 border-b border-white/5">
        <div className="flex items-stretch gap-1">
          {tabs.map((t, i) => {
            const active = tab === t.key;
            return (
              <React.Fragment key={t.key}>
                <button
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={`flex-1 rounded-2xl px-1.5 py-2 border transition-all ${
                    active ? 'bg-[#1A2236] shadow-lg' : 'bg-transparent border-transparent opacity-60'
                  }`}
                  style={active ? { borderColor: `${t.color}99` } : undefined}
                >
                  <p className="text-[18px] leading-none">{t.icon}</p>
                  <p className={`text-[12.5px] font-black mt-1 ${active ? 'text-white' : 'text-slate-300'}`}>{t.label}</p>
                  <p className="text-[10.5px] font-bold mt-0.5" style={{ color: t.color }}>
                    {t.sub}
                  </p>
                </button>
                {i < tabs.length - 1 && <span className="self-center text-slate-600 text-[12px]">›</span>}
              </React.Fragment>
            );
          })}
        </div>
        <div className="flex justify-between px-2 mt-1.5 text-[10px] font-bold text-slate-500">
          <span>모듈 1 · 전체 교육생</span>
          <span>모듈 2 · 조별 토의 → 공유 투표</span>
        </div>
      </div>

      <main className="px-3.5 pt-4">
        {!isLoaded ? (
          <div className="py-20 flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-slate-400 text-[13px]">학습 보드를 불러오는 중…</span>
          </div>
        ) : tab === 'wall' ? (
          <>
            <IdeaWall subject={subject} data={data} me={me} onRefresh={refresh} />
            <button
              type="button"
              onClick={() => setTab('canvas')}
              className="mt-5 w-full py-3.5 rounded-2xl bg-gradient-to-r from-sky-500/25 to-blue-600/20 border border-sky-400/50 text-sky-100 font-black text-[14.5px]"
            >
              다음: 🧩 우리 조 토의 캔버스로 이동 →
            </button>
          </>
        ) : tab === 'canvas' ? (
          <DiscussionCanvas
            key={subject.id}
            subject={subject}
            data={data}
            me={me}
            onGoShowcase={() => setTab('showcase')}
            onRefresh={refresh}
          />
        ) : (
          <InsightShowcase
            subject={subject}
            data={data}
            me={me}
            stampPoints={Number(eventConfig.learningStampPoints) || 0}
            onGoCanvas={() => setTab('canvas')}
            onRefresh={refresh}
          />
        )}
      </main>
    </div>
  );
};

export default LearningHubScreen;
