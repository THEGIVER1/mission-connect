import React, { useState, useEffect, useRef } from 'react';
import { THEME_GARDEN_MISSION, WORKSHOP_TEAMS } from '../../config/workshopConfig';
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
  photoUrl: string; // Base64 data URL
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
  const [showFullHint, setShowFullHint] = useState<boolean>(false);
  const [zoomPhotoUrl, setZoomPhotoUrl] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dbUrl = FIREBASE_DB_URL;

  // 서버에서 조별 업로드 사진 불러오기
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
      .catch(err => console.warn('테마가든 사진 로드 경고:', err));
  }, [isOpen, normTeamId, dbUrl]);

  if (!isOpen) return null;

  // 이미지 압축 및 Base64 변환
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatusMessage('사진을 최적화하는 중...');
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
  };

  // 사진 업로드 제출
  const handleSubmitPhoto = async () => {
    if (!previewPhoto) return;

    setIsUploading(true);
    setStatusMessage('사진을 실시간 업로드하는 중...');

    const payload: ThemeGardenPhotoRecord = {
      teamId: normTeamId,
      teamName: teamConfig.name,
      photoUrl: previewPhoto,
      uploadedBy: participantName || '익명 조원',
      uploadedCompany: participantCompany || '',
      uploadedAt: new Date().toISOString(),
      status: 'submitted',
      caption: captionInput.trim() || '우리 조 테마가든 시그니처 단체사진',
    };

    try {
      // 1) REST PUT
      await fetch(`${dbUrl}/sessions/trekking2026/themeGardenPhotos/${normTeamId}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      // 2) SDK Backup
      const photoRef = ref(rtdb, `sessions/trekking2026/themeGardenPhotos/${normTeamId}`);
      await update(photoRef, payload);

      setPhotoRecord(payload);
      setPreviewPhoto(null);
      fireConfetti();
      if (onPhotoUploaded) onPhotoUploaded();
      setStatusMessage('🎉 조별 단체사진 업로드가 완료되었습니다!');
      setTimeout(() => setStatusMessage(''), 3000);
    } catch (err) {
      console.warn('사진 업로드 실패:', err);
      setStatusMessage('업로드 중 오류가 발생했습니다. 다시 시도해 주세요.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 animate-fade-in select-none">
      <div className="bg-[#13192A] border border-white/15 w-full max-w-[390px] max-h-[92vh] rounded-3xl flex flex-col shadow-2xl overflow-hidden">
        {/* 상단 헤더 */}
        <div className="bg-[#182035] border-b border-white/10 px-4 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-pink-500/20 border border-pink-500/30 flex items-center justify-center text-base">
              🌹
            </span>
            <div>
              <span className="text-[10px] text-pink-400 font-bold uppercase tracking-wider block">
                2:00~4:30 트레킹 메인 미션
              </span>
              <h3 className="text-[14px] font-bold text-white">
                테마가든 단체사진 미션
              </h3>
            </div>
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
          {/* 배점 및 완료 안내 배너 */}
          <div className="bg-gradient-to-r from-pink-500/15 via-rose-500/10 to-purple-500/15 border border-pink-500/30 rounded-2xl p-3 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-pink-400 font-extrabold uppercase tracking-wider block">
                MISSION REWARD
              </span>
              <p className="text-[13px] font-bold text-white">
                조원 전원 <span className="text-amber-400 font-extrabold">+{THEME_GARDEN_MISSION.pointsPerMember}pt</span> 획득
              </p>
            </div>
            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
              photoRecord
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
            }`}>
              {photoRecord ? '✅ 제출 완료' : '📸 미션 진행 중'}
            </span>
          </div>

          {/* 힌트 사진 & 가이드 카드 */}
          <div className="bg-[#182035] border border-white/10 rounded-2xl p-3.5 space-y-2.5 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-bold text-pink-300 flex items-center gap-1">
                <span>🔍</span>
                <span>{THEME_GARDEN_MISSION.hintTitle}</span>
              </span>
              <button
                type="button"
                onClick={() => setShowFullHint(!showFullHint)}
                className="text-[11px] text-sky-400 hover:text-sky-300 font-medium"
              >
                {showFullHint ? '가이드 접기' : '미션 가이드 보기'}
              </button>
            </div>

            {/* 힌트 비주얼 영역 (장미원 & 호수 일러스트) */}
            <div className="relative rounded-xl overflow-hidden border border-white/10 bg-gradient-to-b from-[#1C2538] to-[#101726] p-3 text-center space-y-2">
              <div className="h-28 rounded-lg bg-gradient-to-br from-rose-900/40 via-pink-950/30 to-sky-950/40 border border-pink-500/20 flex flex-col items-center justify-center p-2 relative overflow-hidden">
                <div className="text-3xl mb-1 animate-pulse">🌹 ⛲ 📸</div>
                <p className="text-[12px] font-extrabold text-pink-200">
                  테마가든 장미원 & 호수 수변 테라스
                </p>
                <p className="text-[10px] text-slate-300">
                  분수대 주변 또는 호수가 내려다보이는 랜드마크 앞
                </p>
              </div>

              <p className="text-[11.5px] text-slate-300 leading-relaxed text-left px-1">
                💡 <strong>미션 방법</strong>: 테마가든 내 지정 스팟을 찾아, <strong>{teamConfig.name} 조원 전원</strong>이 함께 참여하는 개성 넘치는 포즈로 단체사진을 촬영해 주세요!
              </p>
            </div>

            {/* 가이드 상세 */}
            {showFullHint && (
              <div className="bg-black/30 border border-white/5 rounded-xl p-2.5 space-y-1 text-[11px] text-slate-300 animate-fade-in">
                {THEME_GARDEN_MISSION.guideLines.map((gl, i) => (
                  <p key={i} className="flex items-start gap-1">
                    <span className="text-pink-400 font-bold">•</span>
                    <span>{gl}</span>
                  </p>
                ))}
              </div>
            )}
          </div>

          {/* 사진 업로드 / 기등록 사진 확인 */}
          <div className="bg-[#182035] border border-white/10 rounded-2xl p-3.5 space-y-3">
            <h4 className="text-[13px] font-bold text-white flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span>📷</span>
                <span>우리 조 단체사진</span>
              </span>
              {photoRecord && (
                <span className="text-[10px] text-slate-400">
                  {new Date(photoRecord.uploadedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} 업로드됨
                </span>
              )}
            </h4>

            {/* 업로드된 사진이 있는 경우 */}
            {photoRecord && !previewPhoto && (
              <div className="space-y-2">
                <div
                  onClick={() => setZoomPhotoUrl(photoRecord.photoUrl)}
                  className="relative rounded-xl overflow-hidden border-2 border-emerald-500/50 cursor-pointer group shadow-xl"
                >
                  <img
                    src={photoRecord.photoUrl}
                    alt="테마가든 단체사진"
                    className="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2.5">
                    <div className="flex items-center justify-between w-full">
                      <span className="text-[11px] text-white font-bold truncate">
                        {photoRecord.caption || '우리 조 단체사진'}
                      </span>
                      <span className="text-[10px] bg-black/60 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                        🔍 확대 보기
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                  <span>촬영/등록자: <strong className="text-slate-200">{photoRecord.uploadedBy}</strong></span>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-pink-400 hover:text-pink-300 font-bold underline"
                  >
                    사진 다시 찍어 교체하기
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
                    className="w-full h-44 object-cover"
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
                  <label className="text-[11px] text-slate-400 block mb-1">한 줄 코멘트 (선택)</label>
                  <input
                    type="text"
                    placeholder="예: 1조 테마가든 완벽 클리어! 🌸"
                    value={captionInput}
                    onChange={e => setCaptionInput(e.target.value)}
                    maxLength={40}
                    className="w-full bg-[#101626] border border-white/10 rounded-xl px-3 py-2 text-[12px] text-white focus:outline-none focus:border-pink-500"
                  />
                </div>
              </div>
            )}

            {/* 사진이 없고 새로 선택도 안 한 초기 상태 */}
            {!photoRecord && !previewPhoto && (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-pink-500/40 hover:border-pink-400 bg-pink-950/10 rounded-2xl p-6 text-center cursor-pointer space-y-2 active:scale-98 transition-all"
              >
                <div className="w-12 h-12 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30 flex items-center justify-center text-2xl mx-auto">
                  📸
                </div>
                <div>
                  <p className="text-[13px] font-bold text-white">
                    조별 단체사진 촬영 / 갤러리 선택
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    터치하여 카메라로 촬영하거나 사진을 업로드하세요
                  </p>
                </div>
              </div>
            )}

            {/* 숨겨진 파일 인풋 */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* 상태 메시지 */}
          {statusMessage && (
            <div className="bg-pink-500/20 border border-pink-500/40 text-pink-200 text-[12px] font-bold py-2 px-3 rounded-xl text-center animate-fade-in">
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
              className="w-full py-3 bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 disabled:opacity-40 text-white font-extrabold text-[13.5px] rounded-xl shadow-lg shadow-pink-500/25 active:scale-95 transition-all flex items-center justify-center gap-1.5"
            >
              <span>{isUploading ? '사진 업로드 중...' : '📸 단체사진 업로드 & 미션 완료 (+100pt)'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 bg-[#1A2235] text-slate-300 font-bold text-[13px] rounded-xl border border-white/10 hover:bg-[#222C44] active:scale-95 transition-all"
            >
              닫기
            </button>
          )}
        </div>
      </div>

      {/* 사진 전체화면 확대 모달 */}
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
