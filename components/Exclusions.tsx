import React, { useState, useContext, useEffect, useCallback } from 'react';
import { SettingsContext } from '../App';
import useLocalStorage from '../hooks/useLocalStorage';
import { getItemsByIds, getImageUrl } from '../services/jellyfinService';
import { JellyfinItem } from '../types';
import Spinner from './common/Spinner';
import { TrashIcon } from '../constants';

const Exclusions: React.FC = () => {
    const settingsCtx = useContext(SettingsContext);
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
            setError(`Erreur lors de la récupération des éléments exclus : ${errorMessage}`);
        } finally {
            setIsLoading(false);
        }
    }, [settingsCtx?.settings?.jellyfin, excludedIds]);

    useEffect(() => {
        fetchExcludedItems();
    }, [fetchExcludedItems]);

    const handleRemoveExclusion = (itemId: string) => {
        setExcludedIds(prev => prev.filter(id => id !== itemId));
    };

    return (
        <div className="container mx-auto">
            <h1 className="text-4xl font-bold text-white mb-4">Exclusions</h1>
            <p className="text-gray-400 mb-8">
                Les éléments listés ci-dessous sont protégés et ne seront pas supprimés par l'automation.
            </p>
            
            {isLoading && (
                <div className="flex justify-center items-center mt-8">
                    <Spinner />
                    <span className="ml-2 text-lg">Chargement des éléments exclus...</span>
                </div>
            )}
            
            {error && <p className="text-red-400 bg-red-900/50 p-3 rounded-lg mb-4">{error}</p>}
            
            {!isLoading && excludedItems.length === 0 && (
                <div className="text-center py-10 text-gray-500 bg-jellyfin-dark-light rounded-lg">
                    <h3 className="text-xl">Aucun élément exclu.</h3>
                    <p className="mt-2">Vous pouvez exclure des éléments depuis la page Automation.</p>
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
                {excludedItems.map(item => (
                    <div key={item.Id} className="bg-jellyfin-light rounded-lg overflow-hidden shadow-lg relative group">
                        <img src={settingsCtx?.settings?.jellyfin ? getImageUrl(settingsCtx.settings.jellyfin, item) : ''} alt={item.Name} className="w-full h-48 object-cover" />
                        <div className="p-3">
                            <h3 className="font-bold truncate" title={item.Name}>{item.Name}</h3>
                            <p className="text-sm text-gray-400">{item.Type === 'Season' ? item.SeriesName : item.Type}</p>
                            <p className="text-xs text-gray-500">Ajouté le: {new Date(item.DateCreated).toLocaleDateString()}</p>
                        </div>
                        <div className="absolute inset-0 bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                             <button
                                onClick={() => handleRemoveExclusion(item.Id)}
                                className="flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-semibold text-white transition-colors"
                                title="Retirer de la liste d'exclusion"
                            >
                                <TrashIcon />
                                Retirer
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Exclusions;