import React, { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { rtdb } from '../../lib/firebase';

export interface BroadcastNoticeData {
  id: string;
  title?: string;
  message: string;
  type?: 'info' | 'urgent' | 'photo' | 'dinner';
  active: boolean;
  timestamp: string;
  sender?: string;
}

export const GlobalNoticeBanner: React.FC = () => {
  const [notice, setNotice] = useState<BroadcastNoticeData | null>(null);
  const [dismissedId, setDismissedId] = useState<string | null>(() => {
    return sessionStorage.getItem('last_dismissed_notice_id') || null;
  });

  useEffect(() => {
    const noticeRef = ref(rtdb, 'sessions/trekking2026/broadcastNotice');
    const unsubscribe = onValue(
      noticeRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val() as BroadcastNoticeData;
          if (data && data.active && data.message) {
            setNotice(data);
          } else {
            setNotice(null);
          }
        } else {
          setNotice(null);
        }
      },
      (error) => {
        console.warn('공지사항 실시간 수신 실패:', error);
      }
    );

    return () => unsubscribe();
  }, []);

  if (!notice || !notice.active || notice.id === dismissedId) {
    return null;
  }

  const handleDismiss = () => {
    if (notice?.id) {
      setDismissedId(notice.id);
      sessionStorage.setItem('last_dismissed_notice_id', notice.id);
    }
  };

  // 공지 유형별 아이콘 및 스타일
  const getTypeConfig = (type?: string) => {
    switch (type) {
      case 'photo':
        return {
          icon: '📸',
          badge: '단체사진 집결',
          badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
          border: 'border-emerald-500/50 shadow-emerald-500/20',
          gradient: 'from-[#0d281e] via-[#101b2b] to-[#0d1626]',
        };
      case 'dinner':
        return {
          icon: '🍽️',
          badge: '저녁 만찬 & 퀴즈쇼',
          badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          border: 'border-amber-500/50 shadow-amber-500/20',
          gradient: 'from-[#2b1f0d] via-[#1b1928] to-[#0d1626]',
        };
      case 'urgent':
        return {
          icon: '⚡',
          badge: '운영본부 긴급 공지',
          badgeBg: 'bg-red-500/20 text-red-300 border-red-500/40',
          border: 'border-red-500/60 shadow-red-500/30',
          gradient: 'from-[#2e0e14] via-[#1c1424] to-[#0d1626]',
        };
      case 'info':
      default:
        return {
          icon: '📢',
          badge: '운영본부 알림',
          badgeBg: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
          border: 'border-sky-500/50 shadow-sky-500/20',
          gradient: 'from-[#0e1e33] via-[#13192a] to-[#0d1626]',
        };
    }
  };

  const config = getTypeConfig(notice.type);

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] p-3 max-w-[440px] mx-auto pointer-events-none animate-bounce-in">
      <div
        className={`pointer-events-auto bg-gradient-to-br ${config.gradient} border-2 ${config.border} rounded-2xl p-4 shadow-2xl backdrop-blur-xl transition-all`}
        style={{
          boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.8), 0 0 20px 2px rgba(227, 24, 55, 0.25)',
        }}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xl animate-pulse">{config.icon}</span>
            <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border ${config.badgeBg}`}>
              {config.badge}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            {notice.timestamp ? new Date(notice.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : ''}
          </span>
        </div>

        {notice.title && (
          <h4 className="text-[14px] font-black text-white mb-1 leading-snug">
            {notice.title}
          </h4>
        )}

        <p className="text-[13px] font-medium text-slate-100 leading-relaxed break-keep mb-3">
          {notice.message}
        </p>

        <div className="flex justify-end gap-2 pt-1 border-t border-white/10">
          <button
            onClick={handleDismiss}
            className="px-4 py-1.5 bg-white/15 hover:bg-white/25 active:scale-95 text-white font-bold text-[12px] rounded-xl border border-white/20 transition-all shadow"
          >
            확인 (닫기) ✓
          </button>
        </div>
      </div>
    </div>
  );
};

export default GlobalNoticeBanner;
