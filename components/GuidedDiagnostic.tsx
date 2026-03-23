
import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { 
  collection, 
  addDoc, 
  serverTimestamp 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

interface GuidedDiagnosticProps {
  techContext: any;
  setTechContext: (ctx: any) => void;
  onComplete: (summary: string) => void;
  onNavigateToBooking?: () => void;
  onRequestAccessPro?: () => void;
}

const steps = [
  {
    id: 1,
    title: "Quel est le problème principal ?",
    options: [
      { id: 'boot', label: "Mon Mac ne démarre pas", icon: "mac", severity: 'CRITIQUE' },
      { id: 'perf', label: "Il est très lent / chauffe", icon: "chip", severity: 'DÉGRADÉ' },
      { id: 'wifi', label: "Problème Wi-Fi / Internet", icon: "wifi", severity: 'LIMITÉ' },
      { id: 'auth', label: "Mot de passe / Compte bloqué", icon: "lock", severity: 'SÉCURITÉ' }
    ]
  },
  {
    id: 2,
    title: "Que voyez-vous à l'écran ?",
    parent: 'boot',
    options: [
      { id: 'black', label: "Écran noir complet", icon: "screen_off" },
      { id: 'folder', label: "Dossier avec ?", icon: "folder" },
      { id: 'stuck', label: "Barre de chargement bloquée", icon: "loader" },
      { id: 'login', label: "Bloqué à l'ouverture de session", icon: "user_x" }
    ]
  },
  {
    id: 3,
    title: "Quel est votre modèle ?",
    options: [
      { id: 'mb_air', label: "MacBook Air", icon: "laptop" },
      { id: 'mb_pro', label: "MacBook Pro", icon: "laptop" },
      { id: 'desktop', label: "iMac / Mac Mini / Studio", icon: "desktop" },
      { id: 'unknown_model', label: "Je ne sais pas", icon: "help" }
    ]
  },
  {
    id: 4,
    title: "Année approximative ?",
    options: [
      { id: 'silicon', label: "2020+ (Puce Apple M1/M2/M3)", icon: "chip_modern" },
      { id: 'intel', label: "2016 - 2019 (Intel)", icon: "chip_intel" },
      { id: 'old', label: "Avant 2015", icon: "calendar" },
      { id: 'unknown_year', label: "Je ne sais pas", icon: "help" }
    ]
  },
  {
    id: 5,
    title: "Analyse terminée",
    options: []
  }
];

export const GuidedDiagnostic: React.FC<GuidedDiagnosticProps> = ({ techContext, setTechContext, onComplete, onNavigateToBooking, onRequestAccessPro }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [selections, setSelections] = useState<Record<number, {id: string, label: string, severity?: string}>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSelect = (optionId: string, label: string, severity?: string) => {
    const newSelections = { ...selections, [currentStep]: {id: optionId, label, severity} };
    
    // Clear future steps if changing a previous step
    Object.keys(newSelections).forEach(key => {
        if (parseInt(key) > currentStep) delete newSelections[parseInt(key)];
    });

    setSelections(newSelections);

    let nextStep = currentStep + 1;
    let contextUpdate = {};

    if (currentStep === 1) {
      contextUpdate = { issue: label };
      if (optionId !== 'boot') {
        nextStep = 3; // Skip visual check if not a boot issue
      } else {
        nextStep = 2;
      }
    } else if (currentStep === 2) {
      contextUpdate = { issue: `${techContext.issue} (${label})` };
      nextStep = 3;
    } else if (currentStep === 3) {
      contextUpdate = { model: label !== "Je ne sais pas" ? label : "Modèle Inconnu" };
      nextStep = 4;
    } else if (currentStep === 4) {
      const yearInfo = label !== "Je ne sais pas" ? label : "";
      contextUpdate = { 
        model: yearInfo ? `${techContext.model || 'Mac'} - ${yearInfo}` : techContext.model 
      };
      nextStep = 5;
    }

    setTechContext({ ...techContext, ...contextUpdate });
    setCurrentStep(nextStep);
  };

  const handleBack = () => {
    if (currentStep > 1) {
       // Logic to find the previous valid step (handling skips)
       let prevStep = currentStep - 1;
       if (currentStep === 3 && selections[1]?.id !== 'boot') {
          prevStep = 1;
       }
       setCurrentStep(prevStep);
    }
  };

  const jumpToStep = (stepId: number) => {
      // Only allow jumping back
      if (stepId < currentStep) {
          setCurrentStep(stepId);
      }
  };

  const handleFinish = () => {
    const issue = selections[1]?.label || 'Problème inconnu';
    const detail = selections[2] ? ` (${selections[2].label})` : '';
    const model = selections[3]?.label && selections[3]?.label !== "Je ne sais pas" ? selections[3].label : 'Modèle inconnu';
    const year = selections[4]?.label && selections[4]?.label !== "Je ne sais pas" ? ` - ${selections[4].label}` : '';
    
    const summary = `Diagnostic guidé terminé. Problème: ${issue}${detail}. Matériel: ${model}${year}.`;
    onComplete(summary);
  };

  const handleSaveDraft = async () => {
    setIsSaving(true);
    setSaveStatus('idle');
    try {
        await addDoc(collection(db, 'macAssist/v1/appointments'), {
            type: 'diagnostic_draft',
            techContext,
            selections,
            userId: auth.currentUser?.uid || 'anonymous',
            createdAt: serverTimestamp(),
            status: 'draft'
        });
        setSaveStatus('success');
        setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (e) {
        console.error("Save failed", e);
        setSaveStatus('error');
    } finally {
        setIsSaving(false);
    }
  };

  const renderIcon = (type: string) => {
    const iconClass = "w-6 h-6 text-neutral-400 group-hover:text-white transition-colors";
    switch(type) {
      case 'mac': return <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeWidth="1.5"/></svg>;
      case 'laptop': return <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" strokeWidth="1.5"/></svg>;
      case 'desktop': return <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeWidth="1.5"/></svg>;
      case 'chip': 
      case 'chip_modern':
        return <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" strokeWidth="1.5"/></svg>;
      case 'chip_intel':
        return <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" strokeWidth="1.5"/></svg>;
      case 'wifi': return <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.345 6.998c5.857-5.858 15.353-5.858 21.21 0" strokeWidth="1.5" strokeLinecap="round"/></svg>;
      case 'lock': return <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 -2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeWidth="1.5"/></svg>;
      case 'calendar': return <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" strokeWidth="1.5"/></svg>;
      case 'help': return <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="1.5"/></svg>;
      case 'screen_off': return <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeWidth="1.5"/><path d="M8 9l8 6M16 9l-8 6" strokeWidth="1.5"/></svg>;
      case 'folder': return <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" strokeWidth="1.5"/></svg>;
      case 'loader': return <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" strokeWidth="1.5"/><path d="M12 6v6l4 2" strokeWidth="1.5"/></svg>;
      case 'user_x': return <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" strokeWidth="1.5"/><circle cx="8.5" cy="7" r="4" strokeWidth="1.5"/><path d="M17 11l2 2m0 0l2-2m-2 2l-2 2m2-2l2 2" strokeWidth="1.5"/></svg>;
      default: return <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M14 5l7 7m0 0l-7 7m7-7H3" strokeWidth="2.5"/></svg>;
    }
  };

  const stepData = steps.find(s => s.id === currentStep);
  const currentStatus = selections[1]?.severity || '-';

  return (
    <div className="flex w-full h-full bg-[#050505] overflow-hidden font-sans">
      
      {/* LEFT PANE - MAIN INTERACTION (75%) */}
      <div className="flex-1 flex flex-col relative border-r border-white/5">
        
        {/* HEADER */}
        <header className="flex-none h-24 px-10 flex items-center justify-between border-b border-white/5 bg-[#050505]">
          <div className="flex items-center gap-4">
            {/* Back Button */}
            {currentStep > 1 && (
                <button 
                    onClick={handleBack}
                    className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
                >
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                </button>
            )}

            <div className={`w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/10 ${currentStep === 1 ? 'ml-0' : 'ml-0'}`}>
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">{auth.currentUser?.isAnonymous ? 'Mode Invité' : auth.currentUser?.displayName || 'Client'}</h2>
              <button 
                onClick={onNavigateToBooking}
                className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 hover:text-white transition-colors flex items-center gap-1"
              >
                <span className="w-1.5 h-0.5 bg-neutral-600"></span> Prendre Rendez-vous
              </button>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-12">
            {[
              { label: "Modèle", val: techContext.model?.split(' - ')[0] || '-' },
              { label: "Série", val: "-" },
              { label: "Statut", val: currentStatus, highlight: currentStatus !== '-' }
            ].map((item, idx) => (
              <div key={idx} className="flex flex-col">
                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-neutral-600 mb-1">{item.label}</span>
                <span className={`text-[10px] font-bold uppercase tracking-wider truncate max-w-[100px] ${item.highlight ? 'text-red-500' : 'text-neutral-300'}`}>
                    {item.val}
                </span>
              </div>
            ))}
          </div>

          <button 
            onClick={onRequestAccessPro}
            className="px-6 py-3 bg-white text-black rounded-full text-[9px] font-black uppercase tracking-[0.2em] hover:scale-105 transition-transform"
          >
            Accès Pro
          </button>
        </header>

        {/* CONTENT AREA */}
        <div className="flex-1 flex flex-col justify-center px-8 lg:px-24 xl:px-32 relative">
          
          {currentStep < 5 ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-neutral-500 mb-6 block">Diagnostic Système</span>
              <h1 className="text-3xl md:text-5xl font-medium text-white mb-16 tracking-tight leading-tight">
                {stepData?.title}
              </h1>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {stepData?.options.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => handleSelect(opt.id, opt.label, opt.severity)}
                    className="group h-24 bg-[#111] border border-white/5 rounded-2xl flex items-center px-8 gap-6 hover:bg-[#161616] hover:border-white/10 transition-all duration-300 active:scale-[0.98]"
                  >
                    <div className="w-12 h-12 rounded-xl bg-black border border-white/5 flex items-center justify-center group-hover:border-white/20 transition-colors">
                      {renderIcon(opt.icon || 'arrow')}
                    </div>
                    <span className="text-sm font-bold text-neutral-300 group-hover:text-white uppercase tracking-wider text-left">
                      {opt.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
             <div className="flex flex-col items-center justify-center text-center animate-in zoom-in duration-500">
                <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-8 border border-white/10 shadow-[0_0_60px_rgba(255,255,255,0.05)]">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                <h2 className="text-3xl font-medium text-white mb-4">Analyse Prête</h2>
                <p className="text-neutral-500 text-sm max-w-md mb-12 leading-relaxed">
                  L'Agent Vestee a compilé le contexte technique. <br/>
                  Cliquez ci-dessous pour démarrer l'assistance vocale.
                </p>
                <div className="flex flex-col gap-4 w-full max-w-xs">
                    <button 
                    onClick={handleFinish}
                    className="w-full py-5 bg-white text-black rounded-full font-bold uppercase tracking-[0.3em] text-[10px] hover:scale-105 active:scale-95 transition-all shadow-[0_0_40px_rgba(255,255,255,0.15)]"
                    >
                    Lancer Session Live
                    </button>
                    <button 
                        onClick={() => setCurrentStep(1)}
                        className="w-full py-4 bg-transparent border border-white/10 text-neutral-500 hover:text-white rounded-full font-bold uppercase tracking-[0.3em] text-[9px] transition-all"
                    >
                        Recommencer
                    </button>
                </div>
             </div>
          )}

          {/* PROGRESS FOOTER (Inside Left Pane) */}
          <div className="absolute bottom-12 left-8 right-8 lg:left-24 lg:right-24">
             <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-[0.2em] text-neutral-600 mb-3">
                <span>Séquence {currentStep} / 5</span>
                <span>{Math.min(100, Math.round((currentStep / 5) * 100))}%</span>
             </div>
             <div className="w-full h-px bg-white/10 relative">
                <div 
                  className="absolute left-0 top-0 h-full bg-white transition-all duration-700 ease-out shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                  style={{ width: `${(currentStep / 5) * 100}%` }}
                />
             </div>
          </div>
        </div>
      </div>

      {/* RIGHT PANE - JOURNAL (25%) */}
      <div className="hidden xl:flex w-[350px] flex-col bg-[#080808]">
        <header className="flex-none h-24 border-b border-white/5 px-8 flex items-center justify-between">
           <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Journal</span>
           <div className="flex gap-4">
              <span className="text-[9px] font-bold uppercase tracking-widest text-white cursor-pointer">Live</span>
              <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-600 cursor-pointer hover:text-neutral-400">Cloud</span>
           </div>
        </header>

        <div className="flex-1 p-8 overflow-y-auto space-y-8">
           {Object.keys(selections).length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center opacity-20">
                 <svg className="w-12 h-12 text-neutral-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                 <span className="text-[9px] uppercase tracking-widest text-neutral-500">En attente d'entrées</span>
              </div>
           ) : (
             <div className="space-y-6">
               {Object.entries(selections).map(([step, sel]) => (
                 <div 
                    key={step} 
                    className="flex gap-4 animate-in slide-in-from-right-4 duration-500 cursor-pointer group"
                    onClick={() => jumpToStep(parseInt(step))}
                 >
                    <div className="flex flex-col items-center">
                       <div className={`w-2 h-2 rounded-full mb-1 transition-colors ${parseInt(step) === currentStep ? 'bg-white shadow-[0_0_10px_white]' : 'bg-blue-500'}`}></div>
                       <div className="w-px h-full bg-white/5 group-hover:bg-white/10"></div>
                    </div>
                    <div className="pb-4 group-hover:translate-x-1 transition-transform">
                       <span className="text-[8px] font-bold uppercase tracking-widest text-neutral-500 block mb-1">Étape 0{step}</span>
                       <p className="text-xs text-neutral-300 font-medium leading-relaxed group-hover:text-white">{sel.label}</p>
                    </div>
                 </div>
               ))}
               
               {currentStep === 5 && (
                  <div className="flex gap-4 animate-in slide-in-from-right-4 duration-500">
                    <div className="flex flex-col items-center">
                       <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_#22c55e] mb-1"></div>
                    </div>
                    <div>
                       <span className="text-[8px] font-bold uppercase tracking-widest text-green-500 block mb-1">Succès</span>
                       <p className="text-xs text-white font-medium leading-relaxed">Contexte Validé.</p>
                    </div>
                 </div>
               )}
             </div>
           )}
        </div>

        <footer className="flex-none p-8 border-t border-white/5">
           <div className="flex justify-between items-center mb-4">
              <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-600">ID Session</span>
              <span className="text-[9px] font-mono text-neutral-500">#VS-{auth.currentUser?.uid.slice(0,4) || 'GUEST'}</span>
           </div>
           <button 
             onClick={handleSaveDraft}
             disabled={isSaving}
             className={`w-full py-4 border rounded-xl text-[9px] font-bold uppercase tracking-[0.3em] transition-all
                ${saveStatus === 'success' ? 'bg-green-500/20 border-green-500 text-green-500' : 
                  saveStatus === 'error' ? 'bg-red-500/20 border-red-500 text-red-500' :
                  'border-white/5 text-neutral-500 hover:text-white hover:border-white/20 hover:bg-white/5'
                }`}
           >
              {isSaving ? 'Sauvegarde...' : saveStatus === 'success' ? 'Sauvegardé' : saveStatus === 'error' ? 'Erreur' : 'Sauvegarder'}
           </button>
        </footer>
      </div>

    </div>
  );
};
