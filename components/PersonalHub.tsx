import React, { useEffect, useState, useContext, useMemo } from 'react';
import { SettingsContext } from '../App';
import { useAuth } from '../auth/AuthContext';
import { useTranslation } from '../hooks/useTranslation';
import { getResumeItems, getPlayedItems, getImageUrl } from '../services/jellyfinService';
import { JellyfinItem } from '../types';
import Spinner from './common/Spinner';
import { PlayIcon } from '../constants';
import useLocalStorage from '../hooks/useLocalStorage';

const CountUp: React.FC<{ end: number, duration?: number, suffix?: string }> = ({ end, duration = 2000, suffix = '' }) => {
    const [count, setCount] = useState(0);
    
    useEffect(() => {
        let startTime: number | null = null;
        const animate = (currentTime: number) => {
            if (!startTime) startTime = currentTime;
            const progress = currentTime - startTime;
            const percentage = Math.min(progress / duration, 1);
            
            // Easing function (easeOutExpo)
            const ease = percentage === 1 ? 1 : 1 - Math.pow(2, -10 * percentage);
            
            setCount(parseFloat((ease * end).toFixed(1)));
            
            if (percentage < 1) {
                requestAnimationFrame(animate);
            }
        };
        requestAnimationFrame(animate);
    }, [end, duration]);

    return <span>{count}{suffix}</span>;
};

const ResumeCard: React.FC<{ item: JellyfinItem, settings: any }> = ({ item, settings }) => {
    const percent = item.UserData?.PlayedPercentage || 0;
    const imageUrl = getImageUrl(settings, item, 'Backdrop');
    
    const jellyfinLink = `${settings.url}/web/index.html#!/details?id=${item.Id}`;

    return (
        <a href={jellyfinLink} target="_blank" rel="noopener noreferrer" className="block flex-shrink-0 w-72 glass-card rounded-2xl overflow-hidden group relative border border-white/10 hover:border-jellyfin-accent/50 transition-all duration-300 transform hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-10"></div>
            <img src={imageUrl} alt={item.Name} className="w-full h-40 object-cover transition-transform duration-700 group-hover:scale-105" />
            
            <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                <div className="bg-jellyfin-accent/80 p-3 rounded-full backdrop-blur-sm shadow-lg transform scale-50 group-hover:scale-100 transition-transform">
                     <PlayIcon />
                </div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-4 z-20">
                <h3 className="font-bold text-sm text-white truncate shadow-black drop-shadow-md">{item.Name}</h3>
                <div className="w-full bg-white/20 h-1 rounded-full overflow-hidden mt-2">
                    <div className="bg-jellyfin-accent h-full rounded-full" style={{ width: `${percent}%` }}></div>
                </div>
                <div className="flex justify-between mt-1">
                    <span className="text-[8px] text-gray-400 uppercase tracking-wider">{Math.round(percent)}%</span>
                </div>
            </div>
        </a>
    );
};

const WrappedCard: React.FC<{ title: string, children: React.ReactNode, className?: string, color?: string }> = ({ title, children, className = '', color = "from-purple-500/20" }) => (
    <div className={`glass-panel p-6 rounded-3xl relative overflow-hidden group ${className}`}>
        <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${color} to-transparent opacity-20 blur-2xl rounded-full -mr-10 -mt-10 group-hover:opacity-40 transition-opacity duration-700`}></div>
        <h3 className="text-sm font-bold text-white/50 uppercase tracking-widest mb-4 relative z-10">{title}</h3>
        <div className="relative z-10">
            {children}
        </div>
    </div>
);

// New Component for Rating Distribution Bar Chart
const RatingChart: React.FC<{ distribution: Record<number, number> }> = ({ distribution }) => {
    const maxVal = Math.max(...(Object.values(distribution) as number[]));
    const ratings = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];

    return (
        <div className="flex justify-between h-32 w-full mt-4 gap-1">
            {ratings.map(r => {
                const count = distribution[r] || 0;
                const heightPercent = maxVal > 0 ? (count / maxVal) * 100 : 0;
                return (
                    <div key={r} className="flex flex-col items-center flex-1 group h-full justify-end">
                         <div className="w-full bg-white/5 rounded-t-sm relative group-hover:bg-white/10 transition-colors flex-grow flex items-end">
                            <div 
                                className={`w-full transition-all duration-1000 ${r >= 4 ? 'bg-emerald-500' : r >= 2.5 ? 'bg-orange-400' : 'bg-red-500'}`} 
                                style={{ height: `${heightPercent}%`, minHeight: count > 0 ? '4px' : '0' }}
                            ></div>
                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-black/80 px-2 py-1 rounded text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20">
                                {count}x
                            </div>
                         </div>
                         <span className="text-[9px] text-gray-500 mt-2 font-mono h-3 leading-none">{r}</span>
                    </div>
                )
            })}
        </div>
    );
};

type TimeRange = '7days' | '30days' | '6months' | '1year' | 'all';
type Tab = 'stats' | 'recap';

const PersonalHub: React.FC = () => {
    const settingsCtx = useContext(SettingsContext);
    const { currentUser } = useAuth();
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<Tab>('stats');
    const [resumeItems, setResumeItems] = useState<JellyfinItem[]>([]);
    const [allHistoryItems, setAllHistoryItems] = useState<JellyfinItem[]>([]);
    const [externalHistory, _] = useLocalStorage<JellyfinItem[]>('medusa-external-history', []);
    const [isLoading, setIsLoading] = useState(true);
    const [timeRange, setTimeRange] = useState<TimeRange>('30days');
    
    // Toggle for Letterboxd Data
    const [showLetterboxd, setShowLetterboxd] = useLocalStorage<boolean>('medusa-show-letterboxd', true);

    // Stats
    const [stats, setStats] = useState({
        totalHours: 0,
        totalItems: 0,
        topGenres: [] as {name: string, count: number, percent: number}[],
        activeDay: '',
        movieCount: 0,
        seriesCount: 0
    });

    // Letterboxd Specific Stats
    const [lbStats, setLbStats] = useState({
        avgRating: 0,
        ratingDist: {} as Record<number, number>,
        oldestMovie: null as JellyfinItem | null,
        favDecade: '',
        decadeCount: 0,
        ratedCount: 0 // Count only items with a rating
    });

    // Recap 2025 Stats
    const [recapStats, setRecapStats] = useState({
        totalMinutes: 0,
        topMonth: '',
        topItem: null as JellyfinItem | null,
        activeDaysCount: 0,
        topGenres: [] as {name: string, count: number}[],
        letterboxdCount: 0
    });

    // Combine Jellyfin + External for stats calculation
    const combinedHistory = useMemo(() => {
        if (!showLetterboxd) {
            return [...allHistoryItems];
        }
        return [...allHistoryItems, ...externalHistory];
    }, [allHistoryItems, externalHistory, showLetterboxd]);

    useEffect(() => {
        const fetchData = async () => {
            if (!settingsCtx?.settings?.jellyfin?.url) {
                setIsLoading(false);
                return;
            }

            try {
                // Fetching up to 2000 items should cover a year for most users
                const [resume, history] = await Promise.all([
                    getResumeItems(settingsCtx.settings.jellyfin),
                    getPlayedItems(settingsCtx.settings.jellyfin, 2000) 
                ]);
                setResumeItems(resume);
                setAllHistoryItems(history);
            } catch (e) {
                console.error(e);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [settingsCtx]);

    // Calculate General Stats (Filtered by Range)
    useEffect(() => {
        if (combinedHistory.length === 0) {
            // Reset stats if no history
            setStats({ totalHours: 0, totalItems: 0, topGenres: [], activeDay: '', movieCount: 0, seriesCount: 0 });
            setLbStats({ avgRating: 0, ratingDist: {}, oldestMovie: null, favDecade: '', decadeCount: 0, ratedCount: 0 });
            return;
        }

        const now = new Date();
        const filtered = combinedHistory.filter(item => {
            if (!item.UserData?.LastPlayedDate) return false;
            // Filter out default epoch dates from 'watched.csv' import if range is not 'all'
            // Epoch (1970) usually means "Watched but unknown date"
            const playedDate = new Date(item.UserData.LastPlayedDate);
            if (playedDate.getFullYear() === 1970 && timeRange !== 'all') return false;

            if (timeRange === 'all') return true;

            const diffTime = Math.abs(now.getTime() - playedDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (timeRange === '7days') return diffDays <= 7;
            if (timeRange === '30days') return diffDays <= 30;
            if (timeRange === '6months') return diffDays <= 180;
            if (timeRange === '1year') return diffDays <= 365;
            return true;
        });

        // Calculate General Stats
        let ticks = 0;
        const genreCounts: Record<string, number> = {};
        const dayCounts: Record<string, number> = {};
        let itemCount = 0;
        let mCount = 0;
        let sCount = 0;

        // Stats specific to Letterboxd / Ratings
        let totalRating = 0;
        let ratedItemsCount = 0;
        const ratingDist: Record<number, number> = {};
        const decadeCounts: Record<string, number> = {};
        let oldestMovieItem: JellyfinItem | null = null;

        filtered.forEach(item => {
            itemCount++;
            if (item.RunTimeTicks) ticks += item.RunTimeTicks;
            if (item.Type === 'Movie') mCount++;
            if (item.Type === 'Episode') sCount++;

            if (item.Genres) {
                item.Genres.forEach(g => {
                    genreCounts[g] = (genreCounts[g] || 0) + 1;
                });
            }
            if (item.UserData?.LastPlayedDate) {
                const date = new Date(item.UserData.LastPlayedDate);
                // Exclude invalid dates from "Active Day" calculation
                if (date.getFullYear() > 1970) {
                    const day = date.toLocaleDateString(undefined, { weekday: 'long' });
                    dayCounts[day] = (dayCounts[day] || 0) + 1;
                }
            }

            // Letterboxd / Metadata Logic
            if (item.UserData?.Rating) {
                totalRating += item.UserData.Rating;
                ratedItemsCount++;
                const roundedRating = Math.round(item.UserData.Rating * 2) / 2; // Ensure 0.5 steps
                ratingDist[roundedRating] = (ratingDist[roundedRating] || 0) + 1;
            }

            if (item.ProductionYear) {
                const decade = Math.floor(item.ProductionYear / 10) * 10;
                decadeCounts[decade] = (decadeCounts[decade] || 0) + 1;

                if (!oldestMovieItem || item.ProductionYear < oldestMovieItem.ProductionYear!) {
                    oldestMovieItem = item;
                }
            }
        });

        const hours = Math.round(ticks / (10000000 * 3600));
        
        const sortedGenres = Object.entries(genreCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3)
            .map(([name, count]) => ({
                name,
                count,
                percent: itemCount > 0 ? Math.round((count / itemCount) * 100) : 0
            }));

        const topDay = Object.entries(dayCounts).sort((a,b) => b[1] - a[1])[0]?.[0] || '-';
        const topDecadeEntry = Object.entries(decadeCounts).sort((a, b) => b[1] - a[1])[0];

        setStats({
            totalHours: hours,
            totalItems: itemCount,
            topGenres: sortedGenres,
            activeDay: topDay,
            movieCount: mCount,
            seriesCount: sCount
        });

        setLbStats({
            avgRating: ratedItemsCount > 0 ? parseFloat((totalRating / ratedItemsCount).toFixed(2)) : 0,
            ratingDist,
            oldestMovie: oldestMovieItem,
            favDecade: topDecadeEntry ? topDecadeEntry[0] : '',
            decadeCount: topDecadeEntry ? topDecadeEntry[1] : 0,
            ratedCount: ratedItemsCount
        });

    }, [timeRange, combinedHistory]);

    // Calculate Recap 2025 Stats
    useEffect(() => {
        if (combinedHistory.length === 0) return;

        const items2025 = combinedHistory.filter(item => {
            if (!item.UserData?.LastPlayedDate) return false;
            return new Date(item.UserData.LastPlayedDate).getFullYear() === 2025;
        });

        if (items2025.length === 0) {
            setRecapStats({ totalMinutes: 0, topMonth: '', topItem: null, activeDaysCount: 0, topGenres: [], letterboxdCount: 0 });
            return;
        }

        let totalTicks = 0;
        const monthCounts: Record<string, number> = {};
        const genreCounts: Record<string, number> = {};
        const uniqueDays = new Set<string>();
        let lbCount = 0;
        
        let maxDurationItem = items2025[0];

        items2025.forEach(item => {
            if (item.IsExternal) lbCount++;
            
            if (item.RunTimeTicks) {
                totalTicks += item.RunTimeTicks;
                if (item.RunTimeTicks > (maxDurationItem.RunTimeTicks || 0)) {
                    maxDurationItem = item;
                }
            }
            
            if (item.UserData?.LastPlayedDate) {
                const date = new Date(item.UserData.LastPlayedDate);
                const month = date.toLocaleDateString(undefined, { month: 'long' });
                monthCounts[month] = (monthCounts[month] || 0) + 1;
                uniqueDays.add(date.toDateString());
            }

            if (item.Genres) {
                item.Genres.forEach(g => genreCounts[g] = (genreCounts[g] || 0) + 1);
            }
        });

        const topMonth = Object.entries(monthCounts).sort((a,b) => b[1] - a[1])[0]?.[0] || '';
        const sortedGenres = Object.entries(genreCounts).sort((a,b) => b[1] - a[1]).slice(0, 3).map(([name, count]) => ({ name, count }));

        setRecapStats({
            totalMinutes: Math.round(totalTicks / (10000000 * 60)),
            topMonth,
            topItem: maxDurationItem,
            activeDaysCount: uniqueDays.size,
            topGenres: sortedGenres,
            letterboxdCount: lbCount
        });

    }, [combinedHistory]);

    const ranges: { id: TimeRange, label: string }[] = [
        { id: '7days', label: t('range7Days') },
        { id: '30days', label: t('range30Days') },
        { id: '6months', label: t('range6Months') },
        { id: '1year', label: t('range1Year') },
        { id: 'all', label: t('rangeAllTime') },
    ];

    if (isLoading) {
         return (
            <div className="flex justify-center items-center h-full">
                <Spinner />
                <span className="ml-4 text-xl font-medium tracking-tight text-white/50">{t('loading')}</span>
            </div>
        );
    }

    return (
        <div className="w-full space-y-8 animate-fade-in-up pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4">
                 <div>
                    <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60 tracking-tighter mb-2">
                        {t('userHubTitle', { name: currentUser?.name || 'User' })}
                    </h1>
                    <p className="text-gray-400 font-medium text-lg">{t('userHubSubtitle')}</p>
                 </div>
                 
                 <div className="flex flex-col md:flex-row gap-4 items-center">
                    {/* Letterboxd Toggle */}
                     {externalHistory.length > 0 && (
                        <button 
                            onClick={() => setShowLetterboxd(prev => !prev)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border border-white/10 flex items-center space-x-2 ${showLetterboxd ? 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30' : 'bg-white/5 text-gray-500 hover:text-white'}`}
                        >
                            <div className={`w-2 h-2 rounded-full ${showLetterboxd ? 'bg-orange-400' : 'bg-gray-600'}`}></div>
                            <span>{t('userHubToggleLetterboxd')}</span>
                        </button>
                     )}

                     {/* Tabs Switcher */}
                     <div className="bg-white/5 p-1 rounded-2xl border border-white/10 flex space-x-1">
                         <button onClick={() => setActiveTab('stats')} className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'stats' ? 'bg-white text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}>
                            {t('userHubTabGlobal')}
                         </button>
                         <button onClick={() => setActiveTab('recap')} className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'recap' ? 'bg-gradient-to-r from-amber-200 to-yellow-500 text-black shadow-lg shadow-amber-500/20' : 'text-gray-400 hover:text-white'}`}>
                            {t('userHubTabRecap')}
                         </button>
                     </div>
                 </div>
            </div>

            {/* Resume Row (Always visible) */}
            {resumeItems.length > 0 && (
                <section>
                    <h2 className="text-xl font-bold text-white mb-6 flex items-center tracking-tight">
                        <PlayIcon />
                        {t('userHubContinueWatching')}
                    </h2>
                    <div className="flex space-x-6 overflow-x-auto pb-8 pt-2 px-2 scrollbar-hide snap-x">
                        {resumeItems.map(item => (
                            <div key={item.Id} className="snap-start">
                                <ResumeCard item={item} settings={settingsCtx?.settings?.jellyfin} />
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Content Based on Tab */}
            {activeTab === 'stats' ? (
                <div className="space-y-10 animate-fade-in-up">
                    {/* Range Selector */}
                     <div className="flex justify-end">
                         <div className="bg-white/5 p-1 rounded-full border border-white/10 flex space-x-1">
                            {ranges.map(r => (
                                <button
                                    key={r.id}
                                    onClick={() => setTimeRange(r.id)}
                                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-300 ${
                                        timeRange === r.id 
                                        ? 'bg-jellyfin-accent text-white shadow-lg' 
                                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                                    }`}
                                >
                                    {r.label}
                                </button>
                            ))}
                         </div>
                     </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* Total Time */}
                        <WrappedCard title={t('userHubTimeInvested')} className="lg:col-span-2" color="from-indigo-500 via-purple-500 to-pink-500">
                            <div className="flex items-baseline mt-2">
                                <span className="text-7xl font-black text-white tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                                    <CountUp end={stats.totalHours} />
                                </span>
                                <span className="text-xl text-white/60 font-bold ml-2">{t('userHubHours')}</span>
                            </div>
                            <p className="text-sm text-gray-400 mt-2 font-medium max-w-xs leading-relaxed">
                                {t('userHubDaysDedication', { days: Math.round(stats.totalHours / 24) })}
                            </p>
                        </WrappedCard>

                        {/* Top Genre */}
                        <WrappedCard title={t('userHubTopVibe')} color="from-emerald-400 to-teal-500">
                            {stats.topGenres.length > 0 ? (
                                <div className="flex flex-col justify-end h-32">
                                    <span className="text-4xl font-black text-white tracking-tight break-words leading-none mb-2">
                                        {stats.topGenres[0].name}
                                    </span>
                                    <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                                        <div className="bg-emerald-400 h-full rounded-full animate-fade-in-up" style={{ width: `${stats.topGenres[0].percent}%`, animationDelay: '1s' }}></div>
                                    </div>
                                    <span className="text-xs text-emerald-300 font-bold mt-2">{t('userHubHistoryPercent', { percent: stats.topGenres[0].percent })}</span>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center h-32 text-white/20 font-bold">{t('userHubNoData')}</div>
                            )}
                        </WrappedCard>

                        {/* Favorite Day */}
                        <WrappedCard title={t('userHubFavoriteDay')} color="from-orange-400 to-red-500">
                            {stats.activeDay && stats.activeDay !== '-' ? (
                                <div className="flex flex-col justify-end h-32">
                                    <span className="text-4xl font-black text-white tracking-tighter uppercase">
                                        {stats.activeDay}
                                    </span>
                                    <span className="text-xs text-orange-200 font-bold mt-2">{t('userHubMostActive', { day: stats.activeDay })}</span>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center h-32 text-white/20 font-bold">{t('userHubNoData')}</div>
                            )}
                        </WrappedCard>
                    </div>

                    {/* Letterboxd / Ratings Section - Only if data available */}
                    {(externalHistory.length > 0 && showLetterboxd) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in-up">
                            {/* Average Rating & Distribution */}
                            <div className="lg:col-span-2 glass-panel p-6 rounded-3xl border border-white/5 relative overflow-hidden">
                                <h3 className="text-sm font-bold text-white/50 uppercase tracking-widest mb-2 flex items-center">
                                    <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
                                    {t('lbStatsTitle')}
                                </h3>
                                
                                <div className="flex flex-col md:flex-row gap-8">
                                    {/* Average Rating Circle */}
                                    <div className="flex-shrink-0 flex flex-col items-center justify-center">
                                         <div className="w-32 h-32 rounded-full border-4 border-white/10 flex items-center justify-center relative bg-white/5">
                                            <div className="text-5xl font-black text-white tracking-tighter">{lbStats.avgRating}</div>
                                            <div className="absolute bottom-2 text-xs font-bold text-gray-400 uppercase">AVG</div>
                                         </div>
                                         <span className="text-xs text-gray-500 mt-2 font-mono">{t('lbTotalRatings')}: {lbStats.ratedCount}</span>
                                    </div>

                                    {/* Histogram */}
                                    <div className="flex-1 w-full">
                                        <h4 className="text-xs font-bold text-gray-400 uppercase">{t('lbRatingDist')}</h4>
                                        <RatingChart distribution={lbStats.ratingDist} />
                                    </div>
                                </div>
                            </div>

                            {/* Oldest Movie & Decade */}
                            <div className="grid grid-rows-2 gap-6">
                                <div className="glass-panel p-5 rounded-2xl border border-white/5 flex items-center justify-between group cursor-default">
                                    <div className="overflow-hidden">
                                        <h3 className="text-xs font-bold text-purple-300 uppercase tracking-widest mb-1">{t('lbOldestMovie')}</h3>
                                        <p className="text-xl font-bold text-white truncate max-w-[150px]">{lbStats.oldestMovie?.Name || '-'}</p>
                                        <p className="text-3xl font-black text-white/20">{lbStats.oldestMovie?.ProductionYear || '----'}</p>
                                    </div>
                                    <div className="h-16 w-16 bg-white/10 rounded-lg overflow-hidden border border-white/10">
                                         {lbStats.oldestMovie && (
                                             <img 
                                                src={lbStats.oldestMovie.IsExternal ? 'https://via.placeholder.com/100?text=LB' : getImageUrl(settingsCtx!.settings!.jellyfin, lbStats.oldestMovie)} 
                                                className="w-full h-full object-cover opacity-60 group-hover:scale-110 transition-transform" 
                                             />
                                         )}
                                    </div>
                                </div>
                                <div className="glass-panel p-5 rounded-2xl border border-white/5 flex flex-col justify-center">
                                    <h3 className="text-xs font-bold text-yellow-300 uppercase tracking-widest mb-1">{t('lbFavDecade')}</h3>
                                    <p className="text-4xl font-black text-white">{lbStats.favDecade}s</p>
                                    <p className="text-xs text-gray-400 mt-1">
                                        {t('lbDecadeCount', { count: lbStats.decadeCount, decade: lbStats.favDecade })}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {/* Secondary Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                         {/* Genre Breakdown */}
                         <div className="lg:col-span-1 glass-panel p-6 rounded-3xl border border-white/5">
                            <h3 className="text-lg font-bold text-white mb-6">{t('userHubGenreMix')}</h3>
                            <div className="space-y-4">
                                {stats.topGenres.map((genre, idx) => (
                                    <div key={genre.name} className="group">
                                        <div className="flex justify-between text-xs font-bold text-gray-400 mb-1 group-hover:text-white transition-colors">
                                            <span>{genre.name}</span>
                                            <span>{t('userHubTitlesCount', { count: genre.count })}</span>
                                        </div>
                                        <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                                            <div 
                                                className={`h-full rounded-full transition-all duration-1000 ease-out ${idx === 0 ? 'bg-gradient-to-r from-purple-500 to-pink-500' : 'bg-white/20'}`} 
                                                style={{ width: `${genre.percent}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                ))}
                                {stats.topGenres.length === 0 && <p className="text-gray-500 text-sm">{t('userHubNotEnoughData')}</p>}
                            </div>
                         </div>
                         
                         {/* Movie vs Series */}
                         <div className="lg:col-span-2 glass-panel p-6 rounded-3xl border border-white/5 flex flex-col justify-between">
                             <h3 className="text-lg font-bold text-white">{t('userHubMovieVsSeries')}</h3>
                             <div className="flex items-center space-x-4 my-6">
                                 <div className="flex-1 text-center">
                                     <span className="block text-4xl font-black text-white">{stats.movieCount}</span>
                                     <span className="text-xs text-gray-500 font-bold uppercase tracking-widest">{t('typeMovie')}s</span>
                                 </div>
                                 <div className="h-12 w-[1px] bg-white/10"></div>
                                 <div className="flex-1 text-center">
                                     <span className="block text-4xl font-black text-white">{stats.seriesCount}</span>
                                     <span className="text-xs text-gray-500 font-bold uppercase tracking-widest">{t('typeSeries')} (EPS)</span>
                                 </div>
                             </div>
                             <div className="w-full h-4 bg-white/10 rounded-full overflow-hidden flex">
                                 <div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: `${stats.movieCount + stats.seriesCount > 0 ? (stats.movieCount / (stats.movieCount + stats.seriesCount)) * 100 : 0}%` }}></div>
                                 <div className="h-full bg-fuchsia-500 transition-all duration-1000" style={{ width: `${stats.movieCount + stats.seriesCount > 0 ? (stats.seriesCount / (stats.movieCount + stats.seriesCount)) * 100 : 0}%` }}></div>
                             </div>
                             <p className="text-center text-xs text-gray-400 mt-3 font-mono">
                                 {t('userHubFormatDistribution', { movies: stats.movieCount, series: stats.seriesCount })}
                             </p>
                         </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-6 animate-fade-in-up">
                    <div className="text-center mb-10">
                         <h2 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-600 mb-2 drop-shadow-[0_0_20px_rgba(251,191,36,0.5)]">2025</h2>
                         <p className="text-white/60 text-xl font-bold tracking-widest uppercase">{t('recapTitle')}</p>
                         {recapStats.letterboxdCount > 0 && showLetterboxd && (
                            <p className="text-amber-300/50 text-xs font-mono mt-2 tracking-widest uppercase">
                                {t('recapIncludesLetterboxd', { count: recapStats.letterboxdCount })}
                            </p>
                         )}
                    </div>

                    {recapStats.totalMinutes === 0 ? (
                        <div className="glass-panel p-10 rounded-3xl text-center border-dashed border-amber-500/30">
                            <p className="text-amber-200/60 font-bold">{t('recapNoData2025')}</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                             {/* Gold Card 1 */}
                             <div className="glass-panel p-8 rounded-3xl border border-amber-500/20 bg-gradient-to-b from-amber-500/10 to-transparent relative overflow-hidden group">
                                 <div className="absolute top-0 right-0 p-3 opacity-20">
                                     <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 text-amber-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg>
                                 </div>
                                 <h3 className="text-amber-300 font-bold uppercase tracking-widest text-xs mb-4">{t('recapTotalMinutes')}</h3>
                                 <p className="text-5xl font-black text-white">{recapStats.totalMinutes.toLocaleString()}</p>
                                 <p className="text-sm text-amber-200/50 mt-2 font-medium">Minutes of pure joy</p>
                             </div>

                             {/* Gold Card 2 */}
                             <div className="glass-panel p-8 rounded-3xl border border-amber-500/20 bg-gradient-to-b from-amber-500/10 to-transparent relative overflow-hidden group">
                                 <h3 className="text-amber-300 font-bold uppercase tracking-widest text-xs mb-4">{t('recapTopMonth')}</h3>
                                 <p className="text-4xl font-black text-white break-words">{recapStats.topMonth}</p>
                                 <p className="text-sm text-amber-200/50 mt-2 font-medium">{t('recapUniqueDays')}: {recapStats.activeDaysCount}</p>
                             </div>

                             {/* Gold Card 3 - Top Item */}
                             {recapStats.topItem && (
                                <div className="md:col-span-1 glass-panel p-0 rounded-3xl border border-amber-500/20 bg-black relative overflow-hidden group">
                                    <div className="absolute inset-0 z-0">
                                        <img 
                                            src={recapStats.topItem.IsExternal ? 'https://via.placeholder.com/400x600.png?text=Letterboxd+Entry' : getImageUrl(settingsCtx!.settings!.jellyfin, recapStats.topItem, 'Primary')} 
                                            className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700" 
                                            alt="" 
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent"></div>
                                    </div>
                                    <div className="relative z-10 p-8 h-full flex flex-col justify-end">
                                        <h3 className="text-amber-300 font-bold uppercase tracking-widest text-xs mb-2">{t('recapTopItem')}</h3>
                                        <p className="text-2xl font-bold text-white leading-tight">{recapStats.topItem.Name}</p>
                                        <p className="text-xs text-gray-300 mt-1">{recapStats.topItem.ProductionYear}</p>
                                    </div>
                                </div>
                             )}

                             {/* Genres List */}
                             <div className="md:col-span-3 glass-panel p-6 rounded-3xl border border-white/5 bg-black/20">
                                 <div className="flex flex-wrap justify-center gap-4">
                                     {recapStats.topGenres.map((g, i) => (
                                         <div key={g.name} className="px-6 py-3 rounded-full border border-white/10 bg-white/5 flex items-center space-x-3">
                                             <span className={`font-bold text-lg ${i===0 ? 'text-amber-400' : 'text-white'}`}>#{i+1}</span>
                                             <span className="text-sm font-bold text-gray-300 uppercase tracking-widest">{g.name}</span>
                                             <span className="text-xs text-gray-500">({g.count})</span>
                                         </div>
                                     ))}
                                 </div>
                             </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default PersonalHub;