import React, { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { createBlob, decode, decodeAudioData, blobToBase64 } from '../utils/audio';
import { MODEL_NAME, SYSTEM_INSTRUCTIONS, OPENING_SCRIPTS } from '../constants';
import { Language, TechnicalContext, ConnectionStatus } from '../types';

interface UseGeminiLiveOptions {
  language: Language;
  techContext: TechnicalContext;
  setTechContext: React.Dispatch<React.SetStateAction<TechnicalContext>>;
  saveTurnToDb: (input: string, output: string) => Promise<void>;
  activeTab: string;
}

export function useGeminiLive({
  language,
  techContext,
  setTechContext,
  saveTurnToDb,
  activeTab,
}: UseGeminiLiveOptions) {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  const [userVolume, setUserVolume] = useState(0);
  const [agentVolume, setAgentVolume] = useState(0);
  const [realtimeInput, setRealtimeInput] = useState('');
  const [realtimeOutput, setRealtimeOutput] = useState('');
  const [reconnectTrigger, setReconnectTrigger] = useState(0);

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
  const timeIntervalRef = useRef<number | null>(null);
  const reconnectIntervalRef = useRef<number | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const isReconnectRef = useRef<boolean>(false);
  const pendingScreenStreamRef = useRef<MediaStream | null>(null);
  const currentInputTranscription = useRef<string>('');
  const currentOutputTranscription = useRef<string>('');
  const animatingRef = useRef<boolean>(false);
  const lastSentContextRef = useRef<string>('');

  const disconnect = useCallback(() => {
    if (reconnectIntervalRef.current) {
      clearInterval(reconnectIntervalRef.current);
      reconnectIntervalRef.current = null;
    }
    if (timeIntervalRef.current) {
      clearInterval(timeIntervalRef.current);
      timeIntervalRef.current = null;
    }
    setSessionTime(0);

    animatingRef.current = false;

    if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
    screenStreamRef.current?.getTracks().forEach(t => t.stop());
    screenStreamRef.current = null;
    cameraStreamRef.current?.getTracks().forEach(t => t.stop());
    cameraStreamRef.current = null;
    setIsScreenSharing(false);
    setIsCameraActive(false);
    mediaStreamRef.current = null;
    sessionPromiseRef.current?.then(s => s.close());
    sessionPromiseRef.current = null;

    setStatus('disconnected');
    setRealtimeInput('');
    setRealtimeOutput('');

    sourcesRef.current.forEach(s => s.stop());
    sourcesRef.current.clear();

    if (videoRef.current) videoRef.current.srcObject = null;
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
      inputAudioContextRef.current.close();
      inputAudioContextRef.current = null;
    }
  }, []);

  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      screenStreamRef.current?.getTracks().forEach(t => t.stop());
      screenStreamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
      setIsScreenSharing(false);
    } else {
      try {
        if (isCameraActive) {
          cameraStreamRef.current?.getTracks().forEach(t => t.stop());
          cameraStreamRef.current = null;
          setIsCameraActive(false);
        }
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
        screenStream.getAudioTracks().forEach(t => t.stop());
        screenStreamRef.current = screenStream;
        if (videoRef.current) {
          videoRef.current.srcObject = screenStream;
          videoRef.current.play().catch(() => {});
        }
        screenStream.getVideoTracks()[0].onended = () => {
          screenStreamRef.current = null;
          if (videoRef.current) videoRef.current.srcObject = null;
          setIsScreenSharing(false);
        };
        setIsScreenSharing(true);
        sessionPromiseRef.current?.then(s => s.sendClientContent({
          turns: [{ role: 'user', parts: [{ text: "[SCREEN_SHARE_START] Le partage d'écran est actif." }] }],
          turnComplete: false
        }));
      } catch (e) {
        console.warn("Partage d'écran annulé ou refusé", e);
      }
    }
  }, [isScreenSharing, isCameraActive]);

  const toggleCamera = useCallback(async () => {
    if (isCameraActive) {
      cameraStreamRef.current?.getTracks().forEach(t => t.stop());
      cameraStreamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
      setIsCameraActive(false);
    } else {
      try {
        if (isScreenSharing) {
          screenStreamRef.current?.getTracks().forEach(t => t.stop());
          screenStreamRef.current = null;
          setIsScreenSharing(false);
        }
        // Prefer environment camera (back camera) on mobile devices
        const cameraStream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' }, 
          audio: false 
        });
        cameraStreamRef.current = cameraStream;
        if (videoRef.current) {
          videoRef.current.srcObject = cameraStream;
          videoRef.current.play().catch(() => {});
        }
        setIsCameraActive(true);
        sessionPromiseRef.current?.then(s => s.sendClientContent({
          turns: [{ role: 'user', parts: [{ text: "[CAMERA_START] La caméra est active." }] }],
          turnComplete: false
        }));
      } catch (e) {
        console.warn("Accès caméra refusé", e);
      }
    }
  }, [isCameraActive, isScreenSharing]);

  // Expose to allow pre-init within a user gesture (autoplay policy)
  const preInitAudio = useCallback(() => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!audioContextRef.current) audioContextRef.current = new AudioContextClass({ sampleRate: 24000 });
      if (!inputAudioContextRef.current) inputAudioContextRef.current = new AudioContextClass({ sampleRate: 16000 });
      audioContextRef.current.resume();
      inputAudioContextRef.current.resume();
    } catch (e) {
      console.warn("Audio Context Init Failed:", e);
    }
  }, []);

  const connect = useCallback(async () => {
    if (status !== 'disconnected') return;
    setStatus('connecting');

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      // Audio only — frames are sent only during active screen share
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (e) {
        console.error("Audio access denied", e);
        setStatus('error');
        return;
      }

      mediaStreamRef.current = stream;

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!audioContextRef.current) audioContextRef.current = new AudioContextClass({ sampleRate: 24000 });
      if (!inputAudioContextRef.current) inputAudioContextRef.current = new AudioContextClass({ sampleRate: 16000 });

      try {
        if (audioContextRef.current.state === 'suspended') await audioContextRef.current.resume();
        if (inputAudioContextRef.current.state === 'suspended') await inputAudioContextRef.current.resume();
      } catch (e) {
        console.warn("Audio resume blocked (should be handled by pre-init).");
      }

      agentAnalyserRef.current = audioContextRef.current.createAnalyser();
      userAnalyserRef.current = inputAudioContextRef.current.createAnalyser();
      agentAnalyserRef.current.fftSize = 256;
      userAnalyserRef.current.fftSize = 256;

      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      const deviceContext = `\n[DEVICE_CONTEXT]\nhost_device détecté : ${isMobile ? 'MOBILE' : 'DESKTOP'}.\nUtilise cette information comme contexte de départ, sans la redemander sauf contradiction.\n${isMobile ? "Si MOBILE : la caméra mobile peut être proposée pour montrer un Mac ou un accessoire." : "Si DESKTOP : le partage d’écran peut être proposé pour montrer un problème logiciel."}`;

      const contextPrompt = Object.keys(techContext).length > 0
        ? `\n\n[SYSTEM_DATA_INJECTION]\nCONTEXTE TECHNIQUE PRÉ-ÉTABLI.\nUtiliser pour le diagnostic.\nNe jamais lire le JSON à haute voix.\nNe jamais redemander ce qui est déjà confirmé sauf contradiction ou manque de précision.\n${JSON.stringify(techContext)}`
        : "";
      const reconnectPrompt = isReconnectRef.current
        ? `\n\n[RECONNEXION SESSION] Tu reprends une session en cours à cause d'une coupure réseau. NE PAS répéter le message d'ouverture. NE PAS dire bonjour. Reste totalement silencieux et attends simplement la prochaine intervention de l'utilisateur ou continue ta réponse précédente.`
        : `\n\nScript d’ouverture :\n"${OPENING_SCRIPTS[language] || OPENING_SCRIPTS['fr']}"`;
      isReconnectRef.current = false;

      const sessionPromise = sessionPromiseRef.current = ai.live.connect({
        model: MODEL_NAME,
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: SYSTEM_INSTRUCTIONS[language] + deviceContext + contextPrompt + reconnectPrompt,
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            setStatus('connected');
            // Snapshot the context already injected in system prompt — don't resend it
            lastSentContextRef.current = JSON.stringify(techContext);

            if (pendingScreenStreamRef.current?.active) {
              screenStreamRef.current = pendingScreenStreamRef.current;
              if (videoRef.current) videoRef.current.srcObject = pendingScreenStreamRef.current;
              setIsScreenSharing(true);
              pendingScreenStreamRef.current = null;
            }

            // Auto-refresh every 270s to prevent Gemini Live timeout (Gemini limit is ~5-10 mins continuous)
            if (reconnectIntervalRef.current) clearInterval(reconnectIntervalRef.current);
            reconnectIntervalRef.current = window.setInterval(() => {
              isReconnectRef.current = true;
              if (screenStreamRef.current?.active) {
                pendingScreenStreamRef.current = screenStreamRef.current;
                screenStreamRef.current = null;
                if (videoRef.current) videoRef.current.srcObject = null;
              }
              disconnect();
              setTimeout(() => setReconnectTrigger(prev => prev + 1), 500);
            }, 270000);

            if (timeIntervalRef.current) clearInterval(timeIntervalRef.current);
            if (!isReconnectRef.current) setSessionTime(0);
            timeIntervalRef.current = window.setInterval(() => {
              setSessionTime(prev => {
                if (prev >= 600) { // 10 minutes limit
                  disconnect();
                  return prev;
                }
                return prev + 1;
              });
            }, 1000);

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
            const muteNode = inputAudioContextRef.current!.createGain();
            muteNode.gain.value = 0;
            scriptProcessor.connect(muteNode);
            muteNode.connect(inputAudioContextRef.current!.destination);

            // Capture frequency: 1 frame/second (increased latency performance)
            // Note: Token usage is mitigated by 8x downscaling and 0.5 JPEG quality.
            const ctx = canvasRef.current?.getContext('2d');
            if (ctx && videoRef.current) {
              frameIntervalRef.current = window.setInterval(() => {
                if (!sessionPromiseRef.current) return;
                if (!screenStreamRef.current?.active && !cameraStreamRef.current?.active) return;
                if (videoRef.current && canvasRef.current && videoRef.current.readyState >= 2 && videoRef.current.videoWidth > 0) {
                  canvasRef.current.width = Math.round(videoRef.current.videoWidth / 8);
                  canvasRef.current.height = Math.round(videoRef.current.videoHeight / 8);
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
              if (nextStartTimeRef.current < currentTime) nextStartTimeRef.current = currentTime;

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

              if (input || output) saveTurnToDb(input, output);

              currentInputTranscription.current = '';
              currentOutputTranscription.current = '';
              setRealtimeInput('');
              setRealtimeOutput('');

              const contextMatch = output.match(/\[CONTEXT_UPDATE: (\{.*?\})\]/);
              if (contextMatch) {
                try { setTechContext(prev => ({ ...prev, ...JSON.parse(contextMatch[1]) })); } catch (e) { /* ignore */ }
              }
            }
          },
          onclose: () => {
            // Null the ref immediately to stop onaudioprocess from spamming on a dead WebSocket
            sessionPromiseRef.current = null;
            setStatus('error');
          },
          onerror: (e: unknown) => {
            console.error("Session Error", e);
            setStatus('error');
          }
        }
      });
      sessionPromiseRef.current = sessionPromise;

      animatingRef.current = true;
      const animate = () => {
        if (!animatingRef.current) return;
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
  }, [status, language, saveTurnToDb, techContext, setTechContext, disconnect]);

  // Trigger reconnect after auto-refresh disconnect
  useEffect(() => {
    if (reconnectTrigger > 0) connect();
  }, [reconnectTrigger, connect]);

  // Connect/disconnect on tab change
  useEffect(() => {
    if (activeTab === 'live' && status === 'disconnected' && reconnectTrigger === 0) connect();
    if (activeTab !== 'live' && status === 'connected') disconnect();
  }, [activeTab, status, connect, disconnect, reconnectTrigger]);

  // Push techContext updates to Gemini in real-time during active session
  useEffect(() => {
    if (status !== 'connected' || !sessionPromiseRef.current) return;
    const serialized = JSON.stringify(techContext);
    if (serialized === lastSentContextRef.current || serialized === '{}') return;
    lastSentContextRef.current = serialized;
    sessionPromiseRef.current.then(s => s.sendClientContent({
      turns: [{ role: 'user', parts: [{ text: `[LIVE_CONTEXT_UPDATE] Nouvelles informations sur l'appareil de l'utilisateur (mettre à jour ta compréhension silencieusement, ne pas lire ces données à haute voix) : ${serialized}` }] }],
      turnComplete: false
    }));
  }, [techContext, status]);

  // Trigger reconnect from error state (used by UI retry button)
  const reconnect = useCallback(() => setStatus('disconnected'), []);

  const sendText = useCallback((text: string) => {
    if (!sessionPromiseRef.current || status !== 'connected') return;
    // Inject into transcription refs so turnComplete picks it up and displays it
    currentInputTranscription.current = text;
    setRealtimeInput(text);
    sessionPromiseRef.current.then(s => s.sendClientContent({
      turns: [{ role: 'user', parts: [{ text }] }],
      turnComplete: true
    }));
  }, [status]);

  return {
    status,
    isScreenSharing,
    isCameraActive,
    sessionTime,
    userVolume,
    agentVolume,
    realtimeInput,
    realtimeOutput,
    videoRef,
    canvasRef,
    connect,
    disconnect,
    reconnect,
    toggleScreenShare,
    toggleCamera,
    preInitAudio,
    sendText,
  };
}
