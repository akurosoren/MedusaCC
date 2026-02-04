import React, { useState, createContext, useMemo, useEffect } from 'react';
import useLocalStorage from './hooks/useLocalStorage';
import { JccSettings } from './types';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import JellyfinView from './components/JellyfinView';
import Automation from './components/Automation';
import Settings from './components/Settings';
import Exclusions from './components/Exclusions';
import { AuthProvider, useAuth } from './auth/AuthContext';
import Login from './auth/Login';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { useTranslation } from './hooks/useTranslation';
import { MedusaLogo, LogoutIcon } from './constants';

type View = 'dashboard' | 'jellyfin' | 'automation' | 'settings' | 'exclusions';

interface SettingsContextType {
    settings: JccSettings | null;
    setSettings: React.Dispatch<React.SetStateAction<JccSettings | null>>;
}

export const SettingsContext = createContext<SettingsContextType | null>(null);

const BackgroundOrbs = () => (
    <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10 bg-[#08080c]">
        {/* Fixed Mesh Gradient Composition */}
        
        {/* Top Left: Deep Purple */}
        <div 
            className="absolute top-[-20%] left-[-10%] w-[80vw] h-[80vw] max-w-[1200px] rounded-full opacity-30 mix-blend-screen filter blur-[140px]"
            style={{ background: 'radial-gradient(circle, rgba(126, 34, 206, 0.4) 0%, rgba(126, 34, 206, 0) 70%)' }}
        ></div>
        
        {/* Bottom Right: Indigo Glow */}
        <div 
            className="absolute bottom-[-15%] right-[-5%] w-[70vw] h-[70vw] max-w-[1000px] rounded-full opacity-25 mix-blend-screen filter blur-[120px]"
            style={{ background: 'radial-gradient(circle, rgba(67, 56, 202, 0.35) 0%, rgba(67, 56, 202, 0) 70%)' }}
        ></div>
        
        {/* Top Right: Soft Magenta Accent */}
        <div 
            className="absolute top-[5%] right-[5%] w-[50vw] h-[50vw] max-w-[700px] rounded-full opacity-15 mix-blend-soft-light filter blur-[150px]"
            style={{ background: 'radial-gradient(circle, rgba(190, 24, 93, 0.25) 0%, rgba(190, 24, 93, 0) 70%)' }}
        ></div>

        {/* Bottom Left: Subtle Cyan Deep */}
        <div 
            className="absolute bottom-[10%] left-[5%] w-[40vw] h-[40vw] max-w-[600px] rounded-full opacity-10 mix-blend-overlay filter blur-[130px]"
            style={{ background: 'radial-gradient(circle, rgba(8, 145, 178, 0.2) 0%, rgba(8, 145, 178, 0) 70%)' }}
        ></div>

        {/* Grainy texture for organic feel */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.015] mix-blend-overlay"></div>
    </div>
);

const MainApp: React.FC = () => {
    const [settings, setSettings] = useLocalStorage<JccSettings | null>('jcc-settings', null);
    const [view, setView] = useState<View>('dashboard');
    const { language } = useLanguage();
    const { t } = useTranslation();
    const { logout } = useAuth();

    useEffect(() => {
        document.documentElement.lang = language;
    }, [language]);

    const contextValue = useMemo(() => ({ settings, setSettings }), [settings, setSettings]);

    const renderView = () => {
        if (!settings?.jellyfin?.url && view !== 'settings') {
            return (
                <div className="flex flex-col items-center justify-center h-full text-center animate-fade-in-up">
                    <div className="bg-white/[0.02] backdrop-blur-xl p-10 rounded-3xl border border-white/10 shadow-2xl max-w-lg">
                        <h2 className="text-4xl font-semibold mb-6 text-white tracking-tight">{t('appWelcomeTitle')}</h2>
                        <p className="text-gray-400 mb-10 leading-relaxed text-lg">{t('appWelcomeMessage')}</p>
                        <button
                            onClick={() => setView('settings')}
                            className="px-10 py-4 bg-white text-black rounded-2xl font-bold tracking-tight transition-all duration-300 transform hover:scale-105 hover:bg-gray-200 active:scale-95 shadow-xl shadow-white/5"
                        >
                            {t('appWelcomeButton')}
                        </button>
                    </div>
                </div>
            )
        }

        switch (view) {
            case 'dashboard':
                return <Dashboard />;
            case 'jellyfin':
                return <JellyfinView />;
            case 'automation':
                return <Automation />;
            case 'exclusions':
                return <Exclusions />;
            case 'settings':
                return <Settings />;
            default:
                return <Dashboard />;
        }
    };

    return (
        <SettingsContext.Provider value={contextValue}>
            <div className="flex h-screen bg-transparent text-gray-200 font-sans relative overflow-hidden">
                <BackgroundOrbs />
                
                {/* Mobile Header (Logo + Logout) */}
                <div className="md:hidden fixed top-0 left-0 right-0 h-20 glass-panel z-40 flex items-center justify-between px-6 border-b border-white/10 backdrop-blur-xl">
                     <div className="flex items-center space-x-3">
                        <MedusaLogo className="h-8 w-8 text-white" pulse={true} />
                        <span className="text-xl font-bold text-white tracking-tighter uppercase tracking-[0.1em]">Medusa</span>
                     </div>
                     <button onClick={logout} className="p-2 bg-white/5 rounded-xl border border-white/10 text-gray-400 hover:text-white transition-colors">
                        <LogoutIcon />
                     </button>
                </div>

                <Sidebar currentView={view} setView={setView} />
                
                {/* Main Content Area */}
                {/* Added padding top for Mobile Header and padding bottom for Mobile Bottom Nav */}
                <main className="flex-1 p-6 sm:p-10 overflow-y-auto z-10 scroll-smooth pt-28 pb-32 md:pt-10 md:pb-10">
                    <div className="max-w-[1800px] mx-auto h-full">
                        {renderView()}
                    </div>
                </main>
            </div>
        </SettingsContext.Provider>
    );
};

const AppWithAuth: React.FC = () => {
    const { isAuthenticated } = useAuth();
    return isAuthenticated ? <MainApp /> : <Login />;
}

const App: React.FC = () => {
    return (
        <LanguageProvider>
            <AuthProvider>
                <AppWithAuth />
            </AuthProvider>
        </LanguageProvider>
    );
};

export default App;