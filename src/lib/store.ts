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
  spotifyData?: any; // could store full Spotify API artist object or custom subset
  confirmed: boolean;
  songs: SongInfo[]; // songs fetched for this artist
}

export interface PlaylistProject {
  title: string; // e.g. "Beyond Wonderland 2025"
  description?: string;
  playlistId?: string; // Spotify playlist ID if created
  artists: ArtistInfo[];
  combinedSongs: SongInfo[]; // aggregated song list for playlist
}
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
  createProject: (title: string, description?: string) => void;
  confirmArtist: (artistName: string, spotifyData: any) => void;
  undoArtist: (artistName: string) => void;
  addSongs: (artistName: string, songs: SongInfo[]) => void;
  removeSong: (songId: string) => void;
  moveSong: (fromIndex: number, toIndex: number) => void;
  setError: (err: string | null) => void;
  setPlaylistId: (playlistId: string) => void; // optional if you want to store created playlist ID
}

// const defaultProject: PlaylistProject = {
//   title: "New Project",
//   description: "",
//   playlistId: undefined,
//   artists: [],
//   combinedSongs: [],
// };

const initialArtists: string[] = [];

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      projects: [],
      currentProjectIndex: 0,
      isLoading: false,
      error: null,

      setAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
      addProject: (project) =>
        set((state) => ({
          projects: [...state.projects, project],
        })),
      setCurrentProject: (index) => set({ currentProjectIndex: index }),

      createProject: (title: string, description?: string) => {
        const newProject: PlaylistProject = {
          title,
          description,
          playlistId: undefined,
          artists: initialArtists.map((name) => ({
            name,
            confirmed: false,
            songs: [],
          })),
          combinedSongs: [],
        };
        set((state) => ({
          projects: [...state.projects, newProject],
          currentProjectIndex: state.projects.length,
        }));
      },

      confirmArtist: (artistName, spotifyData) =>
        set((state) => {
          const artist = state.projects[state.currentProjectIndex].artists.find(
            (a) => a.name === artistName
          );
          if (artist) {
            artist.confirmed = true;
            artist.spotifyData = spotifyData;
          }
          return { projects: [...state.projects] };
        }),

      undoArtist: (artistName) =>
        set((state) => {
          const artist = state.projects[state.currentProjectIndex].artists.find(
            (a) => a.name === artistName
          );
          if (artist) {
            artist.confirmed = false;
            artist.spotifyData = undefined;
          }
          return { projects: [...state.projects] };
        }),

      addSongs: (artistName, songs) =>
        set((state) => {
          const artist = state.projects[state.currentProjectIndex].artists.find(
            (a) => a.name === artistName
          );
          if (artist) {
            artist.songs.push(...songs);
          }
          return { projects: [...state.projects] };
        }),

      removeSong: (songId) =>
        set((state) => {
          const project = state.projects[state.currentProjectIndex];
          project.combinedSongs = project.combinedSongs.filter(
            (song) => song.id !== songId
          );
          project.artists.forEach((artist) => {
            artist.songs = artist.songs.filter((song) => song.id !== songId);
          });
          return { projects: [...state.projects] };
        }),

      moveSong: (fromIndex, toIndex) =>
        set((state) => {
          const project = state.projects[state.currentProjectIndex];
          const song = project.combinedSongs[fromIndex];
          project.combinedSongs.splice(fromIndex, 1);
          project.combinedSongs.splice(toIndex, 0, song);
          return { projects: [...state.projects] };
        }),

      setError: (err) => set({ error: err }),

      setPlaylistId: (playlistId) =>
        set((state) => {
          const project = state.projects[state.currentProjectIndex];
          project.playlistId = playlistId;
          return { projects: [...state.projects] };
        }),
    }),
    {
      name: "playlist-creator-storage", // localStorage key
      storage: createJSONStorage(() => localStorage),
      // Optionally, partialize state to persist only projects (and not ephemeral loading state, etc.)
      partialize: (state) => ({
        projects: state.projects,
        currentProjectIndex: state.currentProjectIndex,
      }),
    }
  )
);
