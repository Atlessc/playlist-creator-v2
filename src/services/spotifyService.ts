// src/services/spotify-service.ts
import type {Artist, Track} from 'spotified';
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
//  Utility: split an array into fixed-size chunks
// ─────────────────────────────────────────────────────────────────────────────
function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Shared types
// ─────────────────────────────────────────────────────────────────────────────
export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface SimplifiedTrack {
  id: string;
  href: string;
}

export interface ArtistAlbumsParams {
  include_groups?: 'album' | 'single' | 'appears_on' | 'compilation';
  market?: string;
  limit?: number;
  offset?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Exports
// ─────────────────────────────────────────────────────────────────────────────

/** Must be called once you have an OAuth access token */
export function setAccessToken(token: string): void {
  client.setBearerToken(token);
}

/** Build the standard Authorization Code URL */
export function getAuthUrl(): string {
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
  return `https://accounts.spotify.com/authorize?${params}`;
}

/** Exchange an authorization code for tokens (server-side) */
export async function exchangeCodeForToken(
  code: string
): Promise<TokenResponse> {
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
}

/** Get the current user’s profile */
export async function getCurrentUser(): Promise<any> {
  return client.user.getCurrentUserProfile();
}



/** Search for artists by name */
/** Search for artists by name */
export async function searchArtists(
  query: string,
  limit = 10
): Promise<Artist[]> {
  const result = await client.search.searchForItem(query, ['artist'], { limit });
  const items: Artist[] = result.artists?.items ?? [];

  // Only keep those entries with the core fields defined
  return items.filter(a =>
    typeof a.id === 'string' &&
    typeof a.name === 'string' &&
    typeof a.href === 'string' &&
    typeof a.uri === 'string' &&
    typeof a.type === 'string' &&
    a.external_urls != null &&
    typeof a.external_urls.spotify === 'string'
  );
}



/** Fetch an artist’s top tracks */
export async function getArtistTopTracks(
  artistId: string,
  market = 'US'
): Promise<SpotifyTrack[]> {
  const { tracks } = await client.artist.getArtistTopTracks(artistId, {
    market,
  });
  return tracks as SpotifyTrack[];
}

/** Fetch an artist’s albums (albums + singles) */
export async function getArtistAlbums(
  artistId: string,
  params: ArtistAlbumsParams = {}
): Promise<any[]> {
  const { items } = await client.artist.getArtistAlbums(artistId, params);
  return items;
}

/** Fetch full track objects from an album */
export async function getAlbumTracks(
  albumId: string,
  market = 'US',
  limit = 50
): Promise<SpotifyTrack[]> {
  const { items }: { items: Track[] } =
    await client.album.getAlbumTracks(albumId, { market, limit });

  return Promise.all(
    items
      .filter((t): t is Track & { id: string } => typeof t.id === 'string')
      .map((t) =>
        client.track.getTrack(t.id!, { market }).then((full) =>
          full as SpotifyTrack
        )
      )
  );
}

/** Lookup up to 50 tracks by an array of IDs */
export async function getTopTracks(
  ids: string[],
  market: string = 'US'
): Promise<SpotifyTrack[]> {
  const all: SpotifyTrack[] = [];

  for (const chunk of chunkArray(ids, 50)) {
    for (const trackId of chunk) {
      try {
        const track = await client.track.getTrack(trackId, { market });
        all.push(track as SpotifyTrack);
      } catch (err) {
        console.error(`Failed to fetch track ${trackId}:`, err);
      }
      // wait 200ms before the next call
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  return all;
}


/** Create a new playlist for the given user */
export async function createPlaylist(
  userId: string,
  name: string,
  isPublic = true,
  description = '',
  collaborative = false
): Promise<any> {
  return client.playlist.createPlaylist(userId, name, {
    public: isPublic,
    description,
    collaborative,
  });
}

/** Add track URIs to a playlist */
export async function addTracksToPlaylist(
  playlistId: string,
  uris: string[]
): Promise<any> {
  return client.playlist.addItemsToPlaylist(playlistId, { uris });
}

/** Fetch the latest album’s tracks for an artist */
export async function getArtistLatestAlbumTracks(
  artistId: string
): Promise<SpotifyTrack[]> {
  const albums = await getArtistAlbums(artistId, { limit: 1 });
  if (albums.length === 0) return [];
  return getAlbumTracks(albums[0].id);
}

/** Fetch both top-tracks & latest-album-tracks, dedupe, and return */
export async function getArtistAllTracks(
  artistId: string
): Promise<{
  topTracks: SpotifyTrack[];
  latestAlbumTracks: SpotifyTrack[];
}> {
  const [topTracks, latestAlbumTracks] = await Promise.all([
    getArtistTopTracks(artistId),
    getArtistLatestAlbumTracks(artistId),
  ]);
  const seen = new Set(topTracks.map((t) => t.id));
  return {
    topTracks,
    latestAlbumTracks: latestAlbumTracks.filter((t) => !seen.has(t.id)),
  };
}