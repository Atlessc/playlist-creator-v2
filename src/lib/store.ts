import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { SongInfo, ArtistInfo, StoreState } from '../types'

// Extend ArtistInfo to include loading & Spotify data
export interface ExtendedArtist extends ArtistInfo {
  spotifyData?: any;
  isLoading: boolean;
}

export interface UnifiedStore extends StoreState {
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
}

export const useStore = create<UnifiedStore>()(
  persist(
    (set, get) => ({
      // ==== existing state from StoreState ==== //
      isAuthenticated: false,
      projects: [],
      currentProjectIndex: 0,
      isLoading: false,
      error: null,
      // ========================================= //

      // ==== new state ==== //
      accessToken: null,
      refreshToken: null,
      // =================== //

      // ==== existing actions ==== //
      setAuthenticated: (val) => set({ isAuthenticated: val }),
      addProject: (proj) => set(state => ({ projects: [...state.projects, proj] })),
      setCurrentProject: (idx) => set({ currentProjectIndex: idx }),
      confirmArtist: (artistName, spotifyData) => {
        const state = get()
        const proj = state.projects[state.currentProjectIndex]
        proj.artists = proj.artists.map(a =>
          a.name === artistName ? { ...a, confirmed: true, spotifyId: spotifyData.id, spotifyData } : a
        )
        set({ projects: [...state.projects] })
      },
      undoArtist: (artistName) => {
        const state = get()
        const proj = state.projects[state.currentProjectIndex]
        proj.artists = proj.artists.map(a =>
          a.name === artistName
            ? { ...a, confirmed: false, spotifyId: undefined, spotifyData: undefined, songs: [] }
            : a
        )
        proj.combinedSongs = proj.combinedSongs.filter(s => s.artist !== artistName)
        set({ projects: [...state.projects] })
      },
      addSongs: (artistName, songs) => {
        const state = get()
        const proj = state.projects[state.currentProjectIndex]
        const newSongs: SongInfo[] = []
        songs.forEach(song => {
          const exists = proj.combinedSongs.some(s => s.id === song.id)
          if (exists) song.duplicate = true
          newSongs.push(song)
          if (!exists) proj.combinedSongs.push(song)
        })
        proj.artists = proj.artists.map(a =>
          a.name === artistName ? { ...a, songs: newSongs } : a
        )
        set({ projects: [...state.projects] })
      },
      removeSong: (id) => {
        const state = get()
        const proj = state.projects[state.currentProjectIndex]
        proj.combinedSongs = proj.combinedSongs.filter(s => s.id !== id)
        proj.artists.forEach(a => {
          a.songs = a.songs.filter(s => s.id !== id)
        })
        set({ projects: [...state.projects] })
      },
      moveSong: (from, to) => {
        const state = get()
        const list = state.projects[state.currentProjectIndex].combinedSongs
        if (from < 0 || to < 0 || from >= list.length || to >= list.length) return
        const updated = [...list]
        const [moved] = updated.splice(from, 1)
        updated.splice(to, 0, moved)
        state.projects[state.currentProjectIndex].combinedSongs = updated
        set({ projects: [...state.projects] })
      },
      setError: (err) => set({ error: err }),
      setPlaylistId: (pid) => {
        const state = get()
        state.projects[state.currentProjectIndex].playlistId = pid
        set({ projects: [...state.projects] })
      },
      addArtistToProject: (artistName) => {
        const state = get()
        const proj = state.projects[state.currentProjectIndex]
        if (proj.artists.some(a => a.name.toLowerCase() === artistName.toLowerCase())) return false
        proj.artists.push({ name: artistName, confirmed: false, songs: [] })
        set({ projects: [...state.projects] })
        return true
      },
      removeArtistFromProject: (artistName) => {
        const state = get()
        const proj = state.projects[state.currentProjectIndex]
        proj.artists = proj.artists.filter(a => a.name !== artistName)
        proj.combinedSongs = proj.combinedSongs.filter(s => s.artist !== artistName)
        set({ projects: [...state.projects] })
      },
      // ========================= //

      // ==== migrated actions ==== //
      setTokens: (accessToken, refreshToken) => {
        set({ accessToken, refreshToken: refreshToken ?? get().refreshToken })
      },
      clearTokens: () => set({ accessToken: null, refreshToken: null }),

      setArtistLoading: (artistName, loading) => {
        const state = get()
        const proj = state.projects[state.currentProjectIndex]
        proj.artists = proj.artists.map(a =>
          a.name === artistName ? { ...a, isLoading: loading } : a
        )
        set({ projects: [...state.projects] })
      },

      setSpotifyArtist: (artistName, spotifyData) => {
        const state = get()
        const proj = state.projects[state.currentProjectIndex]
        proj.artists = proj.artists.map(a =>
          a.name === artistName
            ? { ...a, spotifyId: spotifyData.id, spotifyData, confirmed: false }
            : a
        )
        set({ projects: [...state.projects] })
      },

      setArtistTracks: (artistName, tracks) => {
        const state = get()
        const proj = state.projects[state.currentProjectIndex]
        proj.artists = proj.artists.map(a =>
          a.name === artistName ? { ...a, songs: tracks } : a
        )
        // also update combinedSongs, replacing old tracks from this artist
        proj.combinedSongs = [
          ...proj.combinedSongs.filter(s => s.artist !== artistName),
          ...tracks
        ]
        set({ projects: [...state.projects] })
      },

      addArtistTracks: (artistName, newTracks) => {
        const state = get()
        const proj = state.projects[state.currentProjectIndex]
        const existing = proj.artists.find(a => a.name === artistName)?.songs ?? []
        const existingIds = new Set(existing.map(s => s.id))
        const unique = newTracks.filter(s => !existingIds.has(s.id))
        if (unique.length > 0) {
          // append to artist's songs
          proj.artists = proj.artists.map(a =>
            a.name === artistName
              ? { ...a, songs: [...existing, ...unique] }
              : a
          )
          // append to combinedSongs too
          proj.combinedSongs.push(...unique)
          set({ projects: [...state.projects] })
        }
      },


      removeTrack: (trackId) => {
        const state = get()
        const proj = state.projects[state.currentProjectIndex]
        // remove from combined
        proj.combinedSongs = proj.combinedSongs.filter(s => s.id !== trackId)
        // remove from each artist's songs
        proj.artists = proj.artists.map(a => ({
          ...a,
          songs: a.songs.filter(s => s.id !== trackId)
        }))
        set({ projects: [...state.projects] })
      },

      reorderPlaylist: (trackIds) => {
        const state = get()
        const proj = state.projects[state.currentProjectIndex]
        proj.combinedSongs = trackIds
          .map(id => proj.combinedSongs.find(s => s.id === id))
          .filter((s): s is SongInfo => Boolean(s))
        set({ projects: [...state.projects] })
      },

      setSpotifyPlaylist: (playlistId) => {
        const state = get()
        state.projects[state.currentProjectIndex].playlistId = playlistId
        set({ projects: [...state.projects] })
      },

      getAllTracks: () => {
        const proj = get().projects[get().currentProjectIndex]
        return proj.combinedSongs
      },

      getDuplicateTracks: () => {
        const all = get().projects[get().currentProjectIndex].combinedSongs
        const counts = new Map<string, number>()
        const dupes = new Set<string>()
        all.forEach(s => {
          const c = counts.get(s.id) ?? 0
          counts.set(s.id, c + 1)
          if (c >= 1) dupes.add(s.id)
        })
        return dupes
      }
    }),
    {
      name: 'playlist-creator-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: state => ({
        projects: state.projects,
        currentProjectIndex: state.currentProjectIndex,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken
      })
    }
  )
)
