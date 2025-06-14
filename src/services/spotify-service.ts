import { SpotifyArtist, SpotifyTrack } from '@/store/playlist-store';

const SPOTIFY_BASE_URL = 'https://api.spotify.com/v1';
const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID || 'your_client_id_here';
const REDIRECT_URI = import.meta.env.VITE_SPOTIFY_REDIRECT_URI || `${window.location.origin}/callback`;

export class SpotifyService {
  private static accessToken: string | null = null;

  static setAccessToken(token: string) {
    this.accessToken = token;
  }

  static getAuthUrl(): string {
    const scopes = [
      'playlist-modify-public',
      'playlist-modify-private',
      'user-read-private',
      'user-read-email'
    ].join(' ');

    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      response_type: 'code',
      redirect_uri: REDIRECT_URI,
      scope: scopes,
      state: Math.random().toString(36).substring(7)
    });

    return `https://accounts.spotify.com/authorize?${params.toString()}`;
  }

  static async exchangeCodeForToken(code: string): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }> {
    try {
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: REDIRECT_URI,
          client_id: CLIENT_ID,
          client_secret: import.meta.env.VITE_SPOTIFY_CLIENT_SECRET || '',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to exchange code for token');
      }

      return await response.json();
    } catch (error) {
      console.error('Error exchanging code for token:', error);
      throw error;
    }
  }

  private static async makeAuthenticatedRequest(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Response> {
    if (!this.accessToken) {
      throw new Error('No access token available');
    }

    const response = await fetch(`${SPOTIFY_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (response.status === 401) {
      throw new Error('Unauthorized - token may be expired');
    }

    return response;
  }

  static async getCurrentUser(): Promise<any> {
    try {
      const response = await this.makeAuthenticatedRequest('/me');
      if (!response.ok) {
        throw new Error('Failed to get current user');
      }
      return await response.json();
    } catch (error) {
      console.error('Error getting current user:', error);
      throw error;
    }
  }

  static async searchArtists(query: string, limit: number = 10): Promise<SpotifyArtist[]> {
    try {
      const params = new URLSearchParams({
        q: query,
        type: 'artist',
        limit: limit.toString()
      });

      const response = await this.makeAuthenticatedRequest(`/search?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to search artists');
      }

      const data = await response.json();
      return data.artists.items;
    } catch (error) {
      console.error('Error searching artists:', error);
      throw error;
    }
  }

  static async getArtistTopTracks(artistId: string, market: string = 'US'): Promise<SpotifyTrack[]> {
    try {
      const response = await this.makeAuthenticatedRequest(
        `/artists/${artistId}/top-tracks?market=${market}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to get artist top tracks');
      }

      const data = await response.json();
      return data.tracks;
    } catch (error) {
      console.error('Error getting artist top tracks:', error);
      throw error;
    }
  }

  static async getArtistAlbums(artistId: string, limit: number = 20): Promise<any[]> {
    try {
      const params = new URLSearchParams({
        include_groups: 'album,single',
        market: 'US',
        limit: limit.toString()
      });

      const response = await this.makeAuthenticatedRequest(
        `/artists/${artistId}/albums?${params.toString()}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to get artist albums');
      }

      const data = await response.json();
      return data.items;
    } catch (error) {
      console.error('Error getting artist albums:', error);
      throw error;
    }
  }

  static async getAlbumTracks(albumId: string, limit: number = 50): Promise<SpotifyTrack[]> {
    try {
      const params = new URLSearchParams({
        market: 'US',
        limit: limit.toString()
      });

      const response = await this.makeAuthenticatedRequest(
        `/albums/${albumId}/tracks?${params.toString()}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to get album tracks');
      }

      const data = await response.json();
      
      // Get full track details since album tracks endpoint returns simplified tracks
      const trackIds = data.items.map((track: any) => track.id).join(',');
      return await this.getTracks(trackIds);
    } catch (error) {
      console.error('Error getting album tracks:', error);
      throw error;
    }
  }

  static async getTracks(trackIds: string): Promise<SpotifyTrack[]> {
    try {
      const response = await this.makeAuthenticatedRequest(`/tracks?ids=${trackIds}`);
      
      if (!response.ok) {
        throw new Error('Failed to get tracks');
      }

      const data = await response.json();
      return data.tracks.filter((track: any) => track !== null);
    } catch (error) {
      console.error('Error getting tracks:', error);
      throw error;
    }
  }

  static async createPlaylist(
    userId: string,
    name: string,
    description: string = '',
    isPublic: boolean = true
  ): Promise<any> {
    try {
      const response = await this.makeAuthenticatedRequest(
        `/users/${userId}/playlists`,
        {
          method: 'POST',
          body: JSON.stringify({
            name,
            description,
            public: isPublic
          })
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to create playlist');
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating playlist:', error);
      throw error;
    }
  }

  static async addTracksToPlaylist(playlistId: string, trackUris: string[]): Promise<any> {
    try {
      const response = await this.makeAuthenticatedRequest(
        `/playlists/${playlistId}/tracks`,
        {
          method: 'POST',
          body: JSON.stringify({
            uris: trackUris
          })
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to add tracks to playlist');
      }

      return await response.json();
    } catch (error) {
      console.error('Error adding tracks to playlist:', error);
      throw error;
    }
  }

  static async getArtistLatestAlbumTracks(artistId: string): Promise<SpotifyTrack[]> {
    try {
      const albums = await this.getArtistAlbums(artistId, 1);
      if (albums.length === 0) return [];

      const latestAlbum = albums[0];
      return await this.getAlbumTracks(latestAlbum.id);
    } catch (error) {
      console.error('Error getting artist latest album tracks:', error);
      return [];
    }
  }

  static async getArtistAllTracks(artistId: string): Promise<{
    topTracks: SpotifyTrack[];
    latestAlbumTracks: SpotifyTrack[];
  }> {
    try {
      const [topTracks, latestAlbumTracks] = await Promise.all([
        this.getArtistTopTracks(artistId),
        this.getArtistLatestAlbumTracks(artistId)
      ]);

      // Remove duplicates between top tracks and latest album tracks
      const topTrackIds = new Set(topTracks.map(track => track.id));
      const uniqueLatestAlbumTracks = latestAlbumTracks.filter(
        track => !topTrackIds.has(track.id)
      );

      return {
        topTracks,
        latestAlbumTracks: uniqueLatestAlbumTracks
      };
    } catch (error) {
      console.error('Error getting artist all tracks:', error);
      return { topTracks: [], latestAlbumTracks: [] };
    }
  }
}