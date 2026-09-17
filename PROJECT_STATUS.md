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
| **📱 1. 일반 참가자용** | **[https://mission-connect-final.vercel.app/](https://mission-connect-final.vercel.app/)** | • 50명 참가자용 모바일 웹앱<br>• 기본 정보 & 나의 정보 7문항 입력 (실시간 자동저장)<br>• 메인 대시보드 (팀 점수, 잔여 시간, 코스 지도)<br>• Activity 1: People Quest (조별 1명 추천)<br>• Activity 2: Discovery Quiz (조당 3문항, GPS + 비상인증코드 2026)<br>• 실시간 리더보드 순위 |
| **💻 2. 운영본부 관리자용** | **[https://mission-connect-final.vercel.app/admin](https://mission-connect-final.vercel.app/admin)** | • 운영진 / MC / 저녁 행사용 종합 관제 센터<br>• 🎯 **저녁 퀴즈 마스터 & 📽️ 16:9 무대 퀴즈쇼 풀스크린 모드**<br>• 🧭 **Discovery 퀴즈 관리 & 실시간 테스트 풀이/통계**<br>• 💡 50명 참가자 7문항 답변 실시간 조회 & CSV<br>• 💬 조별 People Quest 추천 현황 & CSV<br>• 📊 실시간 조별 순위 현황<br>• 📥 저녁 퀴즈용 마스터 결합 엑셀(CSV) 다운로드 |

---

## 2. 점수 유연성 및 동적 아키텍처 체계
* **배점 중앙 집중 관리 (`src/config/workshopConfig.ts`)**:
  - `PEOPLE_QUEST_POINTS_PER_MEMBER`: People Quest 추천 완료 시 조원 1인당 배점 (기본 200pt, 자유 변경 가능)
  - `DISCOVERY_QUIZZES[i].points`: 현장 퀴즈 문항별 배점 (기본 100pt, 자유 변경 가능)
  - `getCourseQuizTotalPoints(courseKey)`, `getCourseTotalMaxPoints(courseKey)`: 대시보드, 리더보드, 어드민에서 배점을 하드코딩하지 않고 함수를 통해 동적으로 자동 계산 및 표기.
* **점수 멱등성(Idempotency) 보장**:
  - 참가자 총점 = `sum(answeredQuizzes.pointsEarned) + (isPeopleQuestSubmitted ? PEOPLE_QUEST_POINTS_PER_MEMBER : 0)` 로 매 저장마다 동적 재합산하여 중복 누적 및 새로고침 오류 원천 차단.

---

## 3. 현장 안정성 및 고도화 적용 완료 현황 ✅
- [x] **현장 비상 패스코드 (Bypass Code: `2026`) 탑재**: GPS 음영지역/권한 차단 시 운영진 안내 번호로 즉시 퀴즈 풀이 가능 (`DiscoveryQuizScreen.tsx`)
- [x] **7문항 실시간 로컬 드래프트 자동 저장 (`TeamSelect.tsx`)**: 입력 도중 앱 이탈 시에도 작성 내용 100% 보존
- [x] **정답 및 미션 완료 시 경량 캔버스 축하 컨페티 폭죽 연출 (`src/lib/confetti.ts`)**
- [x] **저녁 행사용 빔프로젝터 무대 퀴즈쇼 16:9 풀스크린 뷰 (`AdminScreen.tsx`)**:
  - 방향키(`←`, `→`) 참가자 카드 이동, `Space`/`B` 블라인드 정답 공개, `C` 축하 폭죽, `ESC` 복귀
- [x] **동물원둘레길 순환 트랙선 & 국립현대미술관 단체사진 촬영지 핀 연동 (`MapScreen.tsx`)**
- [x] **Firebase Realtime Database 실시간 3초 동기화 및 0 에러 클린 빌드**
