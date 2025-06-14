import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: { name: string }[];
  album: {
    name: string;
    images: { url: string; height: number; width: number }[];
  };
  duration_ms: number;
  preview_url: string | null;
  external_urls: {
    spotify: string;
  };
  uri: string;
}

export interface SpotifyArtist {
  id: string;
  name: string;
  images: { url: string; height: number; width: number }[];
  external_urls: {
    spotify: string;
  };
  genres: string[];
  followers: {
    total: number;
  };
}

export interface ArtistSession {
  festivalArtistName: string;
  spotifyArtist: SpotifyArtist | null;
  tracks: SpotifyTrack[];
  isConfirmed: boolean;
  isLoading: boolean;
}

export interface PlaylistSession {
  id: string;
  name: string;
  createdAt: string;
  artists: Record<string, ArtistSession>;
  playlistOrder: string[]; // Track IDs in order
  spotifyPlaylistId?: string;
  spotifyPlaylistUrl?: string;
}

interface PlaylistStore {
  currentSession: PlaylistSession | null;
  allSessions: PlaylistSession[];
  accessToken: string | null;
  refreshToken: string | null;
  
  // Session management
  createSession: (name: string) => void;
  loadSession: (sessionId: string) => void;
  deleteSession: (sessionId: string) => void;
  updateSessionName: (name: string) => void;
  
  // Authentication
  setTokens: (accessToken: string, refreshToken?: string) => void;
  clearTokens: () => void;
  
  // Artist management
  setArtistLoading: (artistName: string, loading: boolean) => void;
  setSpotifyArtist: (artistName: string, spotifyArtist: SpotifyArtist) => void;
  confirmArtist: (artistName: string) => void;
  clearArtist: (artistName: string) => void;
  setArtistTracks: (artistName: string, tracks: SpotifyTrack[]) => void;
  addArtistTracks: (artistName: string, tracks: SpotifyTrack[]) => void;
  removeTrack: (artistName: string, trackId: string) => void;
  
  // Playlist management
  reorderPlaylist: (trackIds: string[]) => void;
  addToPlaylist: (trackIds: string[]) => void;
  removeFromPlaylist: (trackId: string) => void;
  setSpotifyPlaylist: (playlistId: string, playlistUrl: string) => void;
  
  // Utility functions
  getAllTracks: () => SpotifyTrack[];
  getOrderedTracks: () => SpotifyTrack[];
  getDuplicateTracks: () => Set<string>;
}

const createInitialSession = (name: string): PlaylistSession => ({
  id: Date.now().toString(),
  name,
  createdAt: new Date().toISOString(),
  artists: {},
  playlistOrder: [],
});

export const usePlaylistStore = create<PlaylistStore>()(
  persist(
    (set, get) => ({
      currentSession: null,
      allSessions: [],
      accessToken: null,
      refreshToken: null,

      createSession: (name: string) => {
        const newSession = createInitialSession(name);
        set(state => ({
          currentSession: newSession,
          allSessions: [...state.allSessions, newSession]
        }));
      },

      loadSession: (sessionId: string) => {
        const session = get().allSessions.find(s => s.id === sessionId);
        if (session) {
          set({ currentSession: session });
        }
      },

      deleteSession: (sessionId: string) => {
        set(state => ({
          allSessions: state.allSessions.filter(s => s.id !== sessionId),
          currentSession: state.currentSession?.id === sessionId ? null : state.currentSession
        }));
      },

      updateSessionName: (name: string) => {
        set(state => {
          if (!state.currentSession) return state;
          
          const updatedSession = { ...state.currentSession, name };
          return {
            currentSession: updatedSession,
            allSessions: state.allSessions.map(s => 
              s.id === updatedSession.id ? updatedSession : s
            )
          };
        });
      },

      setTokens: (accessToken: string, refreshToken?: string) => {
        set({ 
          accessToken,
          refreshToken: refreshToken || get().refreshToken
        });
      },

      clearTokens: () => {
        set({ accessToken: null, refreshToken: null });
      },

      setArtistLoading: (artistName: string, loading: boolean) => {
        set(state => {
          if (!state.currentSession) return state;
          
          const updatedSession = {
            ...state.currentSession,
            artists: {
              ...state.currentSession.artists,
              [artistName]: {
                ...state.currentSession.artists[artistName],
                festivalArtistName: artistName,
                spotifyArtist: state.currentSession.artists[artistName]?.spotifyArtist || null,
                tracks: state.currentSession.artists[artistName]?.tracks || [],
                isConfirmed: state.currentSession.artists[artistName]?.isConfirmed || false,
                isLoading: loading
              }
            }
          };

          return {
            currentSession: updatedSession,
            allSessions: state.allSessions.map(s => 
              s.id === updatedSession.id ? updatedSession : s
            )
          };
        });
      },

      setSpotifyArtist: (artistName: string, spotifyArtist: SpotifyArtist) => {
        set(state => {
          if (!state.currentSession) return state;
          
          const updatedSession = {
            ...state.currentSession,
            artists: {
              ...state.currentSession.artists,
              [artistName]: {
                ...state.currentSession.artists[artistName],
                festivalArtistName: artistName,
                spotifyArtist,
                tracks: state.currentSession.artists[artistName]?.tracks || [],
                isConfirmed: false,
                isLoading: false
              }
            }
          };

          return {
            currentSession: updatedSession,
            allSessions: state.allSessions.map(s => 
              s.id === updatedSession.id ? updatedSession : s
            )
          };
        });
      },

      confirmArtist: (artistName: string) => {
        set(state => {
          if (!state.currentSession || !state.currentSession.artists[artistName]) return state;
          
          const updatedSession = {
            ...state.currentSession,
            artists: {
              ...state.currentSession.artists,
              [artistName]: {
                ...state.currentSession.artists[artistName],
                isConfirmed: true
              }
            }
          };

          return {
            currentSession: updatedSession,
            allSessions: state.allSessions.map(s => 
              s.id === updatedSession.id ? updatedSession : s
            )
          };
        });
      },

      clearArtist: (artistName: string) => {
        set(state => {
          if (!state.currentSession) return state;
          
          const { [artistName]: removed, ...remainingArtists } = state.currentSession.artists;
          const updatedSession = {
            ...state.currentSession,
            artists: remainingArtists,
            playlistOrder: state.currentSession.playlistOrder.filter(trackId => 
              !removed?.tracks.some(track => track.id === trackId)
            )
          };

          return {
            currentSession: updatedSession,
            allSessions: state.allSessions.map(s => 
              s.id === updatedSession.id ? updatedSession : s
            )
          };
        });
      },

      setArtistTracks: (artistName: string, tracks: SpotifyTrack[]) => {
        set(state => {
          if (!state.currentSession || !state.currentSession.artists[artistName]) return state;
          
          const updatedSession = {
            ...state.currentSession,
            artists: {
              ...state.currentSession.artists,
              [artistName]: {
                ...state.currentSession.artists[artistName],
                tracks
              }
            }
          };

          return {
            currentSession: updatedSession,
            allSessions: state.allSessions.map(s => 
              s.id === updatedSession.id ? updatedSession : s
            )
          };
        });
      },

      addArtistTracks: (artistName: string, newTracks: SpotifyTrack[]) => {
        set(state => {
          if (!state.currentSession || !state.currentSession.artists[artistName]) return state;
          
          const existingTracks = state.currentSession.artists[artistName].tracks;
          const existingIds = new Set(existingTracks.map(t => t.id));
          const uniqueNewTracks = newTracks.filter(t => !existingIds.has(t.id));
          
          const updatedSession = {
            ...state.currentSession,
            artists: {
              ...state.currentSession.artists,
              [artistName]: {
                ...state.currentSession.artists[artistName],
                tracks: [...existingTracks, ...uniqueNewTracks]
              }
            }
          };

          return {
            currentSession: updatedSession,
            allSessions: state.allSessions.map(s => 
              s.id === updatedSession.id ? updatedSession : s
            )
          };
        });
      },

      removeTrack: (artistName: string, trackId: string) => {
        set(state => {
          if (!state.currentSession || !state.currentSession.artists[artistName]) return state;
          
          const updatedSession = {
            ...state.currentSession,
            artists: {
              ...state.currentSession.artists,
              [artistName]: {
                ...state.currentSession.artists[artistName],
                tracks: state.currentSession.artists[artistName].tracks.filter(t => t.id !== trackId)
              }
            },
            playlistOrder: state.currentSession.playlistOrder.filter(id => id !== trackId)
          };

          return {
            currentSession: updatedSession,
            allSessions: state.allSessions.map(s => 
              s.id === updatedSession.id ? updatedSession : s
            )
          };
        });
      },

      reorderPlaylist: (trackIds: string[]) => {
        set(state => {
          if (!state.currentSession) return state;
          
          const updatedSession = {
            ...state.currentSession,
            playlistOrder: trackIds
          };

          return {
            currentSession: updatedSession,
            allSessions: state.allSessions.map(s => 
              s.id === updatedSession.id ? updatedSession : s
            )
          };
        });
      },

      addToPlaylist: (trackIds: string[]) => {
        set(state => {
          if (!state.currentSession) return state;
          
          const existingIds = new Set(state.currentSession.playlistOrder);
          const newTrackIds = trackIds.filter(id => !existingIds.has(id));
          
          const updatedSession = {
            ...state.currentSession,
            playlistOrder: [...state.currentSession.playlistOrder, ...newTrackIds]
          };

          return {
            currentSession: updatedSession,
            allSessions: state.allSessions.map(s => 
              s.id === updatedSession.id ? updatedSession : s
            )
          };
        });
      },

      removeFromPlaylist: (trackId: string) => {
        set(state => {
          if (!state.currentSession) return state;
          
          const updatedSession = {
            ...state.currentSession,
            playlistOrder: state.currentSession.playlistOrder.filter(id => id !== trackId)
          };

          return {
            currentSession: updatedSession,
            allSessions: state.allSessions.map(s => 
              s.id === updatedSession.id ? updatedSession : s
            )
          };
        });
      },

      setSpotifyPlaylist: (playlistId: string, playlistUrl: string) => {
        set(state => {
          if (!state.currentSession) return state;
          
          const updatedSession = {
            ...state.currentSession,
            spotifyPlaylistId: playlistId,
            spotifyPlaylistUrl: playlistUrl
          };

          return {
            currentSession: updatedSession,
            allSessions: state.allSessions.map(s => 
              s.id === updatedSession.id ? updatedSession : s
            )
          };
        });
      },

      getAllTracks: () => {
        const session = get().currentSession;
        if (!session) return [];
        
        return Object.values(session.artists)
          .filter(artist => artist.isConfirmed)
          .flatMap(artist => artist.tracks);
      },

      getOrderedTracks: () => {
        const session = get().currentSession;
        if (!session) return [];
        
        const allTracks = get().getAllTracks();
        const trackMap = new Map(allTracks.map(track => [track.id, track]));
        
        return session.playlistOrder
          .map(id => trackMap.get(id))
          .filter((track): track is SpotifyTrack => track !== undefined);
      },

      getDuplicateTracks: () => {
        const allTracks = get().getAllTracks();
        const trackCounts = new Map<string, number>();
        const duplicates = new Set<string>();
        
        allTracks.forEach(track => {
          const count = trackCounts.get(track.id) || 0;
          trackCounts.set(track.id, count + 1);
          if (count >= 1) {
            duplicates.add(track.id);
          }
        });
        
        return duplicates;
      }
    }),
    {
      name: 'beyond-wonderland-playlist-store',
      partialize: (state) => ({
        allSessions: state.allSessions,
        currentSession: state.currentSession,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      })
    }
  )
);