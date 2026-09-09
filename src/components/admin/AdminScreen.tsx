import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  WORKSHOP_TEAMS,
  MY_INFO_QUESTIONS,
  DISCOVERY_QUIZZES,
  PRE_REGISTERED_PARTICIPANTS,
} from '../../config/workshopConfig';

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

type AdminTab = 'quizMaster' | 'myInfoList' | 'peopleQuest' | 'teams';

const AdminScreen: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<AdminTab>('quizMaster');
  const [participants, setParticipants] = useState<ParticipantRecord[]>([]);
  const [peopleQuests, setPeopleQuests] = useState<Record<string, PeopleQuestRecord>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCompany, setSelectedCompany] = useState<'all' | '㈜두산' | '두산경영연구원'>('all');

  // 저녁 퀴즈 마스터 모드 상태
  const [blindMode, setBlindMode] = useState<boolean>(true);
  const [currentCardIndex, setCurrentCardIndex] = useState<number>(0);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const dbUrl = import.meta.env.VITE_FIREBASE_DATABASE_URL || 'https://doosan-teambuilding-default-rtdb.firebaseio.com';

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // 1. 참가자 전체 목록
      const pRes = await fetch(`${dbUrl}/sessions/trekking2026/participants.json`);
      if (pRes.ok) {
        const pData = await pRes.json();
        if (pData) {
          const list: ParticipantRecord[] = Object.entries(pData).map(([id, val]: [string, any]) => ({
            id,
            ...val,
          }));
          setParticipants(list);
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
        return p.name.toLowerCase().includes(q) || (p.teamName || '').includes(q);
      }
      return true;
    });
  }, [participants, selectedCompany, searchQuery]);

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

  return (
    <div className="max-w-[420px] mx-auto bg-[#0D1117] min-h-screen pb-16 font-['Noto_Sans_KR'] text-slate-100 flex flex-col">
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
            <p className="text-[10px] text-slate-400">2026 CHRO Trekking 운영본부 & 저녁 퀴즈 센터</p>
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

      {/* 탭 네비게이션 */}
      <div className="bg-[#101626] border-b border-white/8 p-1.5 grid grid-cols-4 gap-1 text-[11px] font-bold">
        <button
          onClick={() => setActiveTab('quizMaster')}
          className={`py-2 rounded-lg transition-all ${
            activeTab === 'quizMaster' ? 'bg-red-500 text-white shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          🎯 퀴즈 마스터
        </button>
        <button
          onClick={() => setActiveTab('myInfoList')}
          className={`py-2 rounded-lg transition-all ${
            activeTab === 'myInfoList' ? 'bg-red-500 text-white shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          💡 나의 정보 ({participants.length})
        </button>
        <button
          onClick={() => setActiveTab('peopleQuest')}
          className={`py-2 rounded-lg transition-all ${
            activeTab === 'peopleQuest' ? 'bg-red-500 text-white shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          💬 추천 현황
        </button>
        <button
          onClick={() => setActiveTab('teams')}
          className={`py-2 rounded-lg transition-all ${
            activeTab === 'teams' ? 'bg-red-500 text-white shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          📊 조별 순위
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
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all ${
                    blindMode
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-green-500/20 text-green-300 border-green-500/40'
                  }`}
                >
                  {blindMode ? '🔒 블라인드 모드 (이름 숨김)' : '🔓 정답 공개 모드'}
                </button>
              </div>
              <p className="text-[12px] text-slate-300 leading-relaxed">
                빔프로젝터에 띄우거나 MC가 읽어주며 <strong>"이 답변의 주인공은 누구일까요?"</strong> 퀴즈를 진행할 수 있습니다.
              </p>
            </div>

            {/* 플래시 카드 */}
            {participants.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-[13px]">
                등록된 참가자 정보가 없습니다.
              </div>
            ) : (
              (() => {
                const currentP = participants[currentCardIndex] || participants[0];
                const info = currentP.myInfo || {};
                const stat = nominationStats[currentP.name];

                return (
                  <div className="bg-gradient-to-br from-[#161F33] to-[#101726] border-2 border-white/15 rounded-3xl p-5 shadow-2xl space-y-4 relative overflow-hidden">
                    {/* 카드 헤더 */}
                    <div className="flex justify-between items-start border-b border-white/10 pb-3">
                      <div>
                        <span className="text-[11px] text-red-400 font-bold tracking-wider uppercase block">
                          QUIZ CARD #{currentCardIndex + 1} / {participants.length}
                        </span>
                        <h2 className="text-[20px] font-extrabold text-white mt-0.5">
                          {blindMode ? '❓ 누구의 이야기일까요?' : `👑 ${currentP.name} 님`}
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

                    {/* 7개 질문 답변 리스트 */}
                    <div className="space-y-2.5">
                      {MY_INFO_QUESTIONS.map((q, idx) => {
                        const val = info[q.id] || (idx === 0 ? currentP.truth1 : idx === 2 ? currentP.lie : idx === 4 ? currentP.truth2 : '');
                        if (!val) return null;
                        return (
                          <div key={q.id} className="bg-black/40 border border-white/5 rounded-xl p-3 space-y-1">
                            <span className="text-[11px] text-red-400 font-bold block">
                              Q{idx + 1}. {q.title}
                            </span>
                            <p className="text-[13px] text-white font-medium leading-relaxed">
                              "{val}"
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

        {/* TAB 2: 나의 정보 7문항 전체 목록 */}
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
                        <strong className="text-[14px] text-white">{p.name}</strong>
                        <span className="text-[11px] text-slate-400 ml-2">
                          ({p.company} · {p.teamName || p.teamId})
                        </span>
                      </div>
                      <span className="text-[11px] bg-red-500/15 text-red-400 px-2 py-0.5 rounded-full font-bold">
                        {p.score ?? 0}pt
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-1 text-[11px] text-slate-300 bg-black/30 p-2.5 rounded-xl">
                      <p>• <strong>취미/관심사:</strong> {info['q1_passion'] || p.truth1 || '-'}</p>
                      <p>• <strong>5일 자유시간:</strong> {info['q2_vacation'] || '-'}</p>
                      <p>• <strong>원하는 직업:</strong> {info['q3_dreamJob'] || p.lie || '-'}</p>
                      <p>• <strong>버킷리스트:</strong> {info['q4_bucketList'] || '-'}</p>
                      <p>• <strong>의외의 사실:</strong> {info['q5_unexpectedFact'] || p.truth2 || '-'}</p>
                      <p>• <strong>성장 경험:</strong> {info['q6_growthExperience'] || '-'}</p>
                      <p>• <strong>새로운 도전:</strong> {info['q7_careerChallenge'] || '-'}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: 조별 People Quest 추천 현황 */}
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

        {/* TAB 4: 조별 순위 현황 */}
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
                        {m.name} ({m.score ?? 0}pt)
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
