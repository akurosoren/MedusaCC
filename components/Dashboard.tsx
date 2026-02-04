import React, { useState, useEffect, useContext } from 'react';
import { SettingsContext } from '../App';
import { testRadarrConnection, getRadarrDiskSpace, getRadarrQueue } from '../services/radarrService';
import { testSonarrConnection, getSonarrQueue } from '../services/sonarrService';
import { getActiveSessions } from '../services/jellyfinService';
import { SystemDiskSpace, QueueItem } from '../types';
import Spinner from './common/Spinner';
import { useTranslation } from '../hooks/useTranslation';
import { UsersIcon } from '../constants';

type ServiceStatus = 'online' | 'offline' | 'unconfigured';
interface Statuses {
    jellyfin: ServiceStatus;
    radarr: ServiceStatus;
    sonarr: ServiceStatus;
}

const StatusIndicator: React.FC<{ status: ServiceStatus, label: string }> = ({ status, label }) => {
    const { t } = useTranslation();
    const colorMap: Record<ServiceStatus, string> = {
        online: 'bg-emerald-500',
        offline: 'bg-red-500',
        unconfigured: 'bg-white/10',
    };
    const textMap: Record<ServiceStatus, string> = {
        online: t('statusOnline'),
        offline: t('statusOffline'),
        unconfigured: t('statusUnconfigured'),
    };

    return (
        <div className="glass-card p-5 rounded-2xl flex items-center justify-between group border-white/[0.05]">
            <span className="font-semibold text-lg text-white/90 group-hover:text-white transition-colors tracking-tight">{label}</span>
            <div className="flex items-center space-x-3 bg-white/[0.03] px-3 py-1.5 rounded-full border border-white/[0.05]">
                <span className={`h-2 w-2 rounded-full ${colorMap[status]} ${status === 'online' ? 'animate-pulse' : ''}`}></span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{textMap[status]}</span>
            </div>
        </div>
    );
};

const DiskSpaceBar: React.FC<{ disk: SystemDiskSpace }> = ({ disk }) => {
    const { t } = useTranslation();
    const usedSpace = disk.totalSpace - disk.freeSpace;
    const percentage = Math.round((usedSpace / disk.totalSpace) * 100);
    
    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    let barColorClass = 'bg-gradient-to-r from-emerald-500 to-cyan-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]';
    if (percentage >= 70 && percentage < 90) {
        barColorClass = 'bg-gradient-to-r from-orange-400 to-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.3)]';
    } else if (percentage >= 90) {
        barColorClass = 'bg-gradient-to-r from-rose-500 to-red-600 shadow-[0_0_15px_rgba(239,68,68,0.5)] animate-pulse';
    }

    return (
        <div className="mb-6 last:mb-0 group">
            <div className="flex justify-between text-[11px] font-bold mb-2 uppercase tracking-widest transition-colors duration-300 group-hover:text-white">
                <span className="text-white/60 group-hover:text-white">{disk.label || disk.path}</span>
                <span className="text-white/40 group-hover:text-white/60">{t('dashboardFreeSpace', { free: formatBytes(disk.freeSpace), total: formatBytes(disk.totalSpace) })}</span>
            </div>
            <div className="w-full bg-white/[0.03] rounded-full h-2.5 p-[1px] overflow-hidden border border-white/[0.05]">
                <div 
                    className={`h-full rounded-full ${barColorClass} transition-all duration-1000 ease-out relative`} 
                    style={{ width: `${percentage}%` }}
                >
                    <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                </div>
            </div>
            <div className="flex justify-end mt-1.5">
                <span className={`text-[10px] font-black tracking-tighter ${percentage > 90 ? 'text-red-400' : 'text-white/20'}`}>{percentage}%</span>
            </div>
        </div>
    );
};

const QueueList: React.FC<{ items: QueueItem[], source: string }> = ({ items, source }) => {
     if (items.length === 0) return null;

     return (
        <div className="space-y-4">
            {items.map(item => {
                const percentage = item.size > 0 ? Math.round(((item.size - item.sizeleft) / item.size) * 100) : 0;
                return (
                    <div key={item.id} className="bg-white/[0.02] p-4 rounded-2xl border border-white/[0.05] hover:bg-white/[0.04] transition-colors">
                        <div className="flex justify-between items-center mb-3">
                            <div className="flex items-center space-x-3 overflow-hidden">
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-widest border ${source === 'Radarr' ? 'bg-yellow-500/10 text-yellow-500/80 border-yellow-500/20' : 'bg-blue-500/10 text-blue-500/80 border-blue-500/20'}`}>{source}</span>
                                <span className="text-xs font-semibold truncate text-white/80 tracking-tight" title={item.title}>{item.title}</span>
                            </div>
                            <span className="text-[9px] text-white/30 font-bold uppercase tracking-widest">{item.status}</span>
                        </div>
                        <div className="w-full bg-black/30 rounded-full h-1 overflow-hidden mb-2">
                            <div className="bg-white/30 h-1 rounded-full transition-all duration-500" style={{ width: `${percentage}%` }}></div>
                        </div>
                        <div className="flex justify-between text-[9px] text-white/30 font-bold uppercase tracking-widest">
                             <span>{percentage}%</span>
                             <span>{item.timeleft || '-'}</span>
                        </div>
                    </div>
                );
            })}
        </div>
     );
};


const Dashboard: React.FC = () => {
    const settingsCtx = useContext(SettingsContext);
    const { t } = useTranslation();
    const [statuses, setStatuses] = useState<Statuses>({ jellyfin: 'unconfigured', radarr: 'unconfigured', sonarr: 'unconfigured' });
    const [diskSpace, setDiskSpace] = useState<SystemDiskSpace[]>([]);
    const [downloads, setDownloads] = useState<{ radarr: QueueItem[], sonarr: QueueItem[] }>({ radarr: [], sonarr: [] });
    const [activeUserCount, setActiveUserCount] = useState<number>(0);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!settingsCtx?.settings?.jellyfin?.url) {
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            const { jellyfin, radarr, sonarr } = settingsCtx.settings;

            const promises = [];

            // Radarr Status Check
            if (radarr?.url && radarr?.apiKey) {
                promises.push(
                    testRadarrConnection(radarr)
                        .then(async () => {
                            setStatuses(s => ({ ...s, radarr: 'online' }));
                            try {
                                const space = await getRadarrDiskSpace(radarr);
                                setDiskSpace(space);
                            } catch (e) { console.error(e) }
                            try {
                                const queue = await getRadarrQueue(radarr);
                                setDownloads(prev => ({ ...prev, radarr: queue.records || [] }));
                            } catch (e) { console.error(e) }
                        })
                        .catch(() => setStatuses(s => ({ ...s, radarr: 'offline' })))
                );
            }

            // Sonarr Status Check
            if (sonarr?.url && sonarr?.apiKey) {
                promises.push(
                    testSonarrConnection(sonarr)
                        .then(async () => {
                            setStatuses(s => ({ ...s, sonarr: 'online' }));
                            try {
                                const queue = await getSonarrQueue(sonarr);
                                setDownloads(prev => ({ ...prev, sonarr: queue.records || [] }));
                            } catch (e) { console.error(e) }
                        })
                        .catch(() => setStatuses(s => ({ ...s, sonarr: 'offline' })))
                );
            }
            
            // Jellyfin Checks
            if (jellyfin.url && jellyfin.apiKey) {
                promises.push(
                    getActiveSessions(jellyfin)
                        .then((sessions) => {
                            setStatuses(s => ({ ...s, jellyfin: 'online' }));
                            setActiveUserCount(sessions.length);
                        })
                        .catch((e) => {
                            console.error(e);
                             // If getActiveSessions fails but we had a URL, try basic health check or just mark offline
                             setStatuses(s => ({ ...s, jellyfin: 'offline' }));
                        })
                );
            } else {
                 try {
                    const response = await fetch(`${settingsCtx.settings.jellyfin.url}/System/Info/Public`);
                    if (response.ok) {
                        setStatuses(s => ({ ...s, jellyfin: 'online' }));
                    } else {
                        setStatuses(s => ({ ...s, jellyfin: 'offline' }));
                    }
                } catch {
                    setStatuses(s => ({ ...s, jellyfin: 'offline' }));
                }
            }


            await Promise.all(promises);
            setIsLoading(false);
        };

        fetchDashboardData();
    }, [settingsCtx]);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-full">
                <Spinner />
                <span className="ml-4 text-xl font-medium tracking-tight text-white/50">{t('dashboardLoading')}</span>
            </div>
        );
    }
    
    if (statuses.jellyfin === 'unconfigured') {
         return (
             <div className="glass-panel p-12 rounded-[32px] max-w-2xl mx-auto text-center animate-fade-in-up border-white/5">
                <h2 className="text-4xl font-bold text-white mb-6 tracking-tight">{t('dashboardWelcomeTitle')}</h2>
                <p className="text-gray-400 text-lg leading-relaxed font-medium">
                    {t('dashboardWelcomeMessage')}
                </p>
            </div>
         );
    }

    const hasDownloads = downloads.radarr.length > 0 || downloads.sonarr.length > 0;

    return (
        <div className="w-full space-y-12 animate-fade-in-up pb-12">
            <h1 className="text-6xl font-bold text-white tracking-tighter mb-4">{t('dashboardTitle')}</h1>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-10 items-start">
                <div className="xl:col-span-2 space-y-10">
                     {/* Server Status Indicators & Active Users */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatusIndicator status={statuses.jellyfin} label={t('jellyfin')} />
                        <StatusIndicator status={statuses.radarr} label={t('radarr')} />
                        <StatusIndicator status={statuses.sonarr} label={t('sonarr')} />
                        
                        {/* Active Users Card */}
                        <div className="glass-card p-5 rounded-2xl flex items-center justify-between group border-white/[0.05]">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1">{t('dashboardActiveUsers')}</span>
                                <span className="text-3xl font-bold text-white tracking-tighter">{activeUserCount}</span>
                            </div>
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-cyan-400 to-purple-600 flex items-center justify-center text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]">
                                <UsersIcon />
                            </div>
                        </div>
                    </div>

                    {/* Disk Space Overview */}
                    {(diskSpace.length > 0) && (
                        <div className="glass-panel p-10 rounded-[40px] border-white/5 shadow-2xl">
                            <h2 className="text-xl font-bold text-white mb-10 flex items-center tracking-tight uppercase tracking-widest text-[11px] text-white/50">
                                {t('dashboardDiskSpace')}
                            </h2>
                            <div className="space-y-4 pr-2">
                                {diskSpace.map((disk, idx) => (
                                    <DiskSpaceBar key={idx} disk={disk} />
                                ))}
                            </div>
                        </div>
                     )}
                </div>

                <div className="xl:col-span-1 space-y-10">
                     {/* Downloads Queue */}
                     <div className="glass-panel p-10 rounded-[40px] border-white/5 relative overflow-hidden shadow-2xl">
                        <h2 className="text-xl font-bold text-white mb-10 flex items-center tracking-tight uppercase tracking-widest text-[11px] text-white/50">
                            {t('dashboardDownloads')}
                        </h2>
                        {hasDownloads ? (
                            <div className="max-h-[600px] overflow-y-auto pr-2 space-y-5 custom-scrollbar">
                                <QueueList items={downloads.radarr} source="Radarr" />
                                <QueueList items={downloads.sonarr} source="Sonarr" />
                            </div>
                        ) : (
                            <div className="text-center py-16">
                                <p className="text-gray-500 text-sm italic font-medium">{t('dashboardNoDownloads')}</p>
                            </div>
                        )}
                     </div>
                </div>
            </div>
            
            {statuses.jellyfin === 'offline' && <p className="text-red-400 text-center glass-panel p-6 rounded-3xl border-red-500/20 font-medium">{t('dashboardJellyfinError')}</p>}
        </div>
    );
};

export default Dashboard;