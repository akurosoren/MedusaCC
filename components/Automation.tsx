import React, { useState, useContext, useCallback, useEffect } from 'react';
import { SettingsContext } from '../App';
import { getItems, getItemsByIds, getImageUrl } from '../services/jellyfinService';
import { getRadarrMovies, deleteRadarrMovie } from '../services/radarrService';
import { getSonarrSeries, getSonarrEpisodes, deleteSonarrEpisodeFile } from '../services/sonarrService';
import { JellyfinItem } from '../types';
import { PlayIcon, TrashIcon, SmallShieldIcon, ShieldCheckIcon, GridViewIcon, ListViewIcon, ShieldIcon } from '../constants';
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
    
    // Exclusion Modal State
    const [isExclusionModalOpen, setIsExclusionModalOpen] = useState(false);
    const [excludedItemsList, setExcludedItemsList] = useState<JellyfinItem[]>([]);
    const [isLoadingExclusions, setIsLoadingExclusions] = useState(false);
    
    // Filters
    const [filterGenre, setFilterGenre] = useState('');
    const [availableGenres, setAvailableGenres] = useState<string[]>([]);
    const [estimatedSize, setEstimatedSize] = useState<number>(0);

    const addLog = (message: string) => {
        setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${message}`, ...prev]);
    };

    // --- Exclusion Logic ---
    const fetchExcludedItems = useCallback(async () => {
        if (!settingsCtx?.settings?.jellyfin || exclusions.length === 0) {
            setExcludedItemsList([]);
            return;
        }
        setIsLoadingExclusions(true);
        try {
            const items = await getItemsByIds(settingsCtx.settings.jellyfin, exclusions);
            setExcludedItemsList(items);
        } catch (err) {
            console.error("Failed to fetch exclusions", err);
        } finally {
            setIsLoadingExclusions(false);
        }
    }, [settingsCtx, exclusions]);

    useEffect(() => {
        if (isExclusionModalOpen) {
            fetchExcludedItems();
        }
    }, [isExclusionModalOpen, fetchExcludedItems]);

    const handleRemoveExclusion = (itemId: string) => {
        setExclusions(prev => prev.filter(id => id !== itemId));
        setExcludedItemsList(prev => prev.filter(item => item.Id !== itemId));
    };

    const handleRemoveAllExclusions = () => {
        // Simple confirm before wiping list
        if (window.confirm(t('automationModalTitle'))) { 
            setExclusions([]);
            setExcludedItemsList([]);
        }
    };
    // ----------------------

    const triggerWebhook = async (count: number, sizeBytes: number) => {
        if (!settingsCtx?.settings?.webhooks?.enabled || !settingsCtx?.settings?.webhooks?.discordUrl) return;

        const sizeGB = (sizeBytes / (1024 * 1024 * 1024)).toFixed(2);
        
        // Use custom settings or defaults
        const username = settingsCtx.settings.webhooks.username || "Medusa";
        const avatarUrl = settingsCtx.settings.webhooks.avatarUrl || "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/jellyfin.png";

        const payload = {
            username: username,
            avatar_url: avatarUrl,
            embeds: [{
                title: "🧹 Automation Run Completed",
                color: 11141375, // Jellyfin Purple
                fields: [
                    { name: "Items Deleted", value: String(count), inline: true },
                    { name: "Space Reclaimed", value: `${sizeGB} GB`, inline: true },
                    { name: "Time", value: new Date().toLocaleString(), inline: false }
                ]
            }]
        };

        try {
            await fetch(settingsCtx.settings.webhooks.discordUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            addLog(t('logWebhookSuccess'));
        } catch (e) {
            addLog(t('logWebhookFailed'));
        }
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
        setAvailableGenres([]);
        setEstimatedSize(0);
        addLog(t('logScanStarted'));

        // Capture current settings at moment of scan
        const currentMovieRetention = Number(settingsCtx.settings.automation?.movieRetentionDays || 7);
        const currentSeasonRetention = Number(settingsCtx.settings.automation?.tvSeasonRetentionDays || 28);
        
        addLog(t('logScanStartedParams', { movieDays: currentMovieRetention, seasonDays: currentSeasonRetention }));

        try {
            const allItems = await getItems(settingsCtx.settings.jellyfin, ['Movie', 'Season']);
            addLog(t('logScanFoundItems', { count: allItems.length }));
            const now = new Date();
            
            // Extract Genres
            const genres = new Set<string>();
            let skippedRecent = 0;
            let skippedExcluded = 0;
            
            const itemsToFilter = allItems.filter(item => {
                if (item.Genres) item.Genres.forEach(g => genres.add(g));

                if (exclusions.includes(item.Id)) {
                    skippedExcluded++;
                    return false;
                }
                const dateCreated = new Date(item.DateCreated);
                const ageInDays = (now.getTime() - dateCreated.getTime()) / (1000 * 3600 * 24);

                let isEligible = false;
                if (item.Type === 'Movie') {
                    isEligible = ageInDays > currentMovieRetention;
                } else if (item.Type === 'Season') {
                    isEligible = ageInDays > currentSeasonRetention;
                }
                
                if (isEligible) {
                    return true;
                } else {
                    skippedRecent++;
                    return false;
                }
            });
            
            if (skippedRecent > 0 || skippedExcluded > 0) {
                 addLog(t('logScanSkipped', { recent: skippedRecent, excluded: skippedExcluded }));
            }
            
            setAvailableGenres(Array.from(genres).sort());
            setDeletableItems(itemsToFilter);
            setSelectedItems(new Set(itemsToFilter.map(item => item.Id)));
            
            // Estimate Size (Roughly based on MediaSources if available, or just a guess if not)
            // Note: Radarr/Sonarr sizes are more accurate but require fetching everything.
            // We use Jellyfin MediaSources size here as a proxy.
            let size = 0;
            itemsToFilter.forEach(item => {
                if(item.MediaSources) {
                    item.MediaSources.forEach(source => size += (source.Size || 0));
                }
            });
            setEstimatedSize(size);

            addLog(t('logScanComplete', { count: itemsToFilter.length }));
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            setError(t('logScanError', { error: errorMessage }));
            addLog(t('logError', { error: errorMessage }));
        } finally {
            setIsLoading(false);
        }
    }, [settingsCtx, exclusions, t]);

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
        let totalBytesFreed = 0;
        
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
                        totalBytesFreed += radarrMovie.sizeOnDisk;
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
                        
                        let episodeDeletionSuccess = true;
                        for (const episode of episodesToDelete) {
                            try {
                               // For accurate size we would need to fetch episode file, but we can assume from Jellyfin scan
                               await deleteSonarrEpisodeFile(sonarr, episode.episodeFileId);
                            } catch (err) {
                               const episodeErrorMessage = err instanceof Error ? err.message : String(err);
                               addLog(t('logDeletionFailedEpisode', { seriesName: item.SeriesName, name: item.Name, error: episodeErrorMessage }));
                               episodeDeletionSuccess = false;
                            }
                        }
                        if(episodeDeletionSuccess) {
                             // Use Jellyfin size as fallback estimate for webhooks
                             if (item.MediaSources && item.MediaSources.length > 0) {
                                 totalBytesFreed += item.MediaSources[0].Size || 0;
                             }
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
            
            // Webhook trigger
            if (successCount > 0) {
                await triggerWebhook(successCount, totalBytesFreed);
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

    // Filter Logic
    const displayedItems = deletableItems.filter(item => {
        if (!filterGenre) return true;
        return item.Genres?.includes(filterGenre);
    });

    const displayedEstimatedSize = displayedItems.reduce((acc, item) => acc + (item.MediaSources?.[0]?.Size || 0), 0);
    const formattedSize = (displayedEstimatedSize / (1024 * 1024 * 1024)).toFixed(2);
    
    // Derived state for retention display (read-only for UI)
    const movieRetentionDisplay = settingsCtx?.settings?.automation?.movieRetentionDays || 7;
    const tvRetentionDisplay = settingsCtx?.settings?.automation?.tvSeasonRetentionDays || 28;

    return (
        <div className="container mx-auto animate-fade-in-up pb-8 relative">
            <div className="flex justify-between items-center mb-2">
                <h1 className="text-4xl font-bold text-white">{t('automationTitle')}</h1>
                <button 
                    onClick={() => setIsExclusionModalOpen(true)}
                    className="flex items-center px-4 py-2 bg-gray-700/50 hover:bg-gray-600 rounded-lg text-sm font-semibold text-white transition-all border border-white/10 hover:border-white/30"
                >
                    <ShieldIcon />
                    <span className="ml-2">{t('exclusionsManage')}</span>
                </button>
            </div>
            
            <p className="text-gray-400 mb-6 max-w-2xl text-base font-light">{t('automationDescription')}</p>

            <div className="glass-panel p-6 rounded-2xl mb-6 flex flex-col md:flex-row items-center justify-between border-l-4 border-jellyfin-accent">
                <div className="mb-4 md:mb-0">
                    <h2 className="text-lg font-bold mb-1 text-white">{t('automationRetentionRules')}</h2>
                    <ul className="text-gray-300 space-y-0.5 text-sm">
                        <li><span className="font-semibold text-emerald-400">{t('typeMovie')}s:</span> {t('automationMovieRule', { days: movieRetentionDisplay })}</li>
                        <li><span className="font-semibold text-blue-400">{t('typeSeason')}s:</span> {t('automationSeasonRule', { days: tvRetentionDisplay })}</li>
                    </ul>
                </div>
                <button
                    onClick={handleScan}
                    disabled={isLoading}
                    className="flex items-center justify-center px-6 py-3 bg-gradient-to-r from-jellyfin-accent to-purple-600 text-white rounded-xl font-bold text-base shadow-[0_0_20px_rgba(170,0,255,0.4)] transition-all duration-300 transform hover:scale-105 hover:shadow-[0_0_30px_rgba(170,0,255,0.6)] disabled:bg-gray-700 disabled:shadow-none disabled:transform-none disabled:cursor-not-allowed"
                >
                    {isLoading ? <Spinner /> : <PlayIcon />}
                    <span className="ml-2">{isLoading ? t('automationScanning') : t('automationScanButton')}</span>
                </button>
            </div>

            {error && <p className="text-red-200 bg-red-500/20 border border-red-500/50 p-4 rounded-xl mb-6 backdrop-blur-sm">{error}</p>}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
                        <div className="flex flex-col">
                            <h2 className="text-xl font-bold text-white flex items-center">
                                {t('automationItemsToDelete', { selected: selectedItems.size, total: displayedItems.length })}
                                {displayedItems.length > 0 && <span className="ml-3 px-2 py-0.5 bg-white/10 rounded-full text-[9px] font-mono tracking-widest">{selectedItems.size} SELECTED</span>}
                            </h2>
                            {displayedEstimatedSize > 0 && <span className="text-[10px] text-gray-400 mt-1 uppercase tracking-widest">Est. Space Reclaim: <span className="text-emerald-400 font-bold">{formattedSize} GB</span></span>}
                        </div>
                        
                        <div className="flex space-x-2">
                             {availableGenres.length > 0 && (
                                <select 
                                    className="bg-black/40 border border-white/10 rounded-lg text-xs text-white px-2 py-1 outline-none"
                                    value={filterGenre}
                                    onChange={(e) => setFilterGenre(e.target.value)}
                                >
                                    <option value="">All Genres</option>
                                    {availableGenres.map(g => <option key={g} value={g}>{g}</option>)}
                                </select>
                             )}

                            {/* View Switcher */}
                            {deletableItems.length > 0 && (
                                <div className="flex bg-black/40 p-1 rounded-lg border border-white/5 h-8">
                                    <button 
                                        onClick={() => setViewMode('grid')}
                                        className={`p-1.5 rounded transition-all ${viewMode === 'grid' ? 'bg-white/10 text-white shadow-lg' : 'text-gray-500 hover:text-gray-400'}`}
                                        title="Vue Grille"
                                    >
                                        <GridViewIcon />
                                    </button>
                                    <button 
                                        onClick={() => setViewMode('list')}
                                        className={`p-1.5 rounded transition-all ${viewMode === 'list' ? 'bg-white/10 text-white shadow-lg' : 'text-gray-500 hover:text-gray-400'}`}
                                        title="Vue Liste"
                                    >
                                        <ListViewIcon />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    {deletableItems.length > 0 && (
                        <div className="flex flex-wrap gap-3 mb-4">
                            <button
                                onClick={() => setIsModalOpen(true)}
                                disabled={isLoading || selectedItems.size === 0}
                                className="flex items-center justify-center px-4 py-2 bg-red-500/80 hover:bg-red-500 rounded-lg font-semibold text-white text-sm transition-all duration-300 shadow-lg hover:shadow-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <TrashIcon />
                                {t('automationDeleteButton', { count: selectedItems.size })}
                            </button>
                             <button
                                onClick={handleExcludeAll}
                                disabled={isLoading || displayedItems.length === 0}
                                className="flex items-center justify-center px-4 py-2 bg-gray-700/50 hover:bg-gray-600 rounded-lg font-semibold text-white text-sm transition-all duration-300 border border-white/10 hover:border-white/30 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ShieldCheckIcon />
                                {t('automationExcludeAllButton', { count: displayedItems.length })}
                            </button>
                        </div>
                    )}

                    <div className="max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar p-1">
                        {viewMode === 'grid' ? (
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6 gap-2">
                                {displayedItems.map(item => (
                                    <div 
                                        key={item.Id} 
                                        className={`glass-card rounded-lg overflow-hidden relative cursor-pointer group transition-all duration-300 ${selectedItems.has(item.Id) ? 'ring-2 ring-jellyfin-accent shadow-[0_0_15px_rgba(170,0,255,0.3)]' : 'hover:ring-1 hover:ring-white/30'}`} 
                                        onClick={() => handleToggleSelection(item.Id)}
                                    >
                                        <div className="absolute top-0 right-0 p-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={(e) => handleExcludeItem(e, item)}
                                                className="p-1 rounded-full bg-black/60 hover:bg-emerald-500 text-white transition-colors backdrop-blur-md scale-75"
                                                title={t('automationExcludeTooltip')}
                                            >
                                                <SmallShieldIcon />
                                            </button>
                                        </div>

                                        <div className="relative aspect-[2/3]">
                                            <img src={settingsCtx?.settings?.jellyfin ? getImageUrl(settingsCtx.settings.jellyfin, item) : ''} alt={item.Name} className="w-full h-full object-cover" />
                                            <div className={`absolute inset-0 transition-colors duration-200 ${selectedItems.has(item.Id) ? 'bg-jellyfin-accent/20' : 'bg-black/10 group-hover:bg-transparent'}`}></div>
                                            
                                            <div className={`absolute top-1.5 left-1.5 h-3.5 w-3.5 rounded-full border flex items-center justify-center transition-all duration-200 shadow-lg ${selectedItems.has(item.Id) ? 'bg-jellyfin-accent border-white scale-110' : 'bg-black/40 border-gray-400'}`}>
                                                {selectedItems.has(item.Id) && <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>}
                                            </div>
                                        </div>

                                        <div className="p-1.5 bg-black/40 backdrop-blur-sm">
                                            <h3 className="font-bold truncate text-[9px] text-white leading-tight" title={item.Name}>{item.Name}</h3>
                                            <p className="text-[7px] text-gray-500 truncate mt-0.5">{item.Type === 'Season' ? item.SeriesName : getLocalizedItemType(item)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-1.5">
                                {displayedItems.map(item => (
                                    <div 
                                        key={item.Id} 
                                        className={`glass-card rounded-lg p-2 flex items-center cursor-pointer group transition-all duration-300 ${selectedItems.has(item.Id) ? 'bg-jellyfin-accent/5 border-jellyfin-accent/30' : 'hover:bg-white/[0.04]'}`}
                                        onClick={() => handleToggleSelection(item.Id)}
                                    >
                                        <div className={`h-4 w-4 rounded-full border flex items-center justify-center transition-all duration-200 mr-3 ${selectedItems.has(item.Id) ? 'bg-jellyfin-accent border-white' : 'bg-black/40 border-gray-600'}`}>
                                            {selectedItems.has(item.Id) && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>}
                                        </div>

                                        <div className="h-10 w-7 rounded overflow-hidden mr-3 flex-shrink-0">
                                            <img src={settingsCtx?.settings?.jellyfin ? getImageUrl(settingsCtx.settings.jellyfin, item) : ''} alt={item.Name} className="w-full h-full object-cover" />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-xs text-white truncate" title={item.Name}>{item.Name}</h3>
                                            <p className="text-[9px] text-gray-400 uppercase tracking-wider font-semibold">
                                                {item.Type === 'Season' ? `${item.SeriesName} • ${getLocalizedItemType(item)}` : getLocalizedItemType(item)}
                                            </p>
                                            <p className="text-[8px] text-gray-500">{item.Genres?.slice(0, 3).join(', ')}</p>
                                        </div>

                                        <div className="hidden md:block px-3 text-right">
                                            <p className="text-[8px] text-gray-500 uppercase tracking-widest">{t('automationAddedOn', { date: '' })}</p>
                                            <p className="text-[10px] text-gray-300">{new Date(item.DateCreated).toLocaleDateString(language)}</p>
                                        </div>

                                        <div className="ml-3 flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={(e) => handleExcludeItem(e, item)}
                                                className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white transition-all border border-emerald-500/20"
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
                            <div className="col-span-full flex flex-col items-center justify-center py-16 text-gray-500 border-2 border-dashed border-white/5 rounded-2xl bg-white/5">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                <span className="text-base font-medium">{t('automationNoItemsFound')}</span>
                            </div>
                        )}
                    </div>
                </div>
                <div className="lg:col-span-1">
                    <h2 className="text-xl font-bold text-white mb-4">{t('automationLogs')}</h2>
                    <div className="glass-panel rounded-xl overflow-hidden flex flex-col h-[65vh]">
                        <div className="bg-black/40 px-3 py-1.5 border-b border-white/5 flex space-x-1.5">
                             <div className="w-2.5 h-2.5 rounded-full bg-red-500/50"></div>
                             <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50"></div>
                             <div className="w-2.5 h-2.5 rounded-full bg-green-500/50"></div>
                        </div>
                        <div className="p-3 overflow-y-auto flex-1 font-mono text-[10px] space-y-1.5 custom-scrollbar bg-black/20">
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

            {/* Confirmation Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onConfirm={handleDelete}
                title={t('automationModalTitle')}
            >
                {t('automationModalBody', { count: selectedItems.size })}
                <p className="mt-2 text-emerald-400 font-bold text-center">Estimated Space to be Freed: {formattedSize} GB</p>
            </Modal>

            {/* Manage Exclusions Modal Overlay */}
            {isExclusionModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in-up" onClick={() => setIsExclusionModalOpen(false)}>
                    <div className="glass-panel w-full max-w-5xl h-[80vh] rounded-3xl flex flex-col shadow-2xl overflow-hidden border border-white/10" onClick={e => e.stopPropagation()}>
                        
                        {/* Header */}
                        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-black/20">
                            <div>
                                <h2 className="text-2xl font-bold text-white flex items-center">
                                    <ShieldIcon />
                                    <span className="ml-3">{t('exclusionsManage')}</span>
                                </h2>
                                <p className="text-sm text-gray-400 mt-1">{t('exclusionsDescription')}</p>
                            </div>
                            <div className="flex items-center gap-3">
                                {excludedItemsList.length > 0 && (
                                    <button 
                                        onClick={handleRemoveAllExclusions}
                                        className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-sm font-bold border border-red-500/20 transition-all"
                                    >
                                        {t('exclusionsRemoveAll')}
                                    </button>
                                )}
                                <button 
                                    onClick={() => setIsExclusionModalOpen(false)}
                                    className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                                >
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto p-6 bg-black/10 custom-scrollbar">
                            {isLoadingExclusions ? (
                                <div className="flex justify-center items-center h-full">
                                    <Spinner />
                                    <span className="ml-3 text-white/50">{t('exclusionsLoading')}</span>
                                </div>
                            ) : excludedItemsList.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                                    <ShieldCheckIcon />
                                    <span className="mt-2 font-medium">{t('exclusionsNoItems')}</span>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                    {excludedItemsList.map(item => (
                                        <div key={item.Id} className="glass-card rounded-lg overflow-hidden relative group transition-all duration-300 hover:-translate-y-1">
                                            <div className="relative aspect-[2/3]">
                                                <img src={settingsCtx?.settings?.jellyfin ? getImageUrl(settingsCtx.settings.jellyfin, item) : ''} alt={item.Name} className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-60"></div>
                                                
                                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-sm">
                                                    <button
                                                        onClick={() => handleRemoveExclusion(item.Id)}
                                                        className="flex flex-col items-center px-3 py-2 bg-red-600/90 hover:bg-red-600 rounded-lg font-bold text-white transition-all transform hover:scale-105 shadow-[0_0_20px_rgba(239,68,68,0.4)]"
                                                    >
                                                        <TrashIcon />
                                                        <span className="text-[10px] mt-1">{t('exclusionsRemoveButton')}</span>
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="p-3 bg-black/40 backdrop-blur-sm">
                                                <h3 className="font-bold truncate text-xs text-white" title={item.Name}>{item.Name}</h3>
                                                <p className="text-[9px] font-semibold text-jellyfin-accent uppercase tracking-wide mt-0.5">{item.Type === 'Season' ? item.SeriesName : getLocalizedItemType(item)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Automation;