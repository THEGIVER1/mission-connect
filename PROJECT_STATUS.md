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
- **배포 주소**: https://mission-connect-final.vercel.app
- **GitHub 저장소**: https://github.com/THEGIVER1/mission-connect
- **핵심 철학**: *"사람 연결이 점수가 된다"*

---

## 2. 기술 스택 및 아키텍처
- **프론트엔드**: React 18 + TypeScript + Vite + Tailwind CSS
- **상태 관리**: Zustand (`src/store/useAppStore.ts`)
- **데이터베이스**: Firebase Realtime Database (REST API 연동 방식 적용)
- **배포 플랫폼**: Vercel
- **개발 환경**: Windows Local (Antigravity AI / Cursor) & GitHub Codespaces

---

## 3. 개발 환경 설정 및 실행 방법

### 로컬 실행 (Windows / Mac / Codespaces 공통)
```bash
# 1. 의존성 설치
npm install

# 2. 로컬 개발 서버 실행 (기본 포트: 3000)
npm run dev
# 접속: http://localhost:3000 (동일 Wi-Fi 모바일: http://[내IP]:3000)

# 3. 프로덕션 빌드 테스트
npm run build
```

### 환경 변수 설정 (`.env.local`)
```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=doosan-teambuilding.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=doosan-teambuilding
VITE_FIREBASE_MESSAGING_SENDER_ID=1078188183440
VITE_FIREBASE_APP_ID=1:1078188183440:web:4ba0215acff465572ded15
VITE_FIREBASE_DATABASE_URL=https://doosan-teambuilding-default-rtdb.firebaseio.com
VITE_KAKAO_MAP_KEY=
```

---

## 4. 완료된 기능 현황 ✅
- [x] **입장 화면 (`TeamSelect.tsx`)**
  - DOOSAN 로고 + 트레킹 타이틀 UI
  - 소속 선택: ㈜두산, 두산경영연구원
  - 팀 선택: 1조 ~ 5조
  - Firebase REST API 저장 (PATCH) 및 재입장 시 기존 점수 보존
- [x] **AR 보물찾기 (`ARScreen.tsx`)**
  - 6개 포인트 (두산 무궁화, 배나무, 감나무, 블루베리, 두릅나무, 기도원)
  - GPS 30m 반경 내 캡처 활성화 & 캡처 완료 처리
  - Firebase Realtime Database REST API 연동 및 기존 발견 기록 자동 로딩
  - 점수 획득 시 Zustand 스토어 및 Firebase RTDB 즉시 동기화
- [x] **실시간 리더보드 (`Leaderboard.tsx`)**
  - 팀 순위 탭 (1조~5조 실시간 자동 합산 집계 및 전체 5팀 랭킹 표시)
  - 미션별 탭
  - 개인 기여 탭 (REST API 초기 조회 + RTDB 리스너 연동, 로그인 사용자 '나' 배지 표시)
- [x] **네비게이션 & 대시보드 (`Dashboard.tsx`)**
  - 하단 고정 메뉴: 홈 / 미션지도 / 보물찾기 / 순위 / 내정보
- [x] **운영자 어드민 기본 화면 (`AdminScreen.tsx`)**

---

## 5. 해결된 이슈 & 조치 사항 🟢
### 1) AR 캡처 시 리더보드 점수 미반영 오류 해결
- **원인**: `ARScreen.tsx`에서 Firebase SDK 함수(`set`, `ref`, `update`)가 import 되지 않아 발생한 `ReferenceError` 및 점수 스토어 미동기화
- **조치 완료**:
  - `ARScreen.tsx`에 `fetch REST API`를 적용하여 `PUT/PATCH`로 Firebase RTDB에 안전하게 점수 및 AR 발견 기록 저장
  - 점수 획득 시 `useAppStore`의 `updateTeamScore` 호출하여 로컬 상태 즉각 반영
  - `Leaderboard.tsx`에서 모든 5개 팀 기본 초기화 및 REST API 백업 조회를 추가하여 100% 실시간 순위 반영

---

## 6. Firebase Realtime DB 경로 구조
```
sessions/
  └── trekking2026/
        ├── participants/
        │     └── {participantId}/
        │           ├── name: "홍길동"
        │           ├── company: "㈜두산"
        │           ├── teamId: "team1"
        │           ├── teamName: "1조"
        │           ├── score: 250
        │           ├── missionsCompleted: 2
        │           ├── arFoundCount: 2
        │           ├── arPoints: 250
        │           └── arFinds/
        │                 └── {targetId}: { id, name, emoji, points, found, foundAt }
        ├── teams/
        │     └── {teamId}/
        │           ├── totalScore: 1250
        │           └── memberCount: 10
        └── missions/
              └── {missionId}/
```

---

## 7. 팀 구성 & 점수 체계 & AR 좌표

### 팀 구성
| 팀ID | 팀명 | 색상 |
|:---:|:---:|:---:|
| `team1` | 1조 | 빨강 `#E31837` |
| `team2` | 2조 | 파랑 `#2980B9` |
| `team3` | 3조 | 초록 `#27AE60` |
| `team4` | 4조 | 노랑 `#F39C12` |
| `team5` | 5조 | 보라 `#8E44AD` |

### 점수 체계
- **GPS 포스트 도착**: 50pt
- **다른 자회사 연결 1건**: 200pt
- **미션 완료**: 100pt
- **커넥트 요청 수락**: 500pt
- **AR 보물찾기**: 100 ~ 150pt

### AR 보물찾기 GPS 좌표
| 대상 | 위도 (Lat) | 경도 (Lng) | 점수 |
|:---|:---:|:---:|:---:|
| 🌸 두산 무궁화 | 37.542577 | 127.149285 | 150pt |
| 🍐 배나무 | 37.542698 | 127.150787 | 100pt |
| 🍊 감나무 | 37.541608 | 127.152408 | 100pt |
| 🫐 블루베리 | 37.541951 | 127.151330 | 100pt |
| 🌿 두릅나무 | 37.543243 | 127.150170 | 100pt |
| ⛪ 기도원 | 37.543406 | 127.149597 | 150pt |

---

## 8. 주요 소스 파일 매핑
- **입장 화면**: `src/components/TeamSelect.tsx`
- **대시보드**: `src/components/dashboard/Dashboard.tsx`
- **AR 보물찾기**: `src/components/ar/ARScreen.tsx`
- **리더보드**: `src/components/leaderboard/Leaderboard.tsx`
- **GPS 지도**: `src/components/map/MapScreen.tsx`
- **어드민**: `src/components/admin/AdminScreen.tsx`
- **Firebase 설정/통신**: `src/lib/firebase.ts`
- **상태 관리**: `src/store/useAppStore.ts`
- **타입 정의**: `src/types/index.ts`

---

## 9. 작업 로드맵 (체크리스트)

### 🚨 긴급 과제 (Phase 1 - 완료 ✅)
- [x] `src/components/TeamSelect.tsx` - 입장 시 fetch REST API 저장 완벽 적용 및 에러 핸들링
- [x] `src/components/ar/ARScreen.tsx` - AR 캡처 시 fetch REST API 저장 및 중복 획득 방지
- [x] 리더보드 실시간 점수 반영 및 동기화 검증

### 🚀 기능 개발 (Phase 2)
- [ ] P3 매칭 기능 (고민 입력 → 타 팀/타 자회사 담당자 자동 매칭 알고리즘)
- [ ] 연결 리포트 화면 ("오늘 내가 연결한 N명", 관계망 시각화)
- [ ] 어드민 기능 강화 (운영자 실시간 참가자 모니터링, 점수 수동 조정)
- [ ] AR 식물 좌표 3개 추가 (현장 답사 후 등록)

### 📝 콘텐츠 및 배포 확정 (Phase 3)
- [ ] 단계별 세부 미션 콘텐츠 확정
- [ ] 도입부 입장 페이지 안내 문구 확정
- [ ] Vercel 최종 프로덕션 배포 및 모바일 실기기 E2E 테스트
