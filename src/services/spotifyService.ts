// src/services/spotify-service.ts
import Spotified from 'spotified';
import { SpotifyArtist, SpotifyTrack } from '@/store/playlist-store';

// ─────────────────────────────────────────────────────────────────────────────
//  Init Spotified client
// ─────────────────────────────────────────────────────────────────────────────
const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID || '';
const CLIENT_SECRET = import.meta.env.VITE_SPOTIFY_CLIENT_SECRET || '';
const REDIRECT_URI =
  import.meta.env.VITE_SPOTIFY_REDIRECT_URI || `${window.location.origin}/callback`;

const client = new Spotified({
  clientId: CLIENT_ID,
  clientSecret: CLIENT_SECRET,
});

// ─────────────────────────────────────────────────────────────────────────────
//  Shared supporting types
// ─────────────────────────────────────────────────────────────────────────────

export interface ExternalUrls {
  spotify: string;
  [key: string]: string;
}

export interface Image {
  url: string;
  height: number;
  width: number;
}

export interface Restrictions {
  reason: string;
}

export interface SimplifiedArtist {
  external_urls: ExternalUrls;
  href: string;
  id: string;
  name: string;
  type: string;
  uri: string;
}

export interface SimplifiedArtistAlbum {
  album_group: string;
  album_type: string;
  artists: SimplifiedArtist[];
  available_markets: string[];
  external_urls: ExternalUrls;
  href: string;
  id: string;
  images: Image[];
  name: string;
  release_date: string;
  release_date_precision: string;
  restrictions?: Restrictions;
  total_tracks: number;
  type: string;
  uri: string;
}

export interface Playlist {
  id: string;
  name: string;
  public?: boolean;
  collaborative?: boolean;
  description?: string;
  uri?: string;
}

export interface AddItemsToPlaylistResponse {
  snapshot_id: string;
}

export interface UserProfile {
  id: string;
  display_name?: string;
  email?: string;
  country?: string;
  product?: string;
  images?: Image[];
  followers?: { total: number };
  external_urls?: ExternalUrls;
  href?: string;
  type?: string;
  uri?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
//  “Params → Promise<Return>” type aliases for each function
// ─────────────────────────────────────────────────────────────────────────────

export type SetAccessTokenFn = (token: string) => void;
export type GetAuthUrlFn = () => string;

export type ExchangeCodeForTokenFn = (
  code: string
) => Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}>;

export type GetCurrentUserFn = () => Promise<UserProfile>;

export type SearchArtistsFn = (
  query: string,
  limit?: number
) => Promise<SpotifyArtist[]>;

export type GetArtistTopTracksFn = (
  artistId: string,
  market?: string
) => Promise<Partial<SpotifyTrack>[]>;

export type GetArtistAlbumsFn = (
  artistId: string,
  limit?: number
) => Promise<SimplifiedArtistAlbum[]>;

export type GetAlbumTracksFn = (
  albumId: string,
  limit?: number
) => Promise<SpotifyTrack[]>;

export type GetTopTracksFn = (
  trackIds: string
) => Promise<SpotifyTrack[]>;

export type CreatePlaylistFn = (
  userId: string,
  name: string,
  isPublic?: boolean
) => Promise<Playlist>;

export type AddTracksToPlaylistFn = (
  playlistId: string,
  trackUris: string[]
) => Promise<AddItemsToPlaylistResponse>;

export type GetArtistLatestAlbumTracksFn = (
  artistId: string
) => Promise<SpotifyTrack[]>;

export type GetArtistAllTracksFn = (
  artistId: string
) => Promise<{
  topTracks: SpotifyTrack[];
  latestAlbumTracks: SpotifyTrack[];
}>;

// ─────────────────────────────────────────────────────────────────────────────
//  Exported functions
// ─────────────────────────────────────────────────────────────────────────────

export const setAccessToken: SetAccessTokenFn = (token) => {
  client.setBearerToken(token);
};

export const getAuthUrl: GetAuthUrlFn = () => {
  const scopes = [
    'playlist-modify-public',
    'playlist-modify-private',
    'user-read-private',
    'user-read-email',
  ].join(' ');
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    scope: scopes,
    state: Math.random().toString(36).substring(2),
  });
  return `https://accounts.spotify.com/authorize?${params.toString()}`;
};

export const exchangeCodeForToken: ExchangeCodeForTokenFn = async (code) => {
  const resp = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
  });
  if (!resp.ok) throw new Error('Failed to exchange code for token');
  return resp.json();
};

export const getCurrentUser: GetCurrentUserFn = async () => {
  return client.user.getCurrentUserProfile();
};

export const searchArtists: SearchArtistsFn = async (query, limit = 10) => {
  const result = await client.search.searchForItem(query, ['artist'], { limit });
  return result.artists?.items ?? [];
};

export const getArtistTopTracks: GetArtistTopTracksFn = async (
  artistId,
  market = 'US'
) => {
  const { tracks } = await client.artist.getArtistTopTracks(artistId, {
    market,
  });
  return tracks as Partial<SpotifyTrack>[];
};

export const getArtistAlbums: GetArtistAlbumsFn = async (
  artistId,
  limit = 20
) => {
  const { items } = await client.artist.getArtistAlbums(artistId, {
    include_groups: 'album,single',
    market: 'US',
    limit,
  });
  return items;
};

export const getAlbumTracks: GetAlbumTracksFn = async (
  albumId,
  limit = 50
) => {
  const { items } = await client.album.getAlbumTracks(albumId, {
    market: 'US',
    limit,
  });
  // fetch full detail for each track
  return Promise.all(
    items.map((t: any) => client.track.getTrack(t.id, { market: 'US' }))
  );
};

export const getTopTracks: GetTopTracksFn = async (trackIds) => {
  const tracks: SpotifyTrack[] = [];
  for (const chunk of trackIds.match(/.{1,50}/g) || []) {
    const { tracks: c } = await client.track.getTracks({ ids: chunk });
    tracks.push(...c.filter((t) => t !== null) as SpotifyTrack[]);
  }
  return tracks;
};

export const createPlaylist: CreatePlaylistFn = async (
  userId,
  name,
  isPublic = true
) => {
  return client.playlist.createPlaylist(userId, { name, public: isPublic });
};

export const addTracksToPlaylist: AddTracksToPlaylistFn = async (
  playlistId,
  trackUris
) => {
  return client.playlist.addItemsToPlaylist(playlistId, { uris: trackUris });
};

export const getArtistLatestAlbumTracks: GetArtistLatestAlbumTracksFn = async (
  artistId
) => {
  const albums = await getArtistAlbums(artistId, 1);
  if (albums.length === 0) return [];
  return getAlbumTracks(albums[0].id);
};

export const getArtistAllTracks: GetArtistAllTracksFn = async (artistId) => {
  const [topTracks, latestAlbumTracks] = await Promise.all([
    getArtistTopTracks(artistId),
    getArtistLatestAlbumTracks(artistId),
  ]);
  const topIds = new Set(topTracks.map((t) => t.id!));
  return {
    topTracks,
    latestAlbumTracks: latestAlbumTracks.filter((t) => !topIds.has(t.id!)),
  };
};
