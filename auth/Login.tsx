import React, { useState, useContext, useEffect } from 'react';
import { useAuth, User, UserRole } from './AuthContext';
import { useTranslation } from '../hooks/useTranslation';
import { MedusaLogo } from '../constants';
import { SettingsContext } from '../App';
import { authenticateUserByName } from '../services/jellyfinService';

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
    const { login } = useAuth();
    const settingsCtx = useContext(SettingsContext);
    const { t } = useTranslation();
    
    // Form State
    const [serverUrl, setServerUrl] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // Pre-fill URL if exists in settings
    useEffect(() => {
        if (settingsCtx?.settings?.jellyfin?.url) {
            setServerUrl(settingsCtx.settings.jellyfin.url);
        }
    }, [settingsCtx]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        // Basic URL validation
        let cleanUrl = serverUrl.trim();
        if (!cleanUrl) {
            setError(t('settingsMissingJfUrlOrKey'));
            setIsLoading(false);
            return;
        }
        if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
            cleanUrl = 'http://' + cleanUrl;
        }
        // Remove trailing slash
        cleanUrl = cleanUrl.endsWith('/') ? cleanUrl.slice(0, -1) : cleanUrl;

        try {
            // 1. Authenticate with Jellyfin
            const authResult = await authenticateUserByName(cleanUrl, username, password);
            
            const currentSettings = settingsCtx?.settings;
            // Check if manual mode was previously enabled and we have a stored key
            const isManualMode = currentSettings?.jellyfin?.isManualMode || false;
            const storedApiKey = currentSettings?.jellyfin?.apiKey;

            // Determine Role
            // 1. If Jellyfin Policy says IsAdministrator -> Admin
            // 2. If Manual Mode is ON and we have a stored key -> Force Admin (Override)
            let userRole: UserRole = authResult.User.Policy?.IsAdministrator ? 'admin' : 'user';
            let apiKeyToUse = authResult.AccessToken;

            if (isManualMode && storedApiKey) {
                userRole = 'admin';
                apiKeyToUse = storedApiKey; // Keep the manual/admin key instead of using the new session token
            }
            
            // Construct User Object
            const user: User = {
                role: userRole,
                username: username, // Important: Store the login credential
                name: authResult.User.Name, // Store the display name
                jellyfinUserId: authResult.User.Id,
                jellyfinToken: authResult.AccessToken,
            };

            // Update Global Settings automatically
            if (settingsCtx) {
                settingsCtx.setSettings({
                    ...(currentSettings || {} as any),
                    jellyfin: {
                        url: cleanUrl,
                        apiKey: apiKeyToUse,
                        userId: authResult.User.Id,
                        isManualMode: isManualMode // Persist this flag
                    },
                    // Preserve other settings if they exist, or init defaults
                    automation: currentSettings?.automation || { movieRetentionDays: 7, tvSeasonRetentionDays: 28 },
                    radarr: currentSettings?.radarr,
                    sonarr: currentSettings?.sonarr,
                    webhooks: currentSettings?.webhooks
                });
            }

            // Login to Auth Context
            login(user);

        } catch (err: any) {
            console.error(err);
            setError(t('loginAuthFailed')); 
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen relative overflow-hidden">
            <BackgroundOrbs />
            
            <div className="w-full max-w-md mx-auto relative z-10 px-6">
                <div className="glass-panel p-10 rounded-[40px] shadow-2xl animate-fade-in-up border-white/5">
                    <div className="flex flex-col items-center justify-center mb-8">
                        <div className="relative mb-6">
                             <div className="absolute inset-0 bg-white/5 rounded-full blur-3xl opacity-50"></div>
                             <MedusaLogo className="h-24 w-24 text-white relative z-10" pulse={true} />
                        </div>
                        <h1 className="text-4xl font-bold text-white tracking-tighter mb-2 uppercase tracking-[0.1em]">Medusa</h1>
                        <p className="text-white/30 font-bold uppercase text-[9px] tracking-[0.3em]">Control Center</p>
                    </div>
                    
                    <p className="text-center text-gray-400 mb-8 font-medium text-sm">
                        {t('loginPrompt')}
                    </p>
                    
                    <form onSubmit={handleLogin} className="space-y-5">
                         <div>
                            <label htmlFor="server-url" className="block text-[10px] font-bold text-white/30 mb-2 uppercase tracking-[0.2em] ml-1">{t('settingsServerUrl')}</label>
                            <input
                                type="text"
                                id="server-url"
                                value={serverUrl}
                                onChange={(e) => setServerUrl(e.target.value)}
                                placeholder="http://192.168.1.10:8096"
                                className="w-full glass-input rounded-2xl px-5 py-4 text-white placeholder-gray-600 focus:outline-none transition-all duration-300 tracking-wide font-mono text-sm"
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="username" className="block text-[10px] font-bold text-white/30 mb-2 uppercase tracking-[0.2em] ml-1">{t('loginUsername')}</label>
                            <input
                                type="text"
                                id="username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full glass-input rounded-2xl px-5 py-4 text-white placeholder-gray-600 focus:outline-none transition-all duration-300 tracking-wide"
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="block text-[10px] font-bold text-white/30 mb-2 uppercase tracking-[0.2em] ml-1">{t('loginPassword')}</label>
                            <input
                                type="password"
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full glass-input rounded-2xl px-5 py-4 text-white placeholder-gray-600 focus:outline-none transition-all duration-300 tracking-widest"
                            />
                        </div>
                        
                        <button 
                            type="submit" 
                            disabled={isLoading} 
                            className="w-full py-4 mt-4 bg-white text-black rounded-2xl font-bold text-lg uppercase tracking-widest transition-all duration-300 transform hover:scale-105 hover:shadow-[0_0_20px_rgba(255,255,255,0.6)] shadow-2xl active:scale-95 disabled:opacity-50 disabled:transform-none"
                        >
                            {isLoading ? t('loading') : t('loginButton')}
                        </button>
                    </form>
                    
                    {error && <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs font-bold text-center animate-pulse">{error}</div>}
                </div>
            </div>
        </div>
    );
};

export default Login;