// src/types.ts (for clarity)
export interface SongInfo {
  id: string;
  title: string;
  album: string;
  artist: string;
  uri: string;
  duplicate?: boolean;
}

export interface ArtistInfo {
  name: string;
  spotifyId?: string;
  spotifyData?: any;     // could store full Spotify API artist object or custom subset
  confirmed: boolean;
  songs: SongInfo[];     // songs fetched for this artist
}

export interface PlaylistProject {
  id?: string;           // optional ID for persistence
  title: string;         // e.g. "Beyond Wonderland 2025"
  description?: string;
  playlistId?: string;   // Spotify playlist ID if created
  artists: ArtistInfo[];
  combinedSongs: SongInfo[];  // aggregated song list for playlist
  playlistUrl?: string; // URL to the created Spotify playlist
}

// Zustand store state
export interface StoreState {
  // State:
  spotifyClientId: string | null; // Spotify Client ID for API access
  isAuthenticated: boolean;
  projects: PlaylistProject[];
  currentProjectIndex: number;
  isLoading: boolean;
  error: string | null;
    // Auth tokens for Spotify
  accessToken: string | null
  refreshToken: string | null

  // Session-like actions
  setTokens: (accessToken: string, refreshToken?: string) => void
  clearTokens: () => void

  // Enhanced artist management
  setArtistLoading: (artistName: string, loading: boolean) => void
  setSpotifyArtist: (artistName: string, spotifyData: any) => void
  setArtistTracks: (artistName: string, tracks: SongInfo[]) => void
  addArtistTracks: (artistName: string, tracks: SongInfo[]) => void
  removeTrack: (trackId: string) => void

  // Playlist management by ID order
  reorderPlaylist: (trackIds: string[]) => void
  setSpotifyPlaylist: (playlistId: string) => void

  // Utility getters
  getAllTracks: () => SongInfo[]
  getDuplicateTracks: () => Set<string>
  updateProjectTitle: (newTitle: string) => void
  // Actions (mutators):
  setAuthenticated: (isAuthenticated: boolean) => void;
  addProject: (project: PlaylistProject) => void;
  setCurrentProject: (index: number) => void;
  confirmArtist: (artistName: string, spotifyData: any) => void;
  undoConfirmArtist: (artistName: string) => void;
  addSongs: (artistName: string, songs: SongInfo[]) => void;
  removeSong: (songId: string) => void;
  moveSong: (fromIndex: number, toIndex: number) => void;
  setError: (err: string|null) => void;
  setPlaylistId: (playlistId: string) => void;  // optional if you want to store created playlist ID
  addArtistToProject: (artistName: string) => boolean;
  removeArtistFromProject: (artistName: string) => void;
  setMainPlaylistUri: (uri: string) => void; // to store the main playlist URI
  deleteProject: (index: number) => void;
}