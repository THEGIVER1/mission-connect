import { useCallback, useEffect, useRef, useState } from 'react';
import { onValue, ref, update, set as sdkSet } from 'firebase/database';
import { rtdb, FIREBASE_DB_URL } from '../../lib/firebase';
import { LEARNING_DB_BASE, SubjectData, parseSubjectData } from '../../config/learningConfig';

const EMPTY: SubjectData = { wall: [], canvas: {}, votes: {}, comments: {} };

/** REST + SDK 이중 채널 PATCH (null 값은 해당 키 삭제) */
export async function learningPatch(path: string, body: Record<string, any>) {
  const full = `${LEARNING_DB_BASE}/${path}`;
  try {
    await fetch(`${FIREBASE_DB_URL}/${full}.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {}
  try {
    await update(ref(rtdb, full), body);
  } catch {}
}

/** REST + SDK 이중 채널 PUT (null 이면 삭제) */
export async function learningPut(path: string, body: any) {
  const full = `${LEARNING_DB_BASE}/${path}`;
  try {
    await fetch(`${FIREBASE_DB_URL}/${full}.json`, {
      method: body === null ? 'DELETE' : 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: body === null ? undefined : JSON.stringify(body),
    });
  } catch {}
  try {
    await sdkSet(ref(rtdb, full), body);
  } catch {}
}

/**
 * 특정 과목의 학습 데이터를 실시간 구독 (WebSocket 리스너 + 2.5s REST 폴링)
 */
export function useLearningSubjectData(subjectId: string | undefined) {
  const [data, setData] = useState<SubjectData>(EMPTY);
  const [isLoaded, setIsLoaded] = useState(false);
  const lastSigRef = useRef<string>('');

  const apply = useCallback((raw: any) => {
    const sig = JSON.stringify(raw || {});
    if (sig === lastSigRef.current) return;
    lastSigRef.current = sig;
    setData(parseSubjectData(raw || {}));
  }, []);

  const refresh = useCallback(async () => {
    if (!subjectId) return;
    try {
      const res = await fetch(`${FIREBASE_DB_URL}/${LEARNING_DB_BASE}/${subjectId}.json?t=${Date.now()}`, {
        cache: 'no-store',
      });
      if (res.ok) apply(await res.json());
    } catch {
    } finally {
      setIsLoaded(true);
    }
  }, [subjectId, apply]);

  useEffect(() => {
    lastSigRef.current = '';
    setData(EMPTY);
    setIsLoaded(false);
    if (!subjectId) return;
    refresh();
    const poll = setInterval(refresh, 2500);
    let unsub = () => {};
    try {
      unsub = onValue(
        ref(rtdb, `${LEARNING_DB_BASE}/${subjectId}`),
        snap => {
          apply(snap.exists() ? snap.val() : {});
          setIsLoaded(true);
        },
        () => {}
      );
    } catch {}
    return () => {
      clearInterval(poll);
      unsub();
    };
  }, [subjectId, refresh, apply]);

  return { data, isLoaded, refresh };
}

/** 전체 과목 학습 데이터 원본 구독 (관리자용) */
export function useAllLearningData() {
  const [raw, setRaw] = useState<Record<string, any>>({});
  const lastSigRef = useRef('');

  const apply = useCallback((v: any) => {
    const sig = JSON.stringify(v || {});
    if (sig === lastSigRef.current) return;
    lastSigRef.current = sig;
    setRaw(v && typeof v === 'object' ? v : {});
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`${FIREBASE_DB_URL}/${LEARNING_DB_BASE}.json?t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) apply(await res.json());
    } catch {}
  }, [apply]);

  useEffect(() => {
    refresh();
    const poll = setInterval(refresh, 3000);
    let unsub = () => {};
    try {
      unsub = onValue(ref(rtdb, LEARNING_DB_BASE), snap => apply(snap.exists() ? snap.val() : {}), () => {});
    } catch {}
    return () => {
      clearInterval(poll);
      unsub();
    };
  }, [refresh, apply]);

  return { raw, refresh };
}
