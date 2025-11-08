import { SonarrSettings, SonarrSeries, SonarrEpisode } from '../types';

async function apiFetch(endpoint: string, settings: SonarrSettings, options: RequestInit = {}) {
  const { url, apiKey } = settings;
  if (!url || !apiKey) {
    throw new Error("Sonarr URL or API Key is not configured.");
  }

  const headers = {
    'Accept': 'application/json',
    'X-Api-Key': apiKey,
    ...options.headers,
  };

  const cleanUrl = url.endsWith('/') ? url.slice(0, -1) : url;
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  try {
    const response = await fetch(`${cleanUrl}${cleanEndpoint}`, { ...options, headers });
    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Sonarr API Error: ${response.status} ${response.statusText} - ${errorBody}`);
    }
     if (response.status === 204 || response.headers.get('Content-Length') === '0') {
      return null;
    }
    return response.json();
  } catch (error) {
    console.error(`Sonarr API call to ${endpoint} failed:`, error);
    throw error;
  }
}

export const getSonarrSeries = async (settings: SonarrSettings): Promise<SonarrSeries[]> => {
    return apiFetch('/api/v3/series', settings);
};

export const getSonarrEpisodes = async (settings: SonarrSettings, seriesId: number): Promise<SonarrEpisode[]> => {
    return apiFetch(`/api/v3/episode?seriesId=${seriesId}`, settings);
};

export const deleteSonarrEpisodeFile = async (settings: SonarrSettings, episodeFileId: number): Promise<void> => {
    await apiFetch(`/api/v3/episodefile/${episodeFileId}`, settings, { method: 'DELETE' });
};

export const testSonarrConnection = async (settings: SonarrSettings): Promise<{ appName: string }> => {
    return apiFetch('/api/v3/system/status', settings);
}
