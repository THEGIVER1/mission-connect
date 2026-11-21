/**
 * =====================================================================
 * 📚 과목별 학습 토의 모듈 (두산연강원 전용)
 * =====================================================================
 * 모듈 1. 💬 전체 교육생 라이브 포스트잇 월 (All-Hands Idea Wall)
 * 모듈 2. 🧩 조별 3단계 스마트 토의 캔버스 + 🏆 전 조 인사이트 쇼케이스 & 크로스 공감 투표
 *
 * Firebase 경로: sessions/trekking2026/learning/{subjectId}/
 *   ├─ wall/{postId}          : 전체 교육생 포스트잇 (likes/{participantId}: true)
 *   ├─ canvas/{teamId}        : 조별 3단계 토의 캔버스
 *   ├─ votes/{voterTeamId}    : 조별 공감 스탬프 (insight / action 각 1표)
 *   └─ comments/{targetTeamId}/{commentId} : 타 조 카드 응원 한 줄 코멘트
 *
 * ⚠️ 이 파일은 workshopConfig의 "값"을 import하지 않습니다 (순환 참조 방지).
 */

export type LearningDisplayMode = 'off' | 'with-teambuilding' | 'learning-only';
export type DiscussionFrameworkKey = 'problem' | 'case' | 'value' | 'custom';

export interface LearningStepDef {
  /** 단계 짧은 라벨 (예: 현장의 고민) */
  label: string;
  /** 참가자에게 보이는 질문 */
  question: string;
  /** 입력창 예시 문구 */
  placeholder: string;
  /** 터치로 고르는 추천 키워드 칩 */
  tags: string[];
}

export interface LearningSubject {
  id: string;
  /** 과목명 (예: [Session 1] 일하는 방식 혁신) */
  title: string;
  /** 모듈 1: 전체 교육생에게 던지는 오프닝 질문 */
  wallQuestion: string;
  /** 모듈 2: 조별 토의 주제 */
  canvasTopic: string;
  framework: DiscussionFrameworkKey;
  steps: LearningStepDef[]; // 항상 3개
}

export interface DiscussionFrameworkPreset {
  key: DiscussionFrameworkKey;
  icon: string;
  name: string;
  desc: string;
  steps: LearningStepDef[];
}

export const DISCUSSION_FRAMEWORKS: DiscussionFrameworkPreset[] = [
  {
    key: 'problem',
    icon: '🛠️',
    name: '현업 문제해결형',
    desc: '고민(Why) → 솔루션(How) → 실천(What)',
    steps: [
      {
        label: '현장의 고민',
        question: '이 주제에서 우리가 현업에서 겪는 가장 큰 고민·이슈는 무엇인가요?',
        placeholder: '예: 부서 간 정보 공유가 늦어 같은 일을 두 번 하는 경우가 많다',
        tags: ['소통 단절', '시간 부족', '우선순위 혼선', '반복 업무', '책임 모호', '변화 저항'],
      },
      {
        label: '돌파 솔루션',
        question: '이 고민을 풀기 위해 우리 조가 찾은 돌파 솔루션은?',
        placeholder: '예: 주 1회 15분 크로스 체크인으로 진행 상황을 한 장에 공유한다',
        tags: ['프로세스 개선', '도구 활용', '역할 재정의', '정기 리추얼', '리더 지원', '작게 시작'],
      },
      {
        label: '현업 실천 액션',
        question: '교육 후 현업으로 돌아가 당장 실천할 1가지 액션은?',
        placeholder: '예: 다음 주 월요일 팀 회의에서 체크인 보드를 바로 도입한다',
        tags: ['이번 주', '다음 회의', '1개월 내', '팀 전체', '개인 습관', '리더 주도'],
      },
    ],
  },
  {
    key: 'case',
    icon: '⚖️',
    name: '케이스·딜레마 토의형',
    desc: '쟁점 진단 → 의사결정·근거 → 시사점',
    steps: [
      {
        label: '핵심 쟁점 진단',
        question: '이 케이스의 핵심 원인 또는 쟁점은 무엇이라고 진단했나요?',
        placeholder: '예: 성과 압박 속에서 단기 실적과 구성원 신뢰가 충돌하고 있다',
        tags: ['이해관계 충돌', '정보 비대칭', '가치 충돌', '리더십 공백', '구조적 문제', '타이밍'],
      },
      {
        label: '우리 조의 결정',
        question: '우리 조라면 어떤 결정을 내리겠습니까? 그 근거는?',
        placeholder: '예: 일정을 2주 늦추더라도 구성원과 먼저 합의한다. 신뢰가 장기 성과의 기반이기 때문',
        tags: ['원칙 우선', '사람 우선', '성과 우선', '절충안', '데이터 기반', '단계적 실행'],
      },
      {
        label: '리더십 시사점',
        question: '이 토의가 우리에게 주는 리더십·실무 시사점은?',
        placeholder: '예: 어려운 결정일수록 이유를 투명하게 설명하는 것이 리더의 몫이다',
        tags: ['투명한 소통', '용기 있는 결정', '경청', '책임감', '공정성', '일관성'],
      },
    ],
  },
  {
    key: 'value',
    icon: '🌱',
    name: '가치·일하는 방식형',
    desc: '지향 키워드 → 버릴 것 vs 채울 것 → 선언문',
    steps: [
      {
        label: '지향 핵심 키워드',
        question: '우리가 지향해야 할 일하는 방식의 핵심 키워드는?',
        placeholder: '예: 빠른 실행과 솔직한 피드백',
        tags: ['도전', '신뢰', '자율', '협업', '고객 중심', '속도', '전문성', '존중'],
      },
      {
        label: '버릴 것 vs 채울 것',
        question: '그 방향으로 가기 위해 버려야 할 관행과 새로 채울 문화는?',
        placeholder: '예: 버릴 것 – 보고를 위한 보고 / 채울 것 – 결론부터 말하는 1장 보고',
        tags: ['형식적 보고', '눈치 문화', '사일로', '완벽주의', '칭찬 문화', '실패 공유'],
      },
      {
        label: '우리 조 선언문',
        question: '우리 조의 다짐을 한 줄 선언문으로 정리한다면?',
        placeholder: '예: "우리는 완벽한 계획보다 빠른 실행과 솔직한 회고를 택한다"',
        tags: ['우리는 ~한다', '함께', '매일', '끝까지', '먼저'],
      },
    ],
  },
];

export const CUSTOM_FRAMEWORK_META = { key: 'custom' as const, icon: '✏️', name: '직접 구성', desc: '3단계 질문 자유 편집' };

export function cloneSteps(steps: LearningStepDef[]): LearningStepDef[] {
  return steps.map(s => ({ ...s, tags: [...(s.tags || [])] }));
}

export function getFrameworkPreset(key: DiscussionFrameworkKey): DiscussionFrameworkPreset | undefined {
  return DISCUSSION_FRAMEWORKS.find(f => f.key === key);
}

export function getFrameworkMeta(key: DiscussionFrameworkKey) {
  return getFrameworkPreset(key) || CUSTOM_FRAMEWORK_META;
}

export function createLearningSubject(partial?: Partial<LearningSubject>): LearningSubject {
  const framework = partial?.framework || 'problem';
  const preset = getFrameworkPreset(framework) || DISCUSSION_FRAMEWORKS[0];
  return {
    id: partial?.id || `subj_${Date.now().toString(36)}`,
    title: partial?.title || '새 과목',
    wallQuestion: partial?.wallQuestion || '오늘 이 과목에서 가장 기대되는 점은 무엇인가요?',
    canvasTopic: partial?.canvasTopic || '조별 토의 주제를 입력하세요',
    framework,
    steps: partial?.steps && partial.steps.length === 3 ? cloneSteps(partial.steps) : cloneSteps(preset.steps),
  };
}

export const DEFAULT_LEARNING_SUBJECTS: LearningSubject[] = [
  createLearningSubject({
    id: 'subj_s1',
    title: '[Session 1] 일하는 방식 혁신',
    wallQuestion: '요즘 우리 조직에서 "이건 꼭 바뀌었으면 좋겠다" 싶은 일하는 방식 한 가지는?',
    canvasTopic: '우리 조직의 비효율을 줄이고 몰입을 높이는 일하는 방식은?',
    framework: 'problem',
  }),
  createLearningSubject({
    id: 'subj_s2',
    title: '[Session 2] 리더십 딜레마 케이스',
    wallQuestion: '리더로서 가장 어려웠던 순간을 한 단어로 표현한다면?',
    canvasTopic: '성과와 사람 사이, 우리 조의 리더십 선택은?',
    framework: 'case',
  }),
];

/** 쇼케이스 공감 스탬프 2종 */
export const SHOWCASE_STAMPS = [
  {
    key: 'insight' as const,
    icon: '💡',
    name: '무릎 탁! 최고 인사이트상',
    short: '인사이트',
    color: 'amber',
  },
  {
    key: 'action' as const,
    icon: '🚀',
    name: '당장 실천! 현업 적용상',
    short: '현업적용',
    color: 'sky',
  },
];
export type StampKey = (typeof SHOWCASE_STAMPS)[number]['key'];

/** 포스트잇 컬러 팔레트 (밝은 종이 질감 + 진한 글자로 시인성 확보) */
export const POSTIT_COLORS = [
  { key: 'yellow', bg: '#FFE97A', text: '#3D3200', ring: '#F5C800' },
  { key: 'pink', bg: '#FFB8D2', text: '#4A0F27', ring: '#FF6FA3' },
  { key: 'mint', bg: '#A8F0D1', text: '#073D2A', ring: '#3FD49A' },
  { key: 'sky', bg: '#B5DCFF', text: '#0B2A4A', ring: '#4DA6FF' },
  { key: 'lavender', bg: '#D7C6FF', text: '#2A1460', ring: '#9B7BFF' },
] as const;

export function getPostitColor(key?: string) {
  return POSTIT_COLORS.find(c => c.key === key) || POSTIT_COLORS[0];
}

export const LEARNING_DB_BASE = 'sessions/trekking2026/learning';

// ─────────────────────────────────────────────────────────────────
// 데이터 타입 & 파서
// ─────────────────────────────────────────────────────────────────
export interface WallPost {
  id: string;
  text: string;
  color: string;
  authorName: string;
  authorCompany?: string;
  authorTeamId: string;
  authorPid: string;
  createdAt: string;
  likes?: Record<string, boolean>;
}

export interface CanvasRecord {
  teamId: string;
  answers?: string[]; // [step1, step2, step3]
  tags?: string[][]; // 단계별 선택 키워드
  hashtags?: string[];
  notePhotoUrl?: string;
  status?: 'draft' | 'submitted';
  submittedAt?: string;
  submittedBy?: string;
  updatedAt?: string;
  updatedBy?: string;
  contributors?: Record<string, string>; // pid -> name
}

export interface VoteRecord {
  insight?: string;
  action?: string;
  votedBy?: string;
  updatedAt?: string;
}

export interface CommentRecord {
  id: string;
  text: string;
  authorName: string;
  authorTeamId: string;
  createdAt: string;
}

export interface SubjectData {
  wall: WallPost[];
  canvas: Record<string, CanvasRecord>;
  votes: Record<string, VoteRecord>;
  comments: Record<string, CommentRecord[]>;
}

const toArr = <T,>(v: any): T[] => {
  if (!v) return [];
  if (Array.isArray(v)) return v.filter(Boolean);
  if (typeof v === 'object') return Object.values(v).filter(Boolean) as T[];
  return [];
};

export function normalizeCanvas(raw: any, teamId: string): CanvasRecord {
  // 인덱스 보존 (빈 단계가 있어도 순서가 밀리지 않도록 직접 접근)
  const ansRaw = raw?.answers || {};
  const answers = [0, 1, 2].map(i => String(ansRaw?.[i] ?? ''));
  const tagsRaw = raw?.tags;
  const tags: string[][] = [0, 1, 2].map(i => {
    const t = Array.isArray(tagsRaw) ? tagsRaw[i] : tagsRaw?.[i];
    return toArr<string>(t).map(String);
  });
  return {
    ...(raw || {}),
    teamId,
    answers,
    tags,
    hashtags: toArr<string>(raw?.hashtags).map(String),
  };
}

export function parseSubjectData(raw: any): SubjectData {
  const wall: WallPost[] = Object.entries(raw?.wall || {})
    .map(([id, p]: [string, any]) => ({ ...(p || {}), id: p?.id || id }))
    .filter((p: any) => p && p.text);

  const canvas: Record<string, CanvasRecord> = {};
  Object.entries(raw?.canvas || {}).forEach(([tid, c]) => {
    canvas[tid] = normalizeCanvas(c, tid);
  });

  const votes: Record<string, VoteRecord> = { ...(raw?.votes || {}) };

  const comments: Record<string, CommentRecord[]> = {};
  Object.entries(raw?.comments || {}).forEach(([tid, list]: [string, any]) => {
    comments[tid] = Object.entries(list || {})
      .map(([cid, c]: [string, any]) => ({ ...(c || {}), id: c?.id || cid }))
      .filter((c: any) => c && c.text)
      .sort((a: any, b: any) => String(a.createdAt).localeCompare(String(b.createdAt)));
  });

  return { wall, canvas, votes, comments };
}

export function getLikeCount(p: WallPost): number {
  return p.likes ? Object.values(p.likes).filter(Boolean).length : 0;
}

/** 공감순 정렬 (동률 시 먼저 작성된 순) */
export function sortWallByLikes(wall: WallPost[]): WallPost[] {
  return [...wall].sort((a, b) => getLikeCount(b) - getLikeCount(a) || String(a.createdAt).localeCompare(String(b.createdAt)));
}

export function getTopWallPosts(wall: WallPost[], n = 3): WallPost[] {
  return sortWallByLikes(wall).filter(p => getLikeCount(p) > 0).slice(0, n);
}

/** 대상 조가 받은 스탬프 수 집계 */
export function countStampsForTeam(votes: Record<string, VoteRecord>, targetTeamId: string) {
  let insight = 0;
  let action = 0;
  const insightFrom: string[] = [];
  const actionFrom: string[] = [];
  Object.entries(votes || {}).forEach(([voter, v]) => {
    if (!v || voter === targetTeamId) return;
    if (v.insight === targetTeamId) {
      insight += 1;
      insightFrom.push(voter);
    }
    if (v.action === targetTeamId) {
      action += 1;
      actionFrom.push(voter);
    }
  });
  return { insight, action, total: insight + action, insightFrom, actionFrom };
}

export function isCanvasSubmitted(c?: CanvasRecord | null): boolean {
  return !!c && c.status === 'submitted';
}

export function canvasProgress(c?: CanvasRecord | null): number {
  if (!c) return 0;
  return (c.answers || []).filter(a => String(a || '').trim().length > 0).length;
}

export function normalizeLearningSubjects(raw: any): LearningSubject[] {
  const list = toArr<any>(raw);
  if (list.length === 0) return DEFAULT_LEARNING_SUBJECTS.map(s => createLearningSubject(s));
  return list
    .filter(s => s && s.id)
    .map(s => {
      const steps = toArr<any>(s.steps);
      const preset = getFrameworkPreset(s.framework) || DISCUSSION_FRAMEWORKS[0];
      const safeSteps: LearningStepDef[] = [0, 1, 2].map(i => {
        const st = steps[i] || preset.steps[i];
        return {
          label: String(st?.label ?? preset.steps[i].label),
          question: String(st?.question ?? preset.steps[i].question),
          placeholder: String(st?.placeholder ?? ''),
          tags: toArr<string>(st?.tags).map(String),
        };
      });
      return {
        id: String(s.id),
        title: String(s.title || '과목'),
        wallQuestion: String(s.wallQuestion || ''),
        canvasTopic: String(s.canvasTopic || ''),
        framework: (['problem', 'case', 'value', 'custom'].includes(s.framework) ? s.framework : 'custom') as DiscussionFrameworkKey,
        steps: safeSteps,
      };
    });
}

export function shortText(s: string | undefined, n = 28): string {
  const t = String(s || '').replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n)}…` : t;
}

export function newId(prefix = 'p'): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

/** 이미지 파일을 가로 최대 maxW px JPEG dataURL로 압축 */
export function compressImageFile(file: File, maxW = 1100, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('read failed'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('image load failed'));
      img.onload = () => {
        const ratio = Math.min(1, maxW / img.width);
        const w = Math.round(img.width * ratio);
        const h = Math.round(img.height * ratio);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('no ctx'));
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
