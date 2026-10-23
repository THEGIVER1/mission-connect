import React, { useState, useEffect, useRef } from 'react';
import { THEME_GARDEN_MISSION, WORKSHOP_TEAMS, IS_PILOT_MODE } from '../../config/workshopConfig';
import { normalizeTeamId } from '../../utils/scoreCalculator';
import { rtdb, FIREBASE_DB_URL } from '../../lib/firebase';
import { ref, update } from 'firebase/database';
import { fireConfetti } from '../../lib/confetti';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  teamId: string;
  participantName?: string | null;
  participantCompany?: string | null;
  onPhotoUploaded?: () => void;
}

export interface ThemeGardenPhotoRecord {
  teamId: string;
  teamName: string;
  photoUrl: string;
  uploadedBy: string;
  uploadedCompany?: string;
  uploadedAt: string;
  status: 'submitted';
  caption?: string;
}

export const ThemeGardenMissionModal: React.FC<Props> = ({
  isOpen,
  onClose,
  teamId,
  participantName,
  participantCompany,
  onPhotoUploaded,
}) => {
  const normTeamId = normalizeTeamId(teamId);
  const teamConfig = WORKSHOP_TEAMS.find(t => t.id === normTeamId) || WORKSHOP_TEAMS[0];

  const [photoRecord, setPhotoRecord] = useState<ThemeGardenPhotoRecord | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [captionInput, setCaptionInput] = useState<string>('');
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [zoomPhotoUrl, setZoomPhotoUrl] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');

  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const dbUrl = FIREBASE_DB_URL;

  useEffect(() => {
    if (!isOpen) return;

    fetch(`${dbUrl}/sessions/trekking2026/themeGardenPhotos/${normTeamId}.json?t=${Date.now()}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.photoUrl) {
          setPhotoRecord(data);
          if (data.caption) setCaptionInput(data.caption);
        } else {
          setPhotoRecord(null);
        }
      })
      .catch(err => console.warn('사진 로드 경고:', err));
  }, [isOpen, normTeamId, dbUrl]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatusMessage('사진 처리 중...');
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 960;
        const MAX_HEIGHT = 960;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
          setPreviewPhoto(compressedDataUrl);
          setStatusMessage('');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSubmitPhoto = async () => {
    if (!previewPhoto) return;

    setIsUploading(true);
    setStatusMessage('업로드 중...');

    const payload: ThemeGardenPhotoRecord = {
      teamId: normTeamId,
      teamName: teamConfig.name,
      photoUrl: previewPhoto,
      uploadedBy: participantName || teamConfig.name,
      uploadedCompany: participantCompany || '',
      uploadedAt: new Date().toISOString(),
      status: 'submitted',
      caption: captionInput.trim() || `${teamConfig.name} 단체사진`,
    };

    try {
      await fetch(`${dbUrl}/sessions/trekking2026/themeGardenPhotos/${normTeamId}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const photoRef = ref(rtdb, `sessions/trekking2026/themeGardenPhotos/${normTeamId}`);
      await update(photoRef, payload);

      setPhotoRecord(payload);
      setPreviewPhoto(null);
      fireConfetti();
      if (onPhotoUploaded) onPhotoUploaded();
      setStatusMessage('단체사진 업로드가 완료되었습니다! (+100pt)');
      setTimeout(() => setStatusMessage(''), 3000);
    } catch (err) {
      console.warn('사진 업로드 실패:', err);
      setStatusMessage('업로드 중 오류가 발생했습니다.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 animate-fade-in select-none">
      <div className="bg-[#13192A] border border-white/15 w-full max-w-[430px] max-h-[92vh] rounded-3xl flex flex-col shadow-2xl overflow-hidden">
        {/* 상단 헤더 */}
        <div className="bg-[#182035] border-b border-white/10 px-4 py-3 flex items-center justify-between flex-shrink-0">
          <div>
            <span className="text-[12px] text-pink-400 font-bold uppercase tracking-wider block">
              {IS_PILOT_MODE ? 'STEP 2 · 1:20~2:20' : 'STEP 2 · 2:00~4:30'}
            </span>
            <h3 className="text-[16.5px] font-bold text-white">
              {IS_PILOT_MODE ? '두산 저수지 조별 단체사진' : '테마가든 조별 단체사진'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/10 text-slate-300 flex items-center justify-center hover:bg-white/20 active:scale-95 text-xs"
          >
            ✕
          </button>
        </div>

        {/* 본문 콘텐츠 */}
        <div className="p-4 space-y-3.5 flex-1 overflow-y-auto">
          {/* 배점 및 상태 */}
          <div className="bg-[#182035] border border-pink-500/30 rounded-2xl p-3 flex items-center justify-between">
            <div>
              <p className="text-[15px] font-bold text-white">
                조 대표 1명 업로드 시 <span className="text-amber-400 font-extrabold">우리 조 +{THEME_GARDEN_MISSION.pointsPerMember}pt</span>
              </p>
              <p className="text-[12.5px] text-slate-400 mt-0.5">
                업로드된 사진은 STEP 4 실시간 단체사진 투표에 노출됩니다.
              </p>
            </div>
            <span className={`text-[13px] font-bold px-2.5 py-1 rounded-full border flex-shrink-0 ${
              photoRecord
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
            }`}>
              {photoRecord ? '완료' : '진행 중'}
            </span>
          </div>

          {/* 사진 업로드 / 기등록 사진 확인 */}
          <div className="bg-[#182035] border border-white/10 rounded-2xl p-3.5 space-y-3">
            <h4 className="text-[15px] font-bold text-white flex items-center justify-between">
              <span>{teamConfig.name} 단체사진</span>
              {photoRecord && (
                <span className="text-[12px] text-slate-400">
                  {new Date(photoRecord.uploadedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} 등록됨
                </span>
              )}
            </h4>

            {/* 업로드된 사진이 있는 경우 */}
            {photoRecord && !previewPhoto && (
              <div className="space-y-2.5">
                <div
                  onClick={() => setZoomPhotoUrl(photoRecord.photoUrl)}
                  className="relative rounded-xl overflow-hidden border-2 border-emerald-500/50 cursor-pointer group shadow-xl"
                >
                  <img
                    src={photoRecord.photoUrl}
                    alt="조별 단체사진"
                    className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2.5">
                    <div className="flex items-center justify-between w-full">
                      <span className="text-[13.5px] text-white font-bold truncate">
                        {photoRecord.caption || `${teamConfig.name} 단체사진`}
                      </span>
                      <span className="text-[12px] bg-black/60 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                        확대 보기
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    className="py-2.5 px-3 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/40 text-sky-300 font-bold text-[13.5px] active:scale-95 transition-all"
                  >
                    사진첩에서 교체
                  </button>
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="py-2.5 px-3 rounded-xl bg-pink-500/15 hover:bg-pink-500/25 border border-pink-500/40 text-pink-300 font-bold text-[13.5px] active:scale-95 transition-all"
                  >
                    카메라로 재촬영
                  </button>
                </div>
              </div>
            )}

            {/* 새로 선택한 사진 프리뷰 */}
            {previewPhoto && (
              <div className="space-y-2.5 animate-fade-in">
                <div className="relative rounded-xl overflow-hidden border-2 border-pink-500 shadow-xl">
                  <img
                    src={previewPhoto}
                    alt="새 사진 미리보기"
                    className="w-full h-48 object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setPreviewPhoto(null)}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 text-white flex items-center justify-center text-xs hover:bg-black"
                  >
                    ✕
                  </button>
                </div>

                <div>
                  <label className="text-[13px] text-slate-400 block mb-1">한 줄 코멘트 (선택)</label>
                  <input
                    type="text"
                    placeholder={`예: ${teamConfig.name} 단체사진 완료`}
                    value={captionInput}
                    onChange={e => setCaptionInput(e.target.value)}
                    maxLength={40}
                    className="w-full bg-[#101626] border border-white/10 rounded-xl px-3 py-2 text-[14px] text-white focus:outline-none focus:border-pink-500"
                  />
                </div>
              </div>
            )}

            {/* 사진이 없고 새로 선택도 안 한 초기 상태 */}
            {!photoRecord && !previewPhoto && (
              <div className="border-2 border-dashed border-pink-500/40 bg-pink-950/10 rounded-2xl p-4 text-center space-y-3">
                <p className="text-[14.5px] font-bold text-white">
                  {IS_PILOT_MODE
                    ? '두산 저수지에서 조원 전원이 나오게 촬영 후 등록해 주세요.'
                    : '테마가든 포토 스팟에서 조원 전원이 나오게 촬영 후 등록해 주세요.'}
                </p>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    className="py-3 px-3 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/50 text-sky-200 font-extrabold text-[14px] shadow active:scale-95 transition-all"
                  >
                    사진첩 선택
                  </button>
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="py-3 px-3 rounded-xl bg-pink-500/20 hover:bg-pink-500/30 border border-pink-400/50 text-pink-200 font-extrabold text-[14px] shadow active:scale-95 transition-all"
                  >
                    카메라 촬영
                  </button>
                </div>
              </div>
            )}

            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {statusMessage && (
            <div className="bg-pink-500/20 border border-pink-500/40 text-pink-200 text-[14px] font-bold py-2 px-3 rounded-xl text-center">
              {statusMessage}
            </div>
          )}
        </div>

        {/* 하단 액션 버튼 */}
        <div className="bg-[#182035] border-t border-white/10 p-3 flex items-center gap-2 flex-shrink-0">
          {previewPhoto ? (
            <button
              type="button"
              disabled={isUploading}
              onClick={handleSubmitPhoto}
              className="w-full py-3 bg-pink-600 hover:bg-pink-500 disabled:opacity-40 text-white font-extrabold text-[15.5px] rounded-xl shadow-lg active:scale-95 transition-all"
            >
              {isUploading ? '업로드 중...' : '단체사진 등록 (+100pt)'}
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 bg-[#1A2235] text-slate-300 font-bold text-[15px] rounded-xl border border-white/10 hover:bg-[#222C44] active:scale-95 transition-all"
            >
              닫기
            </button>
          )}
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
              alt="확대 사진"
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
