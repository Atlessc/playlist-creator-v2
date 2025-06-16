// src/components/ArtistTracks.tsx
import { useState } from 'react';
import { usePlaylistStore } from '@/store/playlist-store';
import { SpotifyService } from '@/services/spotify-service';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Music,
  PlayCircle,
  // Trash2,
  Plus,
  Clock,
  ExternalLink,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import type { SpotifyTrack } from '@/store/playlist-store';

export function ArtistTracks() {
  const {
    currentSession,
    setArtistTracks,      // replaces all tracks
    addArtistTracks,      // appends tracks (for albums)
    // removeTrack,
    addToPlaylist,
    getDuplicateTracks,
  } = usePlaylistStore();

  const [loadingTop, setLoadingTop] = useState<string | null>(null);
  const [loadingAlbums, setLoadingAlbums] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'top' | 'albums'>('top');
  const [selected, setSelected] = useState<Record<string, Set<string>>>({});

  if (!currentSession) return null;

  const confirmedArtists = Object.entries(currentSession.artists)
    .filter(([_, a]) => a.isConfirmed)
    .sort(([a], [b]) => a.localeCompare(b));

  const duplicates = getDuplicateTracks();

  if (confirmedArtists.length === 0) {
    return (
      <Card className="border-purple-500/30 bg-purple-900/20 backdrop-blur-sm">
        <CardContent className="pt-6 text-center">
          <Music className="h-12 w-12 text-purple-400 mx-auto mb-4" />
          <p className="text-purple-300">
            Confirm some artists to start fetching their tracks
          </p>
        </CardContent>
      </Card>
    );
  }

  // Fetch only the artist's top tracks
  const handleFetchTopTracks = async (name: string, id: string) => {
    setLoadingTop(name);
    try {
      const topTracks = await SpotifyService.getArtistTopTracks(id);
      setArtistTracks(name, topTracks);
      toast.success(`Fetched ${topTracks.length} top tracks for ${name}!`);
    } catch (err) {
      console.error(err);
      toast.error(`Failed to fetch top tracks for ${name}`);
    } finally {
      setLoadingTop(null);
    }
  };

  // Fetch songs from the artist's albums
  const handleFetchAlbumTracks = async (name: string, id: string) => {
    setLoadingAlbums(name);
    try {
      const albums = await SpotifyService.getArtistAlbums(id, 10);
      const albumTracks: SpotifyTrack[] = [];
      for (const album of albums.slice(0, 3)) {
        try {
          const tracks = await SpotifyService.getAlbumTracks(album.id, 20);
          albumTracks.push(...tracks);
        } catch {
          // ignore single‐album failures
        }
      }
      if (albumTracks.length) {
        addArtistTracks(name, albumTracks);
        toast.success(`Fetched ${albumTracks.length} album tracks for ${name}!`);
      } else {
        toast.warning(`No album tracks found for ${name}`);
      }
    } catch (err) {
      console.error(err);
      toast.error(`Failed to fetch album tracks for ${name}`);
    } finally {
      setLoadingAlbums(null);
    }
  };

  const toggleSelect = (artist: string, trackId: string) => {
    setSelected((prev) => {
      const artistSet = new Set(prev[artist] || []);
      if (artistSet.has(trackId)) artistSet.delete(trackId);
      else artistSet.add(trackId);
      return { ...prev, [artist]: artistSet };
    });
  };

  const confirmSelection = (artist: string) => {
    const toAdd = Array.from(selected[artist] || []);
    if (toAdd.length === 0) {
      toast.error('No tracks selected to add');
      return;
    }
    addToPlaylist(toAdd);
    toast.success(`Added ${toAdd.length} tracks to playlist`);
    setSelected((prev) => ({ ...prev, [artist]: new Set() }));
  };

  const formatDuration = (ms: number) => {
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const renderTrack = (
    track: SpotifyTrack,
    artist: string,
    index: number
  ) => {
    const isDup = duplicates.has(track.id);
    const isSel = selected[artist]?.has(track.id) ?? false;
    const isInPlaylist = currentSession.playlistOrder.includes(track.id);

    return (
      <div
        key={track.id + index}
        className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${
          isDup
            ? 'bg-yellow-500/10 border border-yellow-500/30'
            : 'bg-purple-800/30 hover:bg-purple-700/40'
        }`}
      >
        <input
          type="checkbox"
          checked={isSel}
          disabled={isInPlaylist}
          onChange={() => toggleSelect(artist, track.id)}
        />
        <Avatar className="h-12 w-12">
          <AvatarImage src={track.album.images[0]?.url} />
          <AvatarFallback className="bg-purple-500/20 text-purple-300">
            <Music className="h-6 w-6" />
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <h4 className="font-medium text-white truncate">{track.name}</h4>
            {isDup && <AlertTriangle className="h-4 w-4 text-yellow-400" />}
            {isInPlaylist && (
              <Badge
                variant="outline"
                className="border-green-500/50 text-green-300 text-xs"
              >
                ✓ In Playlist
              </Badge>
            )}
          </div>
          <div className="flex items-center space-x-4 text-sm text-purple-300">
            <span className="truncate">{track.album.name}</span>
            <span className="flex items-center flex-shrink-0">
              <Clock className="h-3 w-3 mr-1" />
              {formatDuration(track.duration_ms)}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2 flex-shrink-0">
          {track.preview_url && (
            <Button
              size="sm"
              variant="ghost"
              className="text-purple-400 hover:text-purple-300 h-8 w-8 p-0"
              onClick={() => {
                new Audio(track.preview_url!).play();
                toast.success('Playing preview...');
              }}
            >
              <PlayCircle className="h-4 w-4" />
            </Button>
          )}
          <a
            href={track.external_urls.spotify}
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-400 hover:text-purple-300"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent">
          Artist Tracks
        </h2>
        <p className="text-purple-300">
          Fetch &amp; select tracks from your confirmed artists
        </p>
      </div>

      {confirmedArtists.map(([artistName, artistSession]) => {
        const artist = artistSession.spotifyArtist!;
        const tracks = artistSession.tracks;
        const isLoadingTop = loadingTop === artistName;
        const isLoadingAlbums = loadingAlbums === artistName;

        return (
          <Card
            key={artistName}
            className="border-purple-500/30 bg-purple-900/20 backdrop-blur-sm"
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={artist.images[0]?.url} />
                    <AvatarFallback className="bg-purple-500/20 text-purple-300">
                      {artist.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-white">{artist.name}</CardTitle>
                    <p className="text-sm text-purple-300">
                      {tracks.length} track{tracks.length !== 1 && 's'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Button
                    size="sm"
                    variant={viewMode === 'top' ? 'default' : 'outline'}
                    onClick={() => setViewMode('top')}
                  >
                    Top Tracks
                  </Button>
                  <Button
                    size="sm"
                    variant={viewMode === 'albums' ? 'default' : 'outline'}
                    onClick={() => setViewMode('albums')}
                  >
                    Album Tracks
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              <div className="flex justify-center space-x-4 mb-4">
                {viewMode === 'top' ? (
                  <Button
                    onClick={() =>
                      handleFetchTopTracks(artistName, artist.id)
                    }
                    disabled={isLoadingTop}
                  >
                    {isLoadingTop ? (
                      <>
                        <Loader2 className="animate-spin mr-2 h-4 w-4" />
                        Fetching Top…
                      </>
                    ) : (
                      <>
                        <Music className="mr-2 h-4 w-4" />
                        Fetch Top Tracks
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    onClick={() =>
                      handleFetchAlbumTracks(artistName, artist.id)
                    }
                    disabled={isLoadingAlbums}
                  >
                    {isLoadingAlbums ? (
                      <>
                        <Loader2 className="animate-spin mr-2 h-4 w-4" />
                        Fetching Albums…
                      </>
                    ) : (
                      <>
                        <Plus className="mr-2 h-4 w-4" />
                        Fetch Album Tracks
                      </>
                    )}
                  </Button>
                )}
              </div>

              <ScrollArea className="h-80">
                <div className="space-y-2">
                  {tracks.map((t, i) =>
                    renderTrack(t, artistName, i)
                  )}
                </div>
              </ScrollArea>

              <Separator className="my-4 bg-purple-500/30" />

              <div className="flex justify-end">
                <Button
                  onClick={() => confirmSelection(artistName)}
                  disabled={(selected[artistName]?.size ?? 0) === 0}
                >
                  Confirm Selection (
                  {selected[artistName]?.size ?? 0})
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
