import React, { useState, useContext, useEffect, useCallback } from 'react';
import { SettingsContext } from '../App';
import useLocalStorage from '../hooks/useLocalStorage';
import { getItemsByIds, getImageUrl } from '../services/jellyfinService';
import { JellyfinItem } from '../types';
import Spinner from './common/Spinner';
import { TrashIcon } from '../constants';
import { useTranslation } from '../hooks/useTranslation';
import { useLanguage } from '../contexts/LanguageContext';

const Exclusions: React.FC = () => {
    const settingsCtx = useContext(SettingsContext);
    const { t } = useTranslation();
    const { language } = useLanguage();
    const [excludedIds, setExcludedIds] = useLocalStorage<string[]>('jellyfin-exclusions', []);
    const [excludedItems, setExcludedItems] = useState<JellyfinItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchExcludedItems = useCallback(async () => {
        if (!settingsCtx?.settings?.jellyfin || excludedIds.length === 0) {
            setExcludedItems([]);
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const items = await getItemsByIds(settingsCtx.settings.jellyfin, excludedIds);
            setExcludedItems(items);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            setError(t('exclusionsFetchError', { error: errorMessage }));
        } finally {
            setIsLoading(false);
        }
    }, [settingsCtx?.settings?.jellyfin, excludedIds, t]);

    useEffect(() => {
        fetchExcludedItems();
    }, [fetchExcludedItems]);

    const handleRemoveExclusion = (itemId: string) => {
        setExcludedIds(prev => prev.filter(id => id !== itemId));
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
            <h1 className="text-5xl font-extrabold text-white mb-4">{t('exclusionsTitle')}</h1>
            <p className="text-gray-300 mb-10 text-lg font-light max-w-3xl">
                {t('exclusionsDescription')}
            </p>
            
            {isLoading && (
                <div className="flex justify-center items-center mt-12">
                    <Spinner />
                    <span className="ml-3 text-lg font-light">{t('exclusionsLoading')}</span>
                </div>
            )}
            
            {error && <p className="text-red-200 bg-red-500/20 border border-red-500/50 p-4 rounded-xl mb-6 backdrop-blur-sm">{error}</p>}
            
            {!isLoading && excludedItems.length === 0 && (
                <div className="glass-panel text-center py-20 rounded-3xl border border-dashed border-white/10">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 mx-auto mb-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 20.944a11.955 11.955 0 019-4.944c3.393 0 6.454 1.449 8.618 3.04A12.02 12.02 0 0021 10.944c0-3.393-1.449-6.454-3.04-8.618z" /></svg>
                    <h3 className="text-2xl font-bold text-gray-400">{t('exclusionsNoItems')}</h3>
                    <p className="mt-2 text-gray-500">{t('exclusionsNoItemsHint')}</p>
                </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-6">
                {excludedItems.map(item => (
                    <div key={item.Id} className="glass-card rounded-xl overflow-hidden relative group transition-all duration-300 hover:-translate-y-2">
                         <div className="relative aspect-[2/3]">
                             <img src={settingsCtx?.settings?.jellyfin ? getImageUrl(settingsCtx.settings.jellyfin, item) : ''} alt={item.Name} className="w-full h-full object-cover" />
                             <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-60"></div>
                             
                             <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-sm">
                                 <button
                                    onClick={() => handleRemoveExclusion(item.Id)}
                                    className="flex flex-col items-center px-4 py-3 bg-red-600/90 hover:bg-red-600 rounded-xl font-bold text-white transition-all transform hover:scale-105 shadow-[0_0_20px_rgba(239,68,68,0.4)]"
                                >
                                    <TrashIcon />
                                    <span className="text-xs mt-1">{t('exclusionsRemoveButton')}</span>
                                </button>
                            </div>
                        </div>

                        <div className="p-4 bg-black/40 backdrop-blur-sm">
                            <h3 className="font-bold truncate text-white" title={item.Name}>{item.Name}</h3>
                            <p className="text-xs font-semibold text-jellyfin-accent uppercase tracking-wide mt-1">{item.Type === 'Season' ? item.SeriesName : getLocalizedItemType(item)}</p>
                            <p className="text-[10px] text-gray-500 mt-2 flex items-center">
                                <span className="w-1.5 h-1.5 rounded-full bg-gray-500 mr-2"></span>
                                {new Date(item.DateCreated).toLocaleDateString(language)}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Exclusions;