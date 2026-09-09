# Mission Connect - 프로젝트 현황 및 개발 컨텍스트 가이드

> **[중요] 개발 연속성 및 인수인계 규칙 (Development Context Handover Rules)**
> 1. **문서 동기화**: 새로운 기능 추가, 버그 수정, 구조 변경 시 반드시 이 문서(`PROJECT_STATUS.md`)의 상태(완료/이슈/남은 작업)를 최신화합니다.
> 2. **자동 커밋 & 푸시 (Autonomous Commits & Push)**: 유의미한 작업 단위마다 AI 에이전트가 코드와 `PROJECT_STATUS.md`를 묶어 즉시 자동으로 Git Commit & Push를 실행합니다.
> 3. **컨텍스트 보존**: 어디서든 `git pull`만 받으면 로컬/Codespaces/어떤 AI 에이전트 환경에서도 즉시 100% 동일하게 작업을 이어받을 수 있도록 유지합니다.
> 4. **환경 독립성**: Windows 로컬 터미널, GitHub Codespaces, Mac/Linux 어디서든 `npm install && npm run dev`로 동일하게 개발할 수 있도록 설정합니다.

---

## 1. 프로젝트 2대 전용 접속 URL 분리

| 구분 | 전용 접속 링크 | 사용 대상 및 주요 기능 |
|:---|:---|:---|
| **📱 1. 일반 참가자용** | **[https://mission-connect-final.vercel.app/](https://mission-connect-final.vercel.app/)** | • 50명 참가자용 모바일 웹앱<br>• 기본 정보 & 나의 정보 7문항 입력<br>• 메인 대시보드 (팀 점수, 잔여 시간, 코스 지도)<br>• Activity 1: People Quest (조별 1명 추천 - 200pt)<br>• Activity 2: Discovery Quiz (조당 3문항 - 300pt)<br>• 실시간 리더보드 순위 |
| **💻 2. 운영본부 관리자용** | **[https://mission-connect-final.vercel.app/admin](https://mission-connect-final.vercel.app/admin)** | • 운영진 / MC / 저녁 행사용 종합 관제 센터<br>• 🎯 저녁 퀴즈 마스터 모드 (플래시카드/블라인드)<br>• 💡 50명 참가자 7문항 답변 실시간 조회 & CSV<br>• 💬 조별 People Quest 추천 현황 & CSV<br>• 📊 실시간 조별 순위 현황<br>• 📥 저녁 퀴즈용 마스터 결합 엑셀(CSV) 다운로드 |

---

## 2. Activity 2: Discovery Quiz & 순환 코스 개편 체계
1. **코끼리열차 매표소 기점 순환 회귀 동선 (`MapScreen.tsx`)**:
   - **🌊 호수둘레길 순환 (4~6조, 2.8km)**: 코끼리열차 매표소(출발) ➡️ 호수 북측 ➡️ 국립현대미술관 ➡️ 호수 브릿지 ➡️ 테마가든 장미원 ➡️ 코끼리열차 매표소(도착/회귀).
   - **🌲 산림욕장길 순환 (1~3조, 4.5km)**: 코끼리열차 매표소(출발) ➡️ 미술관 셔틀로 ➡️ 국립현대미술관 ➡️ 산림욕장 생각하는 숲 ➡️ 숲길 순환로 ➡️ 코끼리열차 매표소(도착/회귀).
   - 공통 기점 핀: **"🚊 코끼리열차 매표소 [출발/도착]"**.
2. **조당 딱 3문항 (공통 2개 + 코스 전용 1개, 총 300pt) (`DiscoveryQuizScreen.tsx`)**:
   - **[공통 1]**: 코끼리열차 매표소 앞 광장 (코끼리열차 최초 개통 1984년)
   - **[공통 2]**: 국립현대미술관 과천 야외조각공원 (노래하는 거인상 Singing Man)
   - **[산림길 전용 1] (1~3조)**: 청계산 산림욕장 생각하는 숲 쉼터 (피톤치드)
   - **[호수길 전용 1] (4~6조)**: 대공원 호수 브릿지 전망 데크 (청계저수지)
3. **500pt 만점 밸런스**:
   - People Quest (조별 대화 1인 추천): 200pt
   - Discovery Quiz (현장 객관식 3문항): 300pt
   - **총 개인 & 조별 만점: 500pt**

---

## 3. 완료된 기능 현황 ✅
- [x] **코끼리열차 매표소 기점 순환 회귀 트랙선 및 위성지도 핀 연동 (`MapScreen.tsx`)**
- [x] **조당 3문항(공통 2개 + 코스 전용 1개, 총 300pt) 퀴즈 풀이 화면 완성 (`DiscoveryQuizScreen.tsx`)**
- [x] **500pt 만점 기준 실시간 리더보드 동기화 (`Leaderboard.tsx`)**
- [x] **단일 통합 조별 대화 & '최고의 스토리 동료' 추천 미션 (`PeopleQuestScreen.tsx`)**
- [x] **7개 질문 예시 줄바꿈 박스 도입으로 모바일 가독성 100% 확보 (`TeamSelect.tsx`)**
- [x] **운영본부 관리자 전용 센터 구축 (`AdminScreen.tsx`)**
- [x] **모바일 브라우저 자동 로그인 세션 유지 (`localStorage` / Zustand `persist`)**
- [x] **Firebase Realtime Database 통신 및 쓰기/읽기 권한 검증 완료**
- [x] **초 단위 실시간 카운트다운 타이머 작동 (`hh:mm:ss`)**
