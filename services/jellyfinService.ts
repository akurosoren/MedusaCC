import { JellyfinSettings, JellyfinItem, JellyfinUser, JellyfinSession } from '../types';

async function apiFetch(endpoint: string, settings: Omit<JellyfinSettings, 'userId'>, options: RequestInit = {}) {
  const { url, apiKey } = settings;
  if (!url) {
    throw new Error("Jellyfin URL is not configured.");
  }

  const headers: HeadersInit = {
    'Accept': 'application/json',
    ...options.headers,
  };
  
  if (apiKey) {
      headers['X-Emby-Token'] = apiKey;
  }
    
  if (options.method === 'POST') {
      headers['Content-Type'] = 'application/json; charset=UTF-8';
  }

  const cleanUrl = url.endsWith('/') ? url.slice(0, -1) : url;
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  try {
    const response = await fetch(`${cleanUrl}${cleanEndpoint}`, { ...options, headers });
    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorBody}`);
    }
    if (response.status === 204) {
      return null;
    }
    return response.json();
  } catch (error) {
    console.error(`Jellyfin API call to ${endpoint} failed:`, error);
    if (error instanceof TypeError) {
        throw new Error("Network Error: Could not connect to the Jellyfin server. This is likely a CORS issue. Please go to your Jellyfin Dashboard > Networking, and in the 'CORS origins' field, add the URL of this application. Using '*' will allow all origins.");
    }
    throw error;
  }
}

export const authenticateUserByName = async (url: string, username: string, pw: string): Promise<{ AccessToken: string, User: JellyfinUser, SessionInfo: any }> => {
    const authHeader = `MediaBrowser Client="Medusa", Device="Web", DeviceId="medusa-web", Version="1.0.0"`;
    
    return apiFetch('/Users/AuthenticateByName', { url, apiKey: '' }, {
        method: 'POST',
        headers: {
            'X-Emby-Authorization': authHeader
        },
        body: JSON.stringify({ Username: username, Pw: pw })
    });
};

export const getJellyfinUsers = async (settings: Omit<JellyfinSettings, 'userId'>): Promise<JellyfinUser[]> => {
  return apiFetch('/Users', settings);
};

export const getActiveSessions = async (settings: Omit<JellyfinSettings, 'userId'>): Promise<JellyfinSession[]> => {
    // Adding ?IsActive=true ensures we only get currently active connections
    // and filters out stale or idle sessions that Jellyfin hasn't cleaned up yet.
    return apiFetch('/Sessions?IsActive=true', settings);
};

export const getActivityLog = async (settings: Omit<JellyfinSettings, 'userId'>, minDate: string): Promise<{ Items: any[] }> => {
    // Fetches login activity to count unique users accurately even if dashboard was closed
    return apiFetch(`/System/ActivityLog/Entries?minDate=${minDate}&hasUserId=true&limit=1000`, settings);
};

export const sendMessage = async (settings: Omit<JellyfinSettings, 'userId'>, sessionId: string, header: string, text: string): Promise<void> => {
    await apiFetch(`/Sessions/${sessionId}/Message`, settings, {
        method: 'POST',
        body: JSON.stringify({ Header: header, Text: text, TimeoutMs: 10000 })
    });
};

export const terminateSession = async (settings: Omit<JellyfinSettings, 'userId'>, sessionId: string): Promise<void> => {
    await apiFetch(`/Sessions/${sessionId}`, settings, { method: 'DELETE' });
}

export const getItems = async (settings: JellyfinSettings, itemTypes: string[], limit?: number): Promise<JellyfinItem[]> => {
  const params = new URLSearchParams({
    Recursive: 'true',
    IncludeItemTypes: itemTypes.join(','),
    Fields: 'DateCreated,SeriesInfo,ParentId,ProductionYear,ProviderIds,SeriesId,Genres,RunTimeTicks,MediaSources,OfficialRating,Tags',
    SortBy: 'DateCreated',
    SortOrder: 'Descending',
  });
  if (limit) {
    params.append('Limit', String(limit));
  }
  const data = await apiFetch(`/Users/${settings.userId}/Items?${params.toString()}`, settings);
  return data?.Items || [];
};

export const getResumeItems = async (settings: JellyfinSettings, limit: number = 10): Promise<JellyfinItem[]> => {
    const params = new URLSearchParams({
        Recursive: 'true',
        Filters: 'IsResumable',
        SortBy: 'DatePlayed',
        SortOrder: 'Descending',
        Limit: String(limit),
        Fields: 'DateCreated,SeriesInfo,ParentId,ProductionYear,RunTimeTicks,MediaSources,UserData',
        EnableImageTypes: 'Primary,Backdrop,Thumb'
    });
    const data = await apiFetch(`/Users/${settings.userId}/Items?${params.toString()}`, settings);
    return data?.Items || [];
};

export const getPlayedItems = async (settings: JellyfinSettings, limit: number = 50): Promise<JellyfinItem[]> => {
    const params = new URLSearchParams({
        Recursive: 'true',
        Filters: 'IsPlayed',
        SortBy: 'DatePlayed',
        SortOrder: 'Descending',
        Limit: String(limit),
        Fields: 'Genres,RunTimeTicks,UserData',
    });
    const data = await apiFetch(`/Users/${settings.userId}/Items?${params.toString()}`, settings);
    return data?.Items || [];
};

export const getItemsByIds = async (settings: JellyfinSettings, ids: string[]): Promise<JellyfinItem[]> => {
  if (ids.length === 0) {
    return [];
  }

  const BATCH_SIZE = 50;
  const batches: string[][] = [];

  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    batches.push(ids.slice(i, i + BATCH_SIZE));
  }

  const batchPromises = batches.map(async (batchOfIds) => {
    const params = new URLSearchParams({
      Recursive: 'true',
      Ids: batchOfIds.join(','),
      Fields: 'DateCreated,SeriesInfo,ParentId,ProductionYear,ProviderIds,SeriesId,Genres,RunTimeTicks,MediaSources,OfficialRating,Tags',
    });
    
    const data = await apiFetch(`/Users/${settings.userId}/Items?${params.toString()}`, settings);
    return data?.Items || [];
  });

  const results = await Promise.all(batchPromises);
  return results.flat();
};


export const deleteItem = async (settings: JellyfinSettings, itemId: string): Promise<void> => {
  await apiFetch(`/Items/${itemId}`, settings, { method: 'DELETE' });
};

export const getImageUrl = (settings: JellyfinSettings, item: JellyfinItem, type: 'Primary' | 'Backdrop' = 'Primary'): string => {
    const { url } = settings;
    const cleanUrl = url.endsWith('/') ? url.slice(0, -1) : url;
    
    // Fallback logic
    if (type === 'Backdrop' && !item.ImageTags?.Backdrop && item.ImageTags?.Primary) {
        type = 'Primary';
    }

    if (item.ImageTags && item.ImageTags[type]) {
        return `${cleanUrl}/Items/${item.Id}/Images/${type}?tag=${item.ImageTags[type]}&quality=90`;
    }
    // If no image on item, try parent (Series/Album)
    if (item.ParentId && item.SeriesId) {
         // This is a naive fallback as we don't have parent image tags here without fetching.
         // In a real app we might fetch the parent, but here we just return placeholder.
    }
    
    return 'https://via.placeholder.com/400x600.png?text=No+Image';
}