# Mission Connect - 프로젝트 현황 및 개발 컨텍스트 가이드

> **[중요] 개발 연속성 및 인수인계 규칙 (Development Context Handover Rules)**
> 1. **문서 동기화**: 새로운 기능 추가, 버그 수정, 구조 변경 시 반드시 이 문서(`PROJECT_STATUS.md`)의 상태(완료/이슈/남은 작업)를 최신화합니다.
> 2. **자동 커밋 & 푸시 (Autonomous Commits & Push)**: 유의미한 작업 단위마다 AI 에이전트가 코드와 `PROJECT_STATUS.md`를 묶어 즉시 자동으로 Git Commit & Push를 실행합니다.
> 3. **컨텍스트 보존**: 어디서든 `git pull`만 받으면 로컬/Codespaces/어떤 AI 에이전트 환경에서도 즉시 100% 동일하게 작업을 이어받을 수 있도록 유지합니다.
> 4. **환경 독립성**: Windows 로컬 터미널, GitHub Codespaces, Mac/Linux 어디서든 `npm install && npm run dev`로 동일하게 개발할 수 있도록 설정합니다.

---

## 1. 프로젝트 개요
- **행사명**: 2026 CHRO 부문 Trekking
- **대상**: CHRO 산하 조직 구성원 약 50명 (소속: `㈜두산`, `두산경영연구원`)
- **장소**: 서울대공원 및 국립현대미술관 과천 일대
- **출발지**: 코끼리열차 매표소 앞 종합광장 (GPS: 37.4347, 127.0132)
- **조 구성 (총 6개 조, 사전 배정형)**:
  - 🌲 **1조, 2조, 3조**: 산림욕장 트레킹길 (약 4.5km)
  - 🌊 **4조, 5조, 6조**: 호수둘레길 코스 (약 2.8km)
- **배포 주소**: https://mission-connect-final.vercel.app
- **GitHub 저장소**: https://github.com/THEGIVER1/mission-connect

---

## 2. 자동 로그인 세션 유지 (Auto-Login Persistence via localStorage)
- **Zustand `persist` 미들웨어 적용 (`mission_connect_session`)**:
  - 참가자가 모바일 브라우저를 닫거나, 다른 앱(카톡, 카메라 등)을 사용하다 복귀하거나, 새로고침하더라도 **입장 화면으로 튕기지 않고 대시보드로 즉시 자동 복귀**합니다.
  - 저장 대상: `myTeam`, `participantName`, `participantCompany`, `selectedCourse`, `peopleQuestDraft`, `isPeopleQuestSubmitted`, `answeredQuizIds`.
  - `/team-select` 진입 시 기존 로그인 세션 바로가기 카드 및 새로 로그인(로그아웃) 기능 제공.

---

## 3. 리더보드 & 실시간 타이머 체계
- **실시간 초 단위 타이머 (Live Ticking Timer)**:
  - 대시보드 상단 및 리더보드 상단 통계 영역에 `hh:mm:ss` 포맷으로 **매 1초마다 실시간 카운트다운** 작동.
- **팀 순위 탭 (`TeamTab`)**:
  - Firebase RTDB의 `participants`(개인별 점수/미션) 및 `peopleQuest`(조별 제출 상태)를 실시간 결합하여 1~6조 누적 점수와 완료 미션 수 실시간 산출.
  - TOP 3 시상대 및 조별 뱃지(🌲산림 / 🌊호수) 노출.
- **미션별 현황 탭 (`MissionTab`)**:
  - **Activity 1: People Quest**: 조별 제출 완료율(N/6개 조 완료, %) 및 1~6조 각각의 완료 상태 뱃지 실시간 노출.
  - **Activity 2: Discovery Quiz**: 5개 현장 퀴즈 스팟(Q1~Q5)별 참가자 풀이 수 및 정답 맞힌 인원 실시간 통계 노출.
- **개인 기여 탭 (`IndividualTab`)**:
  - 참가자별 미션 완료 점수 순 랭킹(나 뱃지 포함) 실시간 집계.

---

## 4. 완료된 기능 현황 ✅
- [x] **모바일 브라우저 자동 로그인 세션 유지 (`localStorage` / Zustand `persist`)**
- [x] **초 단위 실시간 타이머(Dashboard & Leaderboard) 작동 보장 (`hh:mm:ss`)**
- [x] **리더보드 3대 탭(팀 순위 / 2대 액티비티 미션별 현황 / 개인 기여 점수) 실시간 동기화**
- [x] **2026 CHRO Trekking 전용 설정 및 50명 사전 참가자 풀 등록 (`src/config/workshopConfig.ts`)**
- [x] **진진가(진짜2개/가짜1개) 사전정보 수집 2단계 입장 화면 구축 (`src/components/TeamSelect.tsx`)**
- [x] **2대 핵심 Activity 집중형 대시보드 메인 화면 (`src/components/dashboard/Dashboard.tsx`)**
- [x] **Activity 1: People Quest 화면 및 중복방지/검색/임시저장/제출 완성 (`PeopleQuestScreen.tsx`)**
- [x] **Activity 2: Discovery Quiz 화면 및 GPS 인증/객관식 퀴즈/해설 완성 (`DiscoveryQuizScreen.tsx`)**
- [x] **코스 지도 5개소 퀴즈 핀 및 바로가기 연동 (`MapScreen.tsx`)**
- [x] **운영자 전용 진진가 결합 데이터 CSV 다운로드 및 어드민 고도화 (`AdminScreen.tsx`)**
