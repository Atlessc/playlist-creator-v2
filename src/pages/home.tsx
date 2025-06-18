import {
  useEffect,
  useCallback,
  useMemo,
  useState
} from 'react';
import { useSpotified } from '../lib/useSpotified';
import { ArtistAccordion } from '../components/artist-accordion';
import { PlaylistTracks } from '../components/PlaylistTracks';
import { ProjectManager } from '../components/ProjectManager';
import { Toaster } from 'sonner';
import { Button } from '../components/ui/button';
import { useStore } from '../lib/store';
import {
  getTopTracks,
  // getLatestAlbumTracks 
} from '../services/spotifyService';
import type { ArtistInfo, SongInfo } from '../types';
import { toast } from 'sonner';
import { Sparkles, Music } from 'lucide-react';

type RawTrackWithRequired = RawTrack & {
  id: string
  name: string
  uri: string
}

type RawTrack = {
  id?: string
  name?: string
  uri?: string
  album?: { name?: string } | null
  albumName?: string
}

export default function HomePage() {
  const {
    spotified,
    authenticate,
    handleCallback,
    isAuthenticated,
    error,
  } = useSpotified(
    import.meta.env.VITE_SPOTIFY_CLIENT_ID,
    'http://localhost:5173/',
    ['playlist-modify-private', 'user-read-private']
  );

  // track which artist is currently loading
  const [loadingArtist, setLoadingArtist] = useState<string | null>(null);

  // pull only the actions & state you need
  const projects = useStore(s => s.projects);
  const currentProjectIndex = useStore(s => s.currentProjectIndex);
  const setAuthenticated = useStore(s => s.setAuthenticated);

  const addArtistTracks = useStore(s => s.addArtistTracks)

  const currentProject = projects[currentProjectIndex];

  // finalize OAuth on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    if (code) handleCallback(code)
  }, [handleCallback])

  // Update store authentication state
  useEffect(() => {
    setAuthenticated(isAuthenticated);
  }, [isAuthenticated, setAuthenticated]);
  // Update store authentication state
  useEffect(() => {
    setAuthenticated(isAuthenticated);
  }, [isAuthenticated, setAuthenticated]);

  const handleFetchSongs = useCallback(
    async (artist: ArtistInfo): Promise<void> => {
      if (!spotified || !artist.spotifyId) return
      setLoadingArtist(artist.name)

      try {
        // fetch top‐tracks response
        const topResp = await getTopTracks(spotified, artist.spotifyId)

        // normalize to an array of RawTrack
        const rawArr: unknown[] = Array.isArray(topResp)
          ? topResp
          : (topResp as { tracks?: unknown[] }).tracks ?? []

        const rawTracks = rawArr as RawTrack[]

        // 2) Filter using the new Rich type, so TS keeps album & albumName around:
        const validTracks = rawTracks.filter(
          (t): t is RawTrackWithRequired =>
            typeof t.id === 'string' &&
            typeof t.name === 'string' &&
            typeof t.uri === 'string'
        )

        // 3) Now you can safely access album & albumName:
        const songs: SongInfo[] = validTracks.map(t => ({
          id: t.id,
          title: t.name,
          album: t.album?.name ?? t.albumName ?? '',
          artist: artist.name,
          uri: t.uri,
        }))

        console.log(`Fetched ${songs.length} songs for ${artist.name}`, songs)

        // append & dedupe, rather than overwrite
        addArtistTracks(artist.name, songs)

        toast.success(`🎵 Fetched ${songs.length} tracks for ${artist.name}`)
      } catch (err) {
        console.error(err)
        toast.error(`Failed to fetch songs for ${artist.name}`)
      } finally {
        setLoadingArtist(null)
      }
    },
    [spotified, addArtistTracks]
  )

  const allConfirmed = useMemo(
    () => currentProject.artists.every(a => a.confirmed),
    [currentProject.artists]
  );

  const fetchAllSongs = useCallback(async () => {
    for (const artist of currentProject.artists) {
      if (artist.confirmed && artist.songs.length === 0) {
        await handleFetchSongs(artist);
      }
    }
  }, [currentProject.artists, handleFetchSongs]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-900 to-teal-900 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-20 left-10 w-72 h-72 bg-neon-purple rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
          <div className="absolute top-40 right-20 w-64 h-64 bg-neon-pink rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-1000"></div>
          <div className="absolute bottom-20 left-1/2 w-80 h-80 bg-neon-teal rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-2000"></div>
        </div>

        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 text-center">
          <div className="mb-8">
            <div className="mb-6">
              <Sparkles className="w-20 h-20 mx-auto mb-4 text-neon-purple animate-pulse" />
              <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-neon-purple via-neon-pink to-neon-teal bg-clip-text text-transparent mb-4">
                Beyond Wonderland
              </h1>
              <h2 className="text-2xl md:text-3xl font-semibold text-white mb-2">
                The Gorge 2025
              </h2>
              <p className="text-lg text-gray-300 max-w-2xl mx-auto">
                Create the perfect festival playlist with tracks from all your favorite Beyond Wonderland artists
              </p>
            </div>

            <div className="space-y-4 max-w-md mx-auto">
              <div className="p-6 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20">
                <Music className="w-12 h-12 mx-auto mb-3 text-neon-teal" />
                <h3 className="text-xl font-semibold text-white mb-2">
                  Ready to build your playlist?
                </h3>
                <p className="text-gray-300 text-sm mb-4">
                  Connect your Spotify account to search artists, fetch their top tracks, and create your ultimate festival playlist
                </p>

                <Button
                  onClick={authenticate}
                  className="w-full bg-gradient-to-r from-neon-purple to-neon-pink hover:from-neon-purple/80 hover:to-neon-pink/80 text-white font-bold py-3 text-lg shadow-lg shadow-neon-purple/25 transition-all duration-300 hover:scale-105"
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  Connect Spotify
                </Button>
              </div>

              {error && (
                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                  {error}
                </div>
              )}
            </div>
          </div>

          <div className="text-center text-gray-400 text-sm max-w-lg">
            <p>
              This app will access your Spotify account to search for artists and create playlists.
              Your music taste stays private and secure.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-900 to-teal-900">
      {/* Background effects */}
      <div className="fixed inset-0 opacity-20">
        <div className="absolute top-0 left-0 w-96 h-96 bg-neon-purple rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
        <div className="absolute top-1/3 right-0 w-80 h-80 bg-neon-pink rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-0 left-1/2 w-88 h-88 bg-neon-teal rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-2000"></div>
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-black/20 backdrop-blur-md border-b border-white/10">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-neon-purple to-neon-pink bg-clip-text text-transparent">
                  Beyond Wonderland 2025
                </h1>
                <p className="text-sm text-gray-400">Playlist Generator</p>
              </div>

              <div className="flex items-center space-x-4">
                <ProjectManager />

                {allConfirmed && currentProject.artists.some(a => a.songs.length === 0) && (
                  <Button
                    onClick={fetchAllSongs}
                    className="bg-gradient-to-r from-neon-teal to-neon-purple hover:from-neon-teal/80 hover:to-neon-purple/80"
                  >
                    Fetch All Songs
                  </Button>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="container mx-auto px-4 py-8">
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Left column - Artists */}
            <div className="space-y-6">
              
              <ArtistAccordion
                artists={currentProject.artists}
                spotified={spotified}
                onFetchSongs={handleFetchSongs}
                loadingArtist={loadingArtist}
              />
            </div>

            {/* Right column - Playlist */}
            <div className="lg:sticky lg:top-24 lg:self-start">
              <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl p-6">
                <PlaylistTracks
                  songs={currentProject.combinedSongs}
                  spotified={spotified}
                />
              </div>
            </div>
          </div>
        </main>
      </div>

      <Toaster
        theme="dark"
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: 'white',
          },
        }}
      />
    </div>
  );
}