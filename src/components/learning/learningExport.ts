import { WORKSHOP_TEAMS } from '../../config/workshopConfig';
import {
  LearningSubject,
  getFrameworkMeta,
  getLikeCount,
  parseSubjectData,
  sortWallByLikes,
  countStampsForTeam,
} from '../../config/learningConfig';

type Cell = string | number | null | undefined;

export function downloadCsvFile(filename: string, headers: string[], rows: Cell[][]) {
  const esc = (v: Cell) => (v === null || v === undefined ? '""' : `"${String(v).replace(/"/g, '""')}"`);
  const csv = [headers.map(esc).join(','), ...rows.map(r => (r.length === 0 ? '' : r.map(esc).join(',')))].join('\r\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.setAttribute('download', filename);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const teamName = (id?: string) => WORKSHOP_TEAMS.find(t => t.id === id)?.name || id || '-';
const fmt = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('ko-KR');
};

/**
 * 📥 HRD 학습 데이터 통합 엑셀(CSV)
 * - 섹션 1: 전체 교육생 포스트잇 원문 & 공감 수
 * - 섹션 2: 조별 3단계 토의 결론 + 키워드 + 해시태그 + 공감 스탬프 + 응원 코멘트
 * - 섹션 3: 응원 코멘트 원문
 */
export function exportLearningCsv(
  learningRaw: Record<string, any>,
  subjects: LearningSubject[],
  brand: string,
  onlySubjectId?: string
) {
  const targetSubjects = subjects.filter(s => !onlySubjectId || s.id === onlySubjectId);
  // DB에는 있으나 설정에서 삭제된 과목도 누락 없이 포함
  if (!onlySubjectId) {
    Object.keys(learningRaw || {}).forEach(id => {
      if (!targetSubjects.some(s => s.id === id)) {
        targetSubjects.push({
          id,
          title: `(삭제된 과목) ${id}`,
          wallQuestion: '',
          canvasTopic: '',
          framework: 'custom',
          steps: [0, 1, 2].map(i => ({ label: `STEP ${i + 1}`, question: '', placeholder: '', tags: [] })),
        });
      }
    });
  }

  const headers = ['과목명', '포스트잇 질문', '공감 순위', '작성자', '소속 회사', '소속 조', '포스트잇 내용', '공감 수(🔥)', '작성 일시'];
  const rows: Cell[][] = [];

  targetSubjects.forEach(subj => {
    const d = parseSubjectData(learningRaw?.[subj.id] || {});
    sortWallByLikes(d.wall).forEach((p, idx) => {
      rows.push([subj.title, subj.wallQuestion, idx + 1, p.authorName, p.authorCompany || '', teamName(p.authorTeamId), p.text, getLikeCount(p), fmt(p.createdAt)]);
    });
  });

  rows.push([]);
  rows.push([`=== [${brand} 조별 3단계 토의 캔버스 & 인사이트 쇼케이스 결과] ===`]);
  rows.push([
    '과목명',
    '토의 주제',
    '토의 프레임워크',
    '조',
    '제출 상태',
    'STEP1_단계',
    'STEP1_결론',
    'STEP1_키워드',
    'STEP2_단계',
    'STEP2_결론',
    'STEP2_키워드',
    'STEP3_단계',
    'STEP3_결론',
    'STEP3_키워드',
    '해시태그',
    '노트사진 첨부',
    '받은 💡인사이트 스탬프',
    '받은 🚀현업적용 스탬프',
    '받은 스탬프 합계',
    '💡를 보낸 조',
    '🚀를 보낸 조',
    '우리 조가 보낸 💡',
    '우리 조가 보낸 🚀',
    '받은 응원 코멘트 수',
    '함께 작성한 조원',
    '최초 제출자',
    '제출 일시',
    '최종 수정',
  ]);

  targetSubjects.forEach(subj => {
    const d = parseSubjectData(learningRaw?.[subj.id] || {});
    const fw = getFrameworkMeta(subj.framework);
    WORKSHOP_TEAMS.forEach(t => {
      const c = d.canvas[t.id];
      const st = countStampsForTeam(d.votes, t.id);
      const myVote = d.votes[t.id] || {};
      const cmts = d.comments[t.id] || [];
      const ans = c?.answers || ['', '', ''];
      const tags = c?.tags || [[], [], []];
      rows.push([
        subj.title,
        subj.canvasTopic,
        fw.name,
        t.name,
        c?.status === 'submitted' ? '제출 완료' : c && (ans.some(a => a.trim())) ? '작성 중' : '미작성',
        subj.steps[0]?.label,
        ans[0] || '-',
        (tags[0] || []).join(', '),
        subj.steps[1]?.label,
        ans[1] || '-',
        (tags[1] || []).join(', '),
        subj.steps[2]?.label,
        ans[2] || '-',
        (tags[2] || []).join(', '),
        (c?.hashtags || []).map(h => `#${h}`).join(' '),
        c?.notePhotoUrl ? 'Y' : 'N',
        st.insight,
        st.action,
        st.total,
        st.insightFrom.map(teamName).join(', '),
        st.actionFrom.map(teamName).join(', '),
        myVote.insight ? teamName(myVote.insight) : '-',
        myVote.action ? teamName(myVote.action) : '-',
        cmts.length,
        Object.values(c?.contributors || {}).join(', '),
        c?.submittedBy || '',
        fmt(c?.submittedAt),
        c?.updatedBy ? `${c.updatedBy} (${fmt(c.updatedAt)})` : '',
      ]);
    });
  });

  rows.push([]);
  rows.push([`=== [타 조 인사이트 카드 응원 코멘트 원문] ===`]);
  rows.push(['과목명', '받은 조', '작성자', '작성자 소속 조', '코멘트', '작성 일시']);
  targetSubjects.forEach(subj => {
    const d = parseSubjectData(learningRaw?.[subj.id] || {});
    WORKSHOP_TEAMS.forEach(t => {
      (d.comments[t.id] || []).forEach(c => {
        rows.push([subj.title, t.name, c.authorName, teamName(c.authorTeamId), c.text, fmt(c.createdAt)]);
      });
    });
  });

  const label = onlySubjectId ? targetSubjects[0]?.title.replace(/[\\/:*?"<>|[\]\s]+/g, '_') : '전체과목';
  downloadCsvFile(`${brand}_학습데이터_${label}_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
}
