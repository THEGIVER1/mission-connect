import React from 'react';
import {
  CanvasRecord,
  LearningSubject,
  WallPost,
  getLikeCount,
  getPostitColor,
  getFrameworkMeta,
  SHOWCASE_STAMPS,
} from '../../config/learningConfig';
import { WORKSHOP_TEAMS } from '../../config/workshopConfig';

export const getTeamCfg = (teamId?: string) =>
  WORKSHOP_TEAMS.find(t => t.id === teamId) || { id: teamId || '', name: teamId || '-', shortCode: '?', color: '#64748B' };

/** 조 배지 칩 */
export const TeamChip: React.FC<{ teamId?: string; size?: 'xs' | 'sm' | 'md' }> = ({ teamId, size = 'sm' }) => {
  const t = getTeamCfg(teamId);
  const cls =
    size === 'xs' ? 'text-[10.5px] px-1.5 py-[1px]' : size === 'md' ? 'text-[13px] px-2.5 py-0.5' : 'text-[11.5px] px-2 py-0.5';
  return (
    <span
      className={`inline-flex items-center rounded-full font-black text-white whitespace-nowrap ${cls}`}
      style={{ background: t.color }}
    >
      {t.name}
    </span>
  );
};

/** 단계 번호 원형 배지 */
export const StepBadge: React.FC<{ n: number; active?: boolean; done?: boolean; size?: number }> = ({
  n,
  active,
  done,
  size = 28,
}) => (
  <span
    className={`inline-flex items-center justify-center rounded-full font-black shrink-0 transition-all ${
      done
        ? 'bg-emerald-400 text-slate-950'
        : active
        ? 'bg-gradient-to-br from-amber-300 to-orange-500 text-slate-950 shadow-lg shadow-orange-500/30'
        : 'bg-white/10 text-slate-400 border border-white/15'
    }`}
    style={{ width: size, height: size, fontSize: size * 0.48 }}
  >
    {done ? '✓' : n}
  </span>
);

/** 실물 종이 느낌의 포스트잇 */
export const PostitNote: React.FC<{
  post: WallPost;
  liked?: boolean;
  isMine?: boolean;
  onLike?: () => void;
  onDelete?: () => void;
  rank?: number;
  big?: boolean;
  tilt?: number;
}> = ({ post, liked, isMine, onLike, onDelete, rank, big, tilt = 0 }) => {
  const c = getPostitColor(post.color);
  const likes = getLikeCount(post);
  const team = getTeamCfg(post.authorTeamId);
  return (
    <div
      className={`relative rounded-[6px] flex flex-col justify-between shadow-[0_6px_14px_rgba(0,0,0,0.35)] transition-transform ${
        big ? 'p-5 min-h-[170px]' : 'p-3 min-h-[118px]'
      }`}
      style={{ background: c.bg, color: c.text, transform: `rotate(${tilt}deg)` }}
    >
      {/* 테이프 */}
      <span
        className="absolute -top-2 left-1/2 -translate-x-1/2 w-12 h-4 rounded-sm opacity-70"
        style={{ background: 'rgba(255,255,255,0.55)' }}
      />
      {rank && (
        <span
          className={`absolute -top-3 -right-2 rounded-full font-black shadow-lg flex items-center justify-center ${
            big ? 'w-11 h-11 text-xl' : 'w-8 h-8 text-[15px]'
          } ${rank === 1 ? 'bg-amber-400' : rank === 2 ? 'bg-slate-200' : 'bg-orange-300'}`}
        >
          {rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}
        </span>
      )}
      <p
        className={`font-bold leading-snug break-keep whitespace-pre-wrap ${big ? 'text-[22px]' : 'text-[14.5px]'}`}
        style={{ wordBreak: 'keep-all' }}
      >
        {post.text}
      </p>
      <div className={`flex items-end justify-between gap-1.5 ${big ? 'mt-4' : 'mt-2.5'}`}>
        <div className="min-w-0">
          <span
            className={`inline-block rounded-full font-black text-white ${big ? 'text-[13px] px-2 py-0.5' : 'text-[10px] px-1.5 py-[1px]'}`}
            style={{ background: team.color }}
          >
            {team.name}
          </span>
          <p className={`font-bold opacity-75 truncate ${big ? 'text-[15px] mt-1' : 'text-[11.5px] mt-0.5'}`}>
            {post.authorName}
            {isMine && ' (나)'}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {onDelete && isMine && (
            <button
              type="button"
              onClick={onDelete}
              className="text-[11px] font-bold px-1.5 py-1 rounded-md bg-black/10 hover:bg-black/20"
              aria-label="삭제"
            >
              🗑
            </button>
          )}
          <button
            type="button"
            onClick={onLike}
            disabled={!onLike}
            className={`flex items-center gap-1 rounded-full font-black transition-all active:scale-90 ${
              big ? 'px-3 py-1.5 text-[17px]' : 'px-2 py-1 text-[12.5px]'
            } ${liked ? 'bg-rose-500 text-white shadow-md' : 'bg-black/10 hover:bg-black/20'}`}
          >
            <span>🔥</span>
            <span>{likes}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

/** 매거진 스타일 인사이트 카드뉴스 */
export const InsightCard: React.FC<{
  subject: LearningSubject;
  teamId: string;
  canvas: CanvasRecord;
  stamps?: { insight: number; action: number };
  commentCount?: number;
  size?: 'sm' | 'lg';
  highlightMine?: boolean;
  onPhotoClick?: (url: string) => void;
  onClick?: () => void;
  footer?: React.ReactNode;
}> = ({ subject, teamId, canvas, stamps, commentCount, size = 'sm', highlightMine, onPhotoClick, onClick, footer }) => {
  const team = getTeamCfg(teamId);
  const lg = size === 'lg';
  const fw = getFrameworkMeta(subject.framework);
  const answers = canvas.answers || ['', '', ''];
  const tags = canvas.tags || [[], [], []];
  const sectionColors = ['#F59E0B', '#38BDF8', '#34D399'];

  return (
    <div
      onClick={onClick}
      className={`relative rounded-3xl overflow-hidden bg-[#111827] border shadow-2xl flex flex-col ${
        highlightMine ? 'border-amber-400/80 ring-2 ring-amber-400/30' : 'border-white/12'
      } ${onClick ? 'cursor-pointer hover:border-white/30 transition-all' : ''}`}
    >
      {/* 헤더 */}
      <div
        className={`relative ${lg ? 'px-7 pt-6 pb-5' : 'px-4 pt-3.5 pb-3'}`}
        style={{ background: `linear-gradient(135deg, ${team.color} 0%, ${team.color}CC 45%, #111827 100%)` }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className={`rounded-xl bg-white/95 font-black flex items-center justify-center shadow ${
                lg ? 'w-12 h-12 text-2xl' : 'w-8 h-8 text-[15px]'
              }`}
              style={{ color: team.color }}
            >
              {team.shortCode}
            </span>
            <div>
              <p className={`font-black text-white leading-none ${lg ? 'text-[28px]' : 'text-[17px]'}`}>{team.name}</p>
              <p className={`text-white/80 font-bold ${lg ? 'text-[14px] mt-1' : 'text-[10.5px] mt-0.5'}`}>
                {fw.icon} {fw.name} · INSIGHT CARD
              </p>
            </div>
          </div>
          {stamps && (
            <div className="flex items-center gap-1">
              <span
                className={`rounded-full bg-black/35 backdrop-blur font-black text-amber-200 border border-amber-300/40 ${
                  lg ? 'px-3 py-1 text-[17px]' : 'px-2 py-0.5 text-[12px]'
                }`}
              >
                💡 {stamps.insight}
              </span>
              <span
                className={`rounded-full bg-black/35 backdrop-blur font-black text-sky-200 border border-sky-300/40 ${
                  lg ? 'px-3 py-1 text-[17px]' : 'px-2 py-0.5 text-[12px]'
                }`}
              >
                🚀 {stamps.action}
              </span>
            </div>
          )}
        </div>
        <p className={`text-white font-bold mt-2.5 leading-snug ${lg ? 'text-[19px]' : 'text-[13px]'}`}>
          Q. {subject.canvasTopic}
        </p>
      </div>

      {/* 본문 3단계 */}
      <div className={`flex-1 ${lg ? 'p-6 space-y-4' : 'p-3.5 space-y-2.5'}`}>
        {subject.steps.map((st, i) => (
          <div key={i} className="relative pl-3" style={{ borderLeft: `3px solid ${sectionColors[i]}` }}>
            <p
              className={`font-black uppercase tracking-wide ${lg ? 'text-[14px]' : 'text-[10.5px]'}`}
              style={{ color: sectionColors[i] }}
            >
              STEP {i + 1} · {st.label}
            </p>
            <p
              className={`text-white font-semibold leading-relaxed whitespace-pre-wrap ${
                lg ? 'text-[21px] mt-1' : 'text-[13.5px] mt-0.5'
              }`}
              style={{ wordBreak: 'keep-all' }}
            >
              {answers[i] || <span className="text-slate-500 italic font-normal">(작성 전)</span>}
            </p>
            {tags[i] && tags[i].length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {tags[i].map(t => (
                  <span
                    key={t}
                    className={`rounded-md font-bold bg-white/10 text-slate-300 border border-white/10 ${
                      lg ? 'text-[13px] px-2 py-0.5' : 'text-[10.5px] px-1.5 py-[1px]'
                    }`}
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}

        {canvas.notePhotoUrl && (
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              onPhotoClick?.(canvas.notePhotoUrl!);
            }}
            className="w-full relative rounded-xl overflow-hidden border border-white/10 group"
          >
            <img
              src={canvas.notePhotoUrl}
              alt="토의 노트 사진"
              className={`w-full object-cover ${lg ? 'h-56' : 'h-28'}`}
            />
            <span className="absolute left-2 bottom-2 text-[11px] font-black bg-black/70 text-white px-2 py-0.5 rounded-full">
              📝 오프라인 토의 노트 · 탭하여 확대
            </span>
          </button>
        )}
      </div>

      {/* 해시태그 & 푸터 */}
      <div className={`border-t border-white/10 bg-black/25 ${lg ? 'px-6 py-4' : 'px-3.5 py-2.5'}`}>
        <div className="flex flex-wrap items-center gap-1.5">
          {(canvas.hashtags || []).map(h => (
            <span key={h} className={`font-black text-amber-300 ${lg ? 'text-[17px]' : 'text-[12.5px]'}`}>
              #{h.replace(/^#/, '')}
            </span>
          ))}
          {typeof commentCount === 'number' && (
            <span className={`ml-auto text-slate-400 font-bold ${lg ? 'text-[14px]' : 'text-[11px]'}`}>
              💬 응원 {commentCount}
            </span>
          )}
        </div>
        {footer}
      </div>
    </div>
  );
};

export const StampLegend: React.FC = () => (
  <div className="flex flex-wrap gap-1.5">
    {SHOWCASE_STAMPS.map(s => (
      <span
        key={s.key}
        className={`text-[11.5px] font-bold px-2 py-0.5 rounded-full border ${
          s.key === 'insight'
            ? 'bg-amber-500/15 text-amber-200 border-amber-400/40'
            : 'bg-sky-500/15 text-sky-200 border-sky-400/40'
        }`}
      >
        {s.icon} {s.name}
      </span>
    ))}
  </div>
);

export const PhotoZoomOverlay: React.FC<{ url: string | null; onClose: () => void }> = ({ url, onClose }) =>
  url ? (
    <div onClick={onClose} className="fixed inset-0 z-[10000] bg-black/95 flex flex-col items-center justify-center p-4">
      <img src={url} alt="확대" className="max-w-full max-h-[82vh] object-contain rounded-2xl border border-white/20" />
      <button className="mt-3 px-6 py-2 bg-white/20 text-white rounded-full text-sm font-bold">닫기 ✕</button>
    </div>
  ) : null;
