import React, { useMemo } from 'react';
import { DashboardIcon, JellyfinIcon, AutomationIcon, SettingsIcon, ShieldIcon, LogoutIcon, MedusaLogo, PersonalIcon } from '../constants';
import { useAuth } from '../auth/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTranslation } from '../hooks/useTranslation';

type View = 'dashboard' | 'personal' | 'jellyfin' | 'automation' | 'settings' | 'exclusions';

interface SidebarProps {
    currentView: View;
    setView: (view: View) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, setView }) => {
    const { logout, currentUser } = useAuth();
    const { language, setLanguage } = useLanguage();
    const { t } = useTranslation();

    const navItems = useMemo(() => {
        const items = [];

        // Admin Dashboard first if admin
        if (currentUser?.role === 'admin') {
            items.push({ id: 'dashboard', icon: <DashboardIcon />, label: t('sidebarDashboard') });
        }

        // Everyone gets Personal Hub and Jellyfin
        items.push(
            { id: 'personal', icon: <PersonalIcon />, label: t('sidebarPersonal') },
            { id: 'jellyfin', icon: <JellyfinIcon />, label: t('sidebarJellyfin') }
        );

        // Admin Extra Features
        if (currentUser?.role === 'admin') {
            items.push(
                { id: 'automation', icon: <AutomationIcon />, label: t('sidebarAutomation') },
            );
        }

        // Settings (Now accessible to everyone to allow API key override)
        items.push(
            { id: 'settings', icon: <SettingsIcon />, label: t('sidebarSettings') }
        );

        return items;
    }, [t, currentUser]);

    const activeIndex = navItems.findIndex(item => item.id === currentView);

    return (
        <aside className="fixed bottom-0 left-0 w-full h-[80px] md:relative md:h-screen md:w-72 glass-panel md:border-r border-t border-white/10 md:border-t-0 flex flex-row md:flex-col transition-all duration-500 z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] md:shadow-2xl">
            <style>{`
                .icon-jellyfin {
                    transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
                }
                
                /* Jellyfin : Couleurs originales avec gestion d'opacité/saturation */
                .nav-btn-inactive .icon-jellyfin {
                    opacity: 0.35;
                    filter: saturate(0.7) blur(0.5px);
                }
                .nav-btn-active .icon-jellyfin {
                    opacity: 1;
                    filter: saturate(1.2) drop-shadow(0 0 10px rgba(170, 0, 255, 0.5));
                    transform: scale(1.1);
                }
                .nav-btn-hover:hover .icon-jellyfin {
                    opacity: 0.8;
                    filter: saturate(1.1);
                }

                /* Animation de l'indicateur coulissant */
                .nav-indicator {
                    transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);
                }

                /* Animation des icônes SVG standards */
                .nav-btn-active svg {
                    filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.3));
                }
            `}</style>
            
            {/* Logo Section - Hidden on Mobile (Moved to App Header) */}
            <div className="hidden md:flex items-center justify-center md:justify-start p-8 mb-4">
                 <div className="relative group cursor-pointer" onClick={() => setView(currentUser?.role === 'admin' ? 'dashboard' : 'personal')}>
                    <div className="absolute -inset-4 bg-white/5 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition duration-1000"></div>
                    <MedusaLogo className="h-12 w-12 text-white relative z-10" pulse={true} />
                 </div>
                 <div className="hidden md:flex flex-col ml-4">
                    <span className="text-2xl font-bold text-white tracking-tighter uppercase tracking-[0.1em] leading-none">Medusa</span>
                    <span className="text-[9px] font-bold text-white/30 uppercase tracking-[0.2em] mt-1">
                        {currentUser?.role === 'admin' ? 'Control Center' : 'User View'}
                    </span>
                 </div>
            </div>
            
            <nav className="flex-1 px-2 md:px-4 md:mt-4 relative flex items-center md:items-stretch w-full">
                {/* L'indicateur coulissant d'arrière-plan (Desktop Only) */}
                <div 
                    className="hidden md:block absolute left-0 w-full h-[60px] nav-indicator pointer-events-none"
                    style={{ 
                        transform: `translateY(${activeIndex * (60 + 12)}px)`, // 60px hauteur + 12px (space-y-3)
                        opacity: activeIndex === -1 ? 0 : 1
                    }}
                >
                    <div className="mx-2 h-full bg-white/[0.05] border border-white/[0.08] rounded-2xl shadow-xl shadow-black/20"></div>
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white rounded-r-full shadow-[0_0_10px_white]"></div>
                </div>

                <ul className="flex flex-row md:flex-col justify-around md:justify-start w-full md:space-y-3">
                    {navItems.map((item) => {
                        const isActive = currentView === item.id;
                        return (
                            <li key={item.id} className="flex-1 md:flex-none flex justify-center">
                                <button
                                    onClick={() => setView(item.id as View)}
                                    className={`w-12 h-12 md:w-full md:h-[60px] flex items-center justify-center md:justify-start md:p-4 rounded-2xl transition-all duration-500 group relative overflow-hidden nav-btn-hover ${
                                        isActive
                                            ? 'text-white nav-btn-active bg-white/10 md:bg-transparent'
                                            : 'text-gray-500 hover:text-gray-300 nav-btn-inactive'
                                    }`}
                                >
                                    <span className={`relative z-10 transition-all duration-500 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                                        {item.icon}
                                    </span>
                                    <span className={`hidden md:block ml-5 font-semibold tracking-tight relative z-10 transition-all duration-500 ${isActive ? 'translate-x-1' : ''}`}>
                                        {item.label}
                                    </span>
                                    
                                    {/* Effet de brillance au survol si pas actif */}
                                    {!isActive && (
                                        <div className="absolute inset-0 bg-gradient-to-r from-white/[0.01] to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    )}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </nav>
            
            {/* Footer Section */}
            <div className="hidden md:block p-6 border-t border-white/5">
                 <div className="hidden md:flex justify-center space-x-2 mb-6 bg-black/20 p-1.5 rounded-2xl border border-white/5">
                    <button onClick={() => setLanguage('fr')} className={`flex-1 py-1.5 text-[10px] font-bold rounded-xl transition-all duration-300 tracking-widest ${language === 'fr' ? 'bg-white text-black' : 'text-gray-500 hover:text-gray-300'}`}>FR</button>
                    <button onClick={() => setLanguage('en')} className={`flex-1 py-1.5 text-[10px] font-bold rounded-xl transition-all duration-300 tracking-widest ${language === 'en' ? 'bg-white text-black' : 'text-gray-500 hover:text-gray-300'}`}>EN</button>
                </div>
                <div className="mb-4 px-2">
                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Logged as</p>
                    <p className="text-sm font-bold text-white truncate">{currentUser?.name}</p>
                </div>
                <button
                    onClick={logout}
                    className="w-full flex items-center justify-center md:justify-start p-4 rounded-2xl text-gray-500 hover:text-red-400 hover:bg-red-500/5 transition-all duration-300 group"
                >
                    <div className="transition-transform duration-300 group-hover:-translate-x-1">
                        <LogoutIcon />
                    </div>
                    <span className="hidden md:block ml-5 font-bold tracking-tight">{t('sidebarLogout')}</span>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;