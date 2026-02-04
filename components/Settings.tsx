import React, { useContext, useState, useEffect, useRef } from 'react';
import { SettingsContext } from '../App';
import { getJellyfinUsers } from '../services/jellyfinService';
import { testRadarrConnection } from '../services/radarrService';
import { testSonarrConnection } from '../services/sonarrService';
import { JellyfinUser, JccSettings } from '../types';
import Spinner from './common/Spinner';
import Modal from './common/Modal';
import { useTranslation } from '../hooks/useTranslation';
import { useAuth } from '../auth/AuthContext';

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
        <input
            {...props}
            className="w-full glass-input rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none transition-all duration-300"
        />
    </div>
);

const Settings: React.FC = () => {
    const settingsCtx = useContext(SettingsContext);
    const { t } = useTranslation();
    const { changePassword, resetPassword } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Jellyfin state
    const [jfUrl, setJfUrl] = useState(settingsCtx?.settings?.jellyfin?.url || '');
    const [jfApiKey, setJfApiKey] = useState(settingsCtx?.settings?.jellyfin?.apiKey || '');
    const [jfUserId, setJfUserId] = useState(settingsCtx?.settings?.jellyfin?.userId || '');
    const [jfUsers, setJfUsers] = useState<JellyfinUser[]>([]);
    const [isLoadingJfUsers, setIsLoadingJfUsers] = useState(false);

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

    // Security state
    const [currentPass, setCurrentPass] = useState('');
    const [newPass, setNewPass] = useState('');
    const [confirmNewPass, setConfirmNewPass] = useState('');
    const [passError, setPassError] = useState<string | null>(null);
    const [passSuccess, setPassSuccess] = useState<string | null>(null);
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);

    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    useEffect(() => {
        if (settingsCtx?.settings) {
            setJfUrl(settingsCtx.settings.jellyfin?.url || '');
            setJfApiKey(settingsCtx.settings.jellyfin?.apiKey || '');
            setJfUserId(settingsCtx.settings.jellyfin?.userId || '');
            setRadarrUrl(settingsCtx.settings.radarr?.url || '');
            setRadarrApiKey(settingsCtx.settings.radarr?.apiKey || '');
            setSonarrUrl(settingsCtx.settings.sonarr?.url || '');
            setSonarrApiKey(settingsCtx.settings.sonarr?.apiKey || '');
            setMovieRetentionDays(settingsCtx.settings.automation?.movieRetentionDays || 7);
            setTvSeasonRetentionDays(settingsCtx.settings.automation?.tvSeasonRetentionDays || 28);
        }
    }, [settingsCtx]);

    const handleFetchJfUsers = async () => {
        if (!jfUrl || !jfApiKey) {
            setError(t('settingsMissingJfUrlOrKey'));
            return;
        }
        setIsLoadingJfUsers(true);
        setError(null);
        setJfUsers([]);
        try {
            const fetchedUsers = await getJellyfinUsers({ url: jfUrl, apiKey: jfApiKey });
            setJfUsers(fetchedUsers);
            if(fetchedUsers.length > 0 && !jfUserId) {
                setJfUserId(fetchedUsers[0].Id);
            }
        } catch (err) {
            setError(t('settingsFetchUsersError'));
        } finally {
            setIsLoadingJfUsers(false);
        }
    };

    const handleTestRadarr = async () => {
        if (!radarrUrl || !radarrApiKey) return;
        setIsTestingRadarr(true);
        try {
            await testRadarrConnection({ url: radarrUrl, apiKey: radarrApiKey });
            setRadarrStatus('success');
        } catch {
            setRadarrStatus('error');
        } finally {
            setIsTestingRadarr(false);
        }
    };
    
    const handleTestSonarr = async () => {
        if (!sonarrUrl || !sonarrApiKey) return;
        setIsTestingSonarr(true);
        try {
            await testSonarrConnection({ url: sonarrUrl, apiKey: sonarrApiKey });
            setSonarrStatus('success');
        } catch {
            setSonarrStatus('error');
        } finally {
            setIsTestingSonarr(false);
        }
    };

    const handleSave = () => {
        if (settingsCtx) {
            const newSettings: JccSettings = {
                jellyfin: { url: jfUrl, apiKey: jfApiKey, userId: jfUserId },
                automation: {
                    movieRetentionDays: Number(movieRetentionDays),
                    tvSeasonRetentionDays: Number(tvSeasonRetentionDays)
                }
            };

            if (radarrUrl && radarrApiKey) {
                newSettings.radarr = { url: radarrUrl, apiKey: radarrApiKey };
            }
            
            if (sonarrUrl && sonarrApiKey) {
                newSettings.sonarr = { url: sonarrUrl, apiKey: sonarrApiKey };
            }
            
            settingsCtx.setSettings(newSettings);
            setSuccessMessage(t('settingsSaveSuccess'));
            setTimeout(() => setSuccessMessage(null), 3000);
        }
    };

    const handleChangePassword = (e: React.FormEvent) => {
        e.preventDefault();
        setPassError(null);
        setPassSuccess(null);

        if (newPass !== confirmNewPass) {
            setPassError(t('loginPasswordsMismatch'));
            return;
        }

        if (newPass.length < 4) {
            setPassError(t('loginPasswordTooShort'));
            return;
        }

        const success = changePassword(currentPass, newPass);
        if (success) {
            setPassSuccess(t('settingsPasswordChangeSuccess'));
            setCurrentPass('');
            setNewPass('');
            setConfirmNewPass('');
        } else {
            setPassError(t('settingsInvalidCurrentPassword'));
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

    const handleResetPassword = () => {
        setIsResetModalOpen(false);
        resetPassword();
    };

    const isSaveDisabled = !jfUrl || !jfApiKey || !jfUserId;

    return (
        <div className="container mx-auto animate-fade-in-up pb-20">
            <h1 className="text-5xl font-extrabold text-white mb-10">{t('settingsTitle')}</h1>
            
            <div className="max-w-4xl mx-auto space-y-8">
                
                {/* Jellyfin Settings */}
                <SettingsSection title={t('settingsJellyfinRequired')} colorClass="bg-jellyfin-accent">
                    <SettingsInput id="jfUrl" label={t('settingsServerUrl')} value={jfUrl} onChange={(e) => setJfUrl(e.target.value)} placeholder="http://192.168.1.10:8096" />
                    <SettingsInput id="jfApiKey" label={t('settingsApiKey')} type="password" value={jfApiKey} onChange={(e) => setJfApiKey(e.target.value)} placeholder="API Key" />
                    
                    <button onClick={handleFetchJfUsers} disabled={isLoadingJfUsers} className="w-full py-3 rounded-xl border border-white/10 text-sm font-bold text-white bg-white/5 hover:bg-white/10 transition-colors flex justify-center items-center">
                        {isLoadingJfUsers && <Spinner />}
                        {isLoadingJfUsers ? t('loading') : t('settingsLoadUsers')}
                    </button>
                    {jfUsers.length > 0 && (
                        <div>
                            <label htmlFor="jfUserId" className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider ml-1">{t('settingsUserToUse')}</label>
                            <select id="jfUserId" value={jfUserId} onChange={(e) => setJfUserId(e.target.value)} className="w-full glass-input rounded-xl px-4 py-3 text-white appearance-none cursor-pointer">
                                <option value="" className="bg-jellyfin-dark">{t('settingsSelectUser')}</option>
                                {jfUsers.map(user => (<option key={user.Id} value={user.Id} className="bg-jellyfin-dark">{user.Name}</option>))}
                            </select>
                        </div>
                    )}
                </SettingsSection>

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

                {/* Security Section */}
                <SettingsSection title={t('settingsSecurity')} colorClass="bg-rose-500">
                    <form onSubmit={handleChangePassword} className="space-y-6">
                        <SettingsInput 
                            id="currentPass" 
                            label={t('settingsCurrentPassword')} 
                            type="password" 
                            value={currentPass} 
                            onChange={(e) => setCurrentPass(e.target.value)} 
                            required 
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <SettingsInput 
                                id="newPass" 
                                label={t('settingsNewPassword')} 
                                type="password" 
                                value={newPass} 
                                onChange={(e) => setNewPass(e.target.value)} 
                                required 
                            />
                            <SettingsInput 
                                id="confirmNewPass" 
                                label={t('settingsConfirmNewPassword')} 
                                type="password" 
                                value={confirmNewPass} 
                                onChange={(e) => setConfirmNewPass(e.target.value)} 
                                required 
                            />
                        </div>
                        <button 
                            type="submit"
                            className="w-full py-3 bg-white text-black rounded-xl font-bold transition-all duration-300 transform hover:scale-[1.01]"
                        >
                            {t('settingsChangePasswordButton')}
                        </button>
                        {passError && <p className="text-red-400 text-xs font-bold text-center mt-2">{passError}</p>}
                        {passSuccess && <p className="text-emerald-400 text-xs font-bold text-center mt-2">{passSuccess}</p>}
                    </form>
                </SettingsSection>

                {/* Data Management Section */}
                <SettingsSection title={t('settingsDataManagement')} colorClass="bg-indigo-500">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <button 
                            onClick={handleExport}
                            className="flex-1 py-4 bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 rounded-xl font-bold flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all"
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
                </SettingsSection>

                {/* Danger Zone */}
                <SettingsSection title={t('settingsDangerZone')} colorClass="bg-red-600">
                    <p className="text-white/40 text-xs font-medium mb-4 italic">
                        {t('settingsResetPasswordConfirmBody')}
                    </p>
                    <button 
                        onClick={() => setIsResetModalOpen(true)}
                        className="w-full py-4 border border-red-600/50 text-red-500 hover:bg-red-600 hover:text-white rounded-xl font-bold transition-all duration-300"
                    >
                        {t('settingsResetPasswordButton')}
                    </button>
                </SettingsSection>

                {error && <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-200 text-sm text-center backdrop-blur-sm">{error}</div>}
                
                <div className="pt-4 pb-10">
                    <button
                        onClick={handleSave}
                        disabled={isSaveDisabled}
                        className="w-full px-6 py-4 bg-gradient-to-r from-jellyfin-accent to-purple-600 text-white rounded-xl font-bold text-lg shadow-[0_0_20px_rgba(170,0,255,0.4)] transition-all duration-300 transform hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(170,0,255,0.6)] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:transform-none"
                    >
                        {t('settingsSaveButton')}
                    </button>
                    {successMessage && <div className="mt-4 p-4 bg-green-500/20 border border-green-500/50 rounded-xl text-green-200 text-sm text-center backdrop-blur-sm animate-fade-in-up">{successMessage}</div>}
                </div>
            </div>

            <Modal
                isOpen={isResetModalOpen}
                onClose={() => setIsResetModalOpen(false)}
                onConfirm={handleResetPassword}
                title={t('settingsResetPasswordConfirmTitle')}
            >
                {t('settingsResetPasswordConfirmBody')}
            </Modal>
        </div>
    );
};

export default Settings;