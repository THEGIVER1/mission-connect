# Mission Connect - 프로젝트 현황 및 개발 컨텍스트 가이드

> **[중요] 개발 연속성 및 인수인계 규칙 (Development Context Handover Rules)**
> 1. **문서 동기화**: 새로운 기능 추가, 버그 수정, 구조 변경 시 반드시 이 문서(`PROJECT_STATUS.md`)의 상태(완료/이슈/남은 작업)를 최신화합니다.
> 2. **자동 커밋 & 푸시 (Autonomous Commits & Push)**: 유의미한 작업 단위마다 AI 에이전트가 코드와 `PROJECT_STATUS.md`를묶어 즉시 자동으로 Git Commit & Push를 실행합니다.
> 3. **컨텍스트 보존**: 어디서든 `git pull`만 받으면 로컬/Codespaces/어떤 AI 에이전트 환경에서도 즉시 100% 동일하게 작업을 이어받을 수 있도록 유지합니다.
> 4. **환경 독립성**: Windows 로컬 터미널, GitHub Codespaces, Mac/Linux 어디서든 `npm install && npm run dev`로 동일하게 개발할 수 있도록 설정합니다.

---

## 1. 프로젝트 2대 전용 접속 URL 분리

| 구분 | 전용 접속 링크 | 사용 대상 및 주요 기능 |
|:---|:---|:---|
| **📱 1. 일반 참가자용** | **[https://mission-connect-final.vercel.app/](https://mission-connect-final.vercel.app/)** | • 50명 참가자용 모바일 웹앱<br>• 기본 정보 & 나의 정보 7문항 입력<br>• 메인 대시보드 (팀 점수, 잔여 시간, 코스 지도)<br>• Activity 1: People Quest (조별 1명 추천 및 +200pt 실시간 반영)<br>• Activity 2: Discovery Quiz (5개소 GPS 퀴즈)<br>• 실시간 리더보드 순위 |
| **💻 2. 운영본부 관리자용** | **[https://mission-connect-final.vercel.app/admin](https://mission-connect-final.vercel.app/admin)** | • 운영진 / MC / 저녁 행사용 종합 관제 센터<br>• 🎯 저녁 퀴즈 마스터 모드 (플래시카드/블라인드)<br>• 💡 50명 참가자 7문항 답변 실시간 조회 & CSV<br>• 💬 조별 People Quest 추천 현황 & CSV<br>• 📊 실시간 조별 순위 현황<br>• 📥 저녁 퀴즈용 마스터 결합 엑셀(CSV) 다운로드 |

---

## 2. 최근 수정 및 개선 완료 내역 ✅
1. **People Quest 실시간 리더보드 즉시 동기화 완료 (`Leaderboard.tsx` & `PeopleQuestScreen.tsx`)**:
   - 모바일 브라우저에서 팝업이 차단되던 `window.confirm`을 **자체 인터랙티브 확인 모달**로 전면 교체하여 제출 실패 원천 방지.
   - **미션별 현황 탭 (`MissionTab`)**: 조별 제출 상태(`[1조: 김민준 추천 완료 ✓]`, `[작성중 💾]`, `[미진행]`) 및 추천 대상자 이름 실시간 표시.
   - **개인 기여 탭 (`IndividualTab`)**: 조별 People Quest 제출 즉시 조원 전원에게 **+200pt 및 1개 미션 완주**가 실시간 랭킹에 즉시 합산되어 반영.
   - **팀 순위 탭 (`TeamTab`)**: 6개 조 실시간 누적 점수 및 완료 미션 건수 집계.
2. **7개 질문 예시 줄바꿈 박스 도입으로 모바일 가독성 100% 확보 (`TeamSelect.tsx`)**:
   - 질문 아래에 독립된 `[💡 예시 안내 박스]`를 배치하여 모바일에서도 예시 텍스트가 잘리지 않고 온전하게 노출.
3. **운영본부 관리자 센터 (`AdminScreen.tsx`)**:
   - 참가자 선택 셀렉터, 실시간 7문항 답변 조회, 저녁 퀴즈 마스터 모드, 테스트용 샘플 데이터 생성기 지원.
