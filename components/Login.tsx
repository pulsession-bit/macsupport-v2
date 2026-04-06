
import React, { useState } from 'react';
import { auth, googleProvider } from '../firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

interface LoginProps {
  onLoginSuccess: (user: any) => void;
  onCancel?: () => void;
  showCancel?: boolean;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess, onCancel, showCancel }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      let userCredential;
      if (isRegistering) {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
      } else {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      }
      onLoginSuccess(userCredential.user);
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError('Cet email est déjà utilisé.');
      } else if (err.code === 'auth/weak-password') {
        setError('Le mot de passe doit faire au moins 6 caractères.');
      } else if (err.code === 'auth/invalid-credential') {
        setError('Identifiants incorrects.');
      } else {
        setError('Erreur d\'authentification.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setIsLoading(true);
    setError('');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      onLoginSuccess(result.user);
    } catch (err: any) {
      setError("Erreur d'authentification Google");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnonymousAuth = () => {
    // Bypass Firebase — local mock user for dev/guest access
    // useSession détecte uid 'local_*' et crée une session sess_local_ sans Firestore
    onLoginSuccess({ uid: 'local_' + crypto.randomUUID(), isAnonymous: true, displayName: 'Invité' });
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-black p-0 lg:p-8 font-sans">
      <div className="w-full h-full lg:max-w-[1200px] lg:min-h-[85vh] bg-black lg:border lg:border-white/10 lg:rounded-[2.5rem] lg:shadow-2xl flex flex-col items-center justify-center relative overflow-hidden p-5 sm:p-8 lg:p-20">
        
        {/* Close Button */}
        {showCancel && (
          <button 
            onClick={onCancel}
            className="absolute top-8 right-8 lg:top-12 lg:right-12 p-4 bg-white/5 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-all z-50"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        {/* Content */}
        <div className="w-full max-w-md flex flex-col items-center text-center animate-in fade-in zoom-in duration-500">
           
           {/* Icon / Branding */}
           <div className="mb-8 lg:mb-12">
              <div className="w-20 h-20 bg-white/10 rounded-3xl flex items-center justify-center mx-auto mb-6 backdrop-blur-md border border-white/5">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h1 className="text-5xl lg:text-6xl font-medium text-white tracking-tighter mb-4 leading-tight">Vestee Support.</h1>
              <p className="text-neutral-500 text-xs font-bold uppercase tracking-[0.12em] sm:tracking-[0.5em]">{isRegistering ? 'Nouveau Compte' : 'Accès Authentifié'}</p>
           </div>

           {/* Form */}
           <form onSubmit={handleAuth} className="w-full space-y-4">
              <div className="space-y-3">
                 <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-neutral-900 border border-white/10 rounded-2xl px-6 py-5 text-white placeholder:text-neutral-600 focus:border-white/30 focus:bg-neutral-800 transition-all outline-none text-base font-medium"
                    placeholder="Email professionnel"
                    required
                 />
                 <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-neutral-900 border border-white/10 rounded-2xl px-6 py-5 text-white placeholder:text-neutral-600 focus:border-white/30 focus:bg-neutral-800 transition-all outline-none text-base font-medium"
                    placeholder="Mot de passe"
                    required
                 />
              </div>

              <div className="pt-4 space-y-4">
                 <button 
                    disabled={isLoading}
                    className="w-full min-h-[44px] py-4 sm:py-6 bg-white text-black rounded-full font-bold uppercase tracking-[0.12em] sm:tracking-[0.3em] text-xs sm:text-[11px] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_40px_rgba(255,255,255,0.1)] disabled:opacity-50"
                 >
                    {isLoading ? 'Traitement...' : (isRegistering ? 'S\'inscrire maintenant' : 'Se Connecter')}
                 </button>
                 
                 <div className="relative py-4">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
                    <div className="relative flex justify-center text-[11px] sm:text-[8px] font-bold uppercase tracking-[0.08em] sm:tracking-[0.4em]"><span className="bg-black px-4 text-neutral-600">ou</span></div>
                 </div>

                 <button 
                    type="button"
                    onClick={handleGoogleAuth}
                    disabled={isLoading}
                    className="w-full min-h-[44px] py-4 sm:py-5 bg-transparent border border-white/10 text-white rounded-full font-bold uppercase tracking-[0.12em] sm:tracking-[0.3em] text-xs sm:text-[10px] hover:bg-white/5 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                 >
                    <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="currentColor" d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/></svg>
                    <span>Continuer avec Google</span>
                 </button>
                 
                 <button 
                    type="button"
                    onClick={handleAnonymousAuth}
                    disabled={isLoading}
                    className="w-full min-h-[44px] py-3 bg-transparent border border-white/5 text-neutral-500 rounded-full font-bold uppercase tracking-[0.12em] sm:tracking-[0.3em] text-xs hover:bg-white/5 hover:text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                 >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    <span>Accès Invité (Dev)</span>
                 </button>
              </div>
           </form>

           {/* Switch between Login and Register */}
           <div className="mt-10 flex flex-col items-center gap-4">
              <p className="text-neutral-600 text-xs font-medium tracking-wide">
                 {isRegistering ? "Vous avez déjà un compte ?" : "Vous n'avez pas encore de compte ?"}
              </p>
              <button 
                onClick={() => {
                  setIsRegistering(!isRegistering);
                  setError('');
                }} 
                className="min-h-[44px] px-8 py-3 bg-white/5 border border-white/10 text-white rounded-full text-xs font-bold uppercase tracking-[0.12em] sm:tracking-[0.3em] hover:bg-white/10 hover:border-white/20 transition-all active:scale-95"
              >
                 {isRegistering ? 'Accéder à la connexion' : 'Créer un compte expert'}
              </button>
           </div>

           {/* Error Message */}
           {error && (
              <div className="mt-6 px-6 py-4 bg-red-500/10 border border-red-500/20 rounded-2xl animate-in slide-in-from-bottom-2">
                 <p className="text-red-400 text-[9px] font-bold uppercase tracking-widest">{error}</p>
              </div>
           )}
        </div>

        {/* Subtle Footer Watermark */}
        <div className="absolute bottom-10 text-center">
            <p className="text-[9px] font-bold uppercase tracking-[0.4em] text-neutral-800">Vestee Support Pro</p>
        </div>
      </div>
    </div>
  );
};
