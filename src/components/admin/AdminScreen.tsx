import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  WORKSHOP_TEAMS,
  MY_INFO_QUESTIONS,
  DISCOVERY_QUIZZES,
  ACTIVE_VENUE,
  PEOPLE_QUEST_POINTS_PER_MEMBER,
  EMERGENCY_GPS_BYPASS_CODE,
} from '../../config/workshopConfig';
import { calculateLeaderboardData } from '../../utils/scoreCalculator';
import { onValue, ref } from 'firebase/database';
import { rtdb } from '../../lib/firebase';
import { fireConfetti } from '../../lib/confetti';

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

interface BroadcastNoticeData {
  id: string;
  title?: string;
  message: string;
  type?: 'info' | 'urgent' | 'photo' | 'dinner';
  active: boolean;
  timestamp: string;
}

type AdminTab = 'quizMaster' | 'discoveryQuizzes' | 'broadcast' | 'teams' | 'myInfoList' | 'peopleQuest';

const AdminScreen: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<AdminTab>('quizMaster');
  const [rawParticipantsMap, setRawParticipantsMap] = useState<Record<string, any>>({});
  const [peopleQuests, setPeopleQuests] = useState<Record<string, PeopleQuestRecord>>({});
  const [currentBroadcast, setCurrentBroadcast] = useState<BroadcastNoticeData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCompany, setSelectedCompany] = useState<'all' | '㈜두산' | '두산경영연구원'>('all');

  // 저녁 퀴즈 마스터 모드 상태
  const [blindMode, setBlindMode] = useState<boolean>(false);
  const [currentCardIndex, setCurrentCardIndex] = useState<number>(0);

  // 빔프로젝터 무대 퀴즈쇼 풀스크린 모드 상태 (3단계 점진적 힌트 오픈: 0=신비주의, 1=취미/여가, 2=버킷리스트/의외의사실, 3=정답 공개)
  const [isStageMode, setIsStageMode] = useState<boolean>(false);
  const [stageStep, setStageStep] = useState<number>(0);

  // 최종 시상식 모드 상태 (7: 대기, 6->5->4->3->2->1: 순차 발표, 0: 전체 결과표 요약)
  const [isAwardMode, setIsAwardMode] = useState<boolean>(false);
  const [revealedAwardRank, setRevealedAwardRank] = useState<number>(7);

  // 실시간 공지 발송 폼 상태
  const [broadcastTitle, setBroadcastTitle] = useState<string>('');
  const [broadcastMessage, setBroadcastMessage] = useState<string>('');
  const [broadcastType, setBroadcastType] = useState<'info' | 'urgent' | 'photo' | 'dinner'>('info');
  const [isSendingBroadcast, setIsSendingBroadcast] = useState<boolean>(false);

  // Discovery 퀴즈 관리/테스트 상태
  const [adminSelectedQuizId, setAdminSelectedQuizId] = useState<string>(DISCOVERY_QUIZZES[0].id);
  const [adminTestAnswers, setAdminTestAnswers] = useState<Record<string, number | null>>({});
  const [adminSubmittedQuizzes, setAdminSubmittedQuizzes] = useState<Record<string, boolean>>({});
  const [showAnswerDirectly, setShowAnswerDirectly] = useState<boolean>(true);

  const dbUrl = import.meta.env.VITE_FIREBASE_DATABASE_URL || 'https://doosan-teambuilding-default-rtdb.firebaseio.com';

  const processAdminData = useCallback((data: any) => {
    if (!data || typeof data !== 'object') return;
    if (data.participants && typeof data.participants === 'object') {
      setRawParticipantsMap(data.participants);
    } else {
      setRawParticipantsMap({});
    }
    if (data.peopleQuest && typeof data.peopleQuest === 'object') {
      setPeopleQuests(data.peopleQuest);
    } else {
      setPeopleQuests({});
    }
    if (data.broadcastNotice && data.broadcastNotice.active) {
      setCurrentBroadcast(data.broadcastNotice);
    } else {
      setCurrentBroadcast(null);
    }
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`${dbUrl}/sessions/trekking2026.json?t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        processAdminData(data);
      }
    } catch (e) {
      console.warn('Admin 데이터 로드 실패:', e);
    } finally {
      setIsLoading(false);
    }
  }, [dbUrl, processAdminData]);

  // Dual-Channel 실시간 동기화 (WebSocket 리스너 + 2.5s REST 폴링)
  useEffect(() => {
    fetchData();

    const pollInterval = setInterval(fetchData, 2500);

    let unsubscribe = () => {};
    try {
      const sessionRef = ref(rtdb, 'sessions/trekking2026');
      unsubscribe = onValue(
        sessionRef,
        (snapshot) => {
          if (!snapshot.exists()) return;
          const data = snapshot.val();
          processAdminData(data);
        },
        (error) => {
          console.warn('어드민 실시간 동기화 경고:', error);
        }
      );
    } catch (e) {
      console.warn('어드민 Firebase 리스너 등록 경고:', e);
    }

    return () => {
      clearInterval(pollInterval);
      unsubscribe();
    };
  }, [fetchData]);

  // 1. 실시간 랭킹 및 통합 점수 계산 (대시보드·리더보드와 100% 동일한 점수 계산기 연동)
  const { individuals, teams: calculatedTeams } = useMemo(() => {
    return calculateLeaderboardData(rawParticipantsMap, peopleQuests);
  }, [rawParticipantsMap, peopleQuests]);

  // 2. 관리자용 상세 참가자 목록 (myInfo, 퀴즈 상세, 점수 통합)
  const participants: ParticipantRecord[] = useMemo(() => {
    return individuals.map(ind => {
      const raw = rawParticipantsMap[ind.id] ||
        rawParticipantsMap[`${ind.name}_${ind.company}`.replace(/\s/g, '_')] ||
        Object.values(rawParticipantsMap).find((p: any) => (p?.name || '').trim() === ind.name.trim()) ||
        {};

      return {
        id: ind.id,
        name: ind.name,
        company: ind.company,
        teamId: ind.teamId,
        teamName: ind.team,
        course: raw.course || (WORKSHOP_TEAMS.find(t => t.id === ind.teamId)?.assignedCourse ?? 'lake'),
        score: ind.pts,
        missionsCompleted: ind.missions,
        myInfo: raw.myInfo || {},
        quizzes: raw.quizzes || {},
        truth1: raw.truth1,
        truth2: raw.truth2,
        lie: raw.lie,
        joinedAt: raw.joinedAt,
      };
    });
  }, [individuals, rawParticipantsMap]);

  // 3. 실시간 조별 순위 및 팀원 목록 (개인 점수 합산 100% 일치)
  const rankedTeams = useMemo(() => {
    return calculatedTeams.map(team => {
      const members = participants.filter(p => p.teamId === team.id);
      return {
        ...team,
        members,
        totalScore: team.score,
        completedCount: team.missionsCompleted,
      };
    });
  }, [calculatedTeams, participants]);

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

  // 키보드 단축키 핸들러 (무대 퀴즈쇼 모드 및 시상식 모드)
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // 1. 시상식 모드 키보드 컨트롤
    if (isAwardMode) {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault();
        setRevealedAwardRank(prev => {
          if (prev === 7) return 6;
          if (prev > 1) {
            const next = prev - 1;
            if (next <= 3) fireConfetti({ count: next === 1 ? 130 : 70 });
            return next;
          }
          if (prev === 1) return 0; // 전체 결과표
          return 0;
        });
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        setRevealedAwardRank(prev => (prev < 7 ? (prev === 0 ? 1 : prev + 1) : 7));
      } else if (e.key === 'c' || e.key === 'C') {
        fireConfetti({ count: 90 });
      } else if (e.key === 'Escape') {
        setIsAwardMode(false);
      }
      return;
    }

    // 2. 무대 퀴즈쇼 모드 키보드 컨트롤 (3단계 점진적 힌트 오픈)
    if (!isStageMode) return;

    if (e.key === 'ArrowRight' || e.key === ' ') {
      e.preventDefault();
      // 0 -> 1 -> 2 -> 3 (정답 공개 시 폭죽) -> 다음 참가자(0)
      if (stageStep < 3) {
        const nextStep = stageStep + 1;
        setStageStep(nextStep);
        if (nextStep === 3) fireConfetti({ count: 90 });
      } else {
        if (currentCardIndex < participants.length - 1) {
          setCurrentCardIndex(prev => prev + 1);
          setStageStep(0);
        }
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (stageStep > 0) {
        setStageStep(prev => prev - 1);
      } else {
        if (currentCardIndex > 0) {
          setCurrentCardIndex(prev => prev - 1);
          setStageStep(3);
        }
      }
    } else if (e.key === '0') {
      setStageStep(0);
    } else if (e.key === '1') {
      setStageStep(1);
    } else if (e.key === '2') {
      setStageStep(2);
    } else if (e.key === '3') {
      setStageStep(3);
      fireConfetti({ count: 90 });
    } else if (e.key === 'c' || e.key === 'C') {
      fireConfetti({ count: 90 });
    } else if (e.key === 'Escape') {
      setIsStageMode(false);
    }
  }, [isStageMode, isAwardMode, stageStep, currentCardIndex, participants.length]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

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

  // 3. 조별 People Quest 제출 해제
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

  // 4. 실시간 긴급 공지 전송
  const handleSendBroadcast = async (customPayload?: { title: string; message: string; type: 'info' | 'urgent' | 'photo' | 'dinner' }) => {
    const titleToSend = customPayload ? customPayload.title : broadcastTitle.trim();
    const messageToSend = customPayload ? customPayload.message : broadcastMessage.trim();
    const typeToSend = customPayload ? customPayload.type : broadcastType;

    if (!messageToSend) {
      alert('공지 내용을 입력해주세요.');
      return;
    }

    setIsSendingBroadcast(true);
    try {
      const newNotice: BroadcastNoticeData = {
        id: `notice_${Date.now()}`,
        title: titleToSend || undefined,
        message: messageToSend,
        type: typeToSend,
        active: true,
        timestamp: new Date().toISOString(),
      };

      await fetch(`${dbUrl}/sessions/trekking2026/broadcastNotice.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newNotice),
      });

      setCurrentBroadcast(newNotice);
      if (!customPayload) {
        setBroadcastTitle('');
        setBroadcastMessage('');
      }
      alert('전체 참가자에게 실시간 공지가 발송되었습니다!');
    } catch (e) {
      alert('공지 발송 중 오류가 발생했습니다.');
    } finally {
      setIsSendingBroadcast(false);
    }
  };

  // 5. 현재 활성 공지 내리기/삭제
  const handleClearBroadcast = async () => {
    if (!window.confirm('현재 전체 참가자 화면에 표시 중인 공지를 내리시겠습니까?')) return;
    setIsSendingBroadcast(true);
    try {
      await fetch(`${dbUrl}/sessions/trekking2026/broadcastNotice.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: false, message: '', timestamp: new Date().toISOString() }),
      });
      setCurrentBroadcast(null);
      alert('공지가 안전하게 종료되었습니다.');
    } catch (e) {
      alert('공지 종료 중 오류가 발생했습니다.');
    } finally {
      setIsSendingBroadcast(false);
    }
  };

  // 6. 파일럿 테스트용 전체 세션 데이터 초기화 (참가자, 퀴즈 기록, 추천 내역 등)
  const handleResetSessionData = async () => {
    if (!window.confirm('⚠️ 주의: 현재 등록된 모든 참가자 데이터, 퀴즈 풀이 내역, People Quest 추천 내역이 영구 초기화됩니다.\n\n새로운 파일럿 테스트를 위해 데이터를 초기화하시겠습니까?')) {
      return;
    }
    const confirmCode = window.prompt('초기화를 확정하려면 "초기화"라고 입력해주세요.');
    if (confirmCode !== '초기화') {
      alert('초기화가 취소되었습니다.');
      return;
    }

    try {
      setIsLoading(true);
      const resetTimestamp = Date.now();
      await fetch(`${dbUrl}/sessions/trekking2026.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participants: {},
          peopleQuest: {},
          lastResetAt: resetTimestamp,
          broadcastNotice: { active: false, message: '', timestamp: new Date().toISOString() },
        }),
      });
      setRawParticipantsMap({});
      setPeopleQuests({});
      setCurrentBroadcast(null);
      alert('✅ 파일럿 테스트 데이터가 성공적으로 초기화되었습니다.');
    } catch (e) {
      console.error('초기화 실패:', e);
      alert('데이터 초기화 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const currentP = participants[currentCardIndex] || participants[0];
  const activeDiscoveryQuiz = DISCOVERY_QUIZZES.find(q => q.id === adminSelectedQuizId) || DISCOVERY_QUIZZES[0];

  // ─────────────────────────────────────────────────────────────────
  // VIEW 1: 빔프로젝터 최종 시상식 모드 (16:9 와이드 풀스크린)
  // ─────────────────────────────────────────────────────────────────
  if (isAwardMode) {
    const currentAwardTeam = revealedAwardRank >= 1 && revealedAwardRank <= 6
      ? rankedTeams[revealedAwardRank - 1]
      : null;

    return (
      <div className="fixed inset-0 z-[9999] bg-gradient-to-b from-[#0A0D18] via-[#0E1528] to-[#070A12] text-slate-100 flex flex-col font-['Noto_Sans_KR'] select-none p-6 md:p-10 overflow-hidden">
        {/* 상단 시상식 헤더 바 */}
        <div className="flex items-center justify-between border-b border-amber-500/20 pb-4">
          <div className="flex items-center gap-3">
            <span style={{ color: '#005EB8', fontSize: '28px', fontWeight: '900', letterSpacing: '2px', fontStyle: 'italic' }}>
              DOOSAN
            </span>
            <div className="h-6 w-0.5 bg-amber-500/30" />
            <span className="text-xl font-extrabold text-amber-400 tracking-widest uppercase flex items-center gap-2">
              🏆 2026 CHRO TREKKING · 영예의 최종 시상식
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fireConfetti({ count: 110 })}
              className="px-4 py-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-sm font-bold active:scale-95 transition-all flex items-center gap-1.5 shadow"
            >
              🎉 축하 팡파레 (C)
            </button>
            <button
              onClick={() => setIsAwardMode(false)}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 text-sm font-bold"
            >
              ✕ 시상식 종료 (ESC)
            </button>
          </div>
        </div>

        {/* 메인 무대 컨텐츠 영역 */}
        <div className="flex-1 flex flex-col justify-between py-6 max-w-5xl mx-auto w-full">
          {/* STEP 7: 시상식 발표 대기 오프닝 */}
          {revealedAwardRank === 7 && (
            <div className="my-auto text-center space-y-6 bg-gradient-to-br from-[#141C30] to-[#0B1020] border-2 border-amber-500/30 rounded-3xl p-12 shadow-2xl">
              <div className="text-7xl animate-bounce">🏆</div>
              <h1 className="text-4xl md:text-5xl font-black text-white leading-tight">
                2026 CHRO 한마음 트레킹<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-500">
                  영예의 최종 순위 발표
                </span>
              </h1>
              <p className="text-slate-300 text-lg max-w-2xl mx-auto">
                6개 조의 열정적인 현장 퀴즈 풀이와 People Quest 미션 점수가 모두 집계되었습니다.<br />
                지금부터 <strong>6위부터 영광의 1위 우승팀</strong>까지 순차적으로 공개합니다!
              </p>
              <div className="pt-4">
                <button
                  onClick={() => setRevealedAwardRank(6)}
                  className="px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xl rounded-2xl shadow-2xl active:scale-98 transition-all"
                >
                  ▶️ 6위부터 순차 발표 시작 (Space / →)
                </button>
              </div>
            </div>
          )}

          {/* STEP 6 ~ 1: 개별 순위 발표 카드 */}
          {revealedAwardRank >= 1 && revealedAwardRank <= 6 && currentAwardTeam && (
            <div className="my-auto space-y-6">
              <div
                className={`border-2 rounded-3xl p-8 md:p-12 shadow-2xl transition-all relative overflow-hidden ${
                  revealedAwardRank === 1
                    ? 'bg-gradient-to-br from-[#2D2006] via-[#1B170B] to-[#0D111E] border-amber-400 shadow-amber-500/30 ring-4 ring-amber-400/30 animate-scale-up'
                    : revealedAwardRank === 2
                    ? 'bg-gradient-to-br from-[#1C2438] via-[#131B2D] to-[#0D111E] border-slate-300 shadow-slate-400/20'
                    : revealedAwardRank === 3
                    ? 'bg-gradient-to-br from-[#261810] via-[#1A1412] to-[#0D111E] border-amber-700 shadow-amber-700/20'
                    : 'bg-gradient-to-br from-[#131B2C] to-[#0E1524] border-white/15'
                }`}
              >
                {/* 1위 우승팀 골든 후광 효과 */}
                {revealedAwardRank === 1 && (
                  <div className="absolute -top-24 -right-24 w-72 h-72 bg-amber-400/15 rounded-full blur-3xl pointer-events-none" />
                )}

                <div className="flex flex-col md:flex-row items-center justify-between gap-6 border-b border-white/10 pb-6">
                  <div className="text-center md:text-left">
                    <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                      <span className={`px-4 py-1.5 rounded-full text-base font-black uppercase tracking-wider ${
                        revealedAwardRank === 1
                          ? 'bg-amber-400 text-slate-950 shadow-lg'
                          : revealedAwardRank === 2
                          ? 'bg-slate-200 text-slate-950'
                          : revealedAwardRank === 3
                          ? 'bg-amber-700 text-white'
                          : 'bg-white/10 text-slate-300'
                      }`}>
                        {revealedAwardRank === 1 ? '🥇 최종 1위 우승 (CHAMPION)' : revealedAwardRank === 2 ? '🥈 2위 (준우승)' : revealedAwardRank === 3 ? '🥉 3위' : `제 ${revealedAwardRank}위`}
                      </span>
                    </div>
                    <h2 className="text-4xl md:text-6xl font-black text-white flex items-center gap-3">
                      <span>{currentAwardTeam.emoji}</span>
                      <span>{currentAwardTeam.name}</span>
                    </h2>
                  </div>

                  <div className="text-center md:text-right bg-black/40 border border-white/10 px-8 py-5 rounded-3xl">
                    <span className="text-xs text-slate-400 font-bold block uppercase tracking-widest mb-1">
                      TEAM FINAL SCORE
                    </span>
                    <span className={`text-4xl md:text-5xl font-black font-bebas tracking-wider ${
                      revealedAwardRank === 1 ? 'text-amber-400' : 'text-white'
                    }`}>
                      {currentAwardTeam.totalScore.toLocaleString()} <span className="text-2xl font-normal text-slate-400">PT</span>
                    </span>
                  </div>
                </div>

                {/* 팀원 명단 및 세부 활약상 */}
                <div className="pt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-300">
                      👥 영광의 주인공 팀원 ({currentAwardTeam.members.length}명)
                    </span>
                    <span className="text-xs text-green-400 font-semibold bg-green-500/15 px-3 py-1 rounded-full">
                      ✓ 완료 미션: {currentAwardTeam.completedCount}건
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {currentAwardTeam.members.map(m => (
                      <div key={m.id} className="bg-black/40 border border-white/10 rounded-2xl p-4 text-center space-y-1">
                        <strong className="text-lg font-bold text-white block">{m.name || '미등록'}</strong>
                        <span className="text-xs text-slate-400 block">{m.company}</span>
                        <span className="text-xs text-amber-400 font-mono font-bold">{m.score ?? 0} pt</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 0: 6개 조 전체 순위 종합 결과표 */}
          {revealedAwardRank === 0 && (
            <div className="my-auto space-y-4 bg-[#111728] border-2 border-white/15 rounded-3xl p-6 md:p-8 shadow-2xl">
              <div className="text-center pb-2">
                <h2 className="text-3xl font-black text-white">
                  👑 2026 CHRO TREKKING · 종합 최종 순위표
                </h2>
                <p className="text-slate-400 text-sm mt-1">모든 조원들의 열정과 화합에 감사드립니다!</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                {rankedTeams.map((team, idx) => (
                  <div
                    key={team.id}
                    className={`p-4 rounded-2xl border flex items-center justify-between ${
                      idx === 0
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                        : idx === 1
                        ? 'bg-slate-300/15 border-slate-300 text-slate-200'
                        : idx === 2
                        ? 'bg-amber-800/20 border-amber-700 text-amber-200'
                        : 'bg-black/30 border-white/10 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-black/40 flex items-center justify-center font-black text-base">
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}`}
                      </span>
                      <div>
                        <strong className="text-base text-white">{team.emoji} {team.name}</strong>
                        <span className="text-xs text-slate-400 ml-2">({team.members.length}명)</span>
                      </div>
                    </div>
                    <span className="text-xl font-black font-bebas text-amber-400">
                      {team.totalScore.toLocaleString()} pt
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 하단 시상식 진행 컨트롤러 */}
          <div className="flex justify-between items-center pt-4 border-t border-white/10">
            <button
              onClick={() => setRevealedAwardRank(prev => (prev < 7 ? (prev === 0 ? 1 : prev + 1) : 7))}
              disabled={revealedAwardRank === 7}
              className="px-6 py-3.5 bg-[#1A2235] hover:bg-[#232D42] disabled:opacity-30 text-white font-bold text-base rounded-2xl border border-white/10"
            >
              ← 이전 순위
            </button>

            {/* 순위 발표 단계 인디케이터 */}
            <div className="flex items-center gap-2">
              {[6, 5, 4, 3, 2, 1, 0].map(rank => {
                const isCurrent = revealedAwardRank === rank;
                const isPassed = revealedAwardRank < rank && revealedAwardRank !== 7;
                return (
                  <button
                    key={rank}
                    onClick={() => {
                      setRevealedAwardRank(rank);
                      if (rank <= 3 && rank >= 1) fireConfetti({ count: 80 });
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      isCurrent
                        ? 'bg-amber-400 text-slate-950 scale-110 shadow-lg'
                        : isPassed
                        ? 'bg-white/20 text-white'
                        : 'bg-black/40 text-slate-500'
                    }`}
                  >
                    {rank === 0 ? '종합' : `${rank}위`}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => {
                setRevealedAwardRank(prev => {
                  if (prev === 7) return 6;
                  if (prev > 1) {
                    const next = prev - 1;
                    if (next <= 3) fireConfetti({ count: next === 1 ? 130 : 70 });
                    return next;
                  }
                  if (prev === 1) return 0;
                  return 0;
                });
              }}
              disabled={revealedAwardRank === 0}
              className="px-6 py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-30 text-slate-950 font-black text-base rounded-2xl shadow-lg"
            >
              {revealedAwardRank === 7
                ? '6위 발표 시작 →'
                : revealedAwardRank === 1
                ? '종합 결과표 보기 →'
                : `${revealedAwardRank - 1}위 발표 →`}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────
  // VIEW 2: 빔프로젝터 무대 퀴즈쇼 풀스크린 뷰 (3단계 점진적 힌트 오픈)
  // ─────────────────────────────────────────────────────────────────
  if (isStageMode) {
    const info = currentP?.myInfo || {};
    const stat = currentP ? nominationStats[currentP.name] : null;

    if (!currentP || participants.length === 0) {
      return (
        <div className="fixed inset-0 z-[9999] bg-gradient-to-b from-[#0A0D18] via-[#0E1528] to-[#070A12] text-slate-100 flex flex-col font-['Noto_Sans_KR'] select-none p-6 md:p-10 overflow-hidden">
          {/* 상단 무대 헤더 바 */}
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <span style={{ color: '#005EB8', fontSize: '28px', fontWeight: '900', letterSpacing: '2px', fontStyle: 'italic' }}>
                DOOSAN
              </span>
              <div className="h-6 w-0.5 bg-white/20" />
              <span className="text-lg font-bold text-white tracking-widest uppercase">
                2026 CHRO TREKKING · 저녁 퀴즈쇼
              </span>
            </div>
            <button
              onClick={() => setIsStageMode(false)}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 text-sm font-bold"
            >
              ✕ 일반 모드로 복귀 (ESC)
            </button>
          </div>

          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-5 bg-[#131B2C] border-2 border-white/15 rounded-3xl p-10 max-w-xl shadow-2xl">
              <div className="text-6xl animate-pulse">🕵️‍♂️</div>
              <h2 className="text-2xl md:text-3xl font-black text-white">
                아직 등록된 참가자 정보가 없습니다
              </h2>
              <p className="text-slate-300 text-sm leading-relaxed">
                참가자들이 모바일 웹앱에서 <strong>팀 선택 및 나의 정보 7문항</strong>을 입력하면<br />
                실시간으로 저녁 퀴즈 카드가 자동으로 생성됩니다.
              </p>
              <div className="pt-2 flex justify-center gap-3">
                <button
                  onClick={fetchData}
                  className="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold text-sm rounded-xl shadow active:scale-95"
                >
                  🔄 실시간 데이터 새로고침
                </button>
                <button
                  onClick={() => setIsStageMode(false)}
                  className="px-5 py-2.5 bg-[#1A2235] hover:bg-[#232D42] text-slate-300 font-bold text-sm rounded-xl border border-white/10"
                >
                  일반 모드로 돌아가기
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="fixed inset-0 z-[9999] bg-[#0A0E17] text-slate-100 flex flex-col font-['Noto_Sans_KR'] select-none p-6 md:p-10 overflow-hidden">
        {/* 상단 무대 헤더 바 */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <span style={{ color: '#005EB8', fontSize: '28px', fontWeight: '900', letterSpacing: '2px', fontStyle: 'italic' }}>
              DOOSAN
            </span>
            <div className="h-6 w-0.5 bg-white/20" />
            <span className="text-lg font-bold text-white tracking-widest uppercase">
              2026 CHRO TREKKING · 저녁 퀴즈쇼
            </span>
          </div>

          {/* 3단계 힌트 오픈 인디케이터 컨트롤러 */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setStageStep(0)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                stageStep === 0
                  ? 'bg-slate-700 text-white border-white/40 shadow-lg'
                  : 'bg-black/30 text-slate-400 border-white/10'
              }`}
            >
              0단계: ❓ 비밀
            </button>
            <button
              onClick={() => setStageStep(1)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                stageStep === 1
                  ? 'bg-sky-500/30 text-sky-300 border-sky-400 shadow-lg'
                  : 'bg-black/30 text-slate-400 border-white/10'
              }`}
            >
              1단계: 🎯 취미·여가
            </button>
            <button
              onClick={() => setStageStep(2)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                stageStep === 2
                  ? 'bg-amber-500/30 text-amber-300 border-amber-400 shadow-lg'
                  : 'bg-black/30 text-slate-400 border-white/10'
              }`}
            >
              2단계: ⭐ 버킷리스트·비밀
            </button>
            <button
              onClick={() => {
                setStageStep(3);
                fireConfetti({ count: 90 });
              }}
              className={`px-4 py-1.5 rounded-xl text-xs font-black border transition-all ${
                stageStep === 3
                  ? 'bg-red-500 text-white border-red-400 shadow-lg shadow-red-500/30'
                  : 'bg-black/30 text-slate-400 border-white/10'
              }`}
            >
              3단계: 👑 정답 공개!
            </button>
            <button
              onClick={() => fireConfetti({ count: 80 })}
              className="px-3 py-1.5 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/40 text-xs font-bold active:scale-95 ml-2"
            >
              🎉 폭죽 (C)
            </button>
            <button
              onClick={() => setIsStageMode(false)}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-bold ml-1"
            >
              ✕ 일반 모드 (ESC)
            </button>
          </div>
        </div>

        {/* 퀴즈쇼 메인 플래시 카드 (와이드 16:9 대형 폰트) */}
        <div className="flex-1 flex flex-col justify-between py-6 max-w-5xl mx-auto w-full">
          <div className="bg-gradient-to-br from-[#131B2C] to-[#0E1524] border-2 border-white/15 rounded-3xl p-8 shadow-2xl space-y-6">
            <div className="flex justify-between items-center border-b border-white/10 pb-4">
              <div>
                <span className="text-sm text-red-400 font-bold tracking-widest uppercase block mb-1">
                  STAGE QUIZ #{currentCardIndex + 1} / {participants.length}
                </span>
                <h1 className="text-3xl md:text-4xl font-black text-white">
                  {stageStep < 3 ? '❓ 과연 이 답변의 주인공은 누구일까요?' : `👑 ${currentP.name || '미등록'} 님`}
                </h1>
                <p className="text-base text-slate-400 mt-1">
                  {stageStep < 3
                    ? (stageStep >= 1 ? '힌트가 순차적으로 공개됩니다.' : '잠시 후 힌트가 공개됩니다.')
                    : `${currentP.company} · ${currentP.teamName || currentP.teamId}`}
                </p>
              </div>

              {stat && stat.count > 0 && stageStep >= 2 && (
                <div className="bg-amber-500/20 border border-amber-500/40 px-4 py-2 rounded-2xl text-center animate-fade-in">
                  <span className="text-xs text-amber-300 block font-bold">낮 트레킹 추천</span>
                  <span className="text-lg font-black text-amber-400">{stat.count}개 조 지목!</span>
                </div>
              )}
            </div>

            {/* 0단계: 신비주의 (아무 힌트도 안 열렸을 때) */}
            {stageStep === 0 && (
              <div className="py-12 text-center space-y-4 bg-black/30 border border-white/5 rounded-2xl">
                <div className="text-6xl animate-pulse">🕵️‍♂️</div>
                <h3 className="text-2xl font-bold text-slate-200">
                  아직 힌트가 열리지 않았습니다.
                </h3>
                <p className="text-slate-400 text-sm">
                  스페이스바(Space) 또는 우측 화살표(→)를 누르면 <strong>1단계 힌트(취미/여가생활)</strong>가 열립니다!
                </p>
              </div>
            )}

            {/* 1단계 이상: 힌트 카드 그리드 뷰 */}
            {stageStep >= 1 && (
              <div className="grid grid-cols-2 gap-4">
                {/* 1단계 공개 문항 (Q1, Q2) */}
                <div className="bg-black/50 border border-sky-500/40 rounded-2xl p-5 space-y-1.5 shadow-lg">
                  <span className="text-xs text-sky-400 font-bold block">
                    Q1. 요즘 가장 푹 빠져 있는 취미나 관심사
                  </span>
                  <p className="text-lg font-bold text-white leading-snug">
                    "{info['q1_passion'] || currentP.truth1 || '미입력'}"
                  </p>
                </div>

                <div className="bg-black/50 border border-sky-500/40 rounded-2xl p-5 space-y-1.5 shadow-lg">
                  <span className="text-xs text-sky-400 font-bold block">
                    Q2. 5일의 완전한 자유 시간이 주어진다면?
                  </span>
                  <p className="text-lg font-bold text-white leading-snug">
                    "{info['q2_vacation'] || '미입력'}"
                  </p>
                </div>

                {/* 2단계 이상 공개 문항 (Q3, Q4, Q5) */}
                {stageStep >= 2 && (
                  <>
                    <div className="bg-black/50 border border-amber-500/40 rounded-2xl p-5 space-y-1.5 shadow-lg animate-fade-in">
                      <span className="text-xs text-amber-400 font-bold block">
                        Q3. 한 번쯤 해보고 싶은 다른 직업
                      </span>
                      <p className="text-lg font-bold text-white leading-snug">
                        "{info['q3_dreamJob'] || currentP.lie || '미입력'}"
                      </p>
                    </div>

                    <div className="bg-black/50 border border-amber-500/40 rounded-2xl p-5 space-y-1.5 shadow-lg animate-fade-in">
                      <span className="text-xs text-amber-400 font-bold block">
                        Q4. 3년 내 꼭 이루고 싶은 버킷리스트
                      </span>
                      <p className="text-lg font-bold text-white leading-snug">
                        "{info['q4_bucketList'] || '미입력'}"
                      </p>
                    </div>

                    <div className="bg-black/50 border border-amber-500/40 rounded-2xl p-5 space-y-1.5 shadow-lg col-span-2 animate-fade-in">
                      <span className="text-xs text-amber-400 font-bold block">
                        Q5. 동료들이 알면 깜짝 놀랄 의외의 사실
                      </span>
                      <p className="text-lg font-bold text-white leading-snug">
                        "{info['q5_unexpectedFact'] || currentP.truth2 || '미입력'}"
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* 낮 트레킹 추천 코멘트가 있을 때 (2단계 이상 노출) */}
            {stageStep >= 2 && stat && stat.reasons.length > 0 && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 space-y-1 animate-fade-in">
                <span className="text-xs text-red-400 font-bold block">
                  💬 낮 트레킹 동료들의 생생한 추천 코멘트:
                </span>
                {stat.reasons.map((r, i) => (
                  <p key={i} className="text-sm text-slate-200 italic font-medium">
                    • {r}
                  </p>
                ))}
              </div>
            )}
          </div>

          {/* 하단 진행 컨트롤러 */}
          <div className="flex justify-between items-center pt-4">
            <button
              onClick={() => {
                if (stageStep > 0) {
                  setStageStep(prev => prev - 1);
                } else if (currentCardIndex > 0) {
                  setCurrentCardIndex(prev => prev - 1);
                  setStageStep(3);
                }
              }}
              disabled={currentCardIndex === 0 && stageStep === 0}
              className="px-6 py-4 bg-[#1A2235] hover:bg-[#232D42] disabled:opacity-30 text-white font-bold text-base rounded-2xl border border-white/10"
            >
              ← 이전 단계/참가자
            </button>
            <span className="text-slate-400 text-sm">
              키보드 <strong>Space / → (다음 단계)</strong>, <strong>0·1·2·3 (단계 점프)</strong>, <strong>C (폭죽)</strong>
            </span>
            <button
              onClick={() => {
                if (stageStep < 3) {
                  const nextStep = stageStep + 1;
                  setStageStep(nextStep);
                  if (nextStep === 3) fireConfetti({ count: 90 });
                } else if (currentCardIndex < participants.length - 1) {
                  setCurrentCardIndex(prev => prev + 1);
                  setStageStep(0);
                }
              }}
              disabled={currentCardIndex === participants.length - 1 && stageStep === 3}
              className="px-6 py-4 bg-red-500 hover:bg-red-600 disabled:opacity-30 text-white font-bold text-base rounded-2xl shadow-lg"
            >
              {stageStep < 3 ? `${stageStep + 1}단계 힌트 열기 (Space) →` : '다음 참가자로 이동 →'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────
  // VIEW 3: 일반 모바일 / 데스크톱 관리자 콘솔 화면
  // ─────────────────────────────────────────────────────────────────
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
            <p className="text-[10px] text-slate-400">2026 CHRO Trekking 운영본부</p>
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
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="실시간 동기화 작동 중" />
          <span>👥 참여: </span>
          <strong className="text-amber-400 font-bold">{participants.length}명</strong>
        </div>
        <div>
          <span>💡 7문항: </span>
          <strong className="text-green-400 font-bold">{answeredParticipants.length}명</strong>
        </div>
        <button
          onClick={handleResetSessionData}
          className="px-2 py-0.5 rounded bg-red-900/40 text-red-300 border border-red-500/30 text-[10px] font-bold hover:bg-red-800/60 transition-all flex items-center gap-1"
          title="파일럿 테스트용 세션 전체 초기화"
        >
          🧹 데이터 리셋
        </button>
      </div>

      {/* 6개 탭 네비게이션 */}
      <div className="bg-[#101626] border-b border-white/8 p-1.5 grid grid-cols-6 gap-1 text-[10.5px] font-bold">
        <button
          onClick={() => setActiveTab('quizMaster')}
          className={`py-2 rounded-lg transition-all text-center ${
            activeTab === 'quizMaster' ? 'bg-red-500 text-white shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          🎯 퀴즈쇼
        </button>
        <button
          onClick={() => setActiveTab('teams')}
          className={`py-2 rounded-lg transition-all text-center ${
            activeTab === 'teams' ? 'bg-amber-500 text-slate-950 font-black shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          🏆 시상식
        </button>
        <button
          onClick={() => setActiveTab('broadcast')}
          className={`py-2 rounded-lg transition-all text-center ${
            activeTab === 'broadcast' ? 'bg-emerald-500 text-slate-950 font-black shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          📢 공지발송
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
          💬 추천
        </button>
      </div>

      {/* 탭 컨텐츠 */}
      <div className="p-4 space-y-4 flex-1 overflow-y-auto">

        {/* TAB 1: 저녁 퀴즈 마스터 모드 */}
        {activeTab === 'quizMaster' && (
          <div className="space-y-4">
            {/* 빔프로젝터 모드 실행 카드 */}
            <div className="bg-gradient-to-r from-red-900/40 to-orange-900/40 border border-red-500/40 rounded-2xl p-4 space-y-2.5 shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-bold text-white flex items-center gap-1.5">
                  📽️ 빔프로젝터 3단계 퀴즈쇼 모드
                </span>
                <span className="text-[10px] bg-red-500 text-white px-2 py-0.5 rounded-full font-bold">
                  16:9 무대용
                </span>
              </div>
              <p className="text-[11.5px] text-slate-300 leading-relaxed">
                저녁 식사 무대 빔프로젝터에 띄우고 방향키와 스페이스바로 <strong>3단계 점진적 힌트</strong>를 극적으로 공개할 수 있습니다.
              </p>
              <button
                onClick={() => {
                  setStageStep(0);
                  setIsStageMode(true);
                }}
                className="w-full py-3 bg-red-500 hover:bg-red-600 text-white font-bold text-[13.5px] rounded-xl shadow-lg active:scale-98 transition-all flex items-center justify-center gap-2"
              >
                <span>📽️ 무대 퀴즈쇼 풀스크린 시작</span>
              </button>
            </div>

            {/* 일반 모바일 플래시 카드 뷰 */}
            <div className="bg-[#1A2235] border border-white/10 rounded-2xl p-4 space-y-3 shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-bold text-slate-300">
                  모바일 프리뷰 화면
                </span>
                <button
                  onClick={() => setBlindMode(!blindMode)}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold border transition-all ${
                    blindMode
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-green-500/20 text-green-300 border-green-500/40'
                  }`}
                >
                  {blindMode ? '🔒 블라인드 ON' : '🔓 정답 공개'}
                </button>
              </div>

              {/* 참가자 선택 셀렉터 */}
              {participants.length > 0 && (
                <div className="flex items-center justify-between gap-2 pt-1">
                  <span className="text-[11px] font-bold text-slate-400 whitespace-nowrap">참가자:</span>
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
            </div>

            {/* 플래시 카드 */}
            {participants.length === 0 ? (
              <div className="bg-[#1A2235] border border-white/10 rounded-2xl p-6 text-center space-y-3">
                <p className="text-slate-400 text-[13px]">
                  아직 등록된 참가자 정보가 없습니다.
                </p>
              </div>
            ) : (
              (() => {
                const info = currentP?.myInfo || {};
                const stat = currentP ? nominationStats[currentP.name] : null;
                const hasInfo = Object.keys(info).length > 0;

                return (
                  <div className="bg-gradient-to-br from-[#161F33] to-[#101726] border-2 border-white/15 rounded-3xl p-5 shadow-2xl space-y-4">
                    <div className="flex justify-between items-start border-b border-white/10 pb-3">
                      <div>
                        <span className="text-[11px] text-red-400 font-bold tracking-wider uppercase block">
                          QUIZ CARD #{currentCardIndex + 1} / {participants.length}
                        </span>
                        <h2 className="text-[19px] font-extrabold text-white mt-0.5">
                          {blindMode ? '❓ 누구의 이야기일까요?' : `👑 ${currentP.name || '미등록'} 님`}
                        </h2>
                        <span className="text-[12px] text-slate-400">
                          {blindMode ? `소속: ${currentP.company} · ${currentP.teamName || currentP.teamId}` : `${currentP.company} · ${currentP.teamName || currentP.teamId}`}
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

            {/* 하단 CSV 다운로드 버튼 */}
            <div className="pt-2">
              <button
                onClick={handleExportMasterMergedCSV}
                className="w-full py-3.5 bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-500 hover:to-orange-400 text-white font-bold text-[14px] rounded-xl shadow-lg flex items-center justify-center gap-2"
              >
                <span>📥 저녁 퀴즈용 전체 결합 엑셀(CSV) 다운로드</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: 조별 순위 및 최종 시상식 모드 */}
        {activeTab === 'teams' && (
          <div className="space-y-4">
            {/* 시상식 모드 실행 배너 */}
            <div className="bg-gradient-to-r from-amber-900/40 via-yellow-900/30 to-orange-900/40 border border-amber-500/40 rounded-2xl p-4 space-y-2.5 shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-bold text-amber-300 flex items-center gap-1.5">
                  🏆 빔프로젝터 최종 시상식 모드
                </span>
                <span className="text-[10px] bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full font-black">
                  6위~1위 순차 발표
                </span>
              </div>
              <p className="text-[11.5px] text-slate-300 leading-relaxed">
                행사 마지막 순간, 16:9 풀스크린 무대 화면으로 6위부터 우승팀(1위)까지 긴장감 넘치게 발표하고 축하 팡파레를 터뜨릴 수 있습니다.
              </p>
              <button
                onClick={() => {
                  setRevealedAwardRank(7);
                  setIsAwardMode(true);
                }}
                className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-[14px] rounded-xl shadow-2xl active:scale-98 transition-all flex items-center justify-center gap-2"
              >
                <span>🏆 최종 시상식 풀스크린 시작</span>
              </button>
            </div>

            {/* 현재 조별 실시간 순위표 */}
            <div className="space-y-2.5">
              <span className="text-[12px] font-bold text-slate-300 block">
                📊 실시간 조별 종합 순위표
              </span>
              {rankedTeams.map((team, idx) => (
                <div key={team.id} className="bg-[#1A2235] border border-white/8 rounded-2xl p-3.5 space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className={`w-6 h-6 rounded-full font-bold text-[11px] flex items-center justify-center ${
                        idx === 0
                          ? 'bg-amber-400 text-slate-950 font-black'
                          : idx === 1
                          ? 'bg-slate-300 text-slate-950'
                          : idx === 2
                          ? 'bg-amber-700 text-white'
                          : 'bg-white/10 text-slate-300'
                      }`}>
                        {idx + 1}
                      </span>
                      <strong className="text-[14px] text-white">{team.emoji} {team.name}</strong>
                      <span className="text-[11px] text-slate-400">({team.members.length}명)</span>
                    </div>
                    <span className="text-[14px] font-extrabold text-amber-400">
                      {team.totalScore.toLocaleString()} pt
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1 pt-1">
                    {team.members.map(m => (
                      <span key={m.id} className="text-[10px] bg-black/40 border border-white/5 px-2 py-0.5 rounded-md text-slate-300">
                        {m.name || '미등록'} ({m.score ?? 0}pt)
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: 관리자 실시간 긴급 공지 발송 패널 */}
        {activeTab === 'broadcast' && (
          <div className="space-y-4">
            {/* 현재 활성 공지 상태 */}
            <div className="bg-[#1A2235] border border-emerald-500/30 rounded-2xl p-4 space-y-2 shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-bold text-emerald-400 flex items-center gap-1.5">
                  📢 실시간 브로드캐스트 공지 센터
                </span>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                  currentBroadcast && currentBroadcast.active
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'bg-white/10 text-slate-400'
                }`}>
                  {currentBroadcast && currentBroadcast.active ? '🟢 송출 중' : '⚪ 송출 없음'}
                </span>
              </div>
              <p className="text-[11.5px] text-slate-300 leading-relaxed">
                공지를 발송하면 모든 참가자의 스마트폰 상단에 <strong>실시간 알림 팝업</strong>이 즉시 나타납니다.
              </p>

              {currentBroadcast && currentBroadcast.active && (
                <div className="bg-black/40 border border-emerald-500/30 rounded-xl p-3 space-y-1 mt-2">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-emerald-400 font-bold">현재 화면에 노출 중인 내용:</span>
                    <span className="text-slate-400 text-[10px]">{new Date(currentBroadcast.timestamp).toLocaleTimeString('ko-KR')}</span>
                  </div>
                  {currentBroadcast.title && (
                    <strong className="text-white text-[13px] block">{currentBroadcast.title}</strong>
                  )}
                  <p className="text-slate-200 text-[12px]">{currentBroadcast.message}</p>
                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={handleClearBroadcast}
                      className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 text-[11px] font-bold rounded-lg transition-all"
                    >
                      🗑️ 현재 공지 내리기 (삭제)
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 원클릭 프리셋 버튼 모음 */}
            <div className="bg-[#1A2235] border border-white/10 rounded-2xl p-4 space-y-2.5 shadow-xl">
              <span className="text-[12px] font-bold text-slate-300 block">
                ⚡ 빠른 공지 프리셋 (1-Click 전송)
              </span>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => handleSendBroadcast({
                    title: '📸 미술관 앞 단체사진 집결 안내',
                    message: '5분 뒤 국립현대미술관 앞에서 단체사진 촬영이 진행됩니다. 모든 조원들은 미술관 앞으로 모여주세요!',
                    type: 'photo',
                  })}
                  className="w-full p-3 bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-500/40 rounded-xl text-left flex items-center justify-between text-slate-200 text-[12px] transition-all"
                >
                  <span>📸 <strong>[단체사진]</strong> 5분 뒤 미술관 앞 집결</span>
                  <span className="text-[10px] bg-emerald-500 text-slate-950 px-2 py-0.5 rounded font-bold">즉시 발송</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSendBroadcast({
                    title: '⏰ 트레킹 마감 15분 전 안내',
                    message: '트레킹 미션 종료 15분 전입니다. 코끼리열차 매표소(출발지)로 안전하게 복귀해 주시기 바랍니다.',
                    type: 'urgent',
                  })}
                  className="w-full p-3 bg-red-950/40 hover:bg-red-900/50 border border-red-500/40 rounded-xl text-left flex items-center justify-between text-slate-200 text-[12px] transition-all"
                >
                  <span>⏰ <strong>[마감 15분 전]</strong> 출발지로 복귀 안내</span>
                  <span className="text-[10px] bg-red-500 text-white px-2 py-0.5 rounded font-bold">즉시 발송</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSendBroadcast({
                    title: '🍽️ 저녁 만찬 및 퀴즈쇼 장소 이동',
                    message: '낮 트레킹이 종료되었습니다. 만찬 장소로 이동하여 맛있는 저녁 식사와 저녁 퀴즈쇼를 준비해 주세요!',
                    type: 'dinner',
                  })}
                  className="w-full p-3 bg-amber-950/40 hover:bg-amber-900/50 border border-amber-500/40 rounded-xl text-left flex items-center justify-between text-slate-200 text-[12px] transition-all"
                >
                  <span>🍽️ <strong>[저녁 만찬]</strong> 만찬 및 퀴즈쇼 장소 이동</span>
                  <span className="text-[10px] bg-amber-500 text-slate-950 px-2 py-0.5 rounded font-bold">즉시 발송</span>
                </button>
              </div>
            </div>

            {/* 직접 작성 폼 */}
            <div className="bg-[#1A2235] border border-white/10 rounded-2xl p-4 space-y-3 shadow-xl">
              <span className="text-[12px] font-bold text-slate-300 block">
                ✍️ 공지 직접 작성
              </span>

              <div className="space-y-2">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">공지 분류</label>
                  <select
                    value={broadcastType}
                    onChange={e => setBroadcastType(e.target.value as any)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-[12px] text-white focus:outline-none focus:border-red-500"
                  >
                    <option value="info">📢 일반 알림 (하늘색)</option>
                    <option value="photo">📸 단체사진 (초록색)</option>
                    <option value="dinner">🍽️ 저녁 만찬/퀴즈 (주황색)</option>
                    <option value="urgent">⚡ 긴급 공지 (빨간색)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">제목 (선택사항)</label>
                  <input
                    type="text"
                    value={broadcastTitle}
                    onChange={e => setBroadcastTitle(e.target.value)}
                    placeholder="예: [운영본부] 긴급 안내"
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-[12px] text-white placeholder-slate-600 focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">공지 본문 (필수)</label>
                  <textarea
                    value={broadcastMessage}
                    onChange={e => setBroadcastMessage(e.target.value)}
                    rows={3}
                    placeholder="참가자들에게 전달할 내용을 입력하세요."
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-[12px] text-white placeholder-slate-600 focus:outline-none focus:border-red-500"
                  />
                </div>

                <button
                  type="button"
                  disabled={isSendingBroadcast || !broadcastMessage.trim()}
                  onClick={() => handleSendBroadcast()}
                  className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 disabled:opacity-40 text-white font-bold text-[13px] rounded-xl shadow-lg active:scale-98 transition-all flex items-center justify-center gap-2"
                >
                  <span>🚀 전체 참가자에게 실시간 전송</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Discovery 현장 퀴즈 관리 & 실시간 풀이 테스트 */}
        {activeTab === 'discoveryQuizzes' && (
          <div className="space-y-4">
            {/* 상단 안내 배너 */}
            <div className="bg-[#1A2235] border border-sky-500/30 rounded-2xl p-4 space-y-2 shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-bold text-sky-400 flex items-center gap-1.5">
                  🧭 Discovery 현장 퀴즈 관리 센터
                </span>
                <button
                  onClick={() => setShowAnswerDirectly(!showAnswerDirectly)}
                  className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40"
                >
                  {showAnswerDirectly ? '정답 보기 ON' : '정답 숨김'}
                </button>
              </div>
              <p className="text-[12px] text-slate-300 leading-relaxed">
                현장 비상 패스코드: <strong className="text-amber-400 font-mono text-sm bg-black/40 px-2 py-0.5 rounded">{EMERGENCY_GPS_BYPASS_CODE}</strong> (GPS 음영지역 안내용)
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
                      <span className="text-[10px] text-amber-400 font-bold">+{quiz.points}pt</span>
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
              </div>
            )}
          </div>
        )}

        {/* TAB 5: 나의 정보 7문항 전체 목록 */}
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

        {/* TAB 6: 조별 People Quest 추천 현황 */}
        {activeTab === 'peopleQuest' && (
          <div className="space-y-3">
            <div className="bg-[#1A2235] border border-white/10 rounded-2xl p-3.5 space-y-2">
              <span className="text-[12px] font-bold text-white block">
                💬 6개 조 People Quest 제출 상태
              </span>
              <p className="text-[11px] text-slate-400">
                각 조가 트레킹 중 발견하여 추천한 인물과 스토리입니다. (조당 +{PEOPLE_QUEST_POINTS_PER_MEMBER}pt)
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

      </div>
    </div>
  );
};

export default AdminScreen;
