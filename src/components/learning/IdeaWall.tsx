import React, { useMemo, useState } from 'react';
import {
  LearningSubject,
  SubjectData,
  POSTIT_COLORS,
  WallPost,
  getLikeCount,
  getTopWallPosts,
  sortWallByLikes,
  newId,
} from '../../config/learningConfig';
import { learningPatch, learningPut } from './learningDb';
import { PostitNote } from './LearningShared';
import { fireConfetti } from '../../lib/confetti';

const MAX_LEN = 80;

const tiltOf = (id: string) => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return ((Math.abs(h) % 5) - 2) * 0.8;
};

export const IdeaWall: React.FC<{
  subject: LearningSubject;
  data: SubjectData;
  me: { pid: string; name: string; company: string; teamId: string };
  onRefresh: () => void;
}> = ({ subject, data, me, onRefresh }) => {
  const [text, setText] = useState('');
  const [color, setColor] = useState<string>(POSTIT_COLORS[0].key);
  const [sort, setSort] = useState<'latest' | 'likes' | 'mine'>('latest');
  const [isPosting, setIsPosting] = useState(false);
  const [justPostedId, setJustPostedId] = useState<string | null>(null);

  const wall = data.wall;
  const top3 = useMemo(() => getTopWallPosts(wall, 3), [wall]);

  const sorted = useMemo(() => {
    if (sort === 'likes') return sortWallByLikes(wall);
    if (sort === 'mine') return [...wall].filter(p => p.authorPid === me.pid).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    return [...wall].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  }, [wall, sort, me.pid]);

  const myPosts = wall.filter(p => p.authorPid === me.pid);
  const myLikesReceived = myPosts.reduce((s, p) => s + getLikeCount(p), 0);
  const participantsCount = new Set(wall.map(p => p.authorPid)).size;
  const totalLikes = wall.reduce((s, p) => s + getLikeCount(p), 0);

  const handlePost = async () => {
    const t = text.trim();
    if (!t) return;
    setIsPosting(true);
    const id = newId('w');
    const post: WallPost = {
      id,
      text: t.slice(0, MAX_LEN),
      color,
      authorName: me.name,
      authorCompany: me.company,
      authorTeamId: me.teamId,
      authorPid: me.pid,
      createdAt: new Date().toISOString(),
    };
    await learningPut(`${subject.id}/wall/${id}`, post);
    setText('');
    setJustPostedId(id);
    setSort('latest');
    setIsPosting(false);
    if (myPosts.length === 0) {
      try {
        fireConfetti({ count: 50 });
      } catch {}
    }
    setTimeout(() => setJustPostedId(null), 2500);
    onRefresh();
  };

  const toggleLike = async (p: WallPost) => {
    if (p.authorPid === me.pid) return;
    const liked = !!p.likes?.[me.pid];
    await learningPatch(`${subject.id}/wall/${p.id}/likes`, { [me.pid]: liked ? null : true });
    onRefresh();
  };

  const handleDelete = async (p: WallPost) => {
    if (!window.confirm('이 포스트잇을 떼어낼까요?')) return;
    await learningPut(`${subject.id}/wall/${p.id}`, null);
    onRefresh();
  };

  const selColor = POSTIT_COLORS.find(c => c.key === color) || POSTIT_COLORS[0];

  return (
    <div className="space-y-4">
      {/* 오프닝 질문 */}
      <div className="relative rounded-3xl overflow-hidden border border-amber-400/40 bg-gradient-to-br from-[#2A1F08] via-[#1A1712] to-[#111827] p-4 shadow-xl">
        <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-amber-400/15 blur-2xl" />
        <div className="flex items-center gap-1.5 mb-2">
          <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-amber-400 text-slate-950">전체 교육생 참여</span>
          <span className="text-[11px] font-bold text-amber-200/80">조 구분 없이 모두가 한 보드에!</span>
        </div>
        <p className="text-[19px] font-black text-white leading-snug" style={{ wordBreak: 'keep-all' }}>
          Q. {subject.wallQuestion}
        </p>
        <div className="grid grid-cols-3 gap-2 mt-3.5">
          {[
            { label: '참여 교육생', value: `${participantsCount}명` },
            { label: '포스트잇', value: `${wall.length}장` },
            { label: '공감 🔥', value: `${totalLikes}` },
          ].map(s => (
            <div key={s.label} className="bg-black/35 rounded-xl py-2 text-center border border-white/10">
              <p className="text-[18px] font-black text-amber-300 leading-none">{s.value}</p>
              <p className="text-[11px] text-slate-400 font-bold mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 작성기 */}
      <div className="rounded-3xl bg-[#151C2C] border border-white/10 p-3.5 shadow-lg space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[14px] font-black text-white">✍️ 내 생각 포스트잇 붙이기</span>
          <span className="text-[11.5px] text-slate-400 font-bold">
            내 포스트잇 <b className="text-amber-300">{myPosts.length}</b> · 받은 공감 <b className="text-rose-300">🔥 {myLikesReceived}</b>
          </span>
        </div>
        <div className="rounded-xl p-0.5 transition-all" style={{ background: selColor.ring }}>
          <textarea
            value={text}
            onChange={e => setText(e.target.value.slice(0, MAX_LEN))}
            rows={3}
            placeholder="떠오르는 생각을 카톡 보내듯 가볍게 한두 줄로!"
            className="w-full rounded-[10px] p-3 text-[16px] font-bold resize-none focus:outline-none placeholder:font-medium"
            style={{ background: selColor.bg, color: selColor.text }}
          />
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            {POSTIT_COLORS.map(c => (
              <button
                key={c.key}
                type="button"
                onClick={() => setColor(c.key)}
                className={`w-7 h-7 rounded-full transition-all ${color === c.key ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-[#151C2C]' : 'opacity-80'}`}
                style={{ background: c.bg }}
                aria-label={c.key}
              />
            ))}
            <span className="text-[11px] text-slate-500 ml-1">{text.length}/{MAX_LEN}</span>
          </div>
          <button
            type="button"
            disabled={!text.trim() || isPosting}
            onClick={handlePost}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-black text-[14px] shadow-lg disabled:opacity-40 active:scale-95 transition-all"
          >
            {isPosting ? '붙이는 중…' : '📌 붙이기'}
          </button>
        </div>
      </div>

      {/* 베스트 공감 TOP 3 */}
      <div className="rounded-3xl bg-gradient-to-br from-[#2B1630] to-[#141A2B] border border-rose-400/30 p-3.5 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[14.5px] font-black text-white">👑 전체 교육생 베스트 공감 TOP 3</span>
          <span className="text-[11px] text-rose-200/80 font-bold">실시간 자동 승격</span>
        </div>
        {top3.length === 0 ? (
          <p className="text-[13px] text-slate-400 text-center py-4 bg-black/20 rounded-2xl">
            동료의 포스트잇에 🔥 공감을 눌러 베스트 의견을 뽑아주세요!
          </p>
        ) : (
          <div className="space-y-3 pt-1">
            {top3.map((p, i) => (
              <PostitNote
                key={p.id}
                post={p}
                rank={i + 1}
                liked={!!p.likes?.[me.pid]}
                isMine={p.authorPid === me.pid}
                onLike={p.authorPid === me.pid ? undefined : () => toggleLike(p)}
              />
            ))}
          </div>
        )}
      </div>

      {/* 정렬 탭 */}
      <div className="flex items-center gap-1.5 bg-[#151C2C] p-1 rounded-2xl border border-white/10">
        {[
          { k: 'latest' as const, l: '🕒 최신순' },
          { k: 'likes' as const, l: '🔥 공감순' },
          { k: 'mine' as const, l: '🙋 내 포스트잇' },
        ].map(t => (
          <button
            key={t.k}
            type="button"
            onClick={() => setSort(t.k)}
            className={`flex-1 py-2 rounded-xl text-[13px] font-black transition-all ${
              sort === t.k ? 'bg-white text-slate-950 shadow' : 'text-slate-400'
            }`}
          >
            {t.l}
          </button>
        ))}
      </div>

      {/* 포스트잇 보드 */}
      {sorted.length === 0 ? (
        <div className="text-center py-10 rounded-3xl border-2 border-dashed border-white/10 text-slate-400 text-[14px]">
          {sort === 'mine' ? '아직 붙인 포스트잇이 없어요.' : '첫 번째 포스트잇의 주인공이 되어보세요! 📌'}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-3 gap-y-4 pt-1 px-0.5">
          {sorted.map(p => (
            <div key={p.id} className={justPostedId === p.id ? 'animate-bounce' : ''}>
              <PostitNote
                post={p}
                tilt={tiltOf(p.id)}
                liked={!!p.likes?.[me.pid]}
                isMine={p.authorPid === me.pid}
                onLike={p.authorPid === me.pid ? undefined : () => toggleLike(p)}
                onDelete={() => handleDelete(p)}
              />
            </div>
          ))}
        </div>
      )}
      <p className="text-center text-[11.5px] text-slate-500">내 포스트잇에는 공감을 누를 수 없어요 · 동료 의견에 🔥를 눌러주세요</p>
    </div>
  );
};
