import React from 'react';

interface ParticipantRecord {
  id: string;
  name: string;
  company: string;
  teamId?: string;
  teamName?: string;
  course?: string;
  score?: number;
  truth1?: string;
  truth2?: string;
  lie?: string;
  myInfo?: { [key: string]: string };
}

interface NominationStat {
  count: number;
  byTeams: string[];
  reasons: string[];
  topics: string[];
}

interface MCCueSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  participant: ParticipantRecord | null;
  nominationStat: NominationStat | null;
  currentIndex: number;
  totalCount: number;
  onSelectParticipant?: (index: number) => void;
  participants?: ParticipantRecord[];
}

const QUESTION_PROMPTS: { [key: string]: { title: string; prompt: string; icon: string } } = {
  q1_passion: {
    title: 'Q1. 취미 및 관심사 (1단계)',
    prompt: '🎤 MC 팁: "이 취미에 푹 빠지게 된 특별한 계기나 가장 기억에 남는 에피소드가 있으신가요?"',
    icon: '🎯',
  },
  q3_bucketList: {
    title: 'Q2. 3년 내 버킷리스트 (1단계)',
    prompt: '🎤 MC 팁: "이 버킷리스트를 이루기 위해 올해 계획 중이신 첫 번째 실행 단계가 있으신가요?"',
    icon: '⭐',
  },
  q4_dreamJob: {
    title: 'Q3. 해보고 싶은 다른 직업 (2단계)',
    prompt: '🎤 MC 팁: "만약 이 직업을 선택하셨다면 지금 어떤 모습으로 활동하고 계실 것 같나요?"',
    icon: '💼',
  },
  q5_unexpectedFact: {
    title: 'Q4. 의외의 사실 & 숨은 이력 (2단계)',
    prompt: '🎤 MC 팁: "주변 동료들이 이 사실을 처음 알았을 때 반응이 어떠셨나요?"',
    icon: '😮',
  },
};

export const MCCueSheetModal: React.FC<MCCueSheetModalProps> = ({
  isOpen,
  onClose,
  participant,
  nominationStat,
  currentIndex,
  totalCount,
  onSelectParticipant,
  participants = [],
}) => {
  if (!isOpen || !participant) return null;

  const info = participant.myInfo || {};

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in font-['Noto_Sans_KR']">
      <div className="bg-[#0F172A] border-2 border-amber-500/40 w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* 헤더 */}
        <div className="bg-gradient-to-r from-amber-600/30 via-slate-900 to-slate-900 border-b border-white/10 p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📋</span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-amber-300">
                  MC 무대 진행 큐시트 (진행자 전용)
                </h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  #{currentIndex + 1} / {totalCount}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                현장 참가자의 4문항 전체 답변 및 낮 피플퀘스트 추천 코멘트, 맞춤 인터뷰 질문 팁
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 text-lg font-bold transition-all"
          >
            ✕
          </button>
        </div>

        {/* 인물 기본 프로필 요약 카드 */}
        <div className="bg-black/40 border-b border-white/10 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-2xl font-black text-white shadow-lg">
              {participant.name ? participant.name.slice(0, 1) : '인'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black text-white">{participant.name || '미등록'}</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 font-bold">
                  {participant.company || '소속 미지정'}
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                  {participant.teamName || participant.teamId || '팀 미정'}
                </span>
              </div>
              <div className="text-xs text-slate-400 mt-1 flex items-center gap-3">
                <span>코스: <strong className="text-slate-200">{participant.course || '미정'}</strong></span>
                <span>총 획득 점수: <strong className="text-amber-400">{participant.score ?? 0} pt</strong></span>
              </div>
            </div>
          </div>

          {/* 참가자 바로가기 셀렉터 */}
          {participants.length > 0 && onSelectParticipant && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">참가자 전환:</span>
              <select
                value={currentIndex}
                onChange={(e) => onSelectParticipant(Number(e.target.value))}
                className="bg-slate-800 text-slate-200 text-xs rounded-xl px-3 py-1.5 border border-white/20 font-bold focus:outline-none focus:border-amber-400"
              >
                {participants.map((p, idx) => (
                  <option key={p.id} value={idx}>
                    #{idx + 1} {p.name} ({p.company || '소속'})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* 스크롤 영역 (문항 + 추천 사유) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 낮 피플퀘스트 추천 코멘트가 있을 때 하이라이트 박스 */}
          {nominationStat && nominationStat.count > 0 && (
            <div className="bg-amber-500/10 border-2 border-amber-500/40 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span>🌟</span> 낮 트레킹 동료 지목 현황 ({nominationStat.count}개 조에서 강력 추천!)
                </span>
                <span className="text-xs text-amber-300 font-bold">
                  지목 조: {nominationStat.byTeams.join(', ')}
                </span>
              </div>
              <div className="space-y-1.5 pt-1">
                {nominationStat.reasons.map((reason, idx) => (
                  <div key={idx} className="bg-black/40 border border-amber-500/20 rounded-xl p-3 text-sm text-slate-200 font-medium">
                    💬 "{reason}"
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4문항 상세 답변 & 인터뷰 팁 리스트 */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
              📝 참가자 작성 4문항 전체 답변 & 인터뷰 유도 팁
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(QUESTION_PROMPTS).map(([key, config]) => {
                const answer = info[key] || (key === 'q1_passion' ? participant.truth1 : key === 'q4_dreamJob' ? participant.lie : key === 'q5_unexpectedFact' ? participant.truth2 : '') || '미입력';
                const hasAnswer = answer !== '미입력' && Boolean(answer);

                return (
                  <div
                    key={key}
                    className={`rounded-2xl p-4 border transition-all ${
                      hasAnswer
                        ? 'bg-[#141E33] border-white/15 shadow'
                        : 'bg-black/20 border-white/5 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-base">{config.icon}</span>
                      <span className="text-xs font-bold text-amber-300">{config.title}</span>
                    </div>
                    <div className="bg-black/50 border border-white/10 rounded-xl p-3 mb-2">
                      <p className="text-sm font-bold text-white leading-snug">
                        "{answer}"
                      </p>
                    </div>
                    <p className="text-xs text-sky-300 italic bg-sky-950/40 border border-sky-500/20 rounded-lg p-2">
                      {config.prompt}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 푸터 */}
        <div className="bg-black/60 border-t border-white/10 p-4 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            💡 단축키 가이드: 무대 화면에서 <strong className="text-amber-300">Space(다음 단계)</strong>, <strong className="text-amber-300">C(폭죽)</strong>, <strong className="text-amber-300">ESC(닫기)</strong>
          </span>
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-sm rounded-xl transition-all shadow-lg active:scale-95"
          >
            확인 및 큐시트 닫기
          </button>
        </div>
      </div>
    </div>
  );
};
