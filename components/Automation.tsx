import React, { useState, useContext, useCallback } from 'react';
import { SettingsContext } from '../App';
import { getItems, getItemsByIds, getImageUrl } from '../services/jellyfinService';
import { getRadarrMovies, deleteRadarrMovie } from '../services/radarrService';
import { getSonarrSeries, getSonarrEpisodes, deleteSonarrEpisodeFile } from '../services/sonarrService';
import { JellyfinItem } from '../types';
import { PlayIcon, TrashIcon, SmallShieldIcon, ShieldCheckIcon, GridViewIcon, ListViewIcon } from '../constants';
import Spinner from './common/Spinner';
import Modal from './common/Modal';
import useLocalStorage from '../hooks/useLocalStorage';
import { useTranslation } from '../hooks/useTranslation';
import { useLanguage } from '../contexts/LanguageContext';

const Automation: React.FC = () => {
    const settingsCtx = useContext(SettingsContext);
    const { t } = useTranslation();
    const { language } = useLanguage();
    const [isLoading, setIsLoading] = useState(false);
    const [deletableItems, setDeletableItems] = useState<JellyfinItem[]>([]);
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [logs, setLogs] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [exclusions, setExclusions] = useLocalStorage<string[]>('jellyfin-exclusions', []);
    const [viewMode, setViewMode] = useLocalStorage<'grid' | 'list'>('automation-view-mode', 'grid');

    const movieRetentionDays = settingsCtx?.settings?.automation?.movieRetentionDays || 7;
    const tvSeasonRetentionDays = settingsCtx?.settings?.automation?.tvSeasonRetentionDays || 28;

    const addLog = (message: string) => {
        setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${message}`, ...prev]);
    };

    const handleScan = useCallback(async () => {
        if (!settingsCtx?.settings?.jellyfin) {
            setError(t('automationJellyfinNotConfigured'));
            return;
        }
        setIsLoading(true);
        setError(null);
        setDeletableItems([]);
        setSelectedItems(new Set());
        addLog(t('logScanStarted'));

        try {
            const allItems = await getItems(settingsCtx.settings.jellyfin, ['Movie', 'Season']);
            addLog(t('logScanFoundItems', { count: allItems.length }));
            const now = new Date();

            const itemsToFilter = allItems.filter(item => {
                if (exclusions.includes(item.Id)) {
                    return false;
                }
                const dateCreated = new Date(item.DateCreated);
                const ageInDays = (now.getTime() - dateCreated.getTime()) / (1000 * 3600 * 24);

                if (item.Type === 'Movie' && ageInDays > movieRetentionDays) {
                    return true;
                }
                if (item.Type === 'Season' && ageInDays > tvSeasonRetentionDays) {
                    return true;
                }
                return false;
            });
            
            setDeletableItems(itemsToFilter);
            setSelectedItems(new Set(itemsToFilter.map(item => item.Id))); // Select all by default
            addLog(t('logScanComplete', { count: itemsToFilter.length }));
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            setError(t('logScanError', { error: errorMessage }));
            addLog(t('logError', { error: errorMessage }));
        } finally {
            setIsLoading(false);
        }
    }, [settingsCtx, exclusions, movieRetentionDays, tvSeasonRetentionDays, t]);

    const handleToggleSelection = (itemId: string) => {
        setSelectedItems(prev => {
            const newSet = new Set(prev);
            if (newSet.has(itemId)) {
                newSet.delete(itemId);
            } else {
                newSet.add(itemId);
            }
            return newSet;
        });
    };
    
    const handleExcludeItem = (e: React.MouseEvent, itemToExclude: JellyfinItem) => {
        e.stopPropagation(); // Prevent card selection toggle
        setExclusions(prev => [...new Set([...prev, itemToExclude.Id])]);
        setDeletableItems(prev => prev.filter(item => item.Id !== itemToExclude.Id));
        setSelectedItems(prev => {
            const newSet = new Set(prev);
            newSet.delete(itemToExclude.Id);
            return newSet;
        });
        addLog(t('logItemExcluded', { name: itemToExclude.Name }));
    };

    const handleExcludeAll = () => {
        if (deletableItems.length === 0) return;

        const idsToExclude = deletableItems.map(item => item.Id);
        setExclusions(prev => [...new Set([...prev, ...idsToExclude])]);
        
        addLog(t('logAllExcluded', { count: idsToExclude.length }));

        // Clear the current view
        setDeletableItems([]);
        setSelectedItems(new Set());
    };

    const handleDelete = async () => {
        if (!settingsCtx?.settings || selectedItems.size === 0) return;
        const { jellyfin, radarr, sonarr } = settingsCtx.settings;

        setIsModalOpen(false);
        setIsLoading(true);
        addLog(t('logDeletionStarted', { count: selectedItems.size }));

        const itemsToDelete = deletableItems.filter(item => selectedItems.has(item.Id));
        let successCount = 0;
        
        try {
            const radarrMovies = radarr?.url && radarr?.apiKey ? await getRadarrMovies(radarr) : [];
            const sonarrSeries = sonarr?.url && sonarr?.apiKey ? await getSonarrSeries(sonarr) : [];
            
            const seasonItems = itemsToDelete.filter(i => i.Type === 'Season');
            const seriesIds = [...new Set(seasonItems.map(s => s.SeriesId).filter(Boolean) as string[])];
            const jellyfinParentSeries = seriesIds.length > 0 ? await getItemsByIds(jellyfin, seriesIds) : [];
            const seriesIdToProviderIdMap = new Map(jellyfinParentSeries.map(s => [s.Id, s.ProviderIds?.Tvdb]));
            
            for (const item of itemsToDelete) {
                if (item.Type === 'Movie') {
                    if (!radarr?.url || !radarr?.apiKey) {
                        addLog(t('logDeletionFailedRadarr', { name: item.Name }));
                        continue;
                    }
                    if (!item.ProviderIds?.Tmdb) {
                        addLog(t('logDeletionFailedTmdb', { name: item.Name }));
                        continue;
                    }

                    const radarrMovie = radarrMovies.find(m => m.tmdbId === parseInt(item.ProviderIds!.Tmdb!));
                    if (radarrMovie) {
                        await deleteRadarrMovie(radarr, radarrMovie.id);
                        addLog(t('logDeletionSuccessRadarr', { name: item.Name }));
                        successCount++;
                    } else {
                        addLog(t('logDeletionInfoRadarr', { name: item.Name }));
                    }
                } else if (item.Type === 'Season') {
                    if (!sonarr?.url || !sonarr?.apiKey) {
                        addLog(t('logDeletionFailedSonarr', { seriesName: item.SeriesName, name: item.Name }));
                        continue;
                    }
                    const tvdbId = seriesIdToProviderIdMap.get(item.SeriesId!);
                    if (!tvdbId) {
                        addLog(t('logDeletionFailedTvdb', { seriesName: item.SeriesName, name: item.Name }));
                        continue;
                    }

                    const sonarrSerie = sonarrSeries.find(s => s.tvdbId === parseInt(tvdbId));
                    if (sonarrSerie) {
                        const episodes = await getSonarrEpisodes(sonarr, sonarrSerie.id);
                        const seasonNumberMatch = item.Name.match(/\d+/);
                        if (!seasonNumberMatch) {
                            addLog(t('logDeletionFailedSeasonNumber', { name: item.Name }));
                            continue;
                        }
                        const seasonNumber = parseInt(seasonNumberMatch[0]);

                        const episodesToDelete = episodes.filter(e => e.seasonNumber === seasonNumber && e.hasFile);
                        if (episodesToDelete.length === 0) {
                            addLog(t('logDeletionInfoSonarrFiles', { seriesName: item.SeriesName, name: item.Name }));
                            successCount++;
                            continue;
                        }
                        
                        let episodeDeletionSuccess = true;
                        for (const episode of episodesToDelete) {
                            try {
                               await deleteSonarrEpisodeFile(sonarr, episode.episodeFileId);
                            } catch (err) {
                               const episodeErrorMessage = err instanceof Error ? err.message : String(err);
                               addLog(t('logDeletionFailedEpisode', { seriesName: item.SeriesName, name: item.Name, error: episodeErrorMessage }));
                               episodeDeletionSuccess = false;
                            }
                        }
                        if(episodeDeletionSuccess) {
                            addLog(t('logDeletionSuccessSonarr', { count: episodesToDelete.length, seriesName: item.SeriesName, name: item.Name }));
                            successCount++;
                        } else {
                             addLog(t('logDeletionFailedSonarrMulti', { seriesName: item.SeriesName, name: item.Name }));
                        }
                    } else {
                        addLog(t('logDeletionInfoSonarrSeries', { seriesName: item.SeriesName }));
                    }
                }
            }
        } catch(err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            setError(t('logDeletionCriticalError', { error: errorMessage }));
            addLog(t('logError', { error: errorMessage }));
        }
        
        addLog(t('logDeletionComplete', { successCount, total: itemsToDelete.length }));
        setIsLoading(false);
        handleScan();
    };
    
    const getLocalizedItemType = (item: JellyfinItem) => {
        switch(item.Type) {
            case 'Movie': return t('typeMovie');
            case 'Series': return t('typeSeries');
            case 'Season': return t('typeSeason');
            default: return item.Type;
        }
    }

    return (
        <div className="container mx-auto animate-fade-in-up pb-10">
            <h1 className="text-5xl font-extrabold text-white mb-4">{t('automationTitle')}</h1>
            <p className="text-gray-300 mb-8 max-w-2xl text-lg font-light">{t('automationDescription')}</p>

            <div className="glass-panel p-8 rounded-2xl mb-10 flex flex-col md:flex-row items-center justify-between border-l-4 border-jellyfin-accent">
                <div className="mb-6 md:mb-0">
                    <h2 className="text-xl font-bold mb-2 text-white">{t('automationRetentionRules')}</h2>
                    <ul className="text-gray-300 space-y-1">
                        <li><span className="font-semibold text-emerald-400">{t('typeMovie')}s:</span> {t('automationMovieRule', { days: movieRetentionDays })}</li>
                        <li><span className="font-semibold text-blue-400">{t('typeSeason')}s:</span> {t('automationSeasonRule', { days: tvSeasonRetentionDays })}</li>
                    </ul>
                </div>
                <button
                    onClick={handleScan}
                    disabled={isLoading}
                    className="flex items-center justify-center px-8 py-4 bg-gradient-to-r from-jellyfin-accent to-purple-600 text-white rounded-xl font-bold text-lg shadow-[0_0_20px_rgba(170,0,255,0.4)] transition-all duration-300 transform hover:scale-105 hover:shadow-[0_0_30px_rgba(170,0,255,0.6)] disabled:bg-gray-700 disabled:shadow-none disabled:transform-none disabled:cursor-not-allowed"
                >
                    {isLoading ? <Spinner /> : <PlayIcon />}
                    <span className="ml-2">{isLoading ? t('automationScanning') : t('automationScanButton')}</span>
                </button>
            </div>

            {error && <p className="text-red-200 bg-red-500/20 border border-red-500/50 p-4 rounded-xl mb-6 backdrop-blur-sm">{error}</p>}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                        <h2 className="text-2xl font-bold text-white flex items-center">
                            {t('automationItemsToDelete', { selected: selectedItems.size, total: deletableItems.length })}
                            {deletableItems.length > 0 && <span className="ml-3 px-3 py-1 bg-white/10 rounded-full text-[10px] font-mono tracking-widest">{selectedItems.size} SELECTED</span>}
                        </h2>
                        
                        {/* View Switcher */}
                        {deletableItems.length > 0 && (
                            <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
                                <button 
                                    onClick={() => setViewMode('grid')}
                                    className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white/10 text-white shadow-lg' : 'text-gray-500 hover:text-gray-400'}`}
                                    title="Vue Grille"
                                >
                                    <GridViewIcon />
                                </button>
                                <button 
                                    onClick={() => setViewMode('list')}
                                    className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white/10 text-white shadow-lg' : 'text-gray-500 hover:text-gray-400'}`}
                                    title="Vue Liste"
                                >
                                    <ListViewIcon />
                                </button>
                            </div>
                        )}
                    </div>
                    
                    {deletableItems.length > 0 && (
                        <div className="flex flex-wrap gap-4 mb-6">
                            <button
                                onClick={() => setIsModalOpen(true)}
                                disabled={isLoading || selectedItems.size === 0}
                                className="flex items-center justify-center px-5 py-2.5 bg-red-500/80 hover:bg-red-500 rounded-lg font-semibold text-white transition-all duration-300 shadow-lg hover:shadow-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <TrashIcon />
                                {t('automationDeleteButton', { count: selectedItems.size })}
                            </button>
                             <button
                                onClick={handleExcludeAll}
                                disabled={isLoading || deletableItems.length === 0}
                                className="flex items-center justify-center px-5 py-2.5 bg-gray-700/50 hover:bg-gray-600 rounded-lg font-semibold text-white transition-all duration-300 border border-white/10 hover:border-white/30 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ShieldCheckIcon />
                                {t('automationExcludeAllButton', { count: deletableItems.length })}
                            </button>
                        </div>
                    )}

                    <div className="max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar p-1">
                        {viewMode === 'grid' ? (
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6 gap-3">
                                {deletableItems.map(item => (
                                    <div 
                                        key={item.Id} 
                                        className={`glass-card rounded-lg overflow-hidden relative cursor-pointer group transition-all duration-300 ${selectedItems.has(item.Id) ? 'ring-2 ring-jellyfin-accent shadow-[0_0_15px_rgba(170,0,255,0.3)]' : 'hover:ring-1 hover:ring-white/30'}`} 
                                        onClick={() => handleToggleSelection(item.Id)}
                                    >
                                        <div className="absolute top-0 right-0 p-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={(e) => handleExcludeItem(e, item)}
                                                className="p-1.5 rounded-full bg-black/60 hover:bg-emerald-500 text-white transition-colors backdrop-blur-md scale-75"
                                                title={t('automationExcludeTooltip')}
                                            >
                                                <SmallShieldIcon />
                                            </button>
                                        </div>

                                        <div className="relative aspect-[2/3]">
                                            <img src={settingsCtx?.settings?.jellyfin ? getImageUrl(settingsCtx.settings.jellyfin, item) : ''} alt={item.Name} className="w-full h-full object-cover" />
                                            <div className={`absolute inset-0 transition-colors duration-200 ${selectedItems.has(item.Id) ? 'bg-jellyfin-accent/20' : 'bg-black/10 group-hover:bg-transparent'}`}></div>
                                            
                                            <div className={`absolute top-1.5 left-1.5 h-4 w-4 rounded-full border flex items-center justify-center transition-all duration-200 shadow-lg ${selectedItems.has(item.Id) ? 'bg-jellyfin-accent border-white scale-110' : 'bg-black/40 border-gray-400'}`}>
                                                {selectedItems.has(item.Id) && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>}
                                            </div>
                                        </div>

                                        <div className="p-2 bg-black/40 backdrop-blur-sm">
                                            <h3 className="font-bold truncate text-[10px] text-white leading-tight" title={item.Name}>{item.Name}</h3>
                                            <p className="text-[8px] text-gray-500 truncate mt-1">{item.Type === 'Season' ? item.SeriesName : getLocalizedItemType(item)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {deletableItems.map(item => (
                                    <div 
                                        key={item.Id} 
                                        className={`glass-card rounded-xl p-3 flex items-center cursor-pointer group transition-all duration-300 ${selectedItems.has(item.Id) ? 'bg-jellyfin-accent/5 border-jellyfin-accent/30' : 'hover:bg-white/[0.04]'}`}
                                        onClick={() => handleToggleSelection(item.Id)}
                                    >
                                        <div className={`h-5 w-5 rounded-full border flex items-center justify-center transition-all duration-200 mr-4 ${selectedItems.has(item.Id) ? 'bg-jellyfin-accent border-white' : 'bg-black/40 border-gray-600'}`}>
                                            {selectedItems.has(item.Id) && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>}
                                        </div>

                                        <div className="h-12 w-8 rounded overflow-hidden mr-4 flex-shrink-0">
                                            <img src={settingsCtx?.settings?.jellyfin ? getImageUrl(settingsCtx.settings.jellyfin, item) : ''} alt={item.Name} className="w-full h-full object-cover" />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-sm text-white truncate" title={item.Name}>{item.Name}</h3>
                                            <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">
                                                {item.Type === 'Season' ? `${item.SeriesName} • ${getLocalizedItemType(item)}` : getLocalizedItemType(item)}
                                            </p>
                                        </div>

                                        <div className="hidden md:block px-4 text-right">
                                            <p className="text-[10px] text-gray-500 uppercase tracking-widest">{t('automationAddedOn', { date: '' })}</p>
                                            <p className="text-xs text-gray-300">{new Date(item.DateCreated).toLocaleDateString(language)}</p>
                                        </div>

                                        <div className="ml-4 flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={(e) => handleExcludeItem(e, item)}
                                                className="p-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white transition-all border border-emerald-500/20"
                                                title={t('automationExcludeTooltip')}
                                            >
                                                <SmallShieldIcon />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {deletableItems.length === 0 && !isLoading && (
                            <div className="col-span-full flex flex-col items-center justify-center py-20 text-gray-500 border-2 border-dashed border-white/5 rounded-2xl bg-white/5">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                <span className="text-lg font-medium">{t('automationNoItemsFound')}</span>
                            </div>
                        )}
                    </div>
                </div>
                <div className="lg:col-span-1">
                    <h2 className="text-2xl font-bold text-white mb-6">{t('automationLogs')}</h2>
                    <div className="glass-panel rounded-2xl overflow-hidden flex flex-col h-[65vh]">
                        <div className="bg-black/40 px-4 py-2 border-b border-white/5 flex space-x-2">
                             <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
                             <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
                             <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
                        </div>
                        <div className="p-4 overflow-y-auto flex-1 font-mono text-xs space-y-2 custom-scrollbar bg-black/20">
                            {logs.length === 0 && <span className="text-gray-600 italic">// Waiting for scan...</span>}
                            {logs.map((log, index) => (
                                <p key={index} className={`break-words leading-relaxed ${log.startsWith('[') ? 'text-gray-500' : ''} ${log.includes(t('success').toUpperCase()) ? 'text-emerald-400' : ''} ${log.includes(t('error', {count: ''}).toUpperCase()) || log.includes('ÉCHEC') ? 'text-red-400' : ''} ${log.includes('INFO') ? 'text-blue-400' : 'text-gray-300'}`}>
                                    {log}
                                </p>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onConfirm={handleDelete}
                title={t('automationModalTitle')}
            >
                {t('automationModalBody', { count: selectedItems.size })}
            </Modal>
        </div>
    );
};

export default Automation;