import JSZip from 'jszip';
import Papa from 'papaparse';
import { JellyfinItem, LetterboxdDiaryEntry, LetterboxdWatchedEntry, LetterboxdRatingEntry, LetterboxdLikeEntry } from '../types';

// Helper to parse a single CSV file from the zip
const parseCsvFile = async <T>(zip: JSZip, fileName: string | RegExp): Promise<T[]> => {
    // Find file by name or regex (useful for likes/films.csv which might be in a subfolder)
    const fileKey = Object.keys(zip.files).find(key => {
        if (typeof fileName === 'string') return key.endsWith(fileName);
        return fileName.test(key);
    });

    if (!fileKey) return [];

    const file = zip.files[fileKey];
    const text = await file.async('string');
    return new Promise((resolve) => {
        Papa.parse(text, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                resolve(results.data as T[]);
            },
            error: () => resolve([]) // Return empty on error to continue process
        });
    });
};

export const parseLetterboxdZip = async (file: File): Promise<JellyfinItem[]> => {
    const zip = new JSZip();
    const contents = await zip.loadAsync(file);
    
    // 1. Parse Metadata Files first (Ratings and Likes) to enrich the main items
    const ratings = await parseCsvFile<LetterboxdRatingEntry>(contents, 'ratings.csv');
    const likes = await parseCsvFile<LetterboxdLikeEntry>(contents, /likes\/films\.csv|liked\.csv/); // Handle standard export structure
    
    // Create a Metadata Map keyed by URI for O(1) access
    // URI is cleaner than Name+Year
    const metadataMap = new Map<string, { rating?: number, isFavorite: boolean }>();

    ratings.forEach(r => {
        const uri = r['Letterboxd URI'];
        if (!uri) return;
        const current = metadataMap.get(uri) || { isFavorite: false };
        current.rating = parseFloat(r.Rating);
        metadataMap.set(uri, current);
    });

    likes.forEach(l => {
        const uri = l['Letterboxd URI'];
        if (!uri) return;
        const current = metadataMap.get(uri) || { isFavorite: false };
        current.isFavorite = true;
        metadataMap.set(uri, current);
    });

    // 2. Parse Diary (Priority: Contains Date)
    const diaryEntries = await parseCsvFile<LetterboxdDiaryEntry>(contents, 'diary.csv');
    const finalItems: JellyfinItem[] = [];
    const seenUrisInDiary = new Set<string>();

    diaryEntries.forEach((entry, index) => {
        const uri = entry['Letterboxd URI'];
        const metadata = metadataMap.get(uri);
        
        // Use Watched Date (preferred) or Logged Date
        const watchedDateStr = entry['Watched Date'] || entry['Date'];
        const watchedDate = new Date(watchedDateStr);
        
        // Mark URI as seen in diary so we don't duplicate it from 'watched.csv' later
        // Note: We allow duplicates inside Diary (Rewatches)
        if (uri) seenUrisInDiary.add(uri);

        finalItems.push({
            Id: `lb-diary-${index}-${watchedDate.getTime()}`,
            Name: entry.Name,
            Type: 'Movie',
            DateCreated: watchedDate.toISOString(), // Used for sorting history
            ProductionYear: parseInt(entry.Year) || undefined,
            UserData: {
                LastPlayedDate: watchedDate.toISOString(),
                IsPlayed: true,
                PlayedPercentage: 100,
                PlayCount: 1,
                // Priority: Diary Rating > Global Rating > Favorite (4.5+)
                Rating: entry.Rating ? parseFloat(entry.Rating) : metadata?.rating,
                IsFavorite: metadata?.isFavorite || (entry.Rating ? parseFloat(entry.Rating) >= 4.5 : false)
            },
            RunTimeTicks: 120 * 60 * 10000000, // Estimate
            IsExternal: true,
            ExternalSource: 'Letterboxd'
        });
    });

    // 3. Parse Watched (Fallback: No specific date usually, just "I saw this")
    const watchedEntries = await parseCsvFile<LetterboxdWatchedEntry>(contents, 'watched.csv');
    
    watchedEntries.forEach((entry, index) => {
        const uri = entry['Letterboxd URI'];
        
        // Skip if this URI is already in the diary.
        // We only want to add movies that are marked "Watched" but NOT logged in the diary.
        if (uri && seenUrisInDiary.has(uri)) return;

        const metadata = metadataMap.get(uri);
        // Use "Date" from watched.csv (often just the export date or log date, not watch date)
        // Or default to epoch if invalid, to separate them from "Real" history
        const watchedDateStr = entry['Date']; 
        const watchedDate = watchedDateStr ? new Date(watchedDateStr) : new Date(0); 

        finalItems.push({
            Id: `lb-watched-${index}`,
            Name: entry.Name,
            Type: 'Movie',
            DateCreated: watchedDate.toISOString(),
            ProductionYear: parseInt(entry.Year) || undefined,
            UserData: {
                LastPlayedDate: watchedDate.toISOString(),
                IsPlayed: true,
                PlayedPercentage: 100,
                PlayCount: 1,
                Rating: metadata?.rating,
                IsFavorite: metadata?.isFavorite || (metadata?.rating ? metadata.rating >= 4.5 : false)
            },
            RunTimeTicks: 120 * 60 * 10000000,
            IsExternal: true,
            ExternalSource: 'Letterboxd'
        });
    });

    if (finalItems.length === 0) {
        throw new Error("Aucun fichier valide (diary.csv, watched.csv, ratings.csv, films.csv) trouvé dans l'archive.");
    }

    return finalItems;
};