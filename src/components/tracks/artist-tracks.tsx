import { useState } from 'react';
import { usePlaylistStore } from '@/store/playlist-store';
import { SpotifyService } from '@/services/spotify-service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Music, 
  PlayCircle, 
  Trash2, 
  Plus, 
  Clock, 
  ExternalLink,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import type { SpotifyTrack } from '@/store/playlist-store';

export function ArtistTracks() {
  const {
    currentSession,
    setArtistTracks,
    addArtistTracks,
    removeTrack,
    addToPlaylist,
    getDuplicateTracks
  } = usePlaylistStore();
  
  const [loadingTracks, setLoadingTracks] = useState<string | null>(null);
  const [fetchingMore, setFetchingMore] = useState<string | null>(null);

  if (!currentSession) {
    return null;
  }

  const confirmedArtists = Object.entries(currentSession.artists)
    .filter(([_, artist]) => artist.isConfirmed)
    .sort(([a], [b]) => a.localeCompare(b));

  const duplicateTracks = getDuplicateTracks();

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

  const handleFetchTracks = async (artistName: string, artistId: string) => {
    setLoadingTracks(artistName);
    
    try {
      const { topTracks, latestAlbumTracks } = await SpotifyService.getArtistAllTracks(artistId);
      const allTracks = [...topTracks, ...latestAlbumTracks];
      
      setArtistTracks(artistName, allTracks);
      toast.success(`Fetched ${allTracks.length} tracks for ${artistName}!`);
    } catch (error) {
      console.error('Error fetching tracks:', error);
      toast.error(`Failed to fetch tracks for ${artistName}`);
    } finally {
      setLoadingTracks(null);
    }
  };

  const handleFetchMoreTracks = async (artistName: string, artistId: string) => {
    setFetchingMore(artistName);
    
    try {
      const albums = await SpotifyService.getArtistAlbums(artistId, 10);
      const albumTracks: SpotifyTrack[] = [];
      
      // Fetch tracks from multiple albums
      for (const album of albums.slice(0, 3)) {
        try {
          const tracks = await SpotifyService.getAlbumTracks(album.id, 20);
          albumTracks.push(...tracks);
        } catch (error) {
          console.warn(`Failed to fetch tracks from album ${album.name}:`, error);
        }
      }
      
      if (albumTracks.length > 0) {
        addArtistTracks(artistName, albumTracks);
        toast.success(`Added ${albumTracks.length} more tracks for ${artistName}!`);
      } else {
        toast.warning(`No additional tracks found for ${artistName}`);
      }
    } catch (error) {
      console.error('Error fetching more tracks:', error);
      toast.error(`Failed to fetch more tracks for ${artistName}`);
    } finally {
      setFetchingMore(null);
    }
  };

  const handleRemoveTrack = (artistName: string, trackId: string, trackName: string) => {
    removeTrack(artistName, trackId);
    toast.success(`Removed "${trackName}" from ${artistName}`);
  };

  const handleAddToPlaylist = (trackIds: string[], count: number) => {
    addToPlaylist(trackIds);
    toast.success(`Added ${count} track${count === 1 ? '' : 's'} to playlist!`);
  };

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const renderTrack = (track: SpotifyTrack, artistName: string, index: number) => {
    const isDuplicate = duplicateTracks.has(track.id);
    const isInPlaylist = currentSession.playlistOrder.includes(track.id);

    return (
      <div
        key={`${track.id}-${index}`}
        className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${
          isDuplicate ? 'bg-yellow-500/10 border border-yellow-500/30' : 'bg-purple-800/30 hover:bg-purple-700/40'
        }`}
      >
        <Avatar className="h-12 w-12">
          <AvatarImage src={track.album.images[0]?.url} />
          <AvatarFallback className="bg-purple-500/20 text-purple-300">
            <Music className="h-6 w-6" />
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <h4 className="font-medium text-white truncate">{track.name}</h4>
            {isDuplicate && (
              <AlertTriangle className="h-4 w-4 text-yellow-400 flex-shrink-0" id="Duplicate track" />
            )}
            {isInPlaylist && (
              <Badge variant="outline" className="border-green-500/50 text-green-300 text-xs">
                In Playlist
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
                const audio = new Audio(track.preview_url!);
                audio.play();
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
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
              <ExternalLink className="h-4 w-4" />
            </Button>
          </a>
          
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleRemoveTrack(artistName, track.id, track.name)}
            className="text-red-400 hover:text-red-300 hover:bg-red-500/20 h-8 w-8 p-0"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
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
          Fetch and manage tracks from your confirmed artists
        </p>
      </div>

      <div className="space-y-6">
        {confirmedArtists.map(([artistName, artistSession]) => {
          const artist = artistSession.spotifyArtist!;
          const tracks = artistSession.tracks;
          const isLoading = loadingTracks === artistName;
          const isFetchingMore = fetchingMore === artistName;

          return (
            <Card key={artistName} className="border-purple-500/30 bg-purple-900/20 backdrop-blur-sm">
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
                        {tracks.length} track{tracks.length === 1 ? '' : 's'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {tracks.length === 0 ? (
                      <Button
                        onClick={() => handleFetchTracks(artistName, artist.id)}
                        disabled={isLoading}
                        className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Fetching...
                          </>
                        ) : (
                          <>
                            <Music className="mr-2 h-4 w-4" />
                            Fetch Tracks
                          </>
                        )}
                      </Button>
                    ) : (
                      <>
                        <Button
                          onClick={() => handleFetchMoreTracks(artistName, artist.id)}
                          disabled={isFetchingMore}
                          variant="outline"
                          size="sm"
                          className="border-purple-500/50 text-purple-300 hover:bg-purple-500/20"
                        >
                          {isFetchingMore ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Loading...
                            </>
                          ) : (
                            <>
                              <Plus className="mr-2 h-4 w-4" />
                              Fetch More
                            </>
                          )}
                        </Button>
                        
                        <Button
                          onClick={() => handleAddToPlaylist(tracks.map(t => t.id), tracks.length)}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Add All ({tracks.length})
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              {tracks.length > 0 && (
                <CardContent className="pt-0">
                  <ScrollArea className="h-96">
                    <div className="space-y-2">
                      {tracks.map((track, index) => renderTrack(track, artistName, index))}
                    </div>
                  </ScrollArea>
                  
                  {tracks.length > 0 && (
                    <>
                      <Separator className="my-4 bg-purple-500/30" />
                      <div className="flex justify-between items-center text-sm text-purple-300">
                        <span>Total: {tracks.length} tracks</span>
                        <Button
                          onClick={() => handleAddToPlaylist(
                            tracks.filter(t => !currentSession.playlistOrder.includes(t.id)).map(t => t.id),
                            tracks.filter(t => !currentSession.playlistOrder.includes(t.id)).length
                          )}
                          size="sm"
                          variant="outline"
                          className="border-purple-500/50 text-purple-300 hover:bg-purple-500/20"
                          disabled={tracks.every(t => currentSession.playlistOrder.includes(t.id))}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Add New Tracks
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}