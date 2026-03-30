import { useState, useRef, useEffect, useCallback } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import {
  doc,
  setDoc,
  onSnapshot,
  collection,
  query,
  orderBy,
  limit,
  where,
  getDocs,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { TechnicalContext, Turn } from '../types';

const FS_ROOT = "macAssist/v1";

export function useSession() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [techContext, setTechContext] = useState<TechnicalContext>({});
  const [transcriptionHistory, setTranscriptionHistory] = useState<Turn[]>([]);
  const turnSeqRef = useRef<number>(0);

  // Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser: any) => {
      if (currentUser) setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Session initialization
  useEffect(() => {
    if (!user) return;
    if (sessionId) return;

    const initSession = async () => {
      try {
        const q = query(
          collection(db, `${FS_ROOT}/sessions`),
          where('userId', '==', user.uid),
          where('status', '==', 'active'),
          orderBy('lastUpdated', 'desc'),
          limit(1)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          setSessionId(snap.docs[0].id);
        } else {
          setSessionId('sess_' + crypto.randomUUID());
        }
      } catch (e) {
        console.warn("Firestore access failed (likely Mock User), falling back to local session.", e);
        setSessionId('sess_local_' + crypto.randomUUID());
      }
    };
    initSession();
  }, [user, sessionId]);

  // Firestore session + transcript sync
  useEffect(() => {
    if (!sessionId || !sessionId.startsWith('sess_')) return;
    if (sessionId.startsWith('sess_local_')) return;

    const unsub = onSnapshot(
      doc(db, `${FS_ROOT}/sessions`, sessionId),
      (snap: any) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data.techContext) setTechContext(data.techContext);
        }
      },
      (err: any) => console.warn("Session snapshot error", err)
    );

    const transcriptQuery = query(
      collection(db, `${FS_ROOT}/sessions`, sessionId, 'transcript'),
      orderBy('seq', 'asc')
    );

    const unsubTranscript = onSnapshot(
      transcriptQuery,
      (querySnapshot: any) => {
        const history: Turn[] = [];
        querySnapshot.forEach((d: any) => history.push(d.data()));
        setTranscriptionHistory(history);
        turnSeqRef.current = history.length;
      },
      (err: any) => console.warn("Transcript snapshot error", err)
    );

    return () => { unsub(); unsubTranscript(); };
  }, [sessionId]);

  const saveTurnToDb = useCallback(async (input: string, output: string) => {
    if (!sessionId) return;

    // Optimistic local update (covers mock users too)
    setTranscriptionHistory(prev => [...prev, { input, output }]);

    if (sessionId.startsWith('sess_local_')) return;

    const currentSeq = turnSeqRef.current;
    try {
      await setDoc(
        doc(db, `${FS_ROOT}/sessions`, sessionId, 'transcript', `turn_${currentSeq}`),
        { input, output, seq: currentSeq, timestamp: serverTimestamp() }
      );
      turnSeqRef.current = currentSeq + 1;
    } catch (e) {
      console.warn("Failed to save turn to DB", e);
    }
  }, [sessionId]);

  return {
    user,
    setUser,
    loading,
    sessionId,
    techContext,
    setTechContext,
    transcriptionHistory,
    saveTurnToDb,
  };
}
