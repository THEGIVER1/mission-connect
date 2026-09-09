import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  WORKSHOP_TEAMS,
  MY_INFO_QUESTIONS,
  DISCOVERY_QUIZZES,
  ACTIVE_VENUE,
} from '../../config/workshopConfig';
import { DiscoveryQuizItem } from '../../types';

interface ParticipantRecord {
  id: string;
  name: string;
  company: string;
  teamId: string;
  teamName: string;
  course: string;
  score: number;
  missionsCompleted: number;
  myInfo?: Record<string, string>;
  quizzes?: Record<string, {
    selectedIdx: number;
    isCorrect: boolean;
    pointsEarned: number;
    answeredAt: string;
  }>;
  truth1?: string;
  truth2?: string;
  lie?: string;
  joinedAt?: string;
}

interface PeopleQuestRecord {
  teamId: string;
  teamName: string;
  status: 'draft' | 'submitted';
  recommendation?: {
    recommendedPersonId: string;
    recommendedPersonName: string;
    recommendedPersonCompany: string;
    selectedTopic: string;
    reason: string;
  };
  submittedAt?: string;
  submittedBy?: string;
}

type AdminTab = 'quizMaster' | 'discoveryQuizzes' | 'myInfoList' | 'peopleQuest' | 'teams';

const AdminScreen: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<AdminTab>('quizMaster');
  const [participants, setParticipants] = useState<ParticipantRecord[]>([]);
  const [peopleQuests, setPeopleQuests] = useState<Record<string, PeopleQuestRecord>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCompany, setSelectedCompany] = useState<'all' | '㈜두산' | '두산경영연구원'>('all');

  // 저녁 퀴즈 마스터 모드 상태
  const [blindMode, setBlindMode] = useState<boolean>(false);
  const [currentCardIndex, setCurrentCardIndex] = useState<number>(0);

  // Discovery 퀴즈 관리/테스트 상태
  const [adminSelectedQuizId, setAdminSelectedQuizId] = useState<string>(DISCOVERY_QUIZZES[0].id);
  const [adminTestAnswers, setAdminTestAnswers] = useState<Record<string, number | null>>({});
  const [adminSubmittedQuizzes, setAdminSubmittedQuizzes] = useState<Record<string, boolean>>({});
  const [showAnswerDirectly, setShowAnswerDirectly] = useState<boolean>(true);

  const dbUrl = import.meta.env.VITE_FIREBASE_DATABASE_URL || 'https://doosan-teambuilding-default-rtdb.firebaseio.com';

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // 1. 참가자 전체 목록 (quizzes 포함)
      const pRes = await fetch(`${dbUrl}/sessions/trekking2026/participants.json`);
      if (pRes.ok) {
        const pData = await pRes.json();
        if (pData) {
          const list: ParticipantRecord[] = Object.entries(pData).map(([id, val]: [string, any]) => ({
            id,
            ...val,
          }));
          setParticipants(list);
        } else {
          setParticipants([]);
        }
      }

      // 2. People Quest 조별 제출 현황
      const pqRes = await fetch(`${dbUrl}/sessions/trekking2026/peopleQuest.json`);
      if (pqRes.ok) {
        const pqData = await pqRes.json();
        if (pqData) {
          setPeopleQuests(pqData);
        }
      }
    } catch (e) {
      console.warn('Admin 데이터 로드 실패:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dbUrl]);

  // 필터링된 참가자 목록
  const filteredParticipants = useMemo(() => {
    return participants.filter(p => {
      if (selectedCompany !== 'all' && p.company !== selectedCompany) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (p.name || '').toLowerCase().includes(q) || (p.teamName || '').includes(q);
      }
      return true;
    });
  }, [participants, selectedCompany, searchQuery]);

  // Discovery 퀴즈별 실시간 풀이 통계 계산
  const discoveryStats = useMemo(() => {
    const stats: Record<string, { totalSolves: number; correctCount: number; wrongCount: number; solvesByTeam: Record<string, number> }> = {};

    DISCOVERY_QUIZZES.forEach(q => {
      stats[q.id] = { totalSolves: 0, correctCount: 0, wrongCount: 0, solvesByTeam: {} };
    });

    participants.forEach(p => {
      if (p.quizzes && typeof p.quizzes === 'object') {
        Object.entries(p.quizzes).forEach(([quizId, res]) => {
          if (stats[quizId]) {
            stats[quizId].totalSolves += 1;
            if (res.isCorrect) {
              stats[quizId].correctCount += 1;
            } else {
              stats[quizId].wrongCount += 1;
            }
            const team = p.teamName || p.teamId || '미배정';
            stats[quizId].solvesByTeam[team] = (stats[quizId].solvesByTeam[team] || 0) + 1;
          }
        });
      }
    });

    return stats;
  }, [participants]);

  // People Quest 추천 받은 횟수 집계
  const nominationStats = useMemo(() => {
    const map: Record<string, { count: number; byTeams: string[]; reasons: string[] }> = {};
    Object.values(peopleQuests).forEach(pq => {
      if (pq.status === 'submitted' && pq.recommendation?.recommendedPersonName) {
        const name = pq.recommendation.recommendedPersonName;
        if (!map[name]) map[name] = { count: 0, byTeams: [], reasons: [] };
        map[name].count += 1;
        map[name].byTeams.push(pq.teamName);
        map[name].reasons.push(`[${pq.teamName}] ${pq.recommendation.reason}`);
      }
    });
    return map;
  }, [peopleQuests]);

  // 7개 문항 답변을 작성한 참가자 수
  const answeredParticipants = useMemo(() => {
    return participants.filter(p => p.myInfo && Object.keys(p.myInfo).length > 0);
  }, [participants]);

  // CSV 다운로드 유틸리티
  const downloadCSV = (filename: string, headers: string[], rows: (string | number)[][]) => {
    const escape = (val: string | number) => `"${String(val || '').replace(/"/g, '""')}"`;
    const csvContent = [
      headers.map(escape).join(','),
      ...rows.map(row => row.map(escape).join(',')),
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 1. 나의 정보 7문항 전체 CSV 다운로드
  const handleExportMyInfoCSV = () => {
    const headers = [
      '이름',
      '소속',
      '소속 조',
      '배정 코스',
      '현재 점수',
      'Q1_가장 푹 빠진 것',
      'Q2_5일 자유시간',
      'Q3_해보고 싶은 직업',
      'Q4_3년 내 버킷리스트',
      'Q5_의외의 사실',
      'Q6_가장 성장한 경험',
      'Q7_새로운 커리어 도전',
      '등록일시',
    ];

    const rows = participants.map(p => {
      const info = p.myInfo || {};
      return [
        p.name || '',
        p.company || '',
        p.teamName || p.teamId || '',
        p.course || '',
        p.score ?? 0,
        info['q1_passion'] || p.truth1 || '',
        info['q2_vacation'] || '',
        info['q3_dreamJob'] || p.lie || '',
        info['q4_bucketList'] || '',
        info['q5_unexpectedFact'] || p.truth2 || '',
        info['q6_growthExperience'] || '',
        info['q7_careerChallenge'] || '',
        p.joinedAt || '',
      ];
    });

    downloadCSV(`CHRO_트레킹_나의정보_7문항_원문_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  };

  // 2. 통합 저녁 행사용 결합 CSV (7문항 + 조별 추천 내역)
  const handleExportMasterMergedCSV = () => {
    const headers = [
      '이름',
      '소속',
      '소속 조',
      '추천받은 횟수',
      '추천해준 조 목록',
      '조별 추천 사유 통합',
      'Q1_가장 푹 빠진 것',
      'Q2_5일 자유시간',
      'Q3_해보고 싶은 직업',
      'Q4_3년 내 버킷리스트',
      'Q5_의외의 사실',
      'Q6_가장 성장한 경험',
      'Q7_새로운 커리어 도전',
    ];

    const rows = participants.map(p => {
      const info = p.myInfo || {};
      const stat = nominationStats[p.name] || { count: 0, byTeams: [], reasons: [] };
      return [
        p.name || '',
        p.company || '',
        p.teamName || p.teamId || '',
        stat.count,
        stat.byTeams.join(' / '),
        stat.reasons.join(' | '),
        info['q1_passion'] || p.truth1 || '',
        info['q2_vacation'] || '',
        info['q3_dreamJob'] || p.lie || '',
        info['q4_bucketList'] || '',
        info['q5_unexpectedFact'] || p.truth2 || '',
        info['q6_growthExperience'] || '',
        info['q7_careerChallenge'] || '',
      ];
    });

    downloadCSV(`CHRO_트레킹_저녁퀴즈_통합마스터_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  };

  // 3. 테스트용 샘플 데이터 생성
  const handleGenerateSampleData = async () => {
    if (!window.confirm('저녁 퀴즈 및 Discovery 퀴즈 테스트를 위해 샘플 참가자 3명(김민준, 이서연, 손우진)의 데이터를 생성하시겠습니까?')) return;
    setIsLoading(true);
    try {
      const samples = [
        {
          name: '김민준',
          company: '㈜두산',
          teamId: 'team1',
          teamName: '1조',
          course: 'forest',
          score: 300,
          missionsCompleted: 2,
          joinedAt: new Date().toISOString(),
          status: 'active',
          myInfo: {
            q1_passion: '주말 10km 한강 러닝과 마라톤 풀코스 준비',
            q2_vacation: '스위스 인터라켄으로 떠나 대자연 트레킹하기',
            q3_dreamJob: '골목길 작은 심야식당 오너 셰프',
            q4_bucketList: '보스턴 마라톤 대회 완주 메달 획득하기',
            q5_unexpectedFact: '대학 시절 록밴드 드럼 연주자 출신',
            q6_growthExperience: '입사 후 첫 신사업 프로젝트 PM으로 3개 부서 협업 리딩',
            q7_careerChallenge: '글로벌 HR 데이터 분석 및 조직문화 신규 모델 구축',
          },
          quizzes: {
            dq_elephant: { selectedIdx: 0, isCorrect: true, pointsEarned: 100, answeredAt: new Date().toISOString() },
            dq_museum: { selectedIdx: 1, isCorrect: true, pointsEarned: 100, answeredAt: new Date().toISOString() },
            dq_zoo: { selectedIdx: 0, isCorrect: true, pointsEarned: 100, answeredAt: new Date().toISOString() },
          },
        },
        {
          name: '이서연',
          company: '두산경영연구원',
          teamId: 'team1',
          teamName: '1조',
          course: 'forest',
          score: 200,
          missionsCompleted: 1,
          joinedAt: new Date().toISOString(),
          status: 'active',
          myInfo: {
            q1_passion: '프랑스 제과 제빵 베이킹 클래스 수강',
            q2_vacation: '제주도 조용한 바닷가 북스테이에서 5일간 독서하기',
            q3_dreamJob: '어린이 동화 작가 겸 일러스트레이터',
            q4_bucketList: '나만의 홈베이킹 레시피북 독립출판하기',
            q5_unexpectedFact: '바리스타 1급 자격증 보유 & 20개국 배낭여행',
            q6_growthExperience: '어려웠던 전략 과제 분석 실패 후 재도전하여 CEO 보고 성공',
            q7_careerChallenge: '생성형 AI를 활용한 경영진 리더십 진단 툴 개발',
          },
          quizzes: {
            dq_elephant: { selectedIdx: 0, isCorrect: true, pointsEarned: 100, answeredAt: new Date().toISOString() },
            dq_museum: { selectedIdx: 1, isCorrect: true, pointsEarned: 100, answeredAt: new Date().toISOString() },
          },
        },
        {
          name: '손우진',
          company: '㈜두산',
          teamId: 'team4',
          teamName: '4조',
          course: 'lake',
          score: 200,
          missionsCompleted: 1,
          joinedAt: new Date().toISOString(),
          status: 'active',
          myInfo: {
            q1_passion: '골프 숏게임 연습 및 주말 스크린 골프 대회',
            q2_vacation: '가족들과 함께 하와이 휴양지에서 온전한 휴식',
            q3_dreamJob: '세계 여행 전문 여행 다큐멘터리 PD',
            q4_bucketList: '골프 싱글 타수 달성 & 가족 해외여행 3회',
            q5_unexpectedFact: '스킨스쿠버 다이빙 마스터 자격증 보유',
            q6_growthExperience: '새로운 직무로 부서 이동 후 6개월 만에 최우수 조직원 선정',
            q7_careerChallenge: '타 계열사와의 전략적 인재 교류 프로그램 기획',
          },
          quizzes: {
            dq_elephant: { selectedIdx: 0, isCorrect: true, pointsEarned: 100, answeredAt: new Date().toISOString() },
            dq_lake: { selectedIdx: 1, isCorrect: true, pointsEarned: 100, answeredAt: new Date().toISOString() },
          },
        },
      ];

      for (const s of samples) {
        const pId = `${s.name}_${s.company}`.replace(/\s/g, '_');
        await fetch(`${dbUrl}/sessions/trekking2026/participants/${encodeURIComponent(pId)}.json`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(s),
        });
      }

      await fetchData();
      alert('샘플 참가자 데이터 3명이 성공적으로 등록되었습니다!');
    } catch (e) {
      alert('샘플 데이터 생성 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 4. 조별 People Quest 제출 해제
  const handleResetPeopleQuest = async (teamId: string) => {
    if (!window.confirm(`[${teamId}]의 People Quest 제출을 취소하고 임시저장(draft) 상태로 되돌리시겠습니까?`)) {
      return;
    }
    try {
      await fetch(`${dbUrl}/sessions/trekking2026/peopleQuest/${teamId}.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'draft' }),
      });
      fetchData();
      alert('제출이 해제되었습니다.');
    } catch (e) {
      alert('해제 중 오류가 발생했습니다.');
    }
  };

  const currentP = participants[currentCardIndex] || participants[0];
  const activeDiscoveryQuiz = DISCOVERY_QUIZZES.find(q => q.id === adminSelectedQuizId) || DISCOVERY_QUIZZES[0];

  return (
    <div className="max-w-[440px] mx-auto bg-[#0D1117] min-h-screen pb-16 font-['Noto_Sans_KR'] text-slate-100 flex flex-col">
      {/* 헤더 */}
      <header className="bg-[#13192A] border-b border-white/8 px-4 pt-3 pb-3 relative">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-red-600 to-orange-500" />
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="w-9 h-9 rounded-xl bg-[#1A2235] border border-white/8 flex items-center justify-center text-white text-base"
          >
            ←
          </button>
          <div className="text-center">
            <span className="font-bebas text-xl tracking-widest text-white">
              ADMIN · <span className="text-red-500">CONTROL CENTER</span>
            </span>
            <p className="text-[10px] text-slate-400">2026 CHRO Trekking 운영본부 & 퀴즈 센터</p>
          </div>
          <button
            onClick={fetchData}
            className="w-9 h-9 rounded-xl bg-[#1A2235] border border-white/8 flex items-center justify-center text-slate-300 active:scale-95"
            title="새로고침"
          >
            🔄
          </button>
        </div>
      </header>

      {/* 종합 현황 인포 바 */}
      <div className="bg-[#101626] border-b border-white/8 px-4 py-2 flex items-center justify-between text-[11px] text-slate-300">
        <div>
          <span>👥 등록 참가자: </span>
          <strong className="text-amber-400 font-bold">{participants.length}명</strong>
          <span className="text-slate-500 ml-1">/ 50명</span>
        </div>
        <div>
          <span>💡 7문항 답변: </span>
          <strong className="text-green-400 font-bold">{answeredParticipants.length}명</strong>
        </div>
      </div>

      {/* 5개 탭 네비게이션 */}
      <div className="bg-[#101626] border-b border-white/8 p-1.5 grid grid-cols-5 gap-1 text-[11px] font-bold">
        <button
          onClick={() => setActiveTab('quizMaster')}
          className={`py-2 rounded-lg transition-all text-center ${
            activeTab === 'quizMaster' ? 'bg-red-500 text-white shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          🎯 저녁퀴즈
        </button>
        <button
          onClick={() => setActiveTab('discoveryQuizzes')}
          className={`py-2 rounded-lg transition-all text-center ${
            activeTab === 'discoveryQuizzes' ? 'bg-sky-500 text-white shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          🧭 현장퀴즈
        </button>
        <button
          onClick={() => setActiveTab('myInfoList')}
          className={`py-2 rounded-lg transition-all text-center ${
            activeTab === 'myInfoList' ? 'bg-red-500 text-white shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          💡 나의정보
        </button>
        <button
          onClick={() => setActiveTab('peopleQuest')}
          className={`py-2 rounded-lg transition-all text-center ${
            activeTab === 'peopleQuest' ? 'bg-red-500 text-white shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          💬 추천현황
        </button>
        <button
          onClick={() => setActiveTab('teams')}
          className={`py-2 rounded-lg transition-all text-center ${
            activeTab === 'teams' ? 'bg-red-500 text-white shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          📊 조별순위
        </button>
      </div>

      {/* 탭 컨텐츠 */}
      <div className="p-4 space-y-4 flex-1 overflow-y-auto">

        {/* TAB 1: 저녁 퀴즈 마스터 모드 */}
        {activeTab === 'quizMaster' && (
          <div className="space-y-4">
            <div className="bg-[#1A2235] border border-red-500/30 rounded-2xl p-4 space-y-3 shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-bold text-red-400 flex items-center gap-1.5">
                  🎤 저녁 퀴즈 출제 화면
                </span>
                <button
                  onClick={() => setBlindMode(!blindMode)}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold border transition-all ${
                    blindMode
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-green-500/20 text-green-300 border-green-500/40'
                  }`}
                >
                  {blindMode ? '🔒 블라인드 (이름 숨김)' : '🔓 정답 공개 모드'}
                </button>
              </div>
              <p className="text-[12px] text-slate-300 leading-relaxed">
                빔프로젝터에 띄우거나 MC가 읽어주며 <strong>"이 답변의 주인공은 누구일까요?"</strong> 퀴즈를 진행할 수 있습니다.
              </p>
            </div>

            {/* 참가자 선택 셀렉터 */}
            {participants.length > 0 && (
              <div className="bg-[#1A2235] border border-white/10 rounded-2xl p-3 flex items-center justify-between gap-2">
                <span className="text-[12px] font-bold text-slate-300 whitespace-nowrap">참가자 선택:</span>
                <select
                  value={currentCardIndex}
                  onChange={e => setCurrentCardIndex(Number(e.target.value))}
                  className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-[12px] text-white focus:outline-none focus:border-red-500"
                >
                  {participants.map((p, idx) => (
                    <option key={p.id} value={idx} style={{ background: '#1A2235', color: 'white' }}>
                      #{idx + 1} {p.name || '미입력'} ({p.company || ''} · {p.teamName || p.teamId || ''}) {p.myInfo ? '✓' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* 플래시 카드 */}
            {participants.length === 0 ? (
              <div className="bg-[#1A2235] border border-white/10 rounded-2xl p-6 text-center space-y-3">
                <p className="text-slate-400 text-[13px]">
                  아직 실시간 데이터베이스에 등록된 참가자 정보가 없습니다.
                </p>
                <button
                  onClick={handleGenerateSampleData}
                  className="px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold text-[13px] rounded-xl shadow active:scale-98 transition-all"
                >
                  🧪 퀴즈 테스트용 샘플 참가자 데이터 생성
                </button>
              </div>
            ) : (
              (() => {
                const info = currentP?.myInfo || {};
                const stat = currentP ? nominationStats[currentP.name] : null;
                const hasInfo = Object.keys(info).length > 0;

                return (
                  <div className="bg-gradient-to-br from-[#161F33] to-[#101726] border-2 border-white/15 rounded-3xl p-5 shadow-2xl space-y-4 relative overflow-hidden">
                    {/* 카드 헤더 */}
                    <div className="flex justify-between items-start border-b border-white/10 pb-3">
                      <div>
                        <span className="text-[11px] text-red-400 font-bold tracking-wider uppercase block">
                          QUIZ CARD #{currentCardIndex + 1} / {participants.length}
                        </span>
                        <h2 className="text-[20px] font-extrabold text-white mt-0.5">
                          {blindMode ? '❓ 누구의 이야기일까요?' : `👑 ${currentP.name || '미등록'} 님`}
                        </h2>
                        <span className="text-[12px] text-slate-400">
                          {blindMode ? `소속: ${currentP.company} · ${currentP.teamName}` : `${currentP.company} · ${currentP.teamName}`}
                        </span>
                      </div>
                      {stat && stat.count > 0 && (
                        <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-bold px-2.5 py-1 rounded-full">
                          ⭐ 낮 트레킹 {stat.count}개 조 추천!
                        </span>
                      )}
                    </div>

                    {!hasInfo && (
                      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-[12px] text-amber-300 text-center">
                        ⚠️ 이 참가자는 아직 7문항 답변을 입력하지 않았습니다.
                      </div>
                    )}

                    {/* 7개 질문 답변 리스트 */}
                    <div className="space-y-2.5">
                      {MY_INFO_QUESTIONS.map((q, idx) => {
                        const val = info[q.id] || (idx === 0 ? currentP.truth1 : idx === 2 ? currentP.lie : idx === 4 ? currentP.truth2 : '');
                        return (
                          <div key={q.id} className="bg-black/40 border border-white/5 rounded-xl p-3 space-y-1">
                            <span className="text-[11px] text-red-400 font-bold block">
                              Q{idx + 1}. {q.title}
                            </span>
                            <p className="text-[13px] text-white font-medium leading-relaxed">
                              {val ? `"${val}"` : <span className="text-slate-500 italic">(미입력)</span>}
                            </p>
                          </div>
                        );
                      })}
                    </div>

                    {/* 낮 트레킹 추천 사유가 있다면 노출 */}
                    {stat && stat.reasons.length > 0 && (
                      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 space-y-1.5">
                        <span className="text-[11px] text-red-400 font-bold block">
                          💬 낮 트레킹 동료들의 추천 코멘트:
                        </span>
                        {stat.reasons.map((r, i) => (
                          <p key={i} className="text-[12px] text-slate-200 italic">
                            • {r}
                          </p>
                        ))}
                      </div>
                    )}

                    {/* 이전 / 다음 카드 전환 */}
                    <div className="flex gap-2 pt-2 border-t border-white/10">
                      <button
                        onClick={() => setCurrentCardIndex(prev => Math.max(0, prev - 1))}
                        disabled={currentCardIndex === 0}
                        className="flex-1 py-3 bg-[#1A2235] hover:bg-[#222C44] disabled:opacity-40 text-white font-bold text-[13px] rounded-xl border border-white/10"
                      >
                        ← 이전 참가자
                      </button>
                      <button
                        onClick={() => setCurrentCardIndex(prev => Math.min(participants.length - 1, prev + 1))}
                        disabled={currentCardIndex === participants.length - 1}
                        className="flex-1 py-3 bg-red-500 hover:bg-red-600 disabled:opacity-40 text-white font-bold text-[13px] rounded-xl shadow"
                      >
                        다음 참가자 →
                      </button>
                    </div>
                  </div>
                );
              })()
            )}

            {/* 하단 CSV 다운로드 & 샘플 생성 버튼 */}
            <div className="pt-2 space-y-2">
              <button
                onClick={handleExportMasterMergedCSV}
                className="w-full py-3.5 bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-500 hover:to-orange-400 text-white font-bold text-[14px] rounded-xl shadow-lg flex items-center justify-center gap-2"
              >
                <span>📥 저녁 퀴즈용 전체 결합 엑셀(CSV) 다운로드</span>
              </button>
              <button
                onClick={handleGenerateSampleData}
                className="w-full py-2.5 bg-[#1A2235] hover:bg-[#222C44] text-slate-300 font-bold text-[12px] rounded-xl border border-white/10"
              >
                🧪 퀴즈 테스트용 샘플 참가자 데이터 3명 추가
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: Discovery 현장 퀴즈 관리 & 실시간 풀이 테스트 */}
        {activeTab === 'discoveryQuizzes' && (
          <div className="space-y-4">
            {/* 상단 안내 배너 */}
            <div className="bg-[#1A2235] border border-sky-500/30 rounded-2xl p-4 space-y-2 shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-bold text-sky-400 flex items-center gap-1.5">
                  🧭 Discovery 현장 퀴즈 관리 & 풀이 센터
                </span>
                <button
                  onClick={() => setShowAnswerDirectly(!showAnswerDirectly)}
                  className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40"
                >
                  {showAnswerDirectly ? '정답 보기 ON' : '정답 숨김'}
                </button>
              </div>
              <p className="text-[12px] text-slate-300 leading-relaxed">
                총 4개 문항(공통 2개 + 코스별 전용 1개, 조당 3문항 300pt)을 운영자가 직접 검토 및 테스트 풀이할 수 있습니다.
              </p>
              <div className="bg-black/30 p-2.5 rounded-xl border border-white/5 text-[11px] text-slate-300 space-y-1">
                <p>📸 <strong>공통 단체사진 스팟:</strong> {ACTIVE_VENUE.photoSpot.name} (두 코스 모두 통과)</p>
                <p>🦁 <strong>1~3조 (동물원둘레길):</strong> 코끼리열차 매표소 + 미술관 + 동물원둘레길 쉼터 (3문항)</p>
                <p>🌊 <strong>4~6조 (호수둘레길):</strong> 코끼리열차 매표소 + 미술관 + 호수 브릿지 데크 (3문항)</p>
              </div>
            </div>

            {/* 4개 퀴즈 문항 탭 선택 바 */}
            <div className="grid grid-cols-2 gap-2">
              {DISCOVERY_QUIZZES.map((quiz, idx) => {
                const isSel = quiz.id === adminSelectedQuizId;
                const stat = discoveryStats[quiz.id] || { totalSolves: 0, correctCount: 0 };
                const courseBadge = quiz.courseKey === 'all' ? '공통' : quiz.courseKey === 'forest' ? '동물원둘레길 (1~3조)' : '호수둘레길 (4~6조)';

                return (
                  <button
                    key={quiz.id}
                    onClick={() => setAdminSelectedQuizId(quiz.id)}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      isSel
                        ? 'bg-sky-950/40 border-sky-400 shadow-md shadow-sky-500/20'
                        : 'bg-[#1A2235] border-white/8 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isSel ? 'bg-sky-400 text-slate-900' : 'bg-white/10 text-slate-300'
                      }`}>
                        문항 #{idx + 1} ({courseBadge})
                      </span>
                      <span className="text-[10px] text-amber-400 font-bold">100pt</span>
                    </div>
                    <h4 className="text-[13px] font-bold text-white truncate mt-1">
                      {quiz.title}
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-1">
                      실시간 풀이: <strong className="text-green-400">{stat.totalSolves}명</strong> ({stat.correctCount}명 정답)
                    </p>
                  </button>
                );
              })}
            </div>

            {/* 선택된 퀴즈 상세 풀이 & 관리 카드 */}
            {activeDiscoveryQuiz && (
              <div className="bg-gradient-to-br from-[#161F33] to-[#101726] border-2 border-sky-500/30 rounded-3xl p-5 shadow-2xl space-y-4">
                <div className="flex justify-between items-start border-b border-white/10 pb-3">
                  <div>
                    <span className="text-[11px] text-sky-400 font-bold uppercase tracking-wider block">
                      DISCOVERY QUIZ DETAIL & TEST
                    </span>
                    <h3 className="text-[18px] font-extrabold text-white mt-0.5">
                      {activeDiscoveryQuiz.title}
                    </h3>
                    <p className="text-[12px] text-slate-300 mt-0.5">
                      📍 위치: <strong className="text-sky-300">{activeDiscoveryQuiz.locationLabel}</strong>
                    </p>
                  </div>
                  <span className="bg-sky-500/20 text-sky-300 border border-sky-500/40 text-[11px] font-bold px-2.5 py-1 rounded-full">
                    반경 {activeDiscoveryQuiz.radiusMeters}m
                  </span>
                </div>

                {/* 문제 내용 */}
                <div className="bg-black/40 border border-white/10 rounded-2xl p-4 space-y-2">
                  <span className="text-[11px] font-bold text-amber-400 block">
                    [문제 내용]
                  </span>
                  <p className="text-[14px] font-bold text-white leading-relaxed">
                    {activeDiscoveryQuiz.questionText}
                  </p>
                </div>

                {/* 보기 리스트 (운영자 즉시 테스트 가능) */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 block">
                    [보기 선택 및 테스트 풀이]
                  </span>
                  {activeDiscoveryQuiz.options.map((opt, oIdx) => {
                    const selected = adminTestAnswers[activeDiscoveryQuiz.id] === oIdx;
                    const isCorrectAnswer = oIdx === activeDiscoveryQuiz.correctIndex;
                    const submitted = adminSubmittedQuizzes[activeDiscoveryQuiz.id];

                    let btnClass = 'bg-black/30 border-white/10 text-slate-200';
                    if (submitted) {
                      if (isCorrectAnswer) {
                        btnClass = 'bg-green-500/20 border-green-500 text-green-300 font-bold';
                      } else if (selected) {
                        btnClass = 'bg-red-500/20 border-red-500 text-red-300';
                      } else {
                        btnClass = 'bg-black/20 border-white/5 text-slate-500 opacity-60';
                      }
                    } else if (showAnswerDirectly && isCorrectAnswer) {
                      btnClass = 'bg-green-950/40 border-green-500/60 text-green-300';
                    } else if (selected) {
                      btnClass = 'bg-sky-500/20 border-sky-400 text-sky-300 font-bold';
                    }

                    return (
                      <button
                        key={oIdx}
                        type="button"
                        onClick={() => {
                          setAdminTestAnswers(prev => ({ ...prev, [activeDiscoveryQuiz.id]: oIdx }));
                          setAdminSubmittedQuizzes(prev => ({ ...prev, [activeDiscoveryQuiz.id]: false }));
                        }}
                        className={`w-full p-3.5 rounded-xl border text-left text-[13px] flex items-center justify-between transition-all ${btnClass}`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center text-[11px] font-bold">
                            {oIdx + 1}
                          </span>
                          <span>{opt}</span>
                        </div>
                        {showAnswerDirectly && isCorrectAnswer && !submitted && (
                          <span className="text-[11px] font-bold text-green-400 bg-green-500/20 px-2 py-0.5 rounded">
                            정답 ✓
                          </span>
                        )}
                        {submitted && isCorrectAnswer && (
                          <span className="text-green-400 font-bold text-[12px]">정답 ✓</span>
                        )}
                        {submitted && selected && !isCorrectAnswer && (
                          <span className="text-red-400 font-bold text-[12px]">오답 ✕</span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* 테스트 답안 제출 버튼 */}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (adminTestAnswers[activeDiscoveryQuiz.id] === undefined) {
                        alert('보기를 먼저 선택해주세요.');
                        return;
                      }
                      setAdminSubmittedQuizzes(prev => ({ ...prev, [activeDiscoveryQuiz.id]: true }));
                    }}
                    className="flex-1 py-3 bg-sky-500 hover:bg-sky-600 text-white font-bold text-[13px] rounded-xl shadow active:scale-98 transition-all"
                  >
                    🧪 테스트 채점 및 해설 확인
                  </button>
                  <button
                    onClick={() => {
                      setAdminTestAnswers(prev => ({ ...prev, [activeDiscoveryQuiz.id]: null }));
                      setAdminSubmittedQuizzes(prev => ({ ...prev, [activeDiscoveryQuiz.id]: false }));
                    }}
                    className="px-3 py-3 bg-[#1A2235] text-slate-400 hover:text-white text-[12px] font-bold rounded-xl border border-white/10"
                  >
                    초기화
                  </button>
                </div>

                {/* 해설 박스 */}
                {(adminSubmittedQuizzes[activeDiscoveryQuiz.id] || showAnswerDirectly) && (
                  <div className="bg-black/50 border border-sky-500/30 rounded-2xl p-4 space-y-1.5 animate-fade-in">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13px] font-bold text-amber-400">💡 정답 해설 & 현장 안내:</span>
                    </div>
                    <p className="text-[12.5px] text-slate-200 leading-relaxed">
                      {activeDiscoveryQuiz.explanation}
                    </p>
                    <div className="pt-2 border-t border-white/10 text-[11px] text-slate-400 flex justify-between">
                      <span>GPS 좌표: {activeDiscoveryQuiz.coords.lat}, {activeDiscoveryQuiz.coords.lng}</span>
                      <span>지정 배점: +{activeDiscoveryQuiz.points}pt</span>
                    </div>
                  </div>
                )}

                {/* 실시간 참가자 풀이 현황 세부 */}
                <div className="bg-black/30 border border-white/5 rounded-2xl p-3.5 space-y-2">
                  <span className="text-[11px] font-bold text-slate-300 block">
                    📊 이 문항 실시간 참가자 풀이 내역
                  </span>
                  {(() => {
                    const stat = discoveryStats[activeDiscoveryQuiz.id];
                    if (!stat || stat.totalSolves === 0) {
                      return <p className="text-[11px] text-slate-500 italic">아직 풀이를 완료한 참가자가 없습니다.</p>;
                    }

                    const accuracy = Math.round((stat.correctCount / stat.totalSolves) * 100);
                    return (
                      <div className="space-y-2 text-[12px]">
                        <div className="flex justify-between items-center text-slate-300">
                          <span>총 풀이 수: <strong className="text-white">{stat.totalSolves}명</strong></span>
                          <span>정답률: <strong className="text-green-400">{accuracy}%</strong> ({stat.correctCount}명 성공)</span>
                        </div>
                        <div className="flex flex-wrap gap-1 pt-1">
                          {Object.entries(stat.solvesByTeam).map(([team, count]) => (
                            <span key={team} className="text-[10px] bg-sky-500/10 border border-sky-500/20 text-sky-300 px-2 py-0.5 rounded-md">
                              {team}: {count}명
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: 나의 정보 7문항 전체 목록 */}
        {activeTab === 'myInfoList' && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="이름 또는 조 검색"
                className="flex-1 bg-[#1A2235] border border-white/10 rounded-xl px-3 py-2 text-[12px] text-white placeholder-slate-600"
              />
              <button
                onClick={handleExportMyInfoCSV}
                className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white text-[12px] font-bold rounded-xl whitespace-nowrap shadow"
              >
                CSV 받기
              </button>
            </div>

            <div className="space-y-2.5">
              {filteredParticipants.map(p => {
                const info = p.myInfo || {};
                return (
                  <div key={p.id} className="bg-[#1A2235] border border-white/8 rounded-2xl p-3.5 space-y-2">
                    <div className="flex justify-between items-center">
                      <div>
                        <strong className="text-[14px] text-white">{p.name || '미등록'}</strong>
                        <span className="text-[11px] text-slate-400 ml-2">
                          ({p.company || ''} · {p.teamName || p.teamId || ''})
                        </span>
                      </div>
                      <span className="text-[11px] bg-red-500/15 text-red-400 px-2 py-0.5 rounded-full font-bold">
                        {p.score ?? 0}pt
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-1 text-[11px] text-slate-300 bg-black/30 p-2.5 rounded-xl">
                      <p>• <strong>1. 취미/관심사:</strong> {info['q1_passion'] || p.truth1 || '-'}</p>
                      <p>• <strong>2. 5일 자유시간:</strong> {info['q2_vacation'] || '-'}</p>
                      <p>• <strong>3. 원하는 직업:</strong> {info['q3_dreamJob'] || p.lie || '-'}</p>
                      <p>• <strong>4. 버킷리스트:</strong> {info['q4_bucketList'] || '-'}</p>
                      <p>• <strong>5. 의외의 사실:</strong> {info['q5_unexpectedFact'] || p.truth2 || '-'}</p>
                      <p>• <strong>6. 성장 경험:</strong> {info['q6_growthExperience'] || '-'}</p>
                      <p>• <strong>7. 새로운 도전:</strong> {info['q7_careerChallenge'] || '-'}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 4: 조별 People Quest 추천 현황 */}
        {activeTab === 'peopleQuest' && (
          <div className="space-y-3">
            <div className="bg-[#1A2235] border border-white/10 rounded-2xl p-3.5 space-y-2">
              <span className="text-[12px] font-bold text-white block">
                💬 6개 조 People Quest 제출 상태
              </span>
              <p className="text-[11px] text-slate-400">
                각 조가 트레킹 중 발견하여 추천한 인물과 스토리입니다.
              </p>
            </div>

            <div className="space-y-2.5">
              {WORKSHOP_TEAMS.map(team => {
                const pq = peopleQuests[team.id];
                const isSubmitted = pq?.status === 'submitted';
                const rec = pq?.recommendation;

                return (
                  <div key={team.id} className="bg-[#1A2235] border border-white/8 rounded-2xl p-3.5 space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{team.emoji}</span>
                        <strong className="text-[14px] text-white">{team.name}</strong>
                      </div>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                        isSubmitted
                          ? 'bg-green-500/15 text-green-400 border-green-500/30'
                          : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                      }`}>
                        {isSubmitted ? '✓ 최종 제출됨' : '진행 중'}
                      </span>
                    </div>

                    {rec?.recommendedPersonName ? (
                      <div className="bg-black/30 p-2.5 rounded-xl space-y-1 text-[12px]">
                        <p className="text-white font-bold">
                          👑 추천: <span className="text-amber-400">{rec.recommendedPersonName} 님</span> ({rec.recommendedPersonCompany})
                        </p>
                        <p className="text-slate-300 text-[11px]">
                          주제: {rec.selectedTopic}
                        </p>
                        <p className="text-slate-400 text-[11px] italic bg-white/5 p-2 rounded-lg mt-1">
                          "{rec.reason}"
                        </p>
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-500">아직 추천 대상자가 등록되지 않았습니다.</p>
                    )}

                    {isSubmitted && (
                      <div className="pt-1 flex justify-end">
                        <button
                          onClick={() => handleResetPeopleQuest(team.id)}
                          className="text-[11px] text-slate-400 hover:text-red-400 underline"
                        >
                          제출 취소 및 수정 허용
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 5: 조별 순위 현황 */}
        {activeTab === 'teams' && (
          <div className="space-y-3">
            {WORKSHOP_TEAMS.map((team, idx) => {
              const teamMembers = participants.filter(p => p.teamId === team.id);
              const totalScore = teamMembers.reduce((acc, cur) => acc + (cur.score ?? 0), 0);

              return (
                <div key={team.id} className="bg-[#1A2235] border border-white/8 rounded-2xl p-3.5 space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-red-500/20 text-red-400 font-bold text-[11px] flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <strong className="text-[14px] text-white">{team.emoji} {team.name}</strong>
                      <span className="text-[11px] text-slate-400">({teamMembers.length}명)</span>
                    </div>
                    <span className="text-[14px] font-extrabold text-amber-400">
                      {totalScore.toLocaleString()} pt
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1 pt-1">
                    {teamMembers.map(m => (
                      <span key={m.id} className="text-[10px] bg-black/40 border border-white/5 px-2 py-0.5 rounded-md text-slate-300">
                        {m.name || '미등록'} ({m.score ?? 0}pt)
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
};

export default AdminScreen;
