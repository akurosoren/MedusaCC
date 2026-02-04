import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { useTranslation } from '../hooks/useTranslation';
import { MedusaLogo } from '../constants';

const BackgroundOrbs = () => (
    <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10 bg-[#08080c]">
        {/* Fixed Mesh Gradient for Login Screen */}
        <div 
            className="absolute top-[-10%] left-[-5%] w-[80vw] h-[80vw] rounded-full opacity-20 mix-blend-screen filter blur-[120px]"
            style={{ background: 'radial-gradient(circle, rgba(147, 51, 234, 0.35) 0%, rgba(147, 51, 234, 0) 70%)' }}
        ></div>
        <div 
            className="absolute bottom-[-10%] right-[-5%] w-[70vw] h-[70vw] rounded-full opacity-15 mix-blend-screen filter blur-[110px]"
            style={{ background: 'radial-gradient(circle, rgba(79, 70, 229, 0.3) 0%, rgba(79, 70, 229, 0) 70%)' }}
        ></div>
        <div 
            className="absolute top-[20%] right-[10%] w-[40vw] h-[40vw] rounded-full opacity-10 mix-blend-soft-light filter blur-[140px]"
            style={{ background: 'radial-gradient(circle, rgba(236, 72, 153, 0.2) 0%, rgba(236, 72, 153, 0) 70%)' }}
        ></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.015] mix-blend-overlay"></div>
    </div>
);

const Login: React.FC = () => {
    const { isPasswordSet, login, createPassword } = useAuth();
    const { t } = useTranslation();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!login(password)) {
            setError(t('loginIncorrectPassword'));
        }
    };
    
    const handleCreatePassword = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (password !== confirmPassword) {
            setError(t('loginPasswordsMismatch'));
            return;
        }
        if (password.length < 4) {
            setError(t('loginPasswordTooShort'));
            return;
        }
        createPassword(password);
    };

    const renderLoginForm = () => (
        <form onSubmit={handleLogin} className="space-y-6">
            <div>
                <label htmlFor="password-login" className="block text-[10px] font-bold text-white/30 mb-2 uppercase tracking-[0.2em] ml-1">{t('loginPassword')}</label>
                <input
                    type="password"
                    id="password-login"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full glass-input rounded-2xl px-5 py-4 text-white placeholder-gray-700 focus:outline-none transition-all duration-300 text-lg tracking-widest"
                    required
                />
            </div>
            <button type="submit" className="w-full py-5 bg-white text-black rounded-2xl font-bold text-lg transition-all duration-300 transform hover:scale-[1.02] shadow-2xl active:scale-95">
                {t('loginButton')}
            </button>
        </form>
    );

    const renderCreatePasswordForm = () => (
        <form onSubmit={handleCreatePassword} className="space-y-6">
             <div>
                <label htmlFor="password-create" className="block text-[10px] font-bold text-white/30 mb-2 uppercase tracking-[0.2em] ml-1">{t('loginCreatePassword')}</label>
                <input
                    type="password"
                    id="password-create"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full glass-input rounded-2xl px-5 py-4 text-white placeholder-gray-700 focus:outline-none transition-all duration-300 tracking-widest"
                    required
                />
            </div>
            <div>
                <label htmlFor="password-confirm" className="block text-[10px] font-bold text-white/30 mb-2 uppercase tracking-[0.2em] ml-1">{t('loginConfirmPassword')}</label>
                <input
                    type="password"
                    id="password-confirm"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full glass-input rounded-2xl px-5 py-4 text-white placeholder-gray-700 focus:outline-none transition-all duration-300 tracking-widest"
                    required
                />
            </div>
            <button type="submit" className="w-full py-5 bg-white text-black rounded-2xl font-bold text-lg transition-all duration-300 transform hover:scale-[1.02] shadow-2xl active:scale-95">
                {t('loginSetPasswordAndEnter')}
            </button>
        </form>
    );


    return (
        <div className="flex items-center justify-center min-h-screen relative overflow-hidden">
            <BackgroundOrbs />
            
            <div className="w-full max-w-md mx-auto relative z-10 px-6">
                <div className="glass-panel p-12 rounded-[40px] shadow-2xl animate-fade-in-up border-white/5">
                    <div className="flex flex-col items-center justify-center mb-10">
                        <div className="relative mb-8">
                             <div className="absolute inset-0 bg-white/5 rounded-full blur-3xl opacity-50"></div>
                             <MedusaLogo className="h-28 w-28 text-white relative z-10" pulse={true} />
                        </div>
                        <h1 className="text-4xl font-bold text-white tracking-tighter mb-2 uppercase tracking-[0.1em]">Medusa</h1>
                        <p className="text-white/30 font-bold uppercase text-[9px] tracking-[0.3em]">Control Center</p>
                    </div>
                    
                     <p className="text-center text-gray-500 mb-10 font-medium text-sm">
                        {isPasswordSet ? t('loginPrompt') : t('loginWelcome')}
                    </p>
                    
                    {isPasswordSet ? renderLoginForm() : renderCreatePasswordForm()}
                    
                    {error && <div className="mt-8 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs font-bold text-center animate-pulse">{error}</div>}
                    
                    <p className="text-[10px] text-white/10 font-bold text-center mt-10 uppercase tracking-[0.2em]">
                        {t('loginLocalStorageNote')}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;