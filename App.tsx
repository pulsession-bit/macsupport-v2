import React, { useState } from 'react';
import { signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { auth } from './firebase';
import { Login } from './components/Login';
import { GuidedDiagnostic } from './components/GuidedDiagnostic';
import { AppointmentScheduler } from './components/AppointmentScheduler';
import { SmartBooking } from './components/SmartBooking';
import { LiveTab } from './components/LiveTab';
import { useSession } from './hooks/useSession';
import { useGeminiLive } from './hooks/useGeminiLive';

type AppTab = 'guided' | 'live' | 'appointment' | 'smart_booking';

// --- STARTUP / HOME COMPONENT ---

const StartupQuote: React.FC<{ onStart: () => void; onNavigateToRDV: () => void }> = ({ onStart, onNavigateToRDV }) => {
  return (
    <div className="fixed inset-0 z-[100] bg-black text-white flex flex-col items-center justify-center p-4 sm:p-8 overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-600/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-teal-600/10 rounded-full blur-[120px] animate-pulse" />

      <div className="max-w-4xl w-full flex flex-col items-center text-center space-y-8 sm:space-y-12 animate-in fade-in zoom-in duration-1000">
        <div className="w-16 h-16 sm:w-24 sm:h-24 bg-white/5 rounded-3xl flex items-center justify-center backdrop-blur-md border border-white/10 shadow-2xl">
          <svg className="w-8 h-8 sm:w-12 sm:h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <div className="space-y-6">
          <h1 className="text-4xl sm:text-6xl md:text-9xl font-medium tracking-tight sm:tracking-tighter text-white leading-tight">Vestee Support.</h1>
          <p className="text-base sm:text-xl md:text-2xl font-light text-neutral-500 max-w-2xl mx-auto leading-relaxed">
            L'expertise technique réinventée par l'intelligence artificielle.
          </p>
        </div>

        <div className="flex flex-col items-center gap-4 sm:gap-6 pt-4 sm:pt-12">
          <button
            onClick={onStart}
            className="px-8 sm:px-14 md:px-20 py-4 sm:py-6 md:py-7 bg-white text-black rounded-full text-[10px] sm:text-[12px] font-black uppercase tracking-[0.2em] sm:tracking-[0.4em] hover:scale-105 transition-all active:scale-95 duration-500 shadow-[0_0_50px_rgba(255,255,255,0.2)]"
          >
            Commencer le diagnostic
          </button>
          <button
            onClick={onNavigateToRDV}
            className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] sm:tracking-[0.5em] text-neutral-600 hover:text-white transition-colors py-3 sm:py-4 border-b border-white/0 hover:border-white/20"
          >
            Prendre un rendez-vous expert
          </button>
        </div>
      </div>

      <div className="absolute bottom-6 sm:bottom-12 left-0 right-0 text-center flex flex-col gap-3 sm:gap-4 px-4">
        <button
          onClick={onStart}
          className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.15em] sm:tracking-[0.3em] text-blue-500 hover:text-blue-400 transition-colors animate-pulse"
        >
          → Voir la Nouvelle Interface Diagnostic ←
        </button>
        <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.2em] sm:tracking-[0.5em] text-neutral-800">Vestee Support Pro v3.0</p>
      </div>
    </div>
  );
};

// --- MAIN APP COMPONENT ---

const App: React.FC = () => {
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
      return new URLSearchParams(window.location.search).has('tab');
    }
    return false;
  };

  const [activeTab, setActiveTab] = useState<AppTab>(getInitialTab);
  const [showStartupHome, setShowStartupHome] = useState(!shouldSkipHome());
  const [showLoginView, setShowLoginView] = useState(false);

  const {
    user, setUser, loading,
    techContext, setTechContext,
    transcriptionHistory, saveTurnToDb, closeSession,
  } = useSession();

  const {
    status, isScreenSharing, isCameraActive, sessionTime,
    userVolume, agentVolume,
    realtimeInput, realtimeOutput,
    videoRef, canvasRef,
    disconnect, reconnect, toggleScreenShare, toggleCamera, preInitAudio, sendText,
  } = useGeminiLive({
    language: 'fr',
    techContext,
    setTechContext,
    saveTurnToDb,
    activeTab,
  });

  const handleDiagnosticComplete = () => {
    preInitAudio();
    setActiveTab('live');
  };

  if (loading) return <div className="min-h-screen bg-black" />;

  if (showStartupHome) {
    return (
      <StartupQuote
        onStart={() => { setShowStartupHome(false); setActiveTab('guided'); }}
        onNavigateToRDV={() => { setShowStartupHome(false); setActiveTab('smart_booking'); }}
      />
    );
  }

  if ((!user && activeTab !== 'appointment' && activeTab !== 'smart_booking' && activeTab !== 'guided') || showLoginView) {
    return (
      <Login
        onLoginSuccess={(u: any) => { setUser(u); setShowLoginView(false); setShowStartupHome(false); }}
        onCancel={() => { setShowLoginView(false); setShowStartupHome(true); }}
        showCancel={true}
      />
    );
  }

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-white/20">
      <div className="h-[100dvh] w-full flex flex-col overflow-hidden">
        <header className="flex-none px-4 sm:px-6 border-b border-white/5 flex justify-between items-center py-4 sm:py-6">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center border border-white/10">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A10.003 10.003 0 0012 3a10.003 10.003 0 00-6.912 2.744L5.05 6.05M12 7V3m0 0a10 10 0 100 20 10 10 0 000-20z" />
              </svg>
            </div>
            <h2 className="text-xs sm:text-sm font-black uppercase tracking-[0.15em] sm:tracking-[0.3em]">VESTEE ASSISTANCE PRO</h2>
          </div>
          <div className="flex items-center gap-3 sm:gap-6">
            <button onClick={() => setShowStartupHome(true)} className="text-xs font-bold uppercase tracking-[0.12em] sm:tracking-widest text-neutral-500 hover:text-white transition-colors">Accueil</button>
            {user ? (
              <button
                onClick={() => {
                  closeSession();
                  signOut(auth).catch(() => {});
                  setUser(null);
                  setShowStartupHome(true);
                }}
                className="text-xs font-bold uppercase tracking-[0.12em] sm:tracking-widest text-neutral-500 hover:text-white transition-colors"
              >
                Déconnexion
              </button>
            ) : (
              <button onClick={() => setShowLoginView(true)} className="text-xs font-bold uppercase tracking-[0.12em] sm:tracking-widest text-white transition-colors">Connexion</button>
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
                  if (initialContext) setTechContext(prev => ({ ...prev, ...initialContext }));
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
            <LiveTab
              status={status}
              isScreenSharing={isScreenSharing}
              isCameraActive={isCameraActive}
              sessionTime={sessionTime}
              userVolume={userVolume}
              agentVolume={agentVolume}
              transcriptionHistory={transcriptionHistory}
              realtimeInput={realtimeInput}
              realtimeOutput={realtimeOutput}
              videoRef={videoRef}
              canvasRef={canvasRef}
              onToggleScreenShare={toggleScreenShare}
              onToggleCamera={toggleCamera}
              onReconnect={reconnect}
              onDisconnect={disconnect}
              onNavigateToGuided={() => setActiveTab('guided')}
              onSendText={sendText}
            />
          )}
        </main>

        <nav className="flex-none bg-black border-t border-white/5 p-2 sm:p-4 grid grid-cols-4 gap-1 items-center">
          <button onClick={() => setActiveTab('guided')} className={`min-h-[44px] px-1 flex flex-col items-center justify-center gap-1 transition-colors ${activeTab === 'guided' ? 'text-white' : 'text-neutral-600'}`}>
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.08em] sm:tracking-[0.2em]">Diagnostic</span>
          </button>
          <button onClick={() => setActiveTab('smart_booking')} className={`min-h-[44px] px-1 flex flex-col items-center justify-center gap-1 transition-colors ${activeTab === 'smart_booking' ? 'text-white' : 'text-neutral-600'}`}>
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.08em] sm:tracking-[0.2em]">Smart Booking</span>
          </button>
          <button onClick={() => { if (!user) setShowLoginView(true); else setActiveTab('live'); }} className={`min-h-[44px] px-1 flex flex-col items-center justify-center gap-1 transition-colors ${activeTab === 'live' ? 'text-white' : 'text-neutral-600'}`}>
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.08em] sm:tracking-[0.2em]">Live Support</span>
          </button>
          <button onClick={() => setActiveTab('appointment')} className={`min-h-[44px] px-1 flex flex-col items-center justify-center gap-1 transition-colors ${activeTab === 'appointment' ? 'text-white' : 'text-neutral-600'}`}>
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.08em] sm:tracking-[0.2em]">Rendez-vous</span>
          </button>
        </nav>
      </div>
    </div>
  );
};

export default App;
