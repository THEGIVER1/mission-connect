import React, { useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { WORKSHOP_TEAMS } from '../../config/workshopConfig';
import { fireConfetti } from '../../lib/confetti';

interface CompletionCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  personalScore: number;
  teamScore: number;
  totalMissions: number;
}

export const CompletionCertificateModal: React.FC<CompletionCertificateModalProps> = ({
  isOpen,
  onClose,
  personalScore,
  teamScore,
  totalMissions,
}) => {
  const { participantName, participantCompany, myTeam } = useAppStore();
  const teamConfig = WORKSHOP_TEAMS.find(t => t.id === myTeam?.id);

  const issueDate = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  useEffect(() => {
    if (isOpen) {
      fireConfetti({ count: 120, spread: 90 });
      const timer = setTimeout(() => {
        fireConfetti({ count: 70, spread: 60 });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-gradient-to-b from-[#1C2538] via-[#13192A] to-[#0D1117] border-2 border-amber-400/60 w-full max-w-[360px] max-h-[92vh] rounded-3xl flex flex-col shadow-[0_0_50px_rgba(251,191,36,0.3)] overflow-hidden animate-fade-in relative">
        {/* 장식용 골드 코너 */}
        <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-amber-400 pointer-events-none" />
        <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-amber-400 pointer-events-none" />
        <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-amber-400 pointer-events-none" />
        <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-amber-400 pointer-events-none" />

        {/* 상단 타이틀 */}
        <div className="pt-6 pb-2 text-center px-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-600 via-amber-400 to-yellow-200 text-slate-950 flex items-center justify-center text-3xl mx-auto shadow-lg shadow-amber-500/30 ring-4 ring-amber-400/20 animate-pulse">
            👑
          </div>
          <span className="text-[10px] text-amber-300 font-extrabold tracking-[0.2em] uppercase mt-2.5 block">
            HALL OF FAME · OFFICIAL CERTIFICATE
          </span>
          <h2 className="text-[20px] font-extrabold text-white tracking-tight mt-0.5 font-['Noto_Sans_KR']">
            2026 CHRO 트레킹 완주 증서
          </h2>
          <p className="text-[11px] text-slate-300 mt-1 leading-snug">
            두산 가족과 함께 걸으며 소통과 탐색 미션을 모두 완수한 영예로운 기록을 인증합니다.
          </p>
        </div>

        {/* 증서 본문 카드 */}
        <div className="p-4 space-y-3 flex-1 overflow-y-auto">
          <div className="bg-black/40 border border-amber-500/30 rounded-2xl p-4 text-center space-y-3">
            <div>
              <p className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                COMPLETER (완주자)
              </p>
              <h3 className="text-[18px] font-bold text-white mt-0.5">
                {participantName || '두산 리더'} 님
              </h3>
              <p className="text-[12px] text-slate-300">
                {participantCompany || '㈜두산 / 두산경영연구원'}
              </p>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />

            <div className="grid grid-cols-2 gap-2 text-left text-[11px]">
              <div className="bg-[#1A2235]/80 p-2.5 rounded-xl border border-white/5">
                <span className="text-slate-400 block text-[10px]">참여 조 및 코스</span>
                <strong className="text-white text-[12px] mt-0.5 block truncate">
                  {teamConfig?.emoji} {teamConfig?.name} · {teamConfig?.courseName}
                </strong>
              </div>
              <div className="bg-[#1A2235]/80 p-2.5 rounded-xl border border-white/5">
                <span className="text-slate-400 block text-[10px]">완료 미션 수</span>
                <strong className="text-emerald-400 text-[12px] mt-0.5 block">
                  총 {totalMissions}개 전원 완주 (100%)
                </strong>
              </div>
              <div className="bg-[#1A2235]/80 p-2.5 rounded-xl border border-white/5">
                <span className="text-slate-400 block text-[10px]">개인 획득 점수</span>
                <strong className="text-amber-300 text-[12px] mt-0.5 block font-bebas text-sm">
                  {personalScore} pt
                </strong>
              </div>
              <div className="bg-[#1A2235]/80 p-2.5 rounded-xl border border-white/5">
                <span className="text-slate-400 block text-[10px]">우리 조 총점</span>
                <strong className="text-amber-400 text-[12px] mt-0.5 block font-bebas text-sm">
                  {teamScore.toLocaleString()} pt
                </strong>
              </div>
            </div>

            <div className="pt-2 text-center">
              <p className="text-[10px] text-slate-400">발급 일자: {issueDate}</p>
              <div className="flex items-center justify-center gap-1.5 mt-1 text-amber-300 text-[11px] font-bold">
                <span>🎖️</span>
                <span>2026 CHRO TREKKING 운영위원회</span>
              </div>
            </div>
          </div>
        </div>

        {/* 하단 버튼 */}
        <div className="bg-[#182035] border-t border-white/10 p-4 flex gap-2 flex-shrink-0">
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: '2026 CHRO 트레킹 완주 증서',
                  text: `${participantName}님이 2026 CHRO 트레킹 코스(${teamConfig?.courseName})를 성공적으로 완주했습니다! 🏆`,
                  url: window.location.href,
                }).catch(() => {});
              } else {
                alert('📸 스마트폰 화면을 캡처하여 소장해 보세요!');
              }
            }}
            className="flex-1 py-3 bg-[#13192A] text-amber-300 hover:bg-[#1A2235] font-bold text-[12px] rounded-xl border border-amber-500/30 flex items-center justify-center gap-1 active:scale-95 transition-all"
          >
            <span>📸 화면 캡처/소장</span>
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 font-extrabold text-[13px] rounded-xl shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
          >
            확인 완료 닫기
          </button>
        </div>
      </div>
    </div>
  );
};
export default CompletionCertificateModal;
