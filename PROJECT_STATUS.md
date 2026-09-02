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

## 2. 핵심 아키텍처 및 미션 체계 (2대 액티비티 전면 개편 완료)
플랫폼은 생성형 AI 연동 및 사진 촬영을 배제하고, 현장 중심의 2대 Activity로 안정적으로 운영됩니다:

1. **플랫폼 입장 (진진가 사전정보 수집)**
   - Step 1: 이름, 소속(`㈜두산` / `두산경영연구원`), 행사 조(1~6조)
   - Step 2: 진짜 정보 ①, 진짜 정보 ②, 가짜 정보 ① 필수 입력 (각 최대 60자)
   - 타 참가자 비공개, 운영본부 저녁 퀴즈용으로만 활용

2. **Activity 1: People Quest (`/people-quest`)**
   - GPS 무관 / 행사 중 상시 대화형 수행
   - Q1(가장 의외의 취미), Q2(특별한 경험) 질문별 추천 인물 및 선정 이유(최대 100자) 입력
   - 50명 사전 참가자 풀에서 검색, 본인 선택 방지, 질문 간 중복 선택 방지
   - 임시 저장 및 최종 제출 지원
   - **배점**: 2명 추천 완료 시 조원당 **+200pt** 부여

3. **Activity 2: Discovery Quiz (`/discovery-quiz`)**
   - GPS 기반 현장 퀴즈 (서울대공원 & 국립현대미술관 일대 5개 스팟)
   - 지정 반경(60~70m) 진입 시 객관식 퀴즈 활성화
   - 즉각적인 정답/오답 및 현장 해설 제공
   - **배점**: 정답 문항당 **+100pt** 부여 (5문항 완주 시 최대 500pt)

4. **운영본부 어드민 (`/admin`)**
   - **진진가 결합 후보 데이터 (⭐ 저녁용)**: People Quest 추천 인물 + 추천된 질문 + 추천한 조 + 선정 이유 + 해당 인물의 진짜 2개 / 가짜 1개 + 추천 횟수를 결합하여 표시 및 **CSV 다운로드** 지원
   - 진진가 전체 사전정보 CSV 다운로드
   - People Quest 조별 제출 결과 CSV 다운로드 및 제출 잠금 해제 기능
   - Discovery Quiz 문항 및 현장 좌표 확인

---

## 3. 완료된 기능 현황 ✅
- [x] **2026 CHRO Trekking 전용 설정 및 50명 사전 참가자 풀 등록 (`src/config/workshopConfig.ts`)**
- [x] **진진가(진짜2개/가짜1개) 사전정보 수집 2단계 입장 화면 구축 (`src/components/TeamSelect.tsx`)**
- [x] **2대 핵심 Activity 집중형 대시보드 메인 화면 (`src/components/dashboard/Dashboard.tsx`)**
- [x] **Activity 1: People Quest 화면 및 중복방지/검색/임시저장/제출 완성 (`PeopleQuestScreen.tsx`)**
- [x] **Activity 2: Discovery Quiz 화면 및 GPS 인증/객관식 퀴즈/해설 완성 (`DiscoveryQuizScreen.tsx`)**
- [x] **코스 지도 5개소 퀴즈 핀 및 바로가기 연동 (`MapScreen.tsx`)**
- [x] **실시간 리더보드 점수 집계 및 코스 뱃지 노출 (`Leaderboard.tsx`)**
- [x] **운영자 전용 진진가 결합 데이터 CSV 다운로드 및 어드민 고도화 (`AdminScreen.tsx`)**
- [x] **전체 TypeScript 빌드 무결성 검증 완료 (`✓ built in 4.17s`)**
