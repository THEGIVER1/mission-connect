import { useState, useEffect } from 'react';
import { onValue, ref } from 'firebase/database';
import { rtdb, FIREBASE_DB_URL } from '../lib/firebase';
import {
  LIVE_EVENT_CONFIG,
  RemoteEventConfig,
  applyRemoteEventConfig,
} from '../config/workshopConfig';

let isSyncStarted = false;

function startGlobalEventConfigSync() {
  if (isSyncStarted || typeof window === 'undefined') return;
  isSyncStarted = true;

  const dbUrl = FIREBASE_DB_URL;
  if (!dbUrl) return;

  // 1) 초기 REST 조회
  fetch(`${dbUrl}/sessions/trekking2026/eventConfig.json?t=${Date.now()}`, { cache: 'no-store' })
    .then(r => (r.ok ? r.json() : null))
    .then(data => {
      if (data && typeof data === 'object') {
        applyRemoteEventConfig(data);
      }
    })
    .catch(() => {});

  // 2) 실시간 SDK 구독
  try {
    const cfgRef = ref(rtdb, 'sessions/trekking2026/eventConfig');
    onValue(cfgRef, snapshot => {
      if (snapshot.exists()) {
        applyRemoteEventConfig(snapshot.val());
      }
    });
  } catch {
    // ignore
  }
}

export function useEventConfig(): RemoteEventConfig {
  const [, setTick] = useState(0);

  useEffect(() => {
    startGlobalEventConfigSync();
    const handler = () => setTick(t => t + 1);
    window.addEventListener('mmazing-config-updated', handler);
    return () => window.removeEventListener('mmazing-config-updated', handler);
  }, []);

  return LIVE_EVENT_CONFIG;
}
