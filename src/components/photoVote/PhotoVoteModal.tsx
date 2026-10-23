import React, { useState, useEffect, useMemo } from 'react';
import { WORKSHOP_TEAMS, IS_PILOT_MODE } from '../../config/workshopConfig';
import { normalizeTeamId } from '../../utils/scoreCalculator';
import { rtdb, FIREBASE_DB_URL } from '../../lib/firebase';
import { ref, onValue, set } from 'firebase/database';
import { fireConfetti } from '../../lib/confetti';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  teamId: string;
  participantName?: string | null;
}

export const PhotoVoteModal: React.FC<Props> = ({
  isOpen,
  onClose,
  teamId,
  participantName,
}) => {
  const normTeamId = normalizeTeamId(teamId);
  const myTeamConfig = WORKSHOP_TEAMS.find(t => t.id === normTeamId) || WORKSHOP_TEAMS[0];

  const [photosMap, setPhotosMap] = useState<Record<string, any>>({});
  const [votesMap, setVotesMap] = useState<Record<string, any>>({});
  const [isVoting, setIsVoting] = useState<boolean>(false);
  const [zoomPhotoUrl, setZoomPhotoUrl] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string>('');

  const dbUrl = FIREBASE_DB_URL;

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2500);
  };

  // 실시간 단체사진 및 투표 데이터 동기화 (REST + WebSocket)
  useEffect(() => {
    if (!isOpen) return;

    const fetchAll = async () => {
      try {
        const res = await fetch(`${dbUrl}/sessions/trekking2026.json?t=${Date.now()}`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          setPhotosMap(data?.themeGardenPhotos || {});
          setVotesMap(data?.photoVotes || {});
        }
      } catch (e) {
        console.warn('투표 데이터 조회 경고:', e);
      }
    };

    fetchAll();
    const interval = setInterval(fetchAll, 2500);

    let unsubPhotos = () => {};
    let unsubVotes = () => {};
    try {
      const photosRef = ref(rtdb, 'sessions/trekking2026/themeGardenPhotos');
      unsubPhotos = onValue(photosRef, snap => {
        setPhotosMap(snap.exists() ? snap.val() : {});
      });

      const votesRef = ref(rtdb, 'sessions/trekking2026/photoVotes');
      unsubVotes = onValue(votesRef, snap => {
        setVotesMap(snap.exists() ? snap.val() : {});
      });
    } catch (e) {}

    return () => {
      clearInterval(interval);
      unsubPhotos();
      unsubVotes();
    };
  }, [isOpen, dbUrl]);

  // 우리 조가 투표한 대상 조 ID
  const myVotedTeamId = useMemo(() => {
    const myVote = votesMap[normTeamId];
    return myVote?.votedTeamId ? normalizeTeamId(myVote.votedTeamId) : null;
  }, [votesMap, normTeamId]);

  // 각 조별 득표 수 집계
  const voteCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    WORKSHOP_TEAMS.forEach(t => { counts[t.id] = 0; });
    Object.values(votesMap).forEach((v: any) => {
      if (v && v.votedTeamId) {
        const target = normalizeTeamId(v.votedTeamId);
        counts[target] = (counts[target] || 0) + 1;
      }
    });
    return counts;
  }, [votesMap]);

  if (!isOpen) return null;

  const handleVote = async (targetTeamId: string) => {
    const normTarget = normalizeTeamId(targetTeamId);
    const photoRec = photosMap[normTarget];
    if (!photoRec || !photoRec.photoUrl) {
      showToast('아직 사진이 업로드되지 않은 조입니다.');
      return;
    }

    setIsVoting(true);
    const payload = {
      voterTeamId: normTeamId,
      voterTeamName: myTeamConfig.name,
      votedTeamId: normTarget,
      votedBy: participantName || myTeamConfig.name,
      updatedAt: new Date().toISOString(),
    };

    try {
      await fetch(`${dbUrl}/sessions/trekking2026/photoVotes/${normTeamId}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const vRef = ref(rtdb, `sessions/trekking2026/photoVotes/${normTeamId}`);
      await set(vRef, payload);

      setVotesMap(prev => ({ ...prev, [normTeamId]: payload }));
      fireConfetti({ count: 50, spread: 70 });
      const targetTeamName = WORKSHOP_TEAMS.find(t => t.id === normTarget)?.name || normTarget;
      showToast(`${myTeamConfig.name} 투표 완료: ${targetTeamName} 단체사진!`);
    } catch (e) {
      console.warn('투표 저장 오류:', e);
      showToast('투표 저장 중 오류가 발생했습니다.');
    } finally {
      setIsVoting(false);
    }
  };

  const uploadedCount = WORKSHOP_TEAMS.filter(t => !!(photosMap[t.id]?.photoUrl)).length;
  const totalVotesCast = Object.keys(votesMap).length;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 animate-fade-in select-none">
      <div className="bg-[#13192A] border border-white/15 w-full max-w-[430px] max-h-[92vh] rounded-3xl flex flex-col shadow-2xl overflow-hidden">
        {/* 상단 헤더 */}
        <div className="bg-[#182035] border-b border-white/10 px-4 py-3 flex items-center justify-between flex-shrink-0">
          <div>
            <span className="text-[12px] text-purple-400 font-bold uppercase tracking-wider block">
              STEP 4 · 실시간 단체사진 투표
            </span>
            <h3 className="text-[17px] font-bold text-white">
              조별 단체사진 실시간 갤러리 & 투표
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/10 text-slate-300 flex items-center justify-center hover:bg-white/20 active:scale-95 text-xs"
          >
            ✕
          </button>
        </div>

        {/* 요약 바 */}
        <div className="bg-[#101626] px-4 py-2.5 border-b border-white/8 flex items-center justify-between text-[13px] flex-shrink-0">
          <span className="text-slate-300">
            업로드: <strong className="text-white">{uploadedCount}/6개 조</strong> · 참여 투표: <strong className="text-amber-400">{totalVotesCast}/6개 조</strong>
          </span>
          <span className="text-purple-300 font-bold">
            {myVotedTeamId
              ? `우리 조 선택: ${WORKSHOP_TEAMS.find(t => t.id === myVotedTeamId)?.name}`
              : '조 대표 1표 투표'}
          </span>
        </div>

        {toastMsg && (
          <div className="mx-4 mt-2.5 bg-purple-600/30 border border-purple-400/50 text-white text-[13.5px] font-bold py-2 px-3 rounded-xl text-center">
            {toastMsg}
          </div>
        )}

        {/* 6개 조 실시간 사진 그리드 */}
        <div className="p-4 grid grid-cols-2 gap-3 flex-1 overflow-y-auto">
          {WORKSHOP_TEAMS.map(team => {
            const photoRec = photosMap[team.id];
            const hasPhoto = !!(photoRec && photoRec.photoUrl);
            const votes = voteCounts[team.id] || 0;
            const isVotedByMyTeam = myVotedTeamId === team.id;

            return (
              <div
                key={team.id}
                className={`rounded-2xl border p-2.5 flex flex-col justify-between transition-all ${
                  isVotedByMyTeam
                    ? 'bg-purple-950/30 border-purple-400 shadow-lg shadow-purple-500/15'
                    : hasPhoto
                    ? 'bg-[#182035] border-white/10'
                    : 'bg-black/20 border-white/5 opacity-60'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[15px] font-bold text-white flex items-center gap-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full inline-block"
                        style={{ background: team.color }}
                      />
                      {team.name}
                    </span>
                    <span className={`text-[12.5px] font-bold px-2 py-0.5 rounded-full ${
                      votes > 0
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-white/5 text-slate-400'
                    }`}>
                      {votes}표
                    </span>
                  </div>

                  {hasPhoto ? (
                    <div
                      onClick={() => setZoomPhotoUrl(photoRec.photoUrl)}
                      className="relative rounded-xl overflow-hidden border border-white/10 cursor-pointer group h-28 bg-black/50 mb-2"
                    >
                      <img
                        src={photoRec.photoUrl}
                        alt={`${team.name} 단체사진`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent flex items-end justify-between p-1.5">
                        <span className="text-[11.5px] text-white truncate max-w-[75%]">
                          {photoRec.caption || `${team.name} 단체사진`}
                        </span>
                        <span className="text-[11px] bg-black/60 text-sky-300 px-1.5 py-0.5 rounded">
                          확대
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="h-28 rounded-xl bg-black/30 border border-dashed border-white/10 flex flex-col items-center justify-center text-slate-500 text-[12.5px] mb-2">
                      <span>미업로드</span>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  disabled={!hasPhoto || isVoting}
                  onClick={() => handleVote(team.id)}
                  className={`w-full py-2 rounded-xl text-[13.5px] font-bold transition-all active:scale-95 ${
                    isVotedByMyTeam
                      ? 'bg-purple-600 text-white shadow'
                      : hasPhoto
                      ? 'bg-[#222C44] hover:bg-purple-600/40 text-slate-200 border border-white/10'
                      : 'bg-white/5 text-slate-600 cursor-not-allowed'
                  }`}
                >
                  {isVotedByMyTeam ? '✓ 투표 완료' : hasPhoto ? '이 사진에 투표' : '대기 중'}
                </button>
              </div>
            );
          })}
        </div>

        {/* 하단 닫기 */}
        <div className="bg-[#182035] border-t border-white/10 p-3 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 bg-[#1A2235] hover:bg-[#222C44] text-slate-200 font-bold text-[15px] rounded-xl border border-white/10 active:scale-95 transition-all"
          >
            닫기
          </button>
        </div>
      </div>

      {/* 사진 확대 모달 */}
      {zoomPhotoUrl && (
        <div
          onClick={() => setZoomPhotoUrl(null)}
          className="fixed inset-0 z-60 bg-black/95 flex items-center justify-center p-4 animate-fade-in"
        >
          <div className="relative max-w-lg w-full max-h-[90vh] flex flex-col items-center">
            <img
              src={zoomPhotoUrl}
              alt="확대 단체사진"
              className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl border border-white/20"
            />
            <button
              onClick={() => setZoomPhotoUrl(null)}
              className="mt-3 px-5 py-2 bg-white/20 hover:bg-white/30 text-white rounded-full text-xs font-bold"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
