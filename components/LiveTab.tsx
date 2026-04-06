import React, { useRef, useEffect, useState } from 'react';
import { ConnectionStatus, Turn } from '../types';
import { Visualizer } from './Visualizer';
import { TranscriptFeed } from './TranscriptFeed';

interface LiveTabProps {
  status: ConnectionStatus;
  isScreenSharing: boolean;
  isCameraActive: boolean;
  sessionTime: number;
  userVolume: number;
  agentVolume: number;
  transcriptionHistory: Turn[];
  realtimeInput: string;
  realtimeOutput: string;
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  onToggleScreenShare: () => void;
  onToggleCamera: () => void;
  onReconnect: () => void;
  onDisconnect: () => void;
  onNavigateToGuided: () => void;
  onSendText: (text: string) => void;
}

export const LiveTab: React.FC<LiveTabProps> = ({
  status,
  isScreenSharing,
  isCameraActive,
  sessionTime,
  userVolume,
  agentVolume,
  transcriptionHistory,
  realtimeInput,
  realtimeOutput,
  videoRef,
  canvasRef,
  onToggleScreenShare,
  onToggleCamera,
  onReconnect,
  onDisconnect,
  onNavigateToGuided,
  onSendText,
}) => {
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatEndRefDesktop = useRef<HTMLDivElement>(null);
  const [textInput, setTextInput] = useState('');

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    chatEndRefDesktop.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcriptionHistory, realtimeInput, realtimeOutput]);

  const handleSend = () => {
    const trimmed = textInput.trim();
    if (!trimmed) return;
    onSendText(trimmed);
    setTextInput('');
  };

  const TextInput = (
    <form
      onSubmit={(e) => { e.preventDefault(); handleSend(); }}
      className="flex items-center gap-2 p-3 bg-white/5 border border-white/10 rounded-2xl"
    >
      <input
        type="text"
        value={textInput}
        onChange={(e) => setTextInput(e.target.value)}
        placeholder="Écrire un message..."
        disabled={status !== 'connected'}
        className="flex-1 bg-transparent text-white text-base placeholder-neutral-500 outline-none disabled:opacity-30"
      />
      <button
        type="submit"
        disabled={status !== 'connected' || !textInput.trim()}
        className="w-7 h-7 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex-shrink-0"
      >
        <svg className="w-3 h-3 text-white rotate-90" fill="currentColor" viewBox="0 0 24 24">
          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
        </svg>
      </button>
    </form>
  );

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-full bg-black overflow-hidden relative">
      {/* Main video/audio area */}
      <div className="flex-1 relative flex flex-col h-full overflow-hidden">
        <div className="absolute inset-0 z-0 bg-neutral-900 flex items-center justify-center">
          {(!isScreenSharing && !isCameraActive) && (
            <div className="flex flex-col items-center gap-6 opacity-20 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="w-32 h-32 rounded-full border-4 border-white/20 animate-pulse flex items-center justify-center">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.5em] text-white">Audio Link Active</span>
            </div>
          )}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-contain ${(isScreenSharing || isCameraActive) ? 'block' : 'hidden'}`}
          />
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Status bar */}
        <div className="relative z-10 p-6 flex justify-between items-start">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                status === 'connected' ? 'bg-green-500 animate-pulse'
                : status === 'error' ? 'bg-red-600'
                : 'bg-yellow-500'
              }`} />
              <div className="flex flex-col">
                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white">
                  {status === 'connected' ? 'Live Session' : status === 'error' ? 'Erreur Connexion' : 'Connexion...'}
                </span>
                {status === 'connected' && (
                  <span className="text-[10px] text-green-400 font-mono mt-0.5 tracking-wider">
                    {Math.floor(sessionTime / 60).toString().padStart(2, '0')}:{(sessionTime % 60).toString().padStart(2, '0')}
                  </span>
                )}
              </div>
            </div>
            <p className="text-[8px] font-bold text-neutral-500 uppercase tracking-widest">Agent Vestee - Expert N2</p>
          </div>
          <div className="flex gap-4">
            <Visualizer level={userVolume} color="#3b82f6" label="Input" />
            <Visualizer level={agentVolume} color="#ffffff" label="Agent" />
          </div>
        </div>

        {/* Center: error state + mobile transcript */}
        <div className="relative z-10 flex-1 flex flex-col p-6 min-h-0">
          {status === 'error' && (
            <div className="text-center p-6 bg-black/50 backdrop-blur-md rounded-2xl border border-white/10 mx-auto max-w-sm my-auto">
              <p className="text-red-500 text-xs font-bold uppercase tracking-widest mb-4">Échec de connexion</p>
              <p className="text-neutral-400 text-xs mb-6">Vérifiez votre micro/caméra ou votre réseau.</p>
              <button
                onClick={onReconnect}
                className="px-6 py-3 bg-white text-black rounded-full text-[9px] uppercase font-bold tracking-widest hover:scale-105 transition-all"
              >
                Relancer la session
              </button>
            </div>
          )}

          {status !== 'error' && (
            <div className="lg:hidden flex-1 w-full overflow-y-auto space-y-4 mask-image-gradient pb-6">
              <TranscriptFeed
                history={transcriptionHistory}
                realtimeInput={realtimeInput}
                realtimeOutput={realtimeOutput}
                endRef={chatEndRef}
                variant="mobile"
              />
            </div>
          )}
        </div>

        {/* Mobile text input */}
        <div className="relative z-10 px-4 pb-2 lg:hidden">
          {TextInput}
        </div>

        {/* Controls */}
        <div className="relative z-10 p-8 flex justify-center gap-4">
          {status === 'connected' && (
            <>
              {/* Screen Share - Only on Desktop (lg) */}
              <button
                onClick={onToggleScreenShare}
                className={`hidden lg:block px-6 py-5 border rounded-full text-[9px] font-black uppercase tracking-[0.4em] transition-all shadow-lg backdrop-blur-sm ${
                  isScreenSharing
                    ? 'bg-blue-600/20 border-blue-600/40 text-blue-400 hover:bg-blue-600 hover:text-white'
                    : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white'
                }`}
              >
                {isScreenSharing ? 'Arrêter partage' : 'Partager écran'}
              </button>

              {/* Camera - Only on Mobile (< lg) */}
              <button
                onClick={onToggleCamera}
                className={`lg:hidden px-6 py-5 border rounded-full text-[9px] font-black uppercase tracking-[0.4em] transition-all shadow-lg backdrop-blur-sm ${
                  isCameraActive
                    ? 'bg-emerald-600/20 border-emerald-600/40 text-emerald-400 hover:bg-emerald-600 hover:text-white'
                    : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white'
                }`}
              >
                {isCameraActive ? 'Arrêter caméra' : 'Activer caméra'}
              </button>
            </>
          )}
          <button
            onClick={() => { onDisconnect(); onNavigateToGuided(); }}
            className="px-10 py-5 bg-red-600/10 border border-red-600/20 text-red-500 rounded-full text-[9px] font-black uppercase tracking-[0.4em] hover:bg-red-600 hover:text-white transition-all shadow-lg backdrop-blur-sm"
          >
            Terminer
          </button>
        </div>
      </div>

      {/* Desktop sidebar transcript */}
      <div className="hidden lg:flex w-[400px] bg-[#0A0F1C] border-l border-white/5 flex-col shadow-2xl z-20">
        <div className="p-6 border-b border-white/5 bg-[#0A0F1C]">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">Journal d'Intervention</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          <TranscriptFeed
            history={transcriptionHistory}
            realtimeInput={realtimeInput}
            realtimeOutput={realtimeOutput}
            endRef={chatEndRefDesktop}
            variant="desktop"
          />
        </div>
        <div className="p-4 border-t border-white/5">
          {TextInput}
        </div>
      </div>
    </div>
  );
};
