import React, { useState, useEffect, useMemo } from 'react';
import {
  WORKSHOP_TEAMS,
  PHOTO_VOTE_POINTS_PER_VOTE,
  getFinalGatheringInfo,
} from '../../config/workshopConfig';
import {
  normalizeTeamId,
  getVotedTeamIdsFromVoteRecord,
  calculatePhotoVoteCounts,
} from '../../utils/scoreCalculator';
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
  const [forceOpenStep4, setForceOpenStep4] = useState<boolean>(false);
  const [nowMs, setNowMs] = useState<number>(Date.now());
  const [isVoting, setIsVoting] = useState<boolean>(false);
  const [zoomPhotoUrl, setZoomPhotoUrl] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string>('');

  const dbUrl = FIREBASE_DB_URL;

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2500);
  };

  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

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
          setForceOpenStep4(!!(data?.step4ForceOpen));
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

  // 우리 조가 투표한 대상 조 ID 목록 (조당 1장씩 최대 2표)
  const myVotedTeamIds = useMemo(() => {
    return getVotedTeamIdsFromVoteRecord(votesMap[normTeamId]);
  }, [votesMap, normTeamId]);

  // 각 조별 득표 수 집계
  const voteCounts = useMemo(() => {
    return calculatePhotoVoteCounts(votesMap);
  }, [votesMap]);

  const { formattedTimeLeft, isStep3Completed } = useMemo(() => {
    return getFinalGatheringInfo(nowMs, forceOpenStep4);
  }, [nowMs, forceOpenStep4]);

  if (!isOpen) return null;

  const handleToggleVote = async (targetTeamId: string) => {
    if (!isStep3Completed) {
      showToast('STEP 3 최종 집결 시간(14:20) 완료 후 투표가 열립니다.');
      return;
    }

    const normTarget = normalizeTeamId(targetTeamId);
    const photoRec = photosMap[normTarget];
    if (!photoRec || !photoRec.photoUrl) {
      showToast('아직 사진이 등록되지 않은 조입니다.');
      return;
    }

    const isAlreadySelected = myVotedTeamIds.includes(normTarget);
    let nextVotedIds: string[];

    if (isAlreadySelected) {
      // 선택 해제
      nextVotedIds = myVotedTeamIds.filter(id => id !== normTarget);
    } else {
      if (myVotedTeamIds.length >= 2) {
        showToast('조당 최대 2표(사진 1장당 1표)까지만 투표할 수 있습니다. 기존 투표를 취소한 뒤 선택해 주세요.');
        return;
      }
      nextVotedIds = [...myVotedTeamIds, normTarget];
    }

    setIsVoting(true);
    const payload = {
      voterTeamId: normTeamId,
      voterTeamName: myTeamConfig.name,
      votedTeamIds: nextVotedIds,
      votedTeamId: nextVotedIds[0] || null,
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

      if (!isAlreadySelected) {
        fireConfetti({ count: 45, spread: 70 });
        const targetTeamName = WORKSHOP_TEAMS.find(t => t.id === normTarget)?.name || normTarget;
        showToast(`${targetTeamName} 단체사진 투표 완료! (+${PHOTO_VOTE_POINTS_PER_VOTE}pt 반영, ${nextVotedIds.length}/2표 사용)`);
      } else {
        showToast(`투표 선택 해제 (${nextVotedIds.length}/2표 사용 중)`);
      }
    } catch (e) {
      console.warn('투표 저장 오류:', e);
      showToast('투표 저장 중 오류가 발생했습니다.');
    } finally {
      setIsVoting(false);
    }
  };

  const uploadedCount = WORKSHOP_TEAMS.filter(t => !!(photosMap[t.id]?.photoUrl)).length;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 animate-fade-in select-none">
      <div className="bg-[#13192A] border border-white/15 w-full max-w-[430px] max-h-[92vh] rounded-3xl flex flex-col shadow-2xl overflow-hidden">
        {/* 상단 헤더 */}
        <div className="bg-[#182035] border-b border-white/10 px-4 py-3 flex items-center justify-between flex-shrink-0">
          <div>
            <span className="text-[12px] text-purple-400 font-bold uppercase tracking-wider block">
              STEP 4 · 조당 2표 가능 · 1표당 +{PHOTO_VOTE_POINTS_PER_VOTE}pt
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
            사진 등록: <strong className="text-white">{uploadedCount}/6조</strong> · 1표당 <strong className="text-amber-400">+{PHOTO_VOTE_POINTS_PER_VOTE}pt</strong>
          </span>
          <span className="text-purple-300 font-bold">
            우리 조 투표: {myVotedTeamIds.length} / 2표
          </span>
        </div>

        {!isStep3Completed && (
          <div className="mx-4 mt-2.5 bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[13px] font-bold py-2 px-3 rounded-xl text-center">
            STEP 3 최종 집결 시간(14:20) 완료 시 투표가 활성화됩니다. (남은 시간 {formattedTimeLeft})
          </div>
        )}

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
            const bonusScore = votes * PHOTO_VOTE_POINTS_PER_VOTE;
            const isVotedByMyTeam = myVotedTeamIds.includes(team.id);

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
                    <span className={`text-[12px] font-bold px-2 py-0.5 rounded-full ${
                      votes > 0
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-white/5 text-slate-400'
                    }`}>
                      {votes}표 (+{bonusScore}pt)
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
                  disabled={!hasPhoto || isVoting || !isStep3Completed}
                  onClick={() => handleToggleVote(team.id)}
                  className={`w-full py-2 rounded-xl text-[13px] font-bold transition-all active:scale-95 ${
                    !isStep3Completed
                      ? 'bg-white/5 text-slate-500 cursor-not-allowed'
                      : isVotedByMyTeam
                      ? 'bg-purple-600 text-white shadow'
                      : hasPhoto
                      ? 'bg-[#222C44] hover:bg-purple-600/40 text-slate-200 border border-white/10'
                      : 'bg-white/5 text-slate-600 cursor-not-allowed'
                  }`}
                >
                  {!isStep3Completed
                    ? '14:20 집결 후 오픈'
                    : isVotedByMyTeam
                    ? '✓ 투표됨 (탭하여 취소)'
                    : hasPhoto
                    ? '이 사진에 투표 (+200pt)'
                    : '대기 중'}
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
