import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { LiveBadge } from '../shared';
import {
  WORKSHOP_TEAMS,
  PEOPLE_QUEST_QUESTIONS,
  DISCOVERY_QUIZZES,
  PRE_REGISTERED_PARTICIPANTS,
  ACTIVE_VENUE,
} from '../../config/workshopConfig';

type AdminTab = 'candidates' | 'jinjinga' | 'peoplequest' | 'quizzes' | 'teams';

const AdminScreen: React.FC = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<AdminTab>('candidates');

  const [participants, setParticipants] = useState<Record<string, any>>({});
  const [peopleQuests, setPeopleQuests] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);

  const dbUrl = import.meta.env.VITE_FIREBASE_DATABASE_URL || 'https://doosan-teambuilding-default-rtdb.firebaseio.com';

  // 데이터 로드
  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [pRes, qRes] = await Promise.all([
        fetch(`${dbUrl}/sessions/trekking2026/participants.json`),
        fetch(`${dbUrl}/sessions/trekking2026/peopleQuest.json`),
      ]);
      if (pRes.ok) {
        const pData = await pRes.json();
        setParticipants(pData || {});
      }
      if (qRes.ok) {
        const qData = await qRes.json();
        setPeopleQuests(qData || {});
      }
    } catch (err) {
      console.warn('어드민 데이터 조회 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
    const timer = setInterval(fetchAllData, 10000); // 10초마다 자동 갱신
    return () => clearInterval(timer);
  }, []);

  // CSV 다운로드 유틸리티 함수
  const downloadCsv = (filename: string, rows: (string | number)[][]) => {
    const csvContent = '\uFEFF' + rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ─────────────────────────────────────────────────────────────
  // 7.4 진진가 후보 데이터 결합 (핵심 운영 데이터)
  // ─────────────────────────────────────────────────────────────
  const combinedCandidates = useMemo(() => {
    // 1. People Quest 추천 내역 취합
    const recList: {
      teamId: string;
      teamName: string;
      questionId: string;
      questionTitle: string;
      recommendedPersonId: string;
      recommendedPersonName: string;
      recommendedPersonCompany: string;
      reason: string;
    }[] = [];

    // 추천 인물별 추천 횟수 계산
    const recCountMap: Record<string, number> = {};

    Object.entries(peopleQuests).forEach(([tId, questData]: [string, any]) => {
      const recs = questData?.recommendations || {};
      Object.entries(recs).forEach(([qId, item]: [string, any]) => {
        if (item?.personName) {
          const qTitle = PEOPLE_QUEST_QUESTIONS.find(q => q.id === qId)?.title || qId;
          recList.push({
            teamId: tId,
            teamName: questData.teamName || tId,
            questionId: qId,
            questionTitle: qTitle,
            recommendedPersonId: item.personId,
            recommendedPersonName: item.personName,
            recommendedPersonCompany: item.company,
            reason: item.reason || '',
          });
          recCountMap[item.personName] = (recCountMap[item.personName] || 0) + 1;
        }
      });
    });

    // 2. 해당 인물의 진진가 사전정보 결합
    return recList.map(rec => {
      // 참가자 DB에서 진진가 찾기
      const matchedP = Object.values(participants).find((p: any) => p?.name?.trim() === rec.recommendedPersonName.trim());
      return {
        ...rec,
        truthCount: recCountMap[rec.recommendedPersonName] || 1,
        truth1: matchedP?.truth1 || '(미입력)',
        truth2: matchedP?.truth2 || '(미입력)',
        lie: matchedP?.lie || '(미입력)',
      };
    });
  }, [peopleQuests, participants]);

  // 결합 데이터 CSV 다운로드
  const handleDownloadCandidatesCsv = () => {
    const headers = ['추천된 조', '질문 구분', '추천 인물', '소속', '추천 횟수', '선정 이유', '진짜 정보 1', '진짜 정보 2', '가짜 정보 1'];
    const rows = combinedCandidates.map(c => [
      c.teamName,
      c.questionTitle,
      c.recommendedPersonName,
      c.recommendedPersonCompany,
      c.truthCount,
      c.reason,
      c.truth1,
      c.truth2,
      c.lie,
    ]);
    downloadCsv(`2026_CHRO_진진가_후보_결합데이터_${new Date().toISOString().slice(0,10)}.csv`, [headers, ...rows]);
  };

  // ─────────────────────────────────────────────────────────────
  // 7.2 진진가 사전정보 CSV 다운로드
  // ─────────────────────────────────────────────────────────────
  const handleDownloadJinjingaCsv = () => {
    const headers = ['이름', '소속', '행사 조', '정보 문장', '진위 구분', '입력 일시'];
    const rows: any[] = [];
    Object.values(participants).forEach((p: any) => {
      if (!p) return;
      if (p.truth1) rows.push([p.name, p.company, p.teamName, p.truth1, '진짜', p.joinedAt || '']);
      if (p.truth2) rows.push([p.name, p.company, p.teamName, p.truth2, '진짜', p.joinedAt || '']);
      if (p.lie)    rows.push([p.name, p.company, p.teamName, p.lie, '가짜', p.joinedAt || '']);
    });
    downloadCsv(`2026_CHRO_진진가_전체사전정보_${new Date().toISOString().slice(0,10)}.csv`, [headers, ...rows]);
  };

  // ─────────────────────────────────────────────────────────────
  // 7.3 People Quest CSV 다운로드
  // ─────────────────────────────────────────────────────────────
  const handleDownloadPeopleQuestCsv = () => {
    const headers = ['추천한 행사 조', '질문 ID', '질문명', '추천 인물', '추천 인물 소속', '선정 이유', '제출 일시'];
    const rows: any[] = [];
    Object.entries(peopleQuests).forEach(([tId, qData]: [string, any]) => {
      const recs = qData?.recommendations || {};
      Object.entries(recs).forEach(([qId, item]: [string, any]) => {
        const qTitle = PEOPLE_QUEST_QUESTIONS.find(q => q.id === qId)?.title || qId;
        rows.push([
          qData.teamName || tId,
          qId,
          qTitle,
          item.personName || '',
          item.company || '',
          item.reason || '',
          qData.submittedAt || '',
        ]);
      });
    });
    downloadCsv(`2026_CHRO_PeopleQuest_조별추천결과_${new Date().toISOString().slice(0,10)}.csv`, [headers, ...rows]);
  };

  // 조별 People Quest 제출 상태 해제 (재제출 허용)
  const handleUnlockPeopleQuest = async (teamId: string) => {
    if (!window.confirm(`${teamId}의 제출 상태를 해제하여 다시 수정할 수 있게 하시겠습니까?`)) return;
    try {
      await fetch(`${dbUrl}/sessions/trekking2026/peopleQuest/${teamId}.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'draft' }),
      });
      alert('제출 상태가 해제되었습니다.');
      fetchAllData();
    } catch (e) {
      alert('상태 해제 실패');
    }
  };

  return (
    <div className="max-w-[700px] mx-auto bg-[#0D1117] min-h-screen flex flex-col text-slate-100 font-['Noto_Sans_KR']">
      {/* 상단 헤더 */}
      <header className="bg-[#13192A] border-b border-white/10 px-5 pt-4 pb-3 relative flex-shrink-0">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-red-600 to-orange-500" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bebas text-2xl tracking-widest text-white">
              CHRO <span className="text-red-500">ADMIN</span>
            </span>
            <span className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded font-bold">
              운영본부
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/')}
              className="text-[11px] bg-white/10 hover:bg-white/15 px-3 py-1.5 rounded-lg text-slate-300"
            >
              사용자 화면
            </button>
            <button
              onClick={fetchAllData}
              disabled={loading}
              className="text-[11px] bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-lg text-white font-bold"
            >
              {loading ? '새로고침 중...' : '🔄 새로고침'}
            </button>
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <div className="flex gap-1 mt-3 overflow-x-auto pb-1 text-[12px] font-bold">
          <button
            onClick={() => setTab('candidates')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
              tab === 'candidates' ? 'bg-red-500 text-white shadow' : 'bg-[#1A2235] text-slate-400 hover:text-white'
            }`}
          >
            ⭐ 진진가 결합 후보 (저녁용)
          </button>
          <button
            onClick={() => setTab('jinjinga')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
              tab === 'jinjinga' ? 'bg-red-500 text-white shadow' : 'bg-[#1A2235] text-slate-400 hover:text-white'
            }`}
          >
            진진가 사전정보 ({Object.keys(participants).length}명)
          </button>
          <button
            onClick={() => setTab('peoplequest')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
              tab === 'peoplequest' ? 'bg-red-500 text-white shadow' : 'bg-[#1A2235] text-slate-400 hover:text-white'
            }`}
          >
            People Quest 현황
          </button>
          <button
            onClick={() => setTab('quizzes')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
              tab === 'quizzes' ? 'bg-red-500 text-white shadow' : 'bg-[#1A2235] text-slate-400 hover:text-white'
            }`}
          >
            Discovery Quiz 현황
          </button>
        </div>
      </header>

      {/* 탭 내용 */}
      <div className="flex-1 p-4 overflow-y-auto">

        {/* 1. 진진가 후보 데이터 결합 (핵심) */}
        {tab === 'candidates' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-[#1A2235] p-3.5 rounded-xl border border-white/10">
              <div>
                <h2 className="text-[15px] font-bold text-white">진진가 후보 데이터 결합 테이블</h2>
                <p className="text-[11px] text-slate-400">
                  People Quest 추천 인물 + 해당 인물의 진짜 2개 / 가짜 1개 정보를 자동 결합하여 보여줍니다.
                </p>
              </div>
              <button
                onClick={handleDownloadCandidatesCsv}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-[12px] font-bold rounded-lg shadow flex items-center gap-1"
              >
                📥 CSV 다운로드
              </button>
            </div>

            {combinedCandidates.length === 0 ? (
              <div className="text-center py-12 text-slate-500 bg-[#121826] rounded-xl border border-white/5">
                아직 People Quest 추천 데이터가 없습니다.
              </div>
            ) : (
              <div className="space-y-3">
                {combinedCandidates.map((c, idx) => (
                  <div key={idx} className="bg-[#1A2235] border border-white/10 rounded-xl p-3.5 space-y-2">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-bold text-amber-400">
                          {c.recommendedPersonName}
                        </span>
                        <span className="text-[11px] text-slate-400">({c.recommendedPersonCompany})</span>
                        <span className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full font-bold">
                          추천 {c.truthCount}회
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-medium">
                        추천한 조: <strong className="text-white">{c.teamName}</strong>
                      </span>
                    </div>

                    <p className="text-[12px] text-slate-300">
                      <strong className="text-sky-400">[{c.questionTitle}]</strong> {c.reason ? `"${c.reason}"` : '(이유 미입력)'}
                    </p>

                    <div className="bg-black/30 p-2.5 rounded-lg text-[11px] space-y-1 border border-white/5">
                      <p className="text-emerald-400">✓ 진짜 1: <span className="text-white">{c.truth1}</span></p>
                      <p className="text-emerald-400">✓ 진짜 2: <span className="text-white">{c.truth2}</span></p>
                      <p className="text-red-400">✗ 가짜 1: <span className="text-white">{c.lie}</span></p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 2. 진진가 사전정보 관리 */}
        {tab === 'jinjinga' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-[#1A2235] p-3.5 rounded-xl border border-white/10">
              <div>
                <h2 className="text-[15px] font-bold text-white">참가자별 진진가 사전정보</h2>
                <p className="text-[11px] text-slate-400">입장 시 입력한 진짜 2개와 가짜 1개 원문 데이터입니다.</p>
              </div>
              <button
                onClick={handleDownloadJinjingaCsv}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-[12px] font-bold rounded-lg shadow"
              >
                📥 전체 다운로드
              </button>
            </div>

            <div className="space-y-2.5">
              {Object.values(participants).length === 0 ? (
                <div className="text-center py-12 text-slate-500 bg-[#121826] rounded-xl border border-white/5">
                  입장한 참가자 데이터가 없습니다.
                </div>
              ) : (
                Object.values(participants).map((p: any, i) => (
                  <div key={i} className="bg-[#1A2235] border border-white/10 rounded-xl p-3.5 text-[12px] space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <strong className="text-[14px] text-white">{p.name}</strong>
                        <span className="text-slate-400">({p.company} · {p.teamName})</span>
                      </div>
                      <span className="text-[10px] text-slate-500">{p.joinedAt?.slice(0, 16).replace('T', ' ')}</span>
                    </div>
                    <div className="bg-black/30 p-2.5 rounded-lg space-y-1">
                      <p className="text-emerald-400">🟢 진짜 ①: <span className="text-slate-200">{p.truth1 || '-'}</span></p>
                      <p className="text-emerald-400">🟢 진짜 ②: <span className="text-slate-200">{p.truth2 || '-'}</span></p>
                      <p className="text-red-400">🔴 가짜 ①: <span className="text-slate-200">{p.lie || '-'}</span></p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* 3. People Quest 조별 제출 관리 */}
        {tab === 'peoplequest' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-[#1A2235] p-3.5 rounded-xl border border-white/10">
              <div>
                <h2 className="text-[15px] font-bold text-white">People Quest 조별 제출 현황</h2>
                <p className="text-[11px] text-slate-400">조별 질문 추천 인물 및 선정 이유입니다.</p>
              </div>
              <button
                onClick={handleDownloadPeopleQuestCsv}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-[12px] font-bold rounded-lg shadow"
              >
                📥 결과 다운로드
              </button>
            </div>

            <div className="space-y-3">
              {WORKSHOP_TEAMS.map(team => {
                const quest = peopleQuests[team.id];
                const isSub = quest?.status === 'submitted';
                const recs = quest?.recommendations || {};

                return (
                  <div key={team.id} className="bg-[#1A2235] border border-white/10 rounded-xl p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{team.emoji}</span>
                        <strong className="text-[14px] text-white">{team.name}</strong>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                          isSub ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'
                        }`}>
                          {isSub ? '✅ 최종 제출' : '진행 중'}
                        </span>
                      </div>
                      {isSub && (
                        <button
                          onClick={() => handleUnlockPeopleQuest(team.id)}
                          className="text-[11px] text-red-400 hover:underline"
                        >
                          제출 상태 해제
                        </button>
                      )}
                    </div>

                    <div className="space-y-2">
                      {PEOPLE_QUEST_QUESTIONS.map(q => {
                        const item = recs[q.id];
                        return (
                          <div key={q.id} className="bg-black/30 p-2.5 rounded-lg text-[11px]">
                            <p className="text-amber-400 font-bold mb-0.5">{q.title}</p>
                            {item?.personName ? (
                              <p className="text-white">
                                👉 <strong className="text-white">{item.personName}</strong> ({item.company}) : "{item.reason}"
                              </p>
                            ) : (
                              <p className="text-slate-500">추천 대상 미선택</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 4. Discovery Quiz 현황 */}
        {tab === 'quizzes' && (
          <div className="space-y-4">
            <div className="bg-[#1A2235] p-3.5 rounded-xl border border-white/10">
              <h2 className="text-[15px] font-bold text-white">Discovery Quiz 등록 문항 ({DISCOVERY_QUIZZES.length}개)</h2>
              <p className="text-[11px] text-slate-400">현장 객관식 퀴즈 정보 및 좌표 안내입니다.</p>
            </div>

            <div className="space-y-2.5">
              {DISCOVERY_QUIZZES.map((quiz, i) => (
                <div key={quiz.id} className="bg-[#1A2235] border border-white/10 rounded-xl p-3 text-[12px] space-y-1.5">
                  <div className="flex justify-between items-center">
                    <strong className="text-sky-400">Q{i + 1}. {quiz.title}</strong>
                    <span className="text-[10px] text-slate-400">{quiz.locationLabel}</span>
                  </div>
                  <p className="text-slate-200">{quiz.questionText}</p>
                  <p className="text-[11px] text-green-400">정답: {quiz.options[quiz.correctIndex]}</p>
                  <p className="text-[10px] text-slate-500">좌표: {quiz.coords.lat}, {quiz.coords.lng} (반경 {quiz.radiusMeters}m)</p>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default AdminScreen;
