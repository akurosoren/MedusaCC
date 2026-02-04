import React, { useState, useEffect, useContext } from 'react';
import { SettingsContext } from '../App';
import { testRadarrConnection, getRadarrQueue } from '../services/radarrService';
import { testSonarrConnection, getSonarrQueue } from '../services/sonarrService';
import { getActiveSessions } from '../services/jellyfinService';
import { QueueItem } from '../types';
import Spinner from './common/Spinner';
import { useTranslation } from '../hooks/useTranslation';
import { useAuth } from '../auth/AuthContext';
import { UsersIcon } from '../constants';

type ServiceStatus = 'online' | 'offline' | 'unconfigured';
interface Statuses {
    jellyfin: ServiceStatus;
    radarr: ServiceStatus;
    sonarr: ServiceStatus;
    jellyfinPing?: number;
    radarrPing?: number;
    sonarrPing?: number;
}

// Compact Status Indicator: Just Name + Dot (and ping)
const StatusIndicator: React.FC<{ status: ServiceStatus, label: string, ping?: number }> = ({ status, label, ping }) => {
    const colorMap: Record<ServiceStatus, string> = {
        online: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]',
        offline: 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]',
        unconfigured: 'bg-gray-600',
    };
    
    return (
        <div className="bg-white/[0.03] border border-white/5 rounded-lg px-4 py-3 flex items-center justify-between transition-colors hover:bg-white/[0.05]">
            <span className="font-bold text-sm text-gray-300 tracking-wide">{label}</span>
            <div className="flex items-center space-x-3">
                {ping !== undefined && status === 'online' && (
                     <span className="text-[9px] text-gray-600 font-mono">{ping}ms</span>
                )}
                <div className={`h-2.5 w-2.5 rounded-full ${colorMap[status]} ${status === 'online' ? 'animate-pulse' : ''}`}></div>
            </div>
        </div>
    );
};

// Compact Queue List
const QueueList: React.FC<{ items: QueueItem[], source: string }> = ({ items, source }) => {
     if (items.length === 0) return null;

     return (
        <div className="space-y-2">
            {items.map(item => {
                const percentage = item.size > 0 ? Math.round(((item.size - item.sizeleft) / item.size) * 100) : 0;
                return (
                    <div key={item.id} className="bg-black/20 p-2 rounded-lg border border-white/[0.03] flex items-center gap-3">
                        {/* Source Badge */}
                        <div className={`flex-shrink-0 w-1 h-8 rounded-full ${source === 'Radarr' ? 'bg-yellow-500/50' : 'bg-blue-500/50'}`}></div>
                        
                        {/* Title & Progress */}
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-baseline mb-1">
                                <span className="text-[11px] font-semibold text-gray-300 truncate pr-2" title={item.title}>{item.title}</span>
                                <span className="text-[9px] text-gray-500 font-mono">{item.timeleft || '-'}</span>
                            </div>
                            <div className="w-full bg-white/5 rounded-full h-1 overflow-hidden">
                                <div className={`h-1 rounded-full transition-all duration-500 ${source === 'Radarr' ? 'bg-yellow-500' : 'bg-blue-500'}`} style={{ width: `${percentage}%` }}></div>
                            </div>
                        </div>

                        {/* Percentage */}
                        <span className="text-[10px] font-bold text-gray-400 w-8 text-right">{percentage}%</span>
                    </div>
                );
            })}
        </div>
     );
};

const Dashboard: React.FC = () => {
    const settingsCtx = useContext(SettingsContext);
    const { currentUser } = useAuth();
    const { t } = useTranslation();
    const isAdmin = currentUser?.role === 'admin';

    // State for Admin
    const [statuses, setStatuses] = useState<Statuses>({ jellyfin: 'unconfigured', radarr: 'unconfigured', sonarr: 'unconfigured' });
    const [downloads, setDownloads] = useState<{ radarr: QueueItem[], sonarr: QueueItem[] }>({ radarr: [], sonarr: [] });
    const [activeSessionCount, setActiveSessionCount] = useState<number>(0);
    
    const [isLoading, setIsLoading] = useState(true);

    const fetchDashboardData = async () => {
        if (!settingsCtx?.settings?.jellyfin?.url || !isAdmin) {
            setIsLoading(false);
            return;
        }

        const { jellyfin, radarr, sonarr } = settingsCtx.settings;

        const promises = [];
        let newStatuses: Statuses = { ...statuses };

        newStatuses.jellyfin = 'online';
        if (jellyfin.url && jellyfin.apiKey) {
            const startJf = performance.now();
            
            // 1. Get Active Sessions Count (Only those playing media)
            const sessionsPromise = getActiveSessions(jellyfin)
                .then((s) => {
                    const activeS = s || [];
                    // Filter: Only count sessions that have a 'NowPlayingItem'
                    const playingSessions = activeS.filter(session => session.NowPlayingItem);
                    setActiveSessionCount(playingSessions.length); 
                    newStatuses.jellyfinPing = Math.round(performance.now() - startJf);
                })
                .catch(() => { 
                    newStatuses.jellyfin = 'offline'; 
                    setActiveSessionCount(0);
                });
            
            promises.push(sessionsPromise);
        }

        if (radarr?.url && radarr?.apiKey) {
            const startRad = performance.now();
            promises.push(
                testRadarrConnection(radarr)
                    .then(async () => {
                        newStatuses.radarr = 'online';
                        newStatuses.radarrPing = Math.round(performance.now() - startRad);
                        try { const q = await getRadarrQueue(radarr); setDownloads(prev => ({ ...prev, radarr: q.records || [] })); } catch {}
                    })
                    .catch(() => { newStatuses.radarr = 'offline'; })
            );
        }

        if (sonarr?.url && sonarr?.apiKey) {
            const startSon = performance.now();
            promises.push(
                testSonarrConnection(sonarr)
                    .then(async () => {
                        newStatuses.sonarr = 'online';
                        newStatuses.sonarrPing = Math.round(performance.now() - startSon);
                        try { const q = await getSonarrQueue(sonarr); setDownloads(prev => ({ ...prev, sonarr: q.records || [] })); } catch {}
                    })
                    .catch(() => { newStatuses.sonarr = 'offline'; })
            );
        }

        await Promise.all(promises);
        setStatuses(st => ({...st, ...newStatuses}));
        
        setIsLoading(false);
    };

    useEffect(() => {
        if (!isAdmin) return;
        setIsLoading(true);
        fetchDashboardData();
        const interval = setInterval(fetchDashboardData, 15000); // Poll every 15s
        return () => clearInterval(interval);
    }, [settingsCtx, currentUser, isAdmin]);

    if (isLoading && statuses.jellyfin === 'unconfigured') {
        return (
            <div className="flex justify-center items-center h-full">
                <Spinner />
                <span className="ml-4 text-xl font-medium tracking-tight text-white/50">{t('dashboardLoading')}</span>
            </div>
        );
    }
    
    // Check if configuration is missing for admins
    if (statuses.jellyfin === 'unconfigured') {
         return (
             <div className="glass-panel p-8 rounded-[32px] max-w-2xl mx-auto text-center animate-fade-in-up border-white/5">
                <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">{t('dashboardWelcomeTitle')}</h2>
                <p className="text-gray-400 text-base leading-relaxed font-medium">
                    {t('dashboardWelcomeMessage')}
                </p>
            </div>
         );
    }

    // --- RENDER ADMIN DASHBOARD ---
    return (
        <div className="w-full space-y-6 animate-fade-in-up pb-8">
            <div className="flex justify-between items-center">
                <h1 className="text-4xl font-bold text-white tracking-tighter mb-2">{t('dashboardTitle')}</h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 
                 {/* LEFT COLUMN: Sessions + Statuses */}
                 <div className="lg:col-span-1 space-y-4">
                     {/* Active Sessions Counter */}
                     <div className="glass-panel p-6 rounded-2xl border-white/5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                             <UsersIcon />
                        </div>
                        <h2 className="text-xs font-bold text-white/50 uppercase tracking-widest mb-1">{t('dashboardActiveUsers')}</h2>
                        <div className="flex items-baseline space-x-2">
                            <span className="text-6xl font-black text-white tracking-tighter shadow-black drop-shadow-lg">{activeSessionCount}</span>
                            <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">watching</span>
                        </div>
                     </div>

                     {/* Compact Status Indicators Stacked */}
                     <div className="space-y-2">
                        <StatusIndicator status={statuses.jellyfin} label={t('jellyfin')} ping={statuses.jellyfinPing} />
                        <StatusIndicator status={statuses.radarr} label={t('radarr')} ping={statuses.radarrPing} />
                        <StatusIndicator status={statuses.sonarr} label={t('sonarr')} ping={statuses.sonarrPing} />
                     </div>
                 </div>

                 {/* RIGHT COLUMN: Downloads */}
                 <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border-white/5 relative overflow-hidden shadow-2xl flex flex-col h-full min-h-[300px]">
                    <h2 className="text-xs font-bold text-white/50 mb-4 flex items-center tracking-widest uppercase">
                        {t('dashboardDownloads')}
                        {(downloads.radarr.length > 0 || downloads.sonarr.length > 0) && (
                            <span className="ml-2 bg-white/10 text-white px-1.5 py-0.5 rounded text-[9px]">{downloads.radarr.length + downloads.sonarr.length}</span>
                        )}
                    </h2>
                    
                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
                        {(downloads.radarr.length > 0 || downloads.sonarr.length > 0) ? (
                            <div className="space-y-4">
                                <QueueList items={downloads.radarr} source="Radarr" />
                                <QueueList items={downloads.sonarr} source="Sonarr" />
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                <p className="text-xs font-medium">{t('dashboardNoDownloads')}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;