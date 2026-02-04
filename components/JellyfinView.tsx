import React, { useState, useEffect, useContext } from 'react';
import { SettingsContext } from '../App';
import { getItems, getImageUrl } from '../services/jellyfinService';
import { getSonarrCalendar, testSonarrConnection } from '../services/sonarrService';
import { JellyfinItem, SonarrCalendarItem, SonarrSettings } from '../types';
import Spinner from './common/Spinner';
import { useTranslation } from '../hooks/useTranslation';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../auth/AuthContext';

const MediaCard: React.FC<{ item: JellyfinItem, imageUrl: string }> = ({ item, imageUrl }) => (
    <div className="glass-card flex-shrink-0 w-44 rounded-2xl overflow-hidden group relative border-white/[0.05]">
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80 z-10"></div>
        <img src={imageUrl} alt={item.Name} className="w-full h-64 object-cover transition-transform duration-700 group-hover:scale-105" />
        <div className="absolute bottom-0 left-0 right-0 p-3 z-20">
            <h3 className="font-semibold text-xs truncate text-white tracking-tight">{item.Name}</h3>
            {item.SeriesName && <p className="text-[9px] text-gray-400 truncate mt-0.5 font-medium">{item.SeriesName}</p>}
        </div>
    </div>
);

const UpcomingCard: React.FC<{ item: SonarrCalendarItem, language: string }> = ({ item, language }) => {
    const poster = item.series.images.find(img => img.coverType === 'poster');
    const imageUrl = poster ? poster.remoteUrl : 'https://via.placeholder.com/200x300.png?text=No+Image';

    const airDate = new Date(item.airDateUtc);
    const day = airDate.toLocaleDateString(language, { weekday: 'short' });
    const date = airDate.toLocaleDateString(language, { day: '2-digit', month: '2-digit' });

    return (
         <div className="glass-card flex-shrink-0 w-48 rounded-2xl overflow-hidden group relative border-white/[0.05]">
             <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent z-10"></div>
            <img src={imageUrl} alt={item.series.title} className="w-full h-72 object-cover transition-transform duration-1000 group-hover:scale-110 opacity-70 group-hover:opacity-100" />
             <div className="absolute top-2 right-2 z-20 flex flex-col items-center bg-white/10 backdrop-blur-xl rounded-lg p-1.5 shadow-2xl border border-white/10">
                <span className="text-[8px] font-bold uppercase text-white/50 tracking-widest">{day}</span>
                <span className="text-lg font-bold text-white leading-none">{date.split('/')[0]}</span>
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-4 z-20">
                <h3 className="font-semibold text-xs truncate text-white mb-0.5 tracking-tight" title={item.series.title}>{item.series.title}</h3>
                <div className="flex items-center space-x-1.5">
                    <span className="text-[8px] font-bold bg-white/10 px-1.5 py-0.5 rounded text-white/80 border border-white/5">S{item.seasonNumber} E{String(item.episodeNumber).padStart(2, '0')}</span>
                    <p className="text-[9px] text-gray-400 truncate flex-1 font-medium" title={item.title}>{item.title}</p>
                </div>
            </div>
        </div>
    );
};

const JellyfinView: React.FC = () => {
    const settingsCtx = useContext(SettingsContext);
    const { currentUser } = useAuth();
    const { t } = useTranslation();
    const { language } = useLanguage();
    const [latestMovies, setLatestMovies] = useState<JellyfinItem[]>([]);
    const [latestSeries, setLatestSeries] = useState<JellyfinItem[]>([]);
    const [upcomingCalendar, setUpcomingCalendar] = useState<SonarrCalendarItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const isAdmin = currentUser?.role === 'admin';

    useEffect(() => {
        const fetchJellyfinData = async () => {
            if (!settingsCtx?.settings?.jellyfin?.url) {
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            const { jellyfin, sonarr } = settingsCtx.settings;

            const promises = [];

            // Fetch Movies
            promises.push(
                getItems(jellyfin, ['Movie'], 20).then(movies => setLatestMovies(movies)).catch(console.error)
            );
            
            // Fetch Series
            promises.push(
                getItems(jellyfin, ['Series'], 20).then(series => setLatestSeries(series)).catch(console.error)
            );

            // Fetch Upcoming (requires Sonarr) - Only for Admin
            if (isAdmin && sonarr?.url && sonarr?.apiKey) {
                promises.push(
                    testSonarrConnection(sonarr)
                        .then(async () => {
                            const start = new Date();
                            const end = new Date();
                            end.setDate(start.getDate() + 14);
                            const calendar = await getSonarrCalendar(sonarr, start, end);
                            setUpcomingCalendar(calendar);
                        })
                        .catch(console.error)
                );
            }
            
            await Promise.all(promises);
            setIsLoading(false);
        };

        fetchJellyfinData();
    }, [settingsCtx, isAdmin]);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-full">
                <Spinner />
                <span className="ml-4 text-xl font-medium tracking-tight text-white/50">{t('loading')}</span>
            </div>
        );
    }

    return (
        <div className="w-full space-y-8 animate-fade-in-up pb-8">
            <div>
              <h1 className="text-4xl font-bold text-white tracking-tighter mb-1">{t('jellyfinTitle')}</h1>
              <p className="text-gray-400 text-base font-medium">{t('jellyfinSubtitle')}</p>
            </div>

            <div className="space-y-10">
                {/* Upcoming Episodes - Only visible if Admin and Data exists */}
                {isAdmin && upcomingCalendar.length > 0 && (
                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4 flex items-center tracking-tight">
                            <span className="w-1 h-6 bg-blue-500 rounded-full mr-3"></span>
                            {t('dashboardUpcoming')}
                        </h2>
                        <div className="flex space-x-4 overflow-x-auto pb-4 px-1 scrollbar-hide">
                            {upcomingCalendar.map(item => (
                                <UpcomingCard key={`${item.seriesId}-${item.episodeNumber}`} item={item} language={language} />
                            ))}
                        </div>
                    </section>
                )}

                {/* Recently Added Movies */}
                {latestMovies.length > 0 && (
                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4 flex items-center tracking-tight">
                            <span className="w-1 h-6 bg-purple-500 rounded-full mr-3"></span>
                            {t('dashboardLatestMovies')}
                        </h2>
                        <div className="flex space-x-4 overflow-x-auto pb-4 px-1 scrollbar-hide">
                            {latestMovies.map(item => (
                                <MediaCard key={item.Id} item={item} imageUrl={getImageUrl(settingsCtx!.settings!.jellyfin, item)} />
                            ))}
                        </div>
                    </section>
                )}
                
                {/* Recently Added Series */}
                {latestSeries.length > 0 && (
                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4 flex items-center tracking-tight">
                            <span className="w-1 h-6 bg-fuchsia-500 rounded-full mr-3"></span>
                            {t('dashboardLatestSeries')}
                        </h2>
                        <div className="flex space-x-4 overflow-x-auto pb-4 px-1 scrollbar-hide">
                            {latestSeries.map(item => (
                                <MediaCard key={item.Id} item={item} imageUrl={getImageUrl(settingsCtx!.settings!.jellyfin, item)} />
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
};

export default JellyfinView;