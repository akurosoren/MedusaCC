import React, { useContext, useState, useEffect, useRef } from 'react';
import { SettingsContext } from '../App';
import { testRadarrConnection } from '../services/radarrService';
import { testSonarrConnection } from '../services/sonarrService';
import { parseLetterboxdZip } from '../services/dataImportService';
import { JccSettings, JellyfinItem } from '../types';
import Spinner from './common/Spinner';
import { useTranslation } from '../hooks/useTranslation';
import { useAuth } from '../auth/AuthContext';
import useLocalStorage from '../hooks/useLocalStorage';

const SettingsSection: React.FC<{ title: string, colorClass: string, children: React.ReactNode }> = ({ title, colorClass, children }) => (
    <div className="glass-panel p-8 rounded-2xl relative overflow-hidden group hover:border-white/10 transition-colors duration-300">
        <div className={`absolute top-0 left-0 w-1 h-full ${colorClass}`}></div>
        <h2 className={`text-2xl font-bold mb-6 ${colorClass.replace('bg-', 'text-')} flex items-center`}>
            {title}
        </h2>
        <div className="space-y-6 relative z-10">
            {children}
        </div>
    </div>
);

const SettingsInput: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({ label, ...props }) => (
    <div>
        <label htmlFor={props.id} className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider ml-1">{label}</label>
        <div className="relative">
            <input
                {...props}
                className="w-full glass-input rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            />
        </div>
    </div>
);

const Settings: React.FC = () => {
    const settingsCtx = useContext(SettingsContext);
    const { currentUser, updateUser } = useAuth();
    const { t } = useTranslation();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const letterboxdInputRef = useRef<HTMLInputElement>(null);
    const [_, setExternalHistory] = useLocalStorage<JellyfinItem[]>('medusa-external-history', []);

    const isAdmin = currentUser?.role === 'admin';

    // Jellyfin state
    const [jfUrl, setJfUrl] = useState(settingsCtx?.settings?.jellyfin?.url || '');
    
    // Check manual mode first
    const [isManualApiMode, setIsManualApiMode] = useState(settingsCtx?.settings?.jellyfin?.isManualMode || false);

    // FIX: Do not auto-fill API key if not admin to prevent accidental escalation
    const [jfApiKey, setJfApiKey] = useState(
        (isAdmin && settingsCtx?.settings?.jellyfin?.apiKey) ? settingsCtx.settings.jellyfin.apiKey : ''
    );

    // Radarr state
    const [radarrUrl, setRadarrUrl] = useState(settingsCtx?.settings?.radarr?.url || '');
    const [radarrApiKey, setRadarrApiKey] = useState(settingsCtx?.settings?.radarr?.apiKey || '');
    const [isTestingRadarr, setIsTestingRadarr] = useState(false);
    const [radarrStatus, setRadarrStatus] = useState<'untested' | 'success' | 'error'>('untested');

    // Sonarr state
    const [sonarrUrl, setSonarrUrl] = useState(settingsCtx?.settings?.sonarr?.url || '');
    const [sonarrApiKey, setSonarrApiKey] = useState(settingsCtx?.settings?.sonarr?.apiKey || '');
    const [isTestingSonarr, setIsTestingSonarr] = useState(false);
    const [sonarrStatus, setSonarrStatus] = useState<'untested' | 'success' | 'error'>('untested');
    
    // Automation state
    const [movieRetentionDays, setMovieRetentionDays] = useState(settingsCtx?.settings?.automation?.movieRetentionDays || 7);
    const [tvSeasonRetentionDays, setTvSeasonRetentionDays] = useState(settingsCtx?.settings?.automation?.tvSeasonRetentionDays || 28);

    // Webhook state
    const [discordWebhookUrl, setDiscordWebhookUrl] = useState(settingsCtx?.settings?.webhooks?.discordUrl || '');
    const [webhookEnabled, setWebhookEnabled] = useState(settingsCtx?.settings?.webhooks?.enabled || false);
    const [webhookName, setWebhookName] = useState(settingsCtx?.settings?.webhooks?.username || 'Medusa');
    const [webhookAvatar, setWebhookAvatar] = useState(settingsCtx?.settings?.webhooks?.avatarUrl || '');

    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [isImporting, setIsImporting] = useState(false);

    useEffect(() => {
        if (settingsCtx?.settings) {
            setJfUrl(settingsCtx.settings.jellyfin?.url || '');
            
            // Sync Manual Mode state
            setIsManualApiMode(settingsCtx.settings.jellyfin?.isManualMode || false);

            // FIX: Only sync API key from settings if user is Admin.
            // If user is 'user', keep it empty to force manual entry if they want to enable Manual Mode.
            if (currentUser?.role === 'admin') {
                setJfApiKey(settingsCtx.settings.jellyfin?.apiKey || '');
            } else {
                 setJfApiKey('');
            }

            setRadarrUrl(settingsCtx.settings.radarr?.url || '');
            setRadarrApiKey(settingsCtx.settings.radarr?.apiKey || '');
            setSonarrUrl(settingsCtx.settings.sonarr?.url || '');
            setSonarrApiKey(settingsCtx.settings.sonarr?.apiKey || '');
            setMovieRetentionDays(settingsCtx.settings.automation?.movieRetentionDays || 7);
            setTvSeasonRetentionDays(settingsCtx.settings.automation?.tvSeasonRetentionDays || 28);
            setDiscordWebhookUrl(settingsCtx.settings.webhooks?.discordUrl || '');
            setWebhookEnabled(settingsCtx.settings.webhooks?.enabled || false);
            setWebhookName(settingsCtx.settings.webhooks?.username || 'Medusa');
            setWebhookAvatar(settingsCtx.settings.webhooks?.avatarUrl || '');
        }
    }, [settingsCtx, currentUser]);

    const handleTestRadarr = async () => {
        if (!radarrUrl || !radarrApiKey) return;
        setIsTestingRadarr(true);
        setError(null);
        try {
            await testRadarrConnection({ url: radarrUrl, apiKey: radarrApiKey });
            setRadarrStatus('success');
        } catch (err: any) {
            setRadarrStatus('error');
            setError(err.message);
        } finally {
            setIsTestingRadarr(false);
        }
    };
    
    const handleTestSonarr = async () => {
        if (!sonarrUrl || !sonarrApiKey) return;
        setIsTestingSonarr(true);
        setError(null);
        try {
            await testSonarrConnection({ url: sonarrUrl, apiKey: sonarrApiKey });
            setSonarrStatus('success');
        } catch (err: any) {
            setSonarrStatus('error');
            setError(err.message);
        } finally {
            setIsTestingSonarr(false);
        }
    };

    const handleSave = () => {
        if (settingsCtx) {
            const currentUserId = settingsCtx.settings?.jellyfin?.userId || '';

            // FIX: Handle API Key logic safely
            let apiKeyToSave = jfApiKey;
            
            // If field is empty (because hidden/non-admin) and we are NOT in manual mode,
            // preserve the existing token from settings (User Token) to avoid breaking the app
            if (!isManualApiMode && !apiKeyToSave) {
                apiKeyToSave = settingsCtx.settings?.jellyfin?.apiKey || '';
            }

            // Validation: If Manual Mode is checked, we MUST have a key in the input
            if (isManualApiMode && !apiKeyToSave) {
                setError("Veuillez entrer une clé API valide pour activer le mode manuel.");
                return;
            }

            const newSettings: JccSettings = {
                jellyfin: { 
                    url: jfUrl, 
                    apiKey: apiKeyToSave, 
                    userId: currentUserId,
                    isManualMode: isManualApiMode // Save the state
                },
                automation: {
                    movieRetentionDays: Number(movieRetentionDays),
                    tvSeasonRetentionDays: Number(tvSeasonRetentionDays)
                },
                webhooks: {
                    discordUrl: discordWebhookUrl,
                    enabled: webhookEnabled,
                    username: webhookName,
                    avatarUrl: webhookAvatar
                }
            };

            if (radarrUrl && radarrApiKey) {
                newSettings.radarr = { url: radarrUrl, apiKey: radarrApiKey };
            }
            
            if (sonarrUrl && sonarrApiKey) {
                newSettings.sonarr = { url: sonarrUrl, apiKey: sonarrApiKey };
            }
            
            settingsCtx.setSettings(newSettings);
            
            // FIX: Only elevate role if Manual Mode is ON AND we explicitly provided a key in the input
            // This prevents escalation when saving settings with auto-filled user tokens
            if (isManualApiMode && jfApiKey) {
                updateUser({ role: 'admin' });
            }

            setSuccessMessage(t('settingsSaveSuccess'));
            setTimeout(() => setSuccessMessage(null), 3000);
        }
    };

    const handleExport = () => {
        const exclusions = localStorage.getItem('jellyfin-exclusions') || '[]';
        const exportData = {
            settings: settingsCtx?.settings,
            exclusions: JSON.parse(exclusions)
        };
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `medusa-settings-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target?.result as string);
                if (data.settings) {
                    settingsCtx?.setSettings(data.settings);
                    if (data.exclusions) {
                        localStorage.setItem('jellyfin-exclusions', JSON.stringify(data.exclusions));
                    }
                    setSuccessMessage(t('settingsImportSuccess'));
                    setTimeout(() => window.location.reload(), 1500);
                } else {
                    setError(t('settingsImportError'));
                }
            } catch (err) {
                setError(t('settingsImportError'));
            }
        };
        reader.readAsText(file);
    };

    const handleLetterboxdImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const items = await parseLetterboxdZip(file);
            setExternalHistory(items);
            setSuccessMessage(t('settingsImportLetterboxdSuccess', { count: items.length }));
        } catch (err: any) {
            console.error(err);
            setError(t('settingsImportLetterboxdError') + " " + err.message);
        } finally {
            setIsImporting(false);
            if (letterboxdInputRef.current) {
                letterboxdInputRef.current.value = '';
            }
        }
    };

    return (
        <div className="container mx-auto animate-fade-in-up pb-20">
            <h1 className="text-5xl font-extrabold text-white mb-10">{t('settingsTitle')}</h1>
            
            <div className="max-w-4xl mx-auto space-y-8">
                
                {/* Jellyfin Settings (Always Visible) */}
                <SettingsSection title={t('settingsJellyfinRequired')} colorClass="bg-jellyfin-accent">
                    <p className="text-xs text-white/50 mb-4 uppercase tracking-wider font-bold">Read-Only (Managed via Login) unless override enabled</p>
                    <SettingsInput id="jfUrl" label={t('settingsServerUrl')} value={jfUrl} onChange={(e) => setJfUrl(e.target.value)} disabled />
                    
                    <div className="flex items-center space-x-3 mb-4 pt-2 border-t border-white/10">
                        <input 
                            type="checkbox" 
                            id="manualApiMode"
                            checked={isManualApiMode}
                            onChange={(e) => setIsManualApiMode(e.target.checked)}
                            className="w-5 h-5 rounded bg-white/10 border-white/20 checked:bg-jellyfin-accent focus:ring-0 cursor-pointer"
                        />
                        <div className="flex flex-col">
                            <label htmlFor="manualApiMode" className="text-white font-bold cursor-pointer select-none">{t('settingsManualApiMode')}</label>
                            <span className="text-xs text-gray-400">{t('settingsManualApiDesc')}</span>
                        </div>
                    </div>

                    <SettingsInput 
                        id="jfApiKey" 
                        label="API Key / Access Token" 
                        type="password" 
                        value={jfApiKey} 
                        onChange={(e) => setJfApiKey(e.target.value)} 
                        disabled={!isManualApiMode} 
                        placeholder={isManualApiMode ? "Enter Admin API Key here" : "Locked (User Token)"}
                    />
                </SettingsSection>

                {isAdmin && (
                    <>
                        {/* Radarr Settings */}
                        <SettingsSection title={t('settingsRadarrOptional')} colorClass="bg-yellow-400">
                            <SettingsInput id="radarrUrl" label={t('settingsServerUrl')} value={radarrUrl} onChange={(e) => { setRadarrUrl(e.target.value); setRadarrStatus('untested'); }} placeholder="http://192.168.1.11:7878" />
                            <SettingsInput id="radarrApiKey" label={t('settingsApiKey')} type="password" value={radarrApiKey} onChange={(e) => { setRadarrApiKey(e.target.value); setRadarrStatus('untested'); }} placeholder="API Key" />
                            
                            <button onClick={handleTestRadarr} disabled={isTestingRadarr || !radarrUrl || !radarrApiKey} className={`w-full py-3 rounded-xl text-sm font-bold text-white transition-all duration-300 flex justify-center items-center ${radarrStatus === 'success' ? 'bg-green-500/20 text-green-400 border border-green-500/50' : radarrStatus === 'error' ? 'bg-red-500/20 text-red-400 border border-red-500/50' : 'bg-white/5 border border-white/10 hover:bg-white/10'}`}>
                                {isTestingRadarr && <Spinner />}
                                {radarrStatus === 'success' && t('settingsTestSuccess')}
                                {radarrStatus === 'error' && t('settingsTestFailure')}
                                {radarrStatus === 'untested' && !isTestingRadarr && t('settingsTestConnection')}
                            </button>
                        </SettingsSection>

                        {/* Sonarr Settings */}
                        <SettingsSection title={t('settingsSonarrOptional')} colorClass="bg-blue-400">
                            <SettingsInput id="sonarrUrl" label={t('settingsServerUrl')} value={sonarrUrl} onChange={(e) => { setSonarrUrl(e.target.value); setSonarrStatus('untested'); }} placeholder="http://192.168.1.12:8989" />
                            <SettingsInput id="sonarrApiKey" label={t('settingsApiKey')} type="password" value={sonarrApiKey} onChange={(e) => { setSonarrApiKey(e.target.value); setSonarrStatus('untested'); }} placeholder="API Key" />
                            
                            <button onClick={handleTestSonarr} disabled={isTestingSonarr || !sonarrUrl || !sonarrApiKey} className={`w-full py-3 rounded-xl text-sm font-bold text-white transition-all duration-300 flex justify-center items-center ${sonarrStatus === 'success' ? 'bg-green-500/20 text-green-400 border border-green-500/50' : sonarrStatus === 'error' ? 'bg-red-500/20 text-red-400 border border-red-500/50' : 'bg-white/5 border border-white/10 hover:bg-white/10'}`}>
                                {isTestingSonarr && <Spinner />}
                                {sonarrStatus === 'success' && t('settingsTestSuccess')}
                                {sonarrStatus === 'error' && t('settingsTestFailure')}
                                {sonarrStatus === 'untested' && !isTestingSonarr && t('settingsTestConnection')}
                            </button>
                        </SettingsSection>

                        {/* Automation Settings */}
                        <SettingsSection title={t('settingsAutomation')} colorClass="bg-emerald-400">
                            <SettingsInput id="movieRetention" label={t('settingsMovieRetention')} type="number" value={movieRetentionDays} onChange={(e) => setMovieRetentionDays(Number(e.target.value))} />
                            <SettingsInput id="tvRetention" label={t('settingsTvSeasonRetention')} type="number" value={tvSeasonRetentionDays} onChange={(e) => setTvSeasonRetentionDays(Number(e.target.value))} />
                        </SettingsSection>
                        
                        {/* Notification Settings */}
                        <SettingsSection title="Notifications (Webhooks)" colorClass="bg-indigo-500">
                            <div className="flex items-center space-x-3 mb-4">
                                <input 
                                    type="checkbox" 
                                    id="webhookEnabled"
                                    checked={webhookEnabled}
                                    onChange={(e) => setWebhookEnabled(e.target.checked)}
                                    className="w-5 h-5 rounded bg-white/10 border-white/20 checked:bg-indigo-500 focus:ring-0"
                                />
                                <label htmlFor="webhookEnabled" className="text-white font-bold">Enable Discord Notifications</label>
                            </div>
                            <SettingsInput id="webhookUrl" label="Discord Webhook URL" type="text" value={discordWebhookUrl} onChange={(e) => setDiscordWebhookUrl(e.target.value)} placeholder="https://discord.com/api/webhooks/..." disabled={!webhookEnabled} />
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <SettingsInput id="webhookName" label={t('settingsWebhookName')} type="text" value={webhookName} onChange={(e) => setWebhookName(e.target.value)} placeholder="Medusa" disabled={!webhookEnabled} />
                                <SettingsInput id="webhookAvatar" label={t('settingsWebhookIcon')} type="text" value={webhookAvatar} onChange={(e) => setWebhookAvatar(e.target.value)} placeholder="https://..." disabled={!webhookEnabled} />
                            </div>
                        </SettingsSection>

                        {/* Data Management Section */}
                        <SettingsSection title={t('settingsDataManagement')} colorClass="bg-gray-500">
                            <div className="flex flex-col gap-4">
                                <div className="flex flex-col sm:flex-row gap-4">
                                    <button 
                                        onClick={handleExport}
                                        className="flex-1 py-4 bg-white/5 border border-white/10 text-white rounded-xl font-bold flex items-center justify-center hover:bg-white/10 transition-all"
                                    >
                                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                        {t('settingsExportButton')}
                                    </button>
                                    <button 
                                        onClick={() => fileInputRef.current?.click()}
                                        className="flex-1 py-4 bg-white/5 border border-white/10 text-white rounded-xl font-bold flex items-center justify-center hover:bg-white/10 transition-all"
                                    >
                                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                        {t('settingsImportButton')}
                                    </button>
                                    <input 
                                        type="file" 
                                        ref={fileInputRef} 
                                        onChange={handleImport} 
                                        className="hidden" 
                                        accept=".json"
                                    />
                                </div>
                                
                                {/* Letterboxd Import */}
                                <div className="pt-4 border-t border-white/10">
                                    <p className="text-xs text-gray-400 mb-2 font-medium">External Sources</p>
                                    <button 
                                        onClick={() => letterboxdInputRef.current?.click()}
                                        disabled={isImporting}
                                        className="w-full py-4 bg-gradient-to-r from-orange-500/20 to-green-500/20 border border-white/10 text-white rounded-xl font-bold flex items-center justify-center hover:bg-white/10 transition-all disabled:opacity-50"
                                    >
                                        {isImporting ? <Spinner /> : <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>}
                                        {t('settingsImportLetterboxdButton')}
                                    </button>
                                    <input 
                                        type="file" 
                                        ref={letterboxdInputRef} 
                                        onChange={handleLetterboxdImport} 
                                        className="hidden" 
                                        accept=".zip"
                                    />
                                </div>
                            </div>
                        </SettingsSection>
                    </>
                )}

                {error && <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-200 text-sm text-center backdrop-blur-sm">{error}</div>}
                
                <div className="pt-4 pb-10">
                    <button
                        onClick={handleSave}
                        className="w-full px-6 py-4 bg-gradient-to-r from-jellyfin-accent to-purple-600 text-white rounded-xl font-bold text-lg shadow-[0_0_20px_rgba(170,0,255,0.4)] transition-all duration-300 transform hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(170,0,255,0.6)] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:transform-none"
                    >
                        {t('settingsSaveButton')}
                    </button>
                    {successMessage && <div className="mt-4 p-4 bg-green-500/20 border border-green-500/50 rounded-xl text-green-200 text-sm text-center backdrop-blur-sm animate-fade-in-up">{successMessage}</div>}
                </div>
            </div>
        </div>
    );
};

export default Settings;