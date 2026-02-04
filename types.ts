

export interface JellyfinSettings {
  url: string;
  apiKey: string;
  userId: string;
  isManualMode?: boolean;
}

export interface RadarrSettings {
  url: string;
  apiKey: string;
}

export interface SonarrSettings {
  url: string;
  apiKey: string;
}

export interface AutomationSettings {
  movieRetentionDays: number;
  tvSeasonRetentionDays: number;
}

export interface WebhookSettings {
  discordUrl?: string;
  enabled: boolean;
  username?: string;
  avatarUrl?: string;
}

export interface JccSettings {
  jellyfin: JellyfinSettings;
  radarr?: RadarrSettings;
  sonarr?: SonarrSettings;
  automation?: AutomationSettings;
  webhooks?: WebhookSettings;
}

export interface JellyfinUser {
  Name: string;
  Id: string;
  PrimaryImageTag?: string;
  Policy?: {
    IsAdministrator: boolean;
  }
}

export interface JellyfinSession {
  Id: string;
  UserId: string;
  UserName: string;
  Client: string;
  DeviceName: string;
  NowPlayingItem?: {
    Name: string;
    SeriesName?: string;
    Id: string;
    Type: string;
  };
  PlayState?: {
    PlayMethod: 'Transcode' | 'DirectStream' | 'DirectPlay';
    IsPaused: boolean;
  };
  TranscodingInfo?: {
    AudioCodec: string;
    VideoCodec: string;
    TranscodingReasons: string[];
    Bitrate?: number;
  };
}

export interface JellyfinItem {
  Id: string;
  Name: string;
  Type: 'Movie' | 'Series' | 'Season' | 'Episode';
  DateCreated: string; // ISO date string
  SeriesName?: string;
  SeriesId?: string;
  ParentId?: string;
  ImageTags?: {
    Primary?: string;
    Backdrop?: string;
    Thumb?: string;
  }
  ProductionYear?: number;
  ProviderIds?: {
    Tmdb?: string;
    Tvdb?: string;
    Imdb?: string;
  }
  Genres?: string[];
  RunTimeTicks?: number;
  MediaSources?: {
     Size?: number;
     VideoType?: string; // e.g. "Video", "Iso"
     Container?: string;
     Width?: number; // 3840 for 4K, 1920 for 1080p
  }[];
  OfficialRating?: string;
  Tags?: string[];
  UserData?: {
    PlayedPercentage?: number;
    LastPlayedDate?: string;
    IsPlayed?: boolean;
    PlaybackPositionTicks?: number;
    PlayCount?: number;
    IsFavorite?: boolean;
    Rating?: number;
  };
  // Property used to identify items imported from Letterboxd
  IsExternal?: boolean;
  ExternalSource?: string;
}

export interface RadarrMovie {
    id: number;
    title: string;
    year: number;
    tmdbId: number;
    path: string;
    sizeOnDisk: number;
}

export interface SonarrSeries {
    id: number;
    title: string;
    tvdbId: number;
    path: string;
    images: { coverType: string, url: string }[];
}

export interface SonarrEpisode {
    id: number;
    seriesId: number;
    episodeNumber: number;
    seasonNumber: number;
    title: string;
    hasFile: boolean;
    episodeFileId: number;
    // seasonNumber property is assumed in logic but was missing in previous type def in some contexts, ensure it is here. 
    // It is already there in original file.
}

export interface SonarrEpisodeFile {
    id: number;
    size: number;
}

export interface SonarrCalendarItem {
    seriesId: number;
    tvdbId: number;
    title: string;
    seasonNumber: number;
    episodeNumber: number;
    airDateUtc: string;
    series: {
        title: string;
        tvdbId: number;
        images: { coverType: string, remoteUrl: string }[];
    }
}

export interface SystemDiskSpace {
    path: string;
    label: string;
    freeSpace: number;
    totalSpace: number;
}

export interface QueueItem {
    id: number;
    title: string;
    status: string;
    size: number;
    sizeleft: number;
    timeleft: string;
    estimatedCompletionTime: string;
    protocol: string;
    indexer: string;
}

export interface LetterboxdDiaryEntry {
  Date: string; // YYYY-MM-DD (Logged date)
  Name: string;
  Year: string;
  'Letterboxd URI': string;
  Rating: string;
  Rewatch: string;
  Tags: string;
  'Watched Date': string; // The real watch date
}

export interface LetterboxdWatchedEntry {
  Date: string;
  Name: string;
  Year: string;
  'Letterboxd URI': string;
}

export interface LetterboxdRatingEntry {
  Date: string;
  Name: string;
  Year: string;
  'Letterboxd URI': string;
  Rating: string;
}

export interface LetterboxdLikeEntry {
  Date: string;
  Name: string;
  Year: string;
  'Letterboxd URI': string;
}