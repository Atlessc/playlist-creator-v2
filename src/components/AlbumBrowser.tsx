import { useState, useCallback } from 'react'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog'
import {
  Disc3,
  Plus,
  Loader2,
  Calendar,
  Hash,
  PlayCircle,
  PlusCircle,
} from 'lucide-react'
import { getAllArtistAlbums, getFullAlbumTracks } from '../services/spotifyService'
import { useStore, type UnifiedStore } from '@/lib/store'           // ➊ unified store hook
import { toast } from 'sonner'
import type { ArtistInfo, SongInfo } from '../types'
import Spotified from 'spotified'

interface AlbumInfo {
  id: string
  name: string
  images: any[]
  release_date: string
  total_tracks: number
  artists: any[]
}

interface AlbumWithTracks {
  album: AlbumInfo
  tracks: any[]
}

interface AlbumBrowserProps {
  artist: ArtistInfo
  spotified: Spotified | null
}

// one stable empty‐array so our selector never returns a fresh [] each render
const EMPTY_TRACKS: SongInfo[] = []

export function AlbumBrowser({ artist, spotified }: AlbumBrowserProps) {
  // --- local UI state ---
  const [isOpen, setIsOpen] = useState(false)
  const [albums, setAlbums] = useState<AlbumInfo[]>([])
  const [selectedAlbum, setSelectedAlbum] = useState<AlbumWithTracks | null>(null)
  const [loadingAlbums, setLoadingAlbums] = useState(false)
  const [loadingAlbum, setLoadingAlbum] = useState<string | null>(null)
  const [addingTrack, setAddingTrack] = useState<string | null>(null)
  const [addingAlbum, setAddingAlbum] = useState<string | null>(null)

  // --- ➋ selector for this artist’s songs in the unified store ---
  const selectTracks = useCallback(
    (s: UnifiedStore): SongInfo[] => {
      const proj = s.projects[s.currentProjectIndex]
      const artistEntry = proj?.artists.find(a => a.name === artist.name)
      return artistEntry?.songs ?? EMPTY_TRACKS
    },
    [artist.name]
  )


  // --- grab the data & action from unified store ---
  const existingTracks = useStore(selectTracks)
  const addArtistTracks = useStore(s => s.addArtistTracks)

  // --- album‐loading handlers (unchanged) ---
  const handleOpenAlbums = async () => {
    if (!spotified || !artist.spotifyId) return
    setIsOpen(true)
    setLoadingAlbums(true)
    try {
      const data = await getAllArtistAlbums(spotified, artist.spotifyId)
      data.sort(
        (a, b) =>
          new Date(b.release_date).getTime() -
          new Date(a.release_date).getTime()
      )
      setAlbums(data)
    } catch {
      toast.error(`Failed to load albums for ${artist.name}`)
    } finally {
      setLoadingAlbums(false)
    }
  }

  const handleSelectAlbum = async (album: AlbumInfo) => {
    if (!spotified) return
    setLoadingAlbum(album.id)
    try {
      const withTracks = await getFullAlbumTracks(spotified, album.id)
      setSelectedAlbum(withTracks)
    } catch {
      toast.error(`Failed to load tracks for ${album.name}`)
    } finally {
      setLoadingAlbum(null)
    }
  }

  // --- add a single track as SongInfo, skip duplicates ---
  const handleAddTrack = async (track: any) => {
    setAddingTrack(track.id)
    try {
      const song: SongInfo = {
        id: track.id,
        title: track.name,
        album:
          track.album?.name ||
          selectedAlbum?.album.name ||
          '',
        artist: artist.name,
        uri: track.uri,
      }

      if (existingTracks.some(t => t.id === song.id)) {
        toast.error(`"${song.title}" is already in the playlist.`)
      } else {
        addArtistTracks(artist.name, [song])
        toast.success(`Added "${song.title}" to playlist`)
      }
    } catch {
      toast.error(`Failed to add "${track.name}"`)
    } finally {
      setAddingTrack(null)
    }
  }

  // --- add entire album, skip & report duplicates, update toast with new total ---
  const handleAddEntireAlbum = async () => {
    if (!selectedAlbum) return
    setAddingAlbum(selectedAlbum.album.id)
    try {
      const songs: SongInfo[] = selectedAlbum.tracks.map(t => ({
        id: t.id,
        title: t.name,
        album: selectedAlbum.album.name,
        artist: artist.name,
        uri: t.uri,
      }))

      const newSongs = songs.filter(
        s => !existingTracks.some(e => e.id === s.id)
      )

      if (newSongs.length === 0) {
        toast.error(
          `All tracks from "${selectedAlbum.album.name}" are already added.`
        )
      } else {
        addArtistTracks(artist.name, newSongs)
        const totalAfter = existingTracks.length + newSongs.length
        toast.success(
          `Added ${newSongs.length} tracks from "${selectedAlbum.album.name}" (${totalAfter} total)`
        )
      }
    } catch {
      toast.error(`Failed to add album "${selectedAlbum.album.name}"`)
    } finally {
      setAddingAlbum(null)
    }
  }

  const formatDate = (d: string) =>
    isNaN(Date.parse(d)) ? d : new Date(d).getFullYear()

  // const getAlbumTypeColor = (type: string) => {
  //   switch (type) {
  //     case 'album': return 'bg-neon-purple/20 text-neon-purple border-neon-purple/30';
  //     case 'single': return 'bg-neon-pink/20 text-neon-pink border-neon-pink/30';
  //     case 'compilation': return 'bg-neon-teal/20 text-neon-teal border-neon-teal/30';
  //     default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  //   }
  // };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          onClick={handleOpenAlbums}
          variant="outline"
          size="sm"
          className="border-neon-teal/50 text-neon-teal hover:bg-neon-teal/10"
        >
          <Disc3 className="w-4 h-4 mr-2" />
          Browse Albums
        </Button>
      </DialogTrigger>
      
      <DialogContent className="bg-black/90 backdrop-blur-md border-white/20 text-white max-w-4xl max-h-[80vh] overflow-scroll">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold bg-gradient-to-r from-neon-purple to-neon-pink bg-clip-text text-transparent">
            {selectedAlbum ? selectedAlbum.album.name : `${artist.name} - Albums`}
          </DialogTitle>
          <DialogDescription className="text-gray-300">
            {selectedAlbum 
              ? `${selectedAlbum.album.total_tracks} tracks • Released ${formatDate(selectedAlbum.album.release_date)}`
              : `Browse and add tracks from ${artist.name}'s discography`
            }
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1">
          {!selectedAlbum ? (
            // Albums Grid View
            <div className="h-full overflow-y-auto pr-2">
              {loadingAlbums ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-neon-purple" />
                  <span className="ml-3 text-gray-300">Loading albums...</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {albums.map((album) => (
                    <div
                      key={album.id}
                      className="group p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all cursor-pointer"
                      onClick={() => handleSelectAlbum(album)}
                    >
                      <div className="relative">
                        {album.images?.[0] && (
                          <img
                            src={album.images[0].url}
                            alt={album.name}
                            className="w-full aspect-square object-cover rounded-lg mb-3"
                          />
                        )}
                        {loadingAlbum === album.id && (
                          <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                            <Loader2 className="w-6 h-6 animate-spin text-white" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-lg transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <PlayCircle className="w-8 h-8 text-white" />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <h4 className="font-medium text-white truncate group-hover:text-neon-purple transition-colors">
                          {album.name}
                        </h4>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-400">
                            {formatDate(album.release_date)}
                          </span>
                        </div>
                        
                        <div className="flex items-center text-xs text-gray-400">
                          <Hash className="w-3 h-3 mr-1" />
                          {album.total_tracks} tracks
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            // Album Tracks View
            <div className="h-full flex flex-col">
              {/* Album Header */}
              <div className="flex items-start space-x-4 p-4 bg-white/5 rounded-lg mb-4">
                {selectedAlbum.album.images?.[0] && (
                  <img
                    src={selectedAlbum.album.images[0].url}
                    alt={selectedAlbum.album.name}
                    className="w-24 h-24 rounded-lg object-cover"
                  />
                )}
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-2">
                    {selectedAlbum.album.name}
                  </h3>
                  <div className="flex items-center space-x-4 text-sm text-gray-300 mb-3">
                    <span className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      {formatDate(selectedAlbum.album.release_date)}
                    </span>
                    <span className="flex items-center">
                      <Hash className="w-4 h-4 mr-1" />
                      {selectedAlbum.album.total_tracks} tracks
                    </span>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      onClick={handleAddEntireAlbum}
                      disabled={addingAlbum === selectedAlbum.album.id}
                      className="bg-gradient-to-r from-neon-purple to-neon-pink hover:from-neon-purple/80 hover:to-neon-pink/80"
                    >
                      {addingAlbum === selectedAlbum.album.id ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Adding Album...
                        </>
                      ) : (
                        <>
                          <PlusCircle className="w-4 h-4 mr-2" />
                          Add Entire Album
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setSelectedAlbum(null)}
                      className="border-white/20 text-white hover:bg-white/10"
                    >
                      Back to Albums
                    </Button>
                  </div>
                </div>
              </div>

              {/* Tracks List */}
              <div className="flex-1 overflow-y-auto pr-2">
                <div className="space-y-2">
                  {selectedAlbum.tracks.map((track, index) => (
                    <div
                      key={track.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <span className="text-sm text-gray-400 w-6 text-center">
                          {index + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-white truncate">
                            {track.name}
                          </h4>
                          {track.explicit && (
                            <Badge variant="outline" className="text-xs mt-1 border-red-500/50 text-red-400">
                              Explicit
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-gray-400">
                          {Math.floor(track.duration_ms / 60000)}:{String(Math.floor((track.duration_ms % 60000) / 1000)).padStart(2, '0')}
                        </div>
                      </div>
                      
                      <Button
                        size="sm"
                        onClick={() => handleAddTrack(track)}
                        disabled={addingTrack === track.id}
                        className="ml-3 bg-neon-teal hover:bg-neon-teal/80"
                      >
                        {addingTrack === track.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Plus className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}