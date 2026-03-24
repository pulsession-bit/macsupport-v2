
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { createBlob, decode, decodeAudioData, blobToBase64 } from './utils/audio';
import { MODEL_NAME, SYSTEM_INSTRUCTIONS } from './constants';
import { Visualizer } from './components/Visualizer';
import { Language } from './types';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
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
import { Login } from './components/Login';
import { GuidedDiagnostic } from './components/GuidedDiagnostic';
import { AppointmentScheduler } from './components/AppointmentScheduler';
import { SmartBooking } from './components/SmartBooking';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
type AppTab = 'guided' | 'live' | 'appointment' | 'smart_booking';

interface TechnicalContext {
  model?: string;
  os?: string;
  serial?: string;
  issue?: string;
}

const FS_ROOT = "macAssist/v1";

// --- STARTUP / HOME COMPONENT ---

const StartupQuote: React.FC<{ onStart: () => void; onNavigateToRDV: () => void }> = ({ onStart, onNavigateToRDV }) => {
  return (
    <div className="fixed inset-0 z-[100] bg-black text-white flex flex-col items-center justify-center p-8 overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-600/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-teal-600/10 rounded-full blur-[120px] animate-pulse" />

      <div className="max-w-4xl w-full flex flex-col items-center text-center space-y-12 animate-in fade-in zoom-in duration-1000">
        <div className="w-24 h-24 bg-white/5 rounded-3xl flex items-center justify-center backdrop-blur-md border border-white/10 shadow-2xl">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        </div>
        
        <div className="space-y-6">
            <h1 className="text-7xl md:text-9xl font-medium tracking-tighter text-white leading-tight">Vestee Support.</h1>
            <p className="text-xl md:text-2xl font-light text-neutral-500 max-w-2xl mx-auto leading-relaxed">
              L'expertise technique réinventée par l'intelligence artificielle.
            </p>
        </div>
        
        <div className="flex flex-col items-center gap-6 pt-12">
          <button 
            onClick={onStart}
            className="px-20 py-7 bg-white text-black rounded-full text-[12px] font-black uppercase tracking-[0.4em] hover:scale-105 transition-all active:scale-95 duration-500 shadow-[0_0_50px_rgba(255,255,255,0.2)]"
          >
            Commencer le diagnostic
          </button>
          <button 
            onClick={onNavigateToRDV}
            className="text-[10px] font-bold uppercase tracking-[0.5em] text-neutral-600 hover:text-white transition-colors py-4 border-b border-white/0 hover:border-white/20"
          >
            Prendre un rendez-vous expert
          </button>
        </div>
      </div>

      <div className="absolute bottom-12 left-0 right-0 text-center flex flex-col gap-4">
          <button 
            onClick={onStart}
            className="text-[10px] font-bold uppercase tracking-[0.3em] text-blue-500 hover:text-blue-400 transition-colors animate-pulse"
          >
            → Voir la Nouvelle Interface Diagnostic ←
          </button>
          <p className="text-[11px] font-bold uppercase tracking-[0.5em] text-neutral-800">Vestee Support Pro v3.0</p>
      </div>
    </div>
  );
};

// --- MAIN APP COMPONENT ---

const App: React.FC = () => {
  // Logic to handle Deep Linking (?tab=booking)
  const getInitialTab = (): AppTab => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam === 'booking') return 'smart_booking';
      if (tabParam === 'rdv') return 'appointment';
    }
    return 'guided';
  };

  const shouldSkipHome = (): boolean => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.has('tab');
    }
    return false;
  };

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [activeTab, setActiveTab] = useState<AppTab>(getInitialTab);
  const [language] = useState<Language>('fr');
  const [showStartupHome, setShowStartupHome] = useState(!shouldSkipHome());
  const [showLoginView, setShowLoginView] = useState(false);
  
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [techContext, setTechContext] = useState<TechnicalContext>({});
  const [transcriptionHistory, setTranscriptionHistory] = useState<any[]>([]);
  
  // Real-time transcript state (not just DB history)
  const [realtimeInput, setRealtimeInput] = useState('');
  const [realtimeOutput, setRealtimeOutput] = useState('');
  
  // Auto-Reconnect State
  const [reconnectTrigger, setReconnectTrigger] = useState(0);
  
  const currentInputTranscription = useRef<string>('');
  const currentOutputTranscription = useRef<string>('');
  const turnSeqRef = useRef<number>(0);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatEndRefDesktop = useRef<HTMLDivElement>(null);

  const [userVolume, setUserVolume] = useState(0);
  const [agentVolume, setAgentVolume] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const agentAnalyserRef = useRef<AnalyserNode | null>(null);
  const userAnalyserRef = useRef<AnalyserNode | null>(null);
  const frameIntervalRef = useRef<number | null>(null);
  const reconnectIntervalRef = useRef<number | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const isReconnectRef = useRef<boolean>(false);
  const pendingScreenStreamRef = useRef<MediaStream | null>(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      // Only set user if it's a real Firebase user. 
      // If we have a mock user set via Login, we don't want to override it with null unless it's a logout.
      if (currentUser) {
         setUser(currentUser);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Session Initialization Logic (Depends on 'user' state)
  useEffect(() => {
      if (user) {
        setShowLoginView(false);
        
        // If we already have a session, skip
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
      }
  }, [user, sessionId]);

  // Session Data Sync (Firestore)
  useEffect(() => {
    if (!sessionId || !sessionId.startsWith('sess_')) return; // Check if valid ID

    // If it's a local session (Mock user), we can't use onSnapshot
    if (sessionId.startsWith('sess_local_')) {
        return;
    }

    const unsub = onSnapshot(doc(db, `${FS_ROOT}/sessions`, sessionId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.techContext) setTechContext(data.techContext);
      }
    }, (err) => console.warn("Session snapshot error", err));

    const transcriptQuery = query(
      collection(db, `${FS_ROOT}/sessions`, sessionId, 'transcript'),
      orderBy('seq', 'asc')
    );

    const unsubTranscript = onSnapshot(transcriptQuery, (querySnapshot) => {
      const history: any[] = [];
      querySnapshot.forEach((doc) => { history.push(doc.data()); });
      setTranscriptionHistory(history);
      turnSeqRef.current = history.length;
    }, (err) => console.warn("Transcript snapshot error", err));
    
    return () => { unsub(); unsubTranscript(); };
  }, [sessionId]);

  const saveTurnToDb = useCallback(async (input: string, output: string) => {
    if (!sessionId) return;
    
    // Local Update for Mock User / Optimistic UI
    setTranscriptionHistory(prev => [...prev, { input, output }]);

    if (sessionId.startsWith('sess_local_')) return;

    const currentSeq = turnSeqRef.current;
    
    try {
      await setDoc(doc(db, `${FS_ROOT}/sessions`, sessionId, 'transcript', `turn_${currentSeq}`), {
        input,
        output,
        seq: currentSeq,
        timestamp: serverTimestamp()
      });
      turnSeqRef.current = currentSeq + 1;
    } catch (e) {
        console.warn("Failed to save turn to DB", e);
    }
  }, [sessionId]);

  // Transition Handler: Init Audio Contexts on user interaction (Button Click)
  const handleDiagnosticComplete = (summary: string) => {
     // Pre-initialize contexts to respect Autoplay Policy
     try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!audioContextRef.current) audioContextRef.current = new AudioContextClass({ sampleRate: 24000 });
        if (!inputAudioContextRef.current) inputAudioContextRef.current = new AudioContextClass({ sampleRate: 16000 });
        
        // Resume immediately within user gesture
        audioContextRef.current.resume();
        inputAudioContextRef.current.resume();
     } catch(e) {
        console.warn("Audio Context Init Failed:", e);
     }
     
     setActiveTab('live');
  };

  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      screenStreamRef.current?.getTracks().forEach(t => t.stop());
      screenStreamRef.current = null;
      if (videoRef.current && mediaStreamRef.current) {
        videoRef.current.srcObject = mediaStreamRef.current;
      }
      setIsScreenSharing(false);
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
        screenStream.getAudioTracks().forEach(t => t.stop());
        screenStreamRef.current = screenStream;
        if (videoRef.current) {
          videoRef.current.srcObject = screenStream;
        }
        screenStream.getVideoTracks()[0].onended = () => {
          screenStreamRef.current = null;
          if (videoRef.current && mediaStreamRef.current) {
            videoRef.current.srcObject = mediaStreamRef.current;
          }
          setIsScreenSharing(false);
        };
        setIsScreenSharing(true);
      } catch (e) {
        console.warn("Partage d'écran annulé ou refusé", e);
      }
    }
  }, [isScreenSharing]);

  const disconnect = useCallback(() => {
    // Clear Reconnect Interval
    if (reconnectIntervalRef.current) {
        clearInterval(reconnectIntervalRef.current);
        reconnectIntervalRef.current = null;
    }

    if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
    screenStreamRef.current?.getTracks().forEach(t => t.stop());
    screenStreamRef.current = null;
    setIsScreenSharing(false);
    mediaStreamRef.current = null;
    sessionPromiseRef.current?.then(s => s.close());
    sessionPromiseRef.current = null;
    
    setStatus('disconnected');
    setRealtimeInput('');
    setRealtimeOutput('');
    
    sourcesRef.current.forEach(s => s.stop());
    sourcesRef.current.clear();
    
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
       audioContextRef.current.close();
       audioContextRef.current = null;
    }
    if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
       inputAudioContextRef.current.close();
       inputAudioContextRef.current = null;
    }
  }, []);

  const connect = useCallback(async () => {
    if (status !== 'disconnected') return;
    setStatus('connecting');

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // 1. Get User Media (Cam + Mic) with fallback
      let stream: MediaStream;
      try {
        // PRIORITY: REAR CAMERA (ENVIRONMENT) FOR DIAGNOSTICS
        stream = await navigator.mediaDevices.getUserMedia({ 
          audio: true, 
          video: { facingMode: "environment" } 
        });
      } catch (e) {
        console.warn("Preferred camera access denied, falling back to default.", e);
        try {
           // Fallback if environment camera is not available/denied
           stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        } catch (e2) {
            console.warn("Video access denied completely, falling back to audio only.", e2);
            try {
              stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            } catch (e3) {
              console.error("Audio access denied", e3);
              setStatus('error');
              return;
            }
        }
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      mediaStreamRef.current = stream;

      // 2. Setup Audio Contexts (Reuse if pre-initialized)
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!audioContextRef.current) audioContextRef.current = new AudioContextClass({ sampleRate: 24000 });
      if (!inputAudioContextRef.current) inputAudioContextRef.current = new AudioContextClass({ sampleRate: 16000 });

      // 3. Resume (Just in case)
      try {
        if (audioContextRef.current.state === 'suspended') await audioContextRef.current.resume();
        if (inputAudioContextRef.current.state === 'suspended') await inputAudioContextRef.current.resume();
      } catch (e) {
        console.warn("Audio resume blocked (should be handled by pre-init).");
      }

      // 4. Analysers
      agentAnalyserRef.current = audioContextRef.current.createAnalyser();
      userAnalyserRef.current = inputAudioContextRef.current.createAnalyser();
      agentAnalyserRef.current.fftSize = 256;
      userAnalyserRef.current.fftSize = 256;

      // 5. Connect to Gemini Live with Context Injection
      const contextPrompt = Object.keys(techContext).length > 0
        ? `\n\n[SYSTEM_DATA_INJECTION]\nCONTEXTE TECHNIQUE PRÉ-ÉTABLI (Utiliser pour le diagnostic, ne pas lire le JSON à haute voix, confirmer simplement "Je vois le contexte" si pertinent):\n${JSON.stringify(techContext)}`
        : "";
      const reconnectPrompt = isReconnectRef.current
        ? `\n\n[RECONNEXION SESSION] Tu reprends une session en cours. NE PAS répéter le message d'ouverture. Reste silencieux et attends la prochaine intervention de l'utilisateur.`
        : "";
      isReconnectRef.current = false;

      const sessionPromise = sessionPromiseRef.current = ai.live.connect({
        model: MODEL_NAME,
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: SYSTEM_INSTRUCTIONS[language] + contextPrompt + reconnectPrompt,
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } },
          inputAudioTranscription: {},
          outputAudioTranscription: {}
        },
        callbacks: {
          onopen: () => {
            setStatus('connected');

            // Restaurer le partage d'écran si actif avant le reconnect
            if (pendingScreenStreamRef.current?.active) {
                screenStreamRef.current = pendingScreenStreamRef.current;
                if (videoRef.current) videoRef.current.srcObject = pendingScreenStreamRef.current;
                setIsScreenSharing(true);
                pendingScreenStreamRef.current = null;
            }

            // --- AUTO-REFRESH MECHANISM (270s) ---
            if (reconnectIntervalRef.current) clearInterval(reconnectIntervalRef.current);
            reconnectIntervalRef.current = window.setInterval(() => {
                console.log("♻️ Auto-refreshing session to prevent timeout (270s)...");
                isReconnectRef.current = true;
                // Sauvegarder le stream d'écran avant disconnect pour le restaurer après
                if (screenStreamRef.current?.active) {
                    pendingScreenStreamRef.current = screenStreamRef.current;
                    screenStreamRef.current = null;
                    // Détacher de videoRef pour que disconnect() ne stoppe pas les tracks
                    if (videoRef.current) videoRef.current.srcObject = null;
                }
                disconnect();
                // Trigger a reconnect after a short buffer
                setTimeout(() => {
                    setReconnectTrigger(prev => prev + 1);
                }, 500);
            }, 270000);
            // -------------------------------------

            // Setup Microphone Processing
            const source = inputAudioContextRef.current!.createMediaStreamSource(stream);
            const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
            
            source.connect(userAnalyserRef.current!);
            
            scriptProcessor.onaudioprocess = (e) => {
              if (!sessionPromiseRef.current) return;
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              sessionPromise.then(s => s.sendRealtimeInput({ media: pcmBlob }));
            };

            source.connect(scriptProcessor);
            
            // Prevent Feedback Loop
            const muteNode = inputAudioContextRef.current!.createGain();
            muteNode.gain.value = 0;
            scriptProcessor.connect(muteNode);
            muteNode.connect(inputAudioContextRef.current!.destination);

            // Video frames
            const videoTrack = stream.getVideoTracks()[0];
            const ctx = canvasRef.current?.getContext('2d');
            if ((videoTrack || screenStreamRef.current) && ctx && videoRef.current) {
              frameIntervalRef.current = window.setInterval(() => {
                if (!sessionPromiseRef.current) return;
                if (videoRef.current && canvasRef.current && videoRef.current.readyState === 4) {
                  canvasRef.current.width = videoRef.current.videoWidth / 4;
                  canvasRef.current.height = videoRef.current.videoHeight / 4;
                  ctx.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
                  canvasRef.current.toBlob(async (blob) => {
                    if (!sessionPromiseRef.current || !blob) return;
                    const base64Data = await blobToBase64(blob);
                    sessionPromise.then(s => s.sendRealtimeInput({ media: { data: base64Data, mimeType: 'image/jpeg' } }));
                  }, 'image/jpeg', 0.5);
                }
              }, 1000);
            }
          },
          onmessage: async (msg: LiveServerMessage) => {
            if (msg.serverContent?.outputTranscription) {
              const text = msg.serverContent.outputTranscription.text;
              currentOutputTranscription.current += text;
              setRealtimeOutput(prev => prev + text);
            } else if (msg.serverContent?.inputTranscription) {
              const text = msg.serverContent.inputTranscription.text;
              currentInputTranscription.current += text;
              setRealtimeInput(prev => prev + text);
            }

            if (msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data) {
              const audioBuffer = await decodeAudioData(
                decode(msg.serverContent.modelTurn.parts[0].inlineData.data),
                audioContextRef.current!,
                24000, 1
              );
              const source = audioContextRef.current!.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(agentAnalyserRef.current!);
              agentAnalyserRef.current!.connect(audioContextRef.current!.destination);
              
              const currentTime = audioContextRef.current!.currentTime;
              if (nextStartTimeRef.current < currentTime) {
                  nextStartTimeRef.current = currentTime;
              }
              
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
              source.onended = () => sourcesRef.current.delete(source);
            }

            if (msg.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }

            if (msg.serverContent?.turnComplete) {
              const input = currentInputTranscription.current;
              const output = currentOutputTranscription.current;
              
              if (input || output) {
                saveTurnToDb(input, output);
              }
              
              currentInputTranscription.current = '';
              currentOutputTranscription.current = '';
              setRealtimeInput('');
              setRealtimeOutput('');

              const contextMatch = output.match(/\[CONTEXT_UPDATE: (\{.*?\})\]/);
              if (contextMatch) {
                try { setTechContext(prev => ({ ...prev, ...JSON.parse(contextMatch[1]) })); } catch(e) {}
              }
            }
          },
          onclose: () => {
              // Only set disconnected if we aren't in the middle of a purposeful reconnect
              // But since our reconnect logic calls disconnect() first, this is fine.
              setStatus('disconnected');
          },
          onerror: (e) => {
            console.error("Session Error", e);
            setStatus('error');
          }
        }
      });
      sessionPromiseRef.current = sessionPromise;
      
      const animate = () => {
        if (status === 'disconnected') return; 
        if (userAnalyserRef.current) {
          const data = new Uint8Array(userAnalyserRef.current.frequencyBinCount);
          userAnalyserRef.current.getByteFrequencyData(data);
          setUserVolume(data.reduce((a, b) => a + b, 0) / data.length / 255);
        }
        if (agentAnalyserRef.current) {
          const data = new Uint8Array(agentAnalyserRef.current.frequencyBinCount);
          agentAnalyserRef.current.getByteFrequencyData(data);
          setAgentVolume(data.reduce((a, b) => a + b, 0) / data.length / 255);
        }
        requestAnimationFrame(animate);
      };
      animate();

    } catch (e) {
      console.error("Connection Failed:", e);
      setStatus('error');
    }
  }, [status, language, saveTurnToDb, techContext, disconnect]);

  // Effect to handle auto-reconnect trigger
  useEffect(() => {
    if (reconnectIntervalRef.current) {
        // connect is triggered via reconnectTrigger dependency
    }
    if (reconnectTrigger > 0) {
        connect();
    }
  }, [reconnectTrigger, connect]);

  useEffect(() => {
    if (activeTab === 'live' && status === 'disconnected' && reconnectTrigger === 0) {
        // Only initial connect, subsequent are handled by reconnectTrigger
        connect();
    }
    if (activeTab !== 'live' && status === 'connected') disconnect();
  }, [activeTab, status, connect, disconnect, reconnectTrigger]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    chatEndRefDesktop.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcriptionHistory, realtimeInput, realtimeOutput]);

  // Handle access to tabs.
  const handleStartProcess = () => {
     setShowStartupHome(false); 
     setActiveTab('guided'); 
  };

  if (loading) return <div className="min-h-screen bg-black" />;

  if (showStartupHome) {
    return <StartupQuote onStart={handleStartProcess} onNavigateToRDV={() => { setShowStartupHome(false); setActiveTab('smart_booking'); }} />;
  }

  // Allow 'appointment', 'smart_booking' and 'guided' tabs without login
  if ((!user && activeTab !== 'appointment' && activeTab !== 'smart_booking' && activeTab !== 'guided') || showLoginView) {
    return (
      <Login 
        onLoginSuccess={(u) => { setUser(u); setShowLoginView(false); setShowStartupHome(false); }} 
        onCancel={() => { setShowLoginView(false); setShowStartupHome(true); }}
        showCancel={true}
      />
    );
  }

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-white/20">
      <div className="h-screen flex flex-col overflow-hidden">
        <header className="flex-none p-6 border-b border-white/5 flex justify-between items-center py-6">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center border border-white/10">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A10.003 10.003 0 0012 3a10.003 10.003 0 00-6.912 2.744L5.05 6.05M12 7V3m0 0a10 10 0 100 20 10 10 0 000-20z" />
              </svg>
            </div>
            <h2 className="text-sm font-black uppercase tracking-[0.3em]">VESTEE ASSISTANCE PRO</h2>
          </div>
          <div className="flex items-center gap-6">
            <button onClick={() => setShowStartupHome(true)} className="text-[9px] font-bold uppercase tracking-widest text-neutral-500 hover:text-white transition-colors">Accueil</button>
            {user ? (
              <button 
                onClick={() => { 
                    signOut(auth).catch(() => {}); // Logout firebase
                    setUser(null); // Clear local/mock user
                    setShowStartupHome(true); 
                }} 
                className="text-[9px] font-bold uppercase tracking-widest text-neutral-500 hover:text-white transition-colors"
              >
                Déconnexion
              </button>
            ) : (
               <button onClick={() => setShowLoginView(true)} className="text-[9px] font-bold uppercase tracking-widest text-white transition-colors">Connexion</button>
            )}
          </div>
        </header>

        <main className="flex-1 relative bg-neutral-950 overflow-hidden flex flex-col lg:flex-row">
          {activeTab === 'guided' && (
            <div className="flex-1 overflow-y-auto">
              <GuidedDiagnostic 
                techContext={techContext} 
                setTechContext={setTechContext} 
                onComplete={handleDiagnosticComplete} 
                onNavigateToBooking={() => setActiveTab('smart_booking')}
                onRequestAccessPro={() => setShowLoginView(true)}
              />
            </div>
          )}
          
          {activeTab === 'smart_booking' && (
            <div className="flex-1 h-full overflow-hidden">
              <SmartBooking 
                onNavigateToDiagnostic={(initialContext) => { 
                  if (initialContext) {
                    setTechContext(prev => ({ ...prev, ...initialContext }));
                  }
                  setActiveTab('guided'); 
                }} 
              />
            </div>
          )}

          {activeTab === 'appointment' && (
            <div className="flex-1 overflow-y-auto p-4 lg:p-10">
              <AppointmentScheduler onComplete={() => { if (user) setActiveTab('guided'); else setShowStartupHome(true); }} />
            </div>
          )}
          
          {activeTab === 'live' && (
            <div className="flex-1 flex flex-col lg:flex-row h-full bg-black overflow-hidden relative">
              {/* ... Live Component content ... */}
              {/* Note: Kept same as previous to save space, assuming no change needed in Live Component structure */}
              <div className="flex-1 relative flex flex-col h-full overflow-hidden">
                  <div className="absolute inset-0 z-0">
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                    <canvas ref={canvasRef} className="hidden" />
                  </div>
                  
                  <div className="relative z-10 p-6 flex justify-between items-start">
                     <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-green-500 animate-pulse' : status === 'error' ? 'bg-red-600' : 'bg-yellow-500'}`} />
                            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white">
                              {status === 'connected' ? 'Live Session' : status === 'error' ? 'Erreur Connexion' : 'Connexion...'}
                            </span>
                          </div>
                          <p className="text-[8px] font-bold text-neutral-500 uppercase tracking-widest">Agent Vestee - Expert N2</p>
                       </div>
                       <div className="flex gap-4">
                          <Visualizer level={userVolume} color="#3b82f6" label="Input" />
                          <Visualizer level={agentVolume} color="#ffffff" label="Agent" />
                       </div>
                  </div>

                  <div className="relative z-10 flex-1 flex items-center justify-center p-6">
                      {status === 'error' && (
                         <div className="text-center p-6 bg-black/50 backdrop-blur-md rounded-2xl border border-white/10 mx-auto max-w-sm">
                            <p className="text-red-500 text-xs font-bold uppercase tracking-widest mb-4">Échec de connexion</p>
                            <p className="text-neutral-400 text-xs mb-6">Vérifiez votre micro/caméra ou votre réseau.</p>
                            <button onClick={() => { setStatus('disconnected'); connect(); }} className="px-6 py-3 bg-white text-black rounded-full text-[9px] uppercase font-bold tracking-widest hover:scale-105 transition-all">Relancer la session</button>
                         </div>
                      )}
                      
                      {/* Mobile Transcript Overlay */}
                      <div className="lg:hidden w-full h-full overflow-y-auto space-y-4 mask-image-gradient">
                           {transcriptionHistory.map((turn, i) => {
                             const displayOutput = turn.output ? turn.output.replace(/\[CONTEXT_UPDATE:[\s\S]*?\]/g, '').trim() : '';
                             return (
                               <div key={i} className="space-y-2">
                                 {turn.input && (
                                   <div className="flex justify-end">
                                     <div className="bg-blue-600/20 border border-blue-500/20 rounded-2xl px-4 py-2 text-white text-xs backdrop-blur-md">
                                       {turn.input}
                                     </div>
                                   </div>
                                 )}
                                 {displayOutput && (
                                   <div className="flex justify-start">
                                     <div className="text-white text-sm font-light leading-relaxed drop-shadow-md">
                                       {displayOutput}
                                     </div>
                                   </div>
                                 )}
                               </div>
                             );
                           })}
                           {(realtimeInput || realtimeOutput) && (
                              <div className="animate-pulse space-y-2">
                                {realtimeInput && <div className="flex justify-end"><div className="bg-blue-600/20 border border-blue-500/20 rounded-2xl px-4 py-2 text-white text-xs backdrop-blur-md">{realtimeInput}</div></div>}
                                {realtimeOutput && <div className="flex justify-start"><div className="text-white text-sm font-light leading-relaxed">{realtimeOutput.replace(/\[CONTEXT_UPDATE:[\s\S]*?\]/g, '')}</div></div>}
                              </div>
                           )}
                           <div ref={chatEndRef} />
                      </div>
                  </div>

                   <div className="relative z-10 p-8 flex justify-center gap-4">
                       {status === 'connected' && (
                         <button
                           onClick={toggleScreenShare}
                           className={`px-6 py-5 border rounded-full text-[9px] font-black uppercase tracking-[0.4em] transition-all shadow-lg backdrop-blur-sm ${
                             isScreenSharing
                               ? 'bg-blue-600/20 border-blue-600/40 text-blue-400 hover:bg-blue-600 hover:text-white'
                               : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white'
                           }`}
                         >
                           {isScreenSharing ? 'Arrêter partage' : 'Partager écran'}
                         </button>
                       )}
                       <button
                        onClick={() => { disconnect(); setActiveTab('guided'); }}
                        className="px-10 py-5 bg-red-600/10 border border-red-600/20 text-red-500 rounded-full text-[9px] font-black uppercase tracking-[0.4em] hover:bg-red-600 hover:text-white transition-all shadow-lg backdrop-blur-sm"
                       >
                         Terminer
                       </button>
                  </div>
              </div>

              <div className="hidden lg:flex w-[400px] bg-[#0A0F1C] border-l border-white/5 flex-col shadow-2xl z-20">
                  <div className="p-6 border-b border-white/5 bg-[#0A0F1C]">
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">Journal d'Intervention</h3>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6 space-y-8">
                       {transcriptionHistory.map((turn, i) => {
                         const displayOutput = turn.output ? turn.output.replace(/\[CONTEXT_UPDATE:[\s\S]*?\]/g, '').trim() : '';
                         return (
                           <div key={i} className="animate-in slide-in-from-bottom-2 duration-500 space-y-2">
                             {turn.input && (
                               <div className="flex flex-col items-end">
                                 <div className="bg-blue-500/10 border border-blue-500/10 rounded-2xl rounded-tr-sm px-5 py-3 text-neutral-200 text-xs font-medium max-w-[90%]">
                                   {turn.input}
                                 </div>
                                 <span className="text-[8px] text-neutral-600 mt-1 uppercase tracking-wider mr-1">Vous</span>
                               </div>
                             )}
                             {displayOutput && (
                               <div className="flex flex-col items-start">
                                 <div className="bg-white/5 border border-white/5 rounded-2xl rounded-tl-sm px-5 py-3 text-neutral-300 text-xs leading-relaxed max-w-[90%]">
                                   {displayOutput}
                                 </div>
                                 <span className="text-[8px] text-neutral-600 mt-1 uppercase tracking-wider ml-1">Agent Vestee</span>
                               </div>
                             )}
                           </div>
                         );
                       })}
                       
                       {(realtimeInput || realtimeOutput) && (
                          <div className="animate-pulse space-y-2">
                             {realtimeInput && (
                               <div className="flex flex-col items-end">
                                 <div className="bg-blue-500/5 border border-blue-500/5 rounded-2xl rounded-tr-sm px-5 py-3 text-neutral-400 text-xs font-medium max-w-[90%] italic">
                                   {realtimeInput}
                                 </div>
                               </div>
                             )}
                             {realtimeOutput && (
                               <div className="flex flex-col items-start">
                                 <div className="bg-white/5 border border-white/5 rounded-2xl rounded-tl-sm px-5 py-3 text-neutral-400 text-xs leading-relaxed max-w-[90%]">
                                   {realtimeOutput.replace(/\[CONTEXT_UPDATE:[\s\S]*?\]/g, '')}
                                 </div>
                               </div>
                             )}
                          </div>
                       )}
                       <div ref={chatEndRefDesktop} /> 
                  </div>
              </div>
            </div>
          )}
        </main>
        
        <nav className="flex-none bg-black border-t border-white/5 p-4 flex justify-around items-center">
          <button onClick={() => { setActiveTab('guided'); }} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'guided' ? 'text-white' : 'text-neutral-600'}`}>
            <span className="text-[8px] font-bold uppercase tracking-[0.2em]">Diagnostic</span>
          </button>
          <button onClick={() => { setActiveTab('smart_booking'); }} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'smart_booking' ? 'text-white' : 'text-neutral-600'}`}>
            <span className="text-[8px] font-bold uppercase tracking-[0.2em]">Smart Booking</span>
          </button>
          <button onClick={() => { if (!user) setShowLoginView(true); else setActiveTab('live'); }} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'live' ? 'text-white' : 'text-neutral-600'}`}>
            <span className="text-[8px] font-bold uppercase tracking-[0.2em]">Live Support</span>
          </button>
          <button onClick={() => setActiveTab('appointment')} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'appointment' ? 'text-white' : 'text-neutral-600'}`}>
            <span className="text-[8px] font-bold uppercase tracking-[0.2em]">Rendez-vous</span>
          </button>
        </nav>
      </div>
    </div>
  );
};

export default App;
