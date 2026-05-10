import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAppStore } from './store/useAppStore';

const TeamSelect  = lazy(() => import('./components/TeamSelect'));
const Dashboard   = lazy(() => import('./components/dashboard/Dashboard'));
const MapScreen   = lazy(() => import('./components/map/MapScreen'));
const ARScreen    = lazy(() => import('./components/ar/ARScreen'));
const Leaderboard = lazy(() => import('./components/leaderboard/Leaderboard'));
const AdminScreen = lazy(() => import('./components/admin/AdminScreen'));

const LoadingSpinner: React.FC = () => (
  <div className="max-w-[390px] mx-auto bg-[#0D1117] min-h-screen flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
      <span className="font-bebas text-xl tracking-widest text-slate-400">LOADING</span>
    </div>
  </div>
);

// 팀 미선택 시 TeamSelect로 리다이렉트
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const myTeam = useAppStore((s) => s.myTeam);
  if (!myTeam) return <Navigate to="/team-select" replace />;
  return <>{children}</>;
};

const App: React.FC = () => (
  <BrowserRouter>
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        {/* 팀 선택 화면 */}
        <Route path="/team-select" element={<TeamSelect />} />

        {/* 팀 선택 후 접근 가능한 화면들 */}
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/map" element={<ProtectedRoute><MapScreen /></ProtectedRoute>} />
        <Route path="/ar"  element={<ProtectedRoute><ARScreen /></ProtectedRoute>} />
        <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />

        {/* 어드민은 팀 선택 불필요 */}
        <Route path="/admin" element={<AdminScreen />} />

        {/* 그 외 → 팀 선택으로 */}
        <Route path="*" element={<Navigate to="/team-select" replace />} />
      </Routes>
    </Suspense>
  </BrowserRouter>
);

export default App;
