
import React, { useState } from 'react';
import { db, auth } from '../firebase';
import { 
  collection, 
  addDoc, 
  serverTimestamp 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

interface AppointmentSchedulerProps {
  onComplete?: () => void;
  userName?: string;
}

const FS_ROOT = "macAssist/v1";

export const AppointmentScheduler: React.FC<AppointmentSchedulerProps> = ({ onComplete, userName }) => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    serial: '',
    model: '',
    issueType: '',
    fullName: userName || '',
    phone: '',
    email: auth.currentUser?.email || '',
    urgency: 'normal'
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const appointmentsRef = collection(db, `${FS_ROOT}/appointments`);
      await addDoc(appointmentsRef, {
        ...formData,
        userId: auth.currentUser?.uid || 'anonymous',
        createdAt: serverTimestamp(),
        status: 'pending'
      });

      setIsSubmitted(true);
      if (onComplete) {
        setTimeout(() => onComplete(), 3000);
      }
    } catch (err: any) {
      console.error('Erreur lors de la création du RDV:', err);
      setError('Impossible d\'enregistrer le rendez-vous. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="w-full min-h-[500px] flex flex-col items-center justify-center text-center animate-in fade-in zoom-in duration-700 bg-black rounded-[2.5rem] p-10 border border-white/10">
        <div className="relative mb-8">
            <div className="absolute inset-0 bg-blue-500 rounded-full blur-3xl opacity-20 animate-pulse"></div>
            <div className="relative w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-2xl">
              <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
              </svg>
            </div>
        </div>
        <h2 className="text-3xl font-medium text-white mb-2 tracking-tighter">Requête Transmise</h2>
        <p className="text-neutral-500 text-[10px] font-bold uppercase tracking-[0.4em]">Un ingénieur vous contactera sous peu.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto bg-black border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-1000">
      <div className="grid grid-cols-1 lg:grid-cols-12">
        
        {/* Colonne d'Information (Gauche) */}
        <div className="lg:col-span-4 bg-white/[0.02] p-10 lg:p-14 border-b lg:border-b-0 lg:border-r border-white/5 space-y-10">
          <div className="space-y-6">
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center border border-white/10">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" strokeWidth="1.5"/>
              </svg>
            </div>
            <h1 className="text-4xl font-medium text-white tracking-tighter leading-tight">Expert Support.</h1>
            <p className="text-neutral-500 text-xs font-light leading-relaxed">
              Réservez une intervention prioritaire pour votre équipement Apple.
            </p>
          </div>

          <div className="space-y-4 pt-10">
            <div className="flex items-center gap-4 group">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Temps de réponse &lt; 2h</span>
            </div>
            <div className="flex items-center gap-4 group">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Diagnostic Cloud Inclus</span>
            </div>
          </div>
        </div>

        {/* Colonne Formulaire (Droite) */}
        <div className="lg:col-span-8 p-10 lg:p-14">
          <form onSubmit={handleSubmit} className="space-y-10">
            
            <div className="space-y-6">
              <h3 className="text-[9px] font-black text-neutral-600 uppercase tracking-[0.4em]">Spécifications</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input 
                  type="text" 
                  name="serial" 
                  placeholder="Numéro de série (Optionnel)" 
                  onChange={handleChange}
                  className="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-6 py-4 text-white text-sm focus:border-white/20 outline-none transition-all font-mono"
                />
                <select 
                  name="issueType" 
                  required
                  onChange={handleChange}
                  className="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-6 py-4 text-white text-sm focus:border-white/20 outline-none transition-all cursor-pointer"
                >
                  <option value="" className="bg-black">Nature du problème</option>
                  <option value="boot" className="bg-black">Démarrage</option>
                  <option value="battery" className="bg-black">Batterie</option>
                  <option value="screen" className="bg-black">Écran</option>
                  <option value="liquid" className="bg-black">Liquide</option>
                  <option value="keyboard" className="bg-black">Clavier / Trackpad</option>
                  <option value="other" className="bg-black">Autre souci technique</option>
                </select>
              </div>
            </div>

            <div className="space-y-6 pt-6 border-t border-white/5">
              <h3 className="text-[9px] font-black text-neutral-600 uppercase tracking-[0.4em]">Coordonnées</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input 
                  type="text" 
                  name="fullName" 
                  placeholder="Votre nom" 
                  value={formData.fullName}
                  required
                  onChange={handleChange}
                  className="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-6 py-4 text-white text-sm focus:border-white/20 outline-none transition-all"
                />
                <input 
                  type="tel" 
                  name="phone" 
                  placeholder="Téléphone" 
                  required
                  onChange={handleChange}
                  className="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-6 py-4 text-white text-sm focus:border-white/20 outline-none transition-all"
                />
              </div>
              <input 
                  type="email" 
                  name="email" 
                  placeholder="Email" 
                  value={formData.email}
                  required
                  onChange={handleChange}
                  className="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-6 py-4 text-white text-sm focus:border-white/20 outline-none transition-all"
                />
            </div>

            <div className="pt-6">
              <div className="flex items-center gap-2 mb-6">
                <p className="text-[9px] font-black text-neutral-600 uppercase tracking-[0.4em]">Niveau d'urgence :</p>
                <span className="text-[9px] font-bold text-white uppercase bg-blue-500/20 px-2 py-0.5 rounded tracking-widest">{formData.urgency}</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {['normal', 'urgent', 'critique'].map(lvl => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setFormData(f => ({ ...f, urgency: lvl }))}
                    className={`py-3 rounded-xl border text-[9px] font-bold uppercase tracking-widest transition-all ${formData.urgency === lvl ? 'bg-white text-black border-white' : 'bg-transparent border-white/5 text-neutral-500 hover:border-white/10'}`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full py-6 bg-white text-black rounded-full font-black uppercase tracking-[0.4em] text-[10px] hover:scale-[1.01] active:scale-[0.99] transition-all shadow-xl disabled:opacity-50"
              >
                {isSubmitting ? 'Envoi en cours...' : 'Soumettre la demande'}
              </button>
              {error && (
                <p className="text-red-500 text-[8px] font-bold uppercase tracking-widest text-center">{error}</p>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
