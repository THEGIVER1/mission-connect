# Mission Connect 🎯
**야외 팀빌딩 플랫폼** — React + Tailwind CSS + Firebase

---

## 빠른 시작

```bash
cd mission-connect
npm install
npm run dev
# → http://localhost:3000 (모바일: 같은 WiFi에서 IP:3000)
```

---

## 프로젝트 구조

```
src/
├── types/          # TypeScript 타입 전체 정의
│   └── index.ts
├── lib/
│   ├── firebase.ts # Firebase 초기화 (Firestore + RTDB + Auth)
│   └── mockData.ts # 개발용 Mock 데이터 (파일럿 전 사용)
├── store/
│   └── useAppStore.ts  # Zustand 전역 상태 (GPS·점수·미션·알림)
├── hooks/
│   └── useFirebase.ts  # GPS 업로드·실시간 점수 구독 훅
├── components/
│   ├── shared/     # 공통 UI 컴포넌트
│   ├── dashboard/  # 메인 대시보드 ✅
│   ├── map/        # GPS 지도 (다음 작업)
│   ├── ar/         # AR 카메라 뷰 (다음 작업)
│   ├── leaderboard/ # 리더보드 (다음 작업)
│   └── admin/      # 운영자 어드민 (다음 작업)
└── App.tsx         # React Router 라우팅
```

---

## Firebase 설정

### 1. `.env.local` 생성
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your_project-default-rtdb.firebaseio.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 2. Firebase Console 설정
- **Firestore** — teams, missions, notices, alerts 컬렉션 생성
- **Realtime DB** — sessions/{id}/scores, sessions/{id}/locations
- **Authentication** — 익명 로그인 활성화

### 3. Firestore 보안 규칙
```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /sessions/{sessionId}/{document=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

---

## 개발 단계 로드맵

| 단계 | 컴포넌트 | 상태 |
|------|---------|------|
| 1 | 타입 정의 & Mock 데이터 | ✅ 완료 |
| 2 | Zustand 전역 스토어 | ✅ 완료 |
| 3 | Firebase 훅 (GPS·점수) | ✅ 완료 |
| 4 | 메인 대시보드 | ✅ 완료 |
| 5 | GPS 지도 화면 | 🔜 다음 |
| 6 | AR 카메라 뷰 | 🔜 대기 |
| 7 | 리더보드 | 🔜 대기 |
| 8 | 운영자 어드민 | 🔜 대기 |
| 9 | Firebase 실연동 | 🔜 대기 |
| 10 | PWA 빌드 & 배포 | 🔜 대기 |

---

## 기술 스택
- **Frontend**: React 18 + TypeScript + Vite
- **스타일**: Tailwind CSS (커스텀 토큰: brand, navy, surface)
- **상태관리**: Zustand
- **실시간 DB**: Firebase Realtime Database (GPS·점수)
- **데이터**: Firestore (미션·팀·공지·신고)
- **인증**: Firebase Auth (익명 로그인)
- **라우팅**: React Router v6

---

## 파일럿 체크리스트 (D-2)
- [ ] `.env.local` Firebase 키 입력
- [ ] `npm install && npm run dev` 로컬 확인
- [ ] 모바일 실기기 WiFi 접속 테스트
- [ ] GPS 권한 허용 확인 (iOS Safari: 설정 → Safari → 위치)
- [ ] AR 카메라 권한 확인
- [ ] 운영자 어드민 `/admin` 접속 확인
