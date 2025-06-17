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
  title: string;         // e.g. "Beyond Wonderland 2025"
  description?: string;
  playlistId?: string;   // Spotify playlist ID if created
  artists: ArtistInfo[];
  combinedSongs: SongInfo[];  // aggregated song list for playlist
}

// Zustand store state
export interface StoreState {
  // State:
  isAuthenticated: boolean;
  projects: PlaylistProject[];
  currentProjectIndex: number;
  isLoading: boolean;
  error: string | null;
  // Actions (mutators):
  setAuthenticated: (isAuthenticated: boolean) => void;
  addProject: (project: PlaylistProject) => void;
  setCurrentProject: (index: number) => void;
  confirmArtist: (artistName: string, spotifyData: any) => void;
  undoArtist: (artistName: string) => void;
  addSongs: (artistName: string, songs: SongInfo[]) => void;
  removeSong: (songId: string) => void;
  moveSong: (fromIndex: number, toIndex: number) => void;
  setError: (err: string|null) => void;
  setPlaylistId: (playlistId: string) => void;  // optional if you want to store created playlist ID
  addArtistToProject: (artistName: string) => boolean;
  removeArtistFromProject: (artistName: string) => void;
}