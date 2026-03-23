
import React, { useState } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

interface SmartBookingProps {
  onNavigateToDiagnostic?: (initialContext?: { issue: string }) => void;
}

export const SmartBooking: React.FC<SmartBookingProps> = ({ onNavigateToDiagnostic }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [selections, setSelections] = useState<{
    symptom?: { id: string, label: string, context: string },
    device?: string,
    slot?: string,
    contact?: { name: string, phone: string, email: string }
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // --- DATA ---
  const symptoms = [
    { id: 'startup', label: "Démarrage", issueContext: "Problème de démarrage (Boot)", icon: "power" },
    { id: 'slow', label: "Lenteurs / Chauffe", issueContext: "Lenteurs système et surchauffe", icon: "thermometer" },
    { id: 'screen', label: "Écran / Affichage", issueContext: "Problème d'écran ou graphique", icon: "screen" },
    { id: 'battery', label: "Batterie / Charge", issueContext: "Problème d'autonomie ou charge", icon: "battery" },
    { id: 'keyboard', label: "Clavier / Trackpad", issueContext: "Périphériques d'entrée", icon: "keyboard" },
    { id: 'other', label: "Autre souci", issueContext: "Problème technique non spécifié", icon: "help" },
  ];

  const slots = ["09:00", "11:00", "14:00", "16:30"];

  // --- HANDLERS ---

  const handleSymptomSelect = (symptom: typeof symptoms[0]) => {
    setSelections(prev => ({ ...prev, symptom: { id: symptom.id, label: symptom.label, context: symptom.issueContext } }));
    setCurrentStep(2);
  };

  const handleDeviceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const input = form.elements.namedItem('device') as HTMLInputElement;
    if (input.value) {
        setSelections(prev => ({ ...prev, device: input.value }));
        setCurrentStep(3);
    }
  };

  const handleSlotSelect = (slot: string) => {
    setSelections(prev => ({ ...prev, slot }));
    setCurrentStep(4);
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const name = (form.elements.namedItem('name') as HTMLInputElement).value;
    const phone = (form.elements.namedItem('phone') as HTMLInputElement).value;
    const email = (form.elements.namedItem('email') as HTMLInputElement).value;

    const contactData = { name, phone, email };
    setSelections(prev => ({ ...prev, contact: contactData }));
    
    setIsSubmitting(true);
    try {
        await addDoc(collection(db, 'macAssist/v1/appointments'), {
            type: 'smart_booking',
            symptom: selections.symptom?.id,
            device: selections.device,
            slot: selections.slot,
            contact: contactData,
            userId: auth.currentUser?.uid || 'anonymous',
            createdAt: serverTimestamp(),
            status: 'confirmed'
        });
        setSuccess(true);
        setCurrentStep(5);
    } catch (err) {
        console.error(err);
    } finally {
        setIsSubmitting(false);
    }
  };

  const jumpToStep = (step: number) => {
      if (step < currentStep && !success) {
          setCurrentStep(step);
      }
  };

  const renderIcon = (type: string) => {
      const iconClass = "w-6 h-6 text-neutral-400 group-hover:text-white transition-colors";
      switch(type) {
        case 'power': return <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>;
        case 'thermometer': return <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>;
        case 'screen': return <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>;
        case 'battery': return <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>;
        case 'keyboard': return <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>;
        case 'help': return <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>;
        default: return <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M5 13l4 4L19 7"/></svg>;
      }
  }

  return (
    <div className="flex w-full h-full bg-[#050505] overflow-hidden font-sans">
      
      {/* LEFT PANE - MAIN INTERACTION (75%) */}
      <div className="flex-1 flex flex-col relative border-r border-white/5">
        
        {/* HEADER */}
        <header className="flex-none h-24 px-10 flex items-center justify-between border-b border-white/5 bg-[#050505]">
          <div className="flex items-center gap-4">
             {currentStep > 1 && !success && (
                <button 
                    onClick={() => setCurrentStep(prev => prev - 1)}
                    className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
                >
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                </button>
            )}
            <div className="w-10 h-10 rounded-full bg-blue-900/20 flex items-center justify-center border border-blue-500/20">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Réservation Expert</h2>
              <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                {currentStep === 1 ? 'Diagnostic Initial' : currentStep === 2 ? 'Appareil' : currentStep === 3 ? 'Créneau' : currentStep === 4 ? 'Contact' : 'Confirmation'}
              </span>
            </div>
          </div>
          
           {/* AI SHORTCUT IN HEADER */}
           {currentStep === 1 && (
             <button 
                onClick={() => onNavigateToDiagnostic?.()}
                className="hidden lg:flex items-center gap-2 px-6 py-3 bg-purple-600/10 border border-purple-500/20 text-purple-400 rounded-full text-[9px] font-bold uppercase tracking-[0.2em] hover:bg-purple-600 hover:text-white transition-all"
             >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                Passer au Diagnostic IA
             </button>
           )}
        </header>

        {/* CONTENT AREA */}
        <div className="flex-1 flex flex-col justify-center px-8 lg:px-24 xl:px-32 relative overflow-y-auto">
          
          {/* STEP 1: SYMPTOMS */}
          {currentStep === 1 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-neutral-500 mb-6 block">Étape 1/4</span>
              <h1 className="text-3xl md:text-5xl font-medium text-white mb-16 tracking-tight leading-tight">
                Motif de la visite ?
              </h1>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {symptoms.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => handleSymptomSelect(opt)}
                    className="group h-24 bg-[#111] border border-white/5 rounded-2xl flex items-center px-8 gap-6 hover:bg-[#161616] hover:border-white/10 transition-all duration-300 active:scale-[0.98]"
                  >
                    <div className="w-12 h-12 rounded-xl bg-black border border-white/5 flex items-center justify-center group-hover:border-white/20 transition-colors">
                      {renderIcon(opt.icon)}
                    </div>
                    <span className="text-sm font-bold text-neutral-300 group-hover:text-white uppercase tracking-wider text-left">
                      {opt.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 2: DEVICE */}
          {currentStep === 2 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full max-w-xl mx-auto">
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-neutral-500 mb-6 block">Étape 2/4</span>
              <h1 className="text-3xl md:text-5xl font-medium text-white mb-10 tracking-tight leading-tight">
                Votre Appareil ?
              </h1>
              <form onSubmit={handleDeviceSubmit} className="space-y-6">
                 <input 
                    name="device"
                    autoFocus
                    defaultValue={selections.device}
                    className="w-full bg-[#111] border border-white/10 rounded-2xl px-8 py-6 text-xl text-white placeholder:text-neutral-600 focus:border-white/30 outline-none transition-all"
                    placeholder="Ex: MacBook Pro M1 2020"
                 />
                 <button type="submit" className="w-full py-5 bg-white text-black rounded-full font-bold uppercase tracking-[0.3em] text-[10px] hover:scale-105 active:scale-95 transition-all">
                    Valider
                 </button>
              </form>
            </div>
          )}

           {/* STEP 3: SLOTS */}
           {currentStep === 3 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-neutral-500 mb-6 block">Étape 3/4</span>
              <h1 className="text-3xl md:text-5xl font-medium text-white mb-16 tracking-tight leading-tight">
                Créneau disponible
              </h1>
              <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto">
                {slots.map((slot) => (
                  <button
                    key={slot}
                    onClick={() => handleSlotSelect(slot)}
                    className="group h-24 bg-[#111] border border-white/5 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-white hover:border-white transition-all duration-300 active:scale-[0.98]"
                  >
                    <span className="text-2xl font-medium text-white group-hover:text-black">{slot}</span>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-500 group-hover:text-black/60">Demain</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 4: CONTACT */}
          {currentStep === 4 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full max-w-xl mx-auto">
               <span className="text-[10px] font-black uppercase tracking-[0.4em] text-neutral-500 mb-6 block">Étape 4/4</span>
              <h1 className="text-3xl md:text-5xl font-medium text-white mb-10 tracking-tight leading-tight">
                Confirmation
              </h1>
              <form onSubmit={handleContactSubmit} className="space-y-4">
                 <input name="name" required placeholder="Nom complet" defaultValue={auth.currentUser?.displayName || ''} className="w-full bg-[#111] border border-white/10 rounded-xl px-6 py-4 text-white focus:border-white/30 outline-none" />
                 <input name="email" required type="email" placeholder="Email" defaultValue={auth.currentUser?.email || ''} className="w-full bg-[#111] border border-white/10 rounded-xl px-6 py-4 text-white focus:border-white/30 outline-none" />
                 <input name="phone" required type="tel" placeholder="Téléphone" className="w-full bg-[#111] border border-white/10 rounded-xl px-6 py-4 text-white focus:border-white/30 outline-none" />
                 
                 <button type="submit" disabled={isSubmitting} className="w-full mt-6 py-5 bg-blue-600 text-white rounded-full font-bold uppercase tracking-[0.3em] text-[10px] hover:bg-blue-500 transition-all shadow-lg shadow-blue-900/20">
                    {isSubmitting ? 'Validation...' : 'Confirmer le Rendez-vous'}
                 </button>
              </form>
            </div>
          )}

          {/* STEP 5: SUCCESS */}
          {currentStep === 5 && (
             <div className="flex flex-col items-center justify-center text-center animate-in zoom-in duration-500">
                <div className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center mb-8 border border-green-500/20 shadow-[0_0_60px_rgba(34,197,94,0.1)]">
                  <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                <h2 className="text-3xl font-medium text-white mb-4">Réservation Confirmée</h2>
                <p className="text-neutral-500 text-sm max-w-md mb-12 leading-relaxed">
                  Votre rendez-vous est validé pour demain à {selections.slot}.<br/>
                  Un expert Vestee a reçu votre dossier technique.
                </p>
                <div className="flex flex-col gap-4 w-full max-w-xs">
                    <button 
                        onClick={() => window.location.reload()}
                        className="w-full py-4 bg-white text-black rounded-full font-bold uppercase tracking-[0.3em] text-[9px] transition-all hover:scale-105"
                    >
                        Retour Accueil
                    </button>
                </div>
             </div>
          )}

          {/* PROGRESS FOOTER */}
          <div className="absolute bottom-12 left-8 right-8 lg:left-24 lg:right-24">
             <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-[0.2em] text-neutral-600 mb-3">
                <span>Progression</span>
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
           <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
        </header>

        <div className="flex-1 p-8 overflow-y-auto space-y-8">
             <div className="space-y-6">
               
               {/* Step 1 Item */}
               <div onClick={() => jumpToStep(1)} className={`flex gap-4 group cursor-pointer ${currentStep >= 1 && selections.symptom ? 'opacity-100' : 'opacity-30'}`}>
                    <div className="flex flex-col items-center">
                       <div className={`w-2 h-2 rounded-full mb-1 transition-colors ${currentStep === 1 ? 'bg-white shadow-[0_0_10px_white]' : 'bg-blue-500'}`}></div>
                       <div className="w-px h-full bg-white/5 group-hover:bg-white/10"></div>
                    </div>
                    <div className="pb-4 group-hover:translate-x-1 transition-transform">
                       <span className="text-[8px] font-bold uppercase tracking-widest text-neutral-500 block mb-1">Motif</span>
                       <p className="text-xs text-neutral-300 font-medium leading-relaxed group-hover:text-white">
                         {selections.symptom?.label || "En attente..."}
                       </p>
                    </div>
               </div>

               {/* Step 2 Item */}
               <div onClick={() => jumpToStep(2)} className={`flex gap-4 group cursor-pointer ${currentStep >= 2 && selections.device ? 'opacity-100' : 'opacity-30'}`}>
                    <div className="flex flex-col items-center">
                       <div className={`w-2 h-2 rounded-full mb-1 transition-colors ${currentStep === 2 ? 'bg-white shadow-[0_0_10px_white]' : 'bg-blue-500'}`}></div>
                       <div className="w-px h-full bg-white/5 group-hover:bg-white/10"></div>
                    </div>
                    <div className="pb-4 group-hover:translate-x-1 transition-transform">
                       <span className="text-[8px] font-bold uppercase tracking-widest text-neutral-500 block mb-1">Matériel</span>
                       <p className="text-xs text-neutral-300 font-medium leading-relaxed group-hover:text-white">
                         {selections.device || "En attente..."}
                       </p>
                    </div>
               </div>

               {/* Step 3 Item */}
               <div onClick={() => jumpToStep(3)} className={`flex gap-4 group cursor-pointer ${currentStep >= 3 && selections.slot ? 'opacity-100' : 'opacity-30'}`}>
                    <div className="flex flex-col items-center">
                       <div className={`w-2 h-2 rounded-full mb-1 transition-colors ${currentStep === 3 ? 'bg-white shadow-[0_0_10px_white]' : 'bg-blue-500'}`}></div>
                       <div className="w-px h-full bg-white/5 group-hover:bg-white/10"></div>
                    </div>
                    <div className="pb-4 group-hover:translate-x-1 transition-transform">
                       <span className="text-[8px] font-bold uppercase tracking-widest text-neutral-500 block mb-1">Créneau</span>
                       <p className="text-xs text-neutral-300 font-medium leading-relaxed group-hover:text-white">
                         {selections.slot ? `Demain à ${selections.slot}` : "En attente..."}
                       </p>
                    </div>
               </div>

               {/* Step 4 Item */}
               <div onClick={() => jumpToStep(4)} className={`flex gap-4 group cursor-pointer ${currentStep >= 4 && selections.contact ? 'opacity-100' : 'opacity-30'}`}>
                    <div className="flex flex-col items-center">
                       <div className={`w-2 h-2 rounded-full mb-1 transition-colors ${currentStep === 4 ? 'bg-white shadow-[0_0_10px_white]' : 'bg-blue-500'}`}></div>
                       <div className="w-px h-full bg-white/5 group-hover:bg-white/10"></div>
                    </div>
                    <div className="pb-4 group-hover:translate-x-1 transition-transform">
                       <span className="text-[8px] font-bold uppercase tracking-widest text-neutral-500 block mb-1">Contact</span>
                       <p className="text-xs text-neutral-300 font-medium leading-relaxed group-hover:text-white">
                         {selections.contact ? selections.contact.name : "En attente..."}
                       </p>
                    </div>
               </div>
               
               {success && (
                  <div className="flex gap-4 animate-in slide-in-from-right-4 duration-500">
                    <div className="flex flex-col items-center">
                       <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_#22c55e] mb-1"></div>
                    </div>
                    <div>
                       <span className="text-[8px] font-bold uppercase tracking-widest text-green-500 block mb-1">Validé</span>
                       <p className="text-xs text-white font-medium leading-relaxed">Dossier #BK-{Date.now().toString().slice(-4)}</p>
                    </div>
                 </div>
               )}
             </div>
        </div>

        <footer className="flex-none p-8 border-t border-white/5">
           <div className="flex justify-between items-center mb-4">
              <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-600">Support ID</span>
              <span className="text-[9px] font-mono text-neutral-500">#VS-BOOKING</span>
           </div>
           
           {/* If user selected a symptom but is just browsing, offer AI shortcut in footer too */}
           {selections.symptom && !success && (
               <button 
                 onClick={() => onNavigateToDiagnostic?.({ issue: selections.symptom?.context || '' })}
                 className="w-full py-4 border border-purple-500/30 rounded-xl text-[9px] font-bold uppercase tracking-[0.2em] text-purple-400 hover:text-white hover:bg-purple-600/20 transition-colors flex items-center justify-center gap-2"
               >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                  Switch to AI Agent
               </button>
           )}
        </footer>
      </div>

    </div>
  );
};
