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
| **📱 1. 일반 참가자용** | **[https://mission-connect-final.vercel.app/](https://mission-connect-final.vercel.app/)** | • 50명 참가자용 모바일 웹앱<br>• 기본 정보 & 나의 정보 7문항 입력 (실시간 자동저장)<br>• **메인 대시보드 (팀 실시간 점수 & 개인 기여 점수 실시간 양방향 동기화)**<br>• Activity 1: People Quest (조별 1명 추천)<br>• **Activity 2: Discovery Quiz (현장 도착 인증 후 🔓활성화 버튼을 눌러야 문제 공개)**<br>• 실시간 리더보드 순위 |
| **💻 2. 운영본부 관리자용** | **[https://mission-connect-final.vercel.app/admin](https://mission-connect-final.vercel.app/admin)** | • 운영진 / MC / 저녁 행사용 종합 관제 센터<br>• 🎯 **저녁 퀴즈 마스터 & 📽️ 16:9 무대 퀴즈쇼 풀스크린 모드**<br>• 🧭 **Discovery 퀴즈 관리 & 실시간 테스트 풀이/통계**<br>• 💡 50명 참가자 7문항 답변 실시간 조회 & CSV<br>• 💬 조별 People Quest 추천 현황 & CSV<br>• 📊 실시간 조별 순위 현황<br>• 📥 저녁 퀴즈용 마스터 결합 엑셀(CSV) 다운로드 |

---

## 2. 퀴즈 현장 도착 인증 & 활성화 체계
* **문제 노출 보안 제어 (`DiscoveryQuizScreen.tsx`)**:
  - **스팟 도착 전**: 문제가 100% 잠긴 상태(`🔒 문제 잠김`)로 안내되며, 문제 내용 및 보기가 노출되지 않음.
  - **스팟 도착 후(또는 비상 인증코드 입력 후)**: **`[🔓 퀴즈 문제 활성화하기 (열기)]`** 버튼이 나타남.
  - **활성화 버튼 클릭 시**: 비로소 문제 내용과 객관식 보기가 부드럽게 열리며 풀이 가능.
* **대시보드 실시간 점수 양방향 동기화 (`Dashboard.tsx`)**:
  - Firebase RTDB Event Listener(`onValue`) + 2.5초 폴링으로 퀴즈 제출 즉시 우리 조 획득 점수와 내 개인 기여 점수가 0초 딜레이로 실시간 반영.

---

## 3. 완료된 기능 현황 ✅
- [x] **현장 도착 후 🔓활성화 버튼 클릭 시에만 퀴즈 문제 및 보기 공개 (`DiscoveryQuizScreen.tsx`)**
- [x] **대시보드 실시간 팀 점수, 조 순위, 개인 기여 점수 양방향 즉시 동기화 (`Dashboard.tsx`)**
- [x] **현장 비상 패스코드 (`2026`) 지원 (`DiscoveryQuizScreen.tsx`)**
- [x] **7문항 실시간 로컬 드래프트 자동 저장 (`TeamSelect.tsx`)**
- [x] **정답 및 미션 완료 시 경량 캔버스 축하 컨페티 폭죽 연출 (`src/lib/confetti.ts`)**
- [x] **저녁 행사용 빔프로젝터 무대 퀴즈쇼 16:9 풀스크린 뷰 (`AdminScreen.tsx`)**
- [x] **동물원둘레길 순환 트랙선 & 국립현대미술관 단체사진 촬영지 핀 연동 (`MapScreen.tsx`)**
