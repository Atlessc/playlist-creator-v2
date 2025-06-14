import { useState } from 'react';
import { usePlaylistStore } from '../../store/playlist-store';
import { SpotifyService } from '../../services/spotify-service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Music, 
  PlayCircle, 
  Trash2, 
  ArrowUp, 
  ArrowDown,
  Clock, 
  ExternalLink,
  Loader2,
  AlertTriangle,
  Upload,
  CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableItem } from './sortable-item';

export function PlaylistManager() {
  const {
    currentSession,
    getOrderedTracks,
    getDuplicateTracks,
    reorderPlaylist,
    removeFromPlaylist,
    setSpotifyPlaylist
  } = usePlaylistStore();
  
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);
  const [playlistName, setPlaylistName] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  if (!currentSession) {
    return null;
  }

  const tracks = getOrderedTracks();
  const duplicateTracks = getDuplicateTracks();

  if (tracks.length === 0) {
    return (
      <Card className="border-purple-500/30 bg-purple-900/20 backdrop-blur-sm">
        <CardContent className="pt-6 text-center">
          <Music className="h-12 w-12 text-purple-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No Tracks in Playlist</h3>
          <p className="text-purple-300">
            Add tracks from your confirmed artists to build your playlist
          </p>
        </CardContent>
      </Card>
    );
  }

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = tracks.findIndex(track => track.id === active.id);
      const newIndex = tracks.findIndex(track => track.id === over.id);
      
      const newOrder = arrayMove(tracks, oldIndex, newIndex);
      reorderPlaylist(newOrder.map(track => track.id));
      
      toast.success('Playlist reordered!');
    }
  };

  const handleMoveTrack = (trackId: string, direction: 'up' | 'down') => {
    const currentIndex = tracks.findIndex(track => track.id === trackId);
    if (currentIndex === -1) return;
    
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= tracks.length) return;
    
    const newOrder = arrayMove(tracks, currentIndex, newIndex);
    reorderPlaylist(newOrder.map(track => track.id));
    
    toast.success(`Track moved ${direction}!`);
  };

  const handleRemoveTrack = (trackId: string, trackName: string) => {
    removeFromPlaylist(trackId);
    toast.success(`Removed "${trackName}" from playlist`);
  };

  const handleCreateSpotifyPlaylist = async () => {
    if (!playlistName.trim()) {
      toast.error('Please enter a playlist name');
      return;
    }

    setIsCreatingPlaylist(true);
    
    try {
      const user = await SpotifyService.getCurrentUser();
      const playlist = await SpotifyService.createPlaylist(
        user.id,
        playlistName.trim(),
        `Beyond Wonderland at the Gorge 2025 playlist created with ${tracks.length} tracks`,
        true
      );
      
      const trackUris = tracks.map(track => track.uri);
      await SpotifyService.addTracksToPlaylist(playlist.id, trackUris);
      
      setSpotifyPlaylist(playlist.id, playlist.external_urls.spotify);
      
      toast.success('Playlist created on Spotify!');
      setPlaylistName('');
    } catch (error) {
      console.error('Error creating playlist:', error);
      toast.error('Failed to create playlist on Spotify');
    } finally {
      setIsCreatingPlaylist(false);
    }
  };

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getTotalDuration = () => {
    const totalMs = tracks.reduce((sum, track) => sum + track.duration_ms, 0);
    const hours = Math.floor(totalMs / 3600000);
    const minutes = Math.floor((totalMs % 3600000) / 60000);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent">
          Your Playlist
        </h2>
        <p className="text-purple-300">
          Reorder tracks and create your Spotify playlist
        </p>
      </div>

      <Card className="border-purple-500/30 bg-purple-900/20 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white">{currentSession.name}</CardTitle>
              <p className="text-sm text-purple-300">
                {tracks.length} track{tracks.length === 1 ? '' : 's'} • {getTotalDuration()}
                {duplicateTracks.size > 0 && (
                  <span className="ml-2 text-yellow-400">
                    • {duplicateTracks.size} duplicate{duplicateTracks.size === 1 ? '' : 's'}
                  </span>
                )}
              </p>
            </div>
            
            <div className="flex items-center space-x-2">
              {currentSession.spotifyPlaylistUrl ? (
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <a
                    href={currentSession.spotifyPlaylistUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-400 hover:text-green-300"
                  >
                    <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      View on Spotify
                    </Button>
                  </a>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Input
                    value={playlistName}
                    onChange={(e) => setPlaylistName(e.target.value)}
                    placeholder="Enter playlist name..."
                    className="bg-purple-800/50 border-purple-500/50 text-white placeholder:text-purple-400 w-64"
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateSpotifyPlaylist()}
                  />
                  <Button
                    onClick={handleCreateSpotifyPlaylist}
                    disabled={isCreatingPlaylist || !playlistName.trim()}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {isCreatingPlaylist ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Create on Spotify
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          <ScrollArea className="h-96">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={tracks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {tracks.map((track, index) => {
                    const isDuplicate = duplicateTracks.has(track.id);
                    
                    return (
                      <SortableItem key={track.id} id={track.id}>
                        <div className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                          isDuplicate 
                            ? 'bg-yellow-500/10 border border-yellow-500/30' 
                            : 'bg-purple-800/30 hover:bg-purple-700/40'
                        }`}>
                          <div className="flex items-center space-x-2 w-12">
                            <span className="text-sm text-purple-400 font-mono w-6 text-right">
                              {index + 1}
                            </span>
                          </div>
                          
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
                            </div>
                            
                            <div className="flex items-center space-x-4 text-sm text-purple-300">
                              <span className="truncate">{track.artists[0].name}</span>
                              <span className="truncate">{track.album.name}</span>
                              <span className="flex items-center flex-shrink-0">
                                <Clock className="h-3 w-3 mr-1" />
                                {formatDuration(track.duration_ms)}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2 flex-shrink-0">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleMoveTrack(track.id, 'up')}
                              disabled={index === 0}
                              className="text-purple-400 hover:text-purple-300 h-8 w-8 p-0"
                            >
                              <ArrowUp className="h-4 w-4" />
                            </Button>
                            
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleMoveTrack(track.id, 'down')}
                              disabled={index === tracks.length - 1}
                              className="text-purple-400 hover:text-purple-300 h-8 w-8 p-0"
                            >
                              <ArrowDown className="h-4 w-4" />
                            </Button>
                            
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
                              onClick={() => handleRemoveTrack(track.id, track.name)}
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/20 h-8 w-8 p-0"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </SortableItem>
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>
          </ScrollArea>
          
          {tracks.length > 0 && (
            <>
              <Separator className="my-4 bg-purple-500/30" />
              <div className="flex justify-between items-center text-sm text-purple-300">
                <span>
                  Total: {tracks.length} tracks • {getTotalDuration()}
                  {duplicateTracks.size > 0 && (
                    <span className="text-yellow-400 ml-2">
                      • {duplicateTracks.size} duplicate{duplicateTracks.size === 1 ? '' : 's'}
                    </span>
                  )}
                </span>
                
                {currentSession.spotifyPlaylistUrl && (
                  <Badge variant="outline" className="border-green-500/50 text-green-300">
                    <CheckCircle className="mr-1 h-3 w-3" />
                    Created on Spotify
                  </Badge>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}