# Mission Connect - 프로젝트 현황 및 개발 컨텍스트 가이드

> **[중요] 개발 연속성 및 인수인계 규칙 (Development Context Handover Rules)**
> 1. **문서 동기화**: 새로운 기능 추가, 버그 수정, 구조 변경 시 반드시 이 문서(`PROJECT_STATUS.md`)의 상태(완료/이슈/남은 작업)를 최신화합니다.
> 2. **자동 커밋 & 푸시 (Autonomous Commits & Push)**: 유의미한 작업 단위(컴포넌트 수정, 버그 해결, 기능 완료 등)마다 AI 에이전트가 코드와 `PROJECT_STATUS.md`를 묶어 즉시 자동으로 Git Commit & Push(`git add . && git commit -m "..." && git push`)를 실행합니다.
> 3. **컨텍스트 보존**: 어디서든 `git pull`만 받으면 로컬/Codespaces/어떤 AI 에이전트 환경에서도 즉시 100% 동일하게 작업을 이어받을 수 있도록 유지합니다.
> 4. **환경 독립성**: Windows 로컬 터미널, GitHub Codespaces, Mac/Linux 어디서든 `npm install && npm run dev`로 동일하게 개발할 수 있도록 설정합니다.

---

## 1. 프로젝트 개요
- **프로젝트명**: Mission Connect (미션 커넥트)
- **목적**: 두산 그룹 HR 담당자 50명 대상 트레킹 워크샵 팀빌딩 플랫폼
- **일정**: 2026년 9월 워크샵
- **기본 장소**: **서울대공원 (호수둘레길 트레킹 코스)** *(장소 변경 가능하도록 모듈화 완료)*
- **배포 주소**: https://mission-connect-final.vercel.app
- **GitHub 저장소**: https://github.com/THEGIVER1/mission-connect
- **핵심 철학**: *"사람 연결이 점수가 된다"*

---

## 2. 기술 스택 및 모듈화 아키텍처
- **프론트엔드**: React 18 + TypeScript + Vite + Tailwind CSS
- **장소/미션 중앙 설정**: `src/config/workshopConfig.ts` (장소 변경 및 좌표/콘텐츠 일괄 관리 레이어)
- **상태 관리**: Zustand (`src/store/useAppStore.ts`)
- **데이터베이스**: Firebase Realtime Database (REST API 연동 방식 적용)
- **배포 플랫폼**: Vercel (GitHub 연동 자동 CI/CD 배포 완료)
- **개발 환경**: Windows Local (Antigravity AI / Cursor) & GitHub Codespaces

---

## 3. 장소 변경 및 코스 셋팅 방법 (`workshopConfig.ts`)
장소가 변경되거나 현장 답사 후 세부 좌표/미션 내용이 확정되면, 컴포넌트 코드를 수정할 필요 없이 **`src/config/workshopConfig.ts` 파일의 값만 수정**하면 됩니다:
- `ACTIVE_VENUE`: 현재 활성화된 장소 프리셋 지정 (`SEOUL_GRAND_PARK_CONFIG` / `YONKANG_CONFIG`)
- `posts`: 미션 포스트 좌표(lat, lng), 반경, 이름, 설명, 점수 설정
- `explorationTargets`: 보물찾기 타겟 이름, 이모지, 좌표, 점수 설정
- `WORKSHOP_COMPANIES` / `WORKSHOP_TEAMS`: 소속사 및 팀 구성

---

## 4. 완료된 기능 현황 ✅
- [x] **장소 독립형 모듈화 아키텍처 구축 (`src/config/workshopConfig.ts`)**
  - 서울대공원(호수둘레길) 및 연강원 프리셋 분리
  - UI 텍스트, 지도 라벨, GPS 좌표, 보물찾기 타겟의 컴포넌트 하드코딩 완전 제거
- [x] **입장 화면 (`TeamSelect.tsx`)**
  - DOOSAN 로고 + 트레킹 타이틀 UI
  - 소속사 선택 및 팀 선택 (1조~5조)
  - Firebase REST API 저장 (`PATCH`) 및 재입장 시 기존 점수 보존
- [x] **AR 보물찾기 (`ARScreen.tsx`)**
  - 6개 탐험 포인트 (중앙 설정 연동)
  - GPS 반경 내 캡처 활성화 & 캡처 완료 처리
  - Firebase RTDB REST API 저장 및 기존 발견 기록 자동 로딩
  - 점수 획득 시 Zustand 스토어 및 Firebase RTDB 즉시 동기화
- [x] **실시간 리더보드 (`Leaderboard.tsx`)**
  - 팀 순위 탭 (1조~5조 실시간 자동 합산 집계 및 전체 5팀 랭킹 표시)
  - 미션별 탭
  - 개인 기여 탭 (REST API 초기 조회 + RTDB 리스너 연동, 로그인 사용자 '나' 배지 표시)
- [x] **GPS 트레킹 지도 (`MapScreen.tsx`)**
  - 활성 장소 기반 SVG 지도 렌더링 및 포스트 마커 시각화
  - GPS 포스트 도착 인증 시 Firebase RTDB 즉시 합산 저장 (`PATCH`)
- [x] **Vercel GitHub 연동 및 자동 CI/CD 배포 완료**

---

## 5. 현재 활성 장소 설정 (서울대공원 호수둘레길)
| 포스트 ID | 명칭 | 위치 | 점수 | 유형 |
|:---:|:---|:---|:---:|:---:|
| **P1** | 우리 팀 첫 만남 | 만남의 광장 (분수대) | 200pt | GPS 팀빌딩 |
| **P2** | 호수둘레길 자연 탐험 | 둘레길 입구 숲길 | 500pt | AR 탐험 |
| **P3** | 같은 고민, 다른 회사 | 호수 브릿지 전망대 | 300pt | 매칭 네트워킹 |
| **P4** | 두산 HR로 산다는 것 | 테마가든 메타세쿼이아길 | 400pt | 크로스 챌린지 |
| **P5** | 오늘의 연결 선언 | 동물원 정문 만남의 숲 | 800pt | 퀴즈/선언 |

---

## 6. 남은 작업 로드맵 (체크리스트)

### 🚀 핵심 기능 구현 (Phase 2)
- [ ] **P3 스마트 매칭 기능**: 고민 키워드 입력 → 타 팀/타 자회사 담당자 자동 매칭 알고리즘 및 대화 인증 (+500pt)
- [ ] **연결 리포트 화면**: 워크샵 종료 시 "오늘 내가 연결한 N명" 관계망 시각화
- [ ] **운영자 어드민 강화 (`AdminScreen.tsx`)**: 50명 실시간 모니터링, 점수 수동 조정, 긴급 공지 푸시

### 📝 코스 및 콘텐츠 최종 확정 (Phase 3)
- [ ] 사용자 세부 코스 확정 후 `workshopConfig.ts` 실측 GPS 좌표 업데이트
- [ ] 세부 미션 텍스트 및 안내 문구 확정
- [ ] 현장 모바일 실기기 E2E 테스트
