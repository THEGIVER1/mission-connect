import React, { useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { WORKSHOP_TEAMS, IS_PILOT_MODE } from '../../config/workshopConfig';
import { fireConfetti } from '../../lib/confetti';

interface CompletionCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamScore: number;
  totalMissions: number;
}

export const CompletionCertificateModal: React.FC<CompletionCertificateModalProps> = ({
  isOpen,
  onClose,
  teamScore,
  totalMissions,
}) => {
  const { myTeam } = useAppStore();
  const teamConfig = WORKSHOP_TEAMS.find(t => t.id === myTeam?.id);

  const issueDate = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  useEffect(() => {
    if (isOpen) {
      fireConfetti({ count: 100, spread: 80 });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-gradient-to-b from-[#1C2538] via-[#13192A] to-[#0D1117] border-2 border-amber-400/60 w-full max-w-[400px] rounded-3xl flex flex-col shadow-2xl overflow-hidden animate-fade-in">
        <div className="pt-6 pb-3 text-center px-4">
          <span className="text-[12px] text-amber-300 font-extrabold tracking-widest uppercase block">
            OFFICIAL CERTIFICATE
          </span>
          <h2 className="text-[20px] font-extrabold text-white mt-1">
            {IS_PILOT_MODE ? '연강원 Team Activity 완주 증서' : '2026 CHRO 트래킹 완주 증서'}
          </h2>
        </div>

        <div className="p-4 space-y-3">
          <div className="bg-black/40 border border-amber-500/30 rounded-2xl p-4 text-center space-y-3">
            <div>
              <p className="text-[12.5px] text-amber-400 font-bold">완주 조</p>
              <h3 className="text-[20px] font-bold text-white mt-0.5">
                {teamConfig?.name || myTeam?.name || '우리 조'}
              </h3>
            </div>

            <div className="h-px bg-white/10" />

            <div className="grid grid-cols-2 gap-2 text-left text-[13.5px]">
              <div className="bg-[#1A2235]/80 p-2.5 rounded-xl border border-white/5">
                <span className="text-slate-400 block text-[12px]">완료 미션</span>
                <strong className="text-emerald-400 text-[15px] mt-0.5 block">
                  {totalMissions} / 2 완료
                </strong>
              </div>
              <div className="bg-[#1A2235]/80 p-2.5 rounded-xl border border-white/5">
                <span className="text-slate-400 block text-[12px]">조별 총점</span>
                <strong className="text-amber-400 text-[15px] mt-0.5 block font-bebas">
                  {teamScore} pt
                </strong>
              </div>
            </div>

            {!IS_PILOT_MODE && (
              <div className="bg-amber-500/10 border border-amber-400/30 rounded-xl px-3 py-3 text-[14px] text-slate-100 leading-relaxed">
                보이지 않는 곳에서도 묵묵히 소임을 다하며 조직을 더 따뜻하게 만들어 온{' '}
                <strong className="text-amber-300">우리 모두에게 뜨거운 박수를 보냅니다.</strong>
                <span className="block mt-1.5 text-slate-300">
                  올 한 해 정말 수고 많으셨습니다.
                </span>
              </div>
            )}

            <p className="text-[12px] text-slate-400 pt-1">발급 일자: {issueDate}</p>
          </div>
        </div>

        <div className="bg-[#182035] border-t border-white/10 p-4">
          <button
            onClick={onClose}
            className="w-full py-3 bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-[15px] rounded-xl shadow active:scale-95 transition-all"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
};
export default CompletionCertificateModal;
