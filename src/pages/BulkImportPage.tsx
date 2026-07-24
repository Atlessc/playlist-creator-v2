import { useEffect } from 'react'
import { ArrowLeft, Music, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { BulkSongImporter } from '../components/BulkSongImporter'
import { Button } from '../components/ui/button'
import { useSpotified } from '../lib/useSpotified'

export default function BulkImportPage() {
  const redirectUri = import.meta.env.VITE_REDIRECT_URI || `${window.location.origin}/bulk`
  const {
    authenticate,
    handleCallback,
    isAuthenticated,
    error,
  } = useSpotified(
    import.meta.env.VITE_SPOTIFY_CLIENT_ID,
    redirectUri,
    ['playlist-modify-private', 'user-read-private', 'playlist-modify-public'],
  )

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    if (code) void handleCallback(code)
  }, [handleCallback])

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-900 via-pink-900 to-teal-900 px-4">
        <div className="w-full max-w-lg rounded-xl border border-white/20 bg-black/25 p-8 text-center backdrop-blur-md">
          <Music className="mx-auto mb-4 h-14 w-14 text-neon-teal" />
          <h1 className="text-3xl font-bold text-white">Bulk Spotify Import</h1>
          <p className="mt-3 text-gray-300">
            Connect Spotify to import a large JSON song list with resumable searching and rate-limit-safe uploads.
          </p>
          <Button
            onClick={authenticate}
            className="mt-6 w-full bg-gradient-to-r from-neon-purple to-neon-pink text-white"
          >
            <Sparkles className="mr-2 h-5 w-5" />
            Connect Spotify
          </Button>
          {error && <p className="mt-4 text-sm text-red-300">{error}</p>}
          <Link to="/" className="mt-6 inline-flex items-center text-sm text-gray-300 hover:text-white">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to festival creator
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-900 to-teal-900">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/25 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Playlist Creator v2</h1>
            <p className="text-sm text-gray-300">Bulk JSON importer</p>
          </div>
          <Link to="/">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Festival creator
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <BulkSongImporter />
      </main>
    </div>
  )
}
