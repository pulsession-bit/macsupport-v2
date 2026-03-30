import { useState, useRef, useEffect, useCallback } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import {
  doc,
  setDoc,
  updateDoc,
  writeBatch,
  onSnapshot,
  collection,
  query,
  orderBy,
  limit,
  where,
  getDocs,
  serverTimestamp,
  Timestamp
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { TechnicalContext, Turn } from '../types';

const FS_ROOT = "macAssist/v1";
const SESSION_TTL_DAYS = 1; // Sessions older than this are considered stale
const HEARTBEAT_INTERVAL_MS = 60_000; // Update lastUpdated every 60s

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
        const staleThreshold = new Date();
        staleThreshold.setDate(staleThreshold.getDate() - SESSION_TTL_DAYS);

        // Fetch all active sessions for this user
        const q = query(
          collection(db, `${FS_ROOT}/sessions`),
          where('userId', '==', user.uid),
          where('status', '==', 'active'),
          orderBy('lastUpdated', 'desc')
        );
        const snap = await getDocs(q);

        let resumeId: string | null = null;
        const batch = writeBatch(db);

        snap.forEach((d: any) => {
          const data = d.data();
          const lastUpdated: Date = data.lastUpdated?.toDate ? data.lastUpdated.toDate() : new Date(0);
          if (!resumeId && lastUpdated > staleThreshold) {
            // Keep most recent fresh session
            resumeId = d.id;
          } else {
            // Expire stale / extra sessions
            batch.update(doc(db, `${FS_ROOT}/sessions`, d.id), { status: 'expired', closedAt: serverTimestamp() });
            console.log(`🗑️ Expired stale session: ${d.id}`);
          }
        });

        await batch.commit();

        if (resumeId) {
          setSessionId(resumeId);
        } else {
          const newId = 'sess_' + crypto.randomUUID();
          await setDoc(doc(db, `${FS_ROOT}/sessions`, newId), {
            userId: user.uid,
            status: 'active',
            createdAt: serverTimestamp(),
            lastUpdated: serverTimestamp(),
          });
          setSessionId(newId);
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

  // Heartbeat: keep lastUpdated fresh so session is not expired by next user
  useEffect(() => {
    if (!sessionId || sessionId.startsWith('sess_local_')) return;
    const interval = setInterval(() => {
      updateDoc(doc(db, `${FS_ROOT}/sessions`, sessionId), { lastUpdated: serverTimestamp() })
        .catch((e: any) => console.warn('Heartbeat failed', e));
    }, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [sessionId]);

  // Close session when user navigates away / tab closes
  const closeSession = useCallback(() => {
    if (!sessionId || sessionId.startsWith('sess_local_')) return;
    updateDoc(doc(db, `${FS_ROOT}/sessions`, sessionId), { status: 'completed', closedAt: serverTimestamp() })
      .catch((e: any) => console.warn('Failed to close session', e));
  }, [sessionId]);

  useEffect(() => {
    window.addEventListener('beforeunload', closeSession);
    return () => window.removeEventListener('beforeunload', closeSession);
  }, [closeSession]);

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
    closeSession,
  };
}
