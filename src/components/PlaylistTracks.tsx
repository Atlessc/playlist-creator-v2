import { useState } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  // arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Play,
  Trash2,
  ArrowUp,
  ArrowDown,
  GripVertical,
  Music,
  Loader2,
  Check,
  Pencil
} from 'lucide-react';
import { useStore } from '../lib/store';
import { createPlaylist, addTracksToPlaylist } from '../services/spotifyService';
import { toast } from 'sonner';
import type { SongInfo } from '../types';
import Spotified from 'spotified';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from './ui/dialog';
import { Input } from './ui/input';

interface PlaylistTracksProps {
  songs: SongInfo[];
  spotified: Spotified | null;
}

interface SortableItemProps {
  song: SongInfo;
  index: number;
  onRemove: (songId: string) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  totalSongs: number;
}

function SortableItem({ song, index, onRemove, onMoveUp, onMoveDown, totalSongs }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: song.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group p-4 rounded-lg border ${song.duplicate
          ? 'bg-yellow-500/10 border-yellow-500/30'
          : 'bg-white/5 border-white/10'
        } hover:bg-white/10 transition-all duration-200`}
    >
      <div className="flex items-center space-x-3">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-white transition-colors"
        >
          <GripVertical className="w-4 h-4" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-white truncate">
                {song.title}
              </h4>
              <p className="text-sm text-gray-400 truncate">
                by {song.artist} • {song.album}
              </p>
            </div>

            <div className="flex items-center space-x-2 ml-4">
              {song.duplicate && (
                <Badge variant="outline" className="text-xs border-yellow-500/50 text-yellow-400">
                  Duplicate
                </Badge>
              )}

              <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onMoveUp(index)}
                  disabled={index === 0}
                  className="p-1 h-6 w-6 text-gray-400 hover:text-white disabled:opacity-30"
                >
                  <ArrowUp className="w-3 h-3" />
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onMoveDown(index)}
                  disabled={index === totalSongs - 1}
                  className="p-1 h-6 w-6 text-gray-400 hover:text-white disabled:opacity-30"
                >
                  <ArrowDown className="w-3 h-3" />
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onRemove(song.id)}
                  className="p-1 h-6 w-6 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PlaylistTracks({ songs, spotified }: PlaylistTracksProps) {
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);

  const removeSong = useStore(s => s.removeSong);
  const moveSong = useStore(s => s.moveSong);
  const setPlaylistId = useStore(s => s.setPlaylistId);
  const currentProject = useStore(s => s.projects[s.currentProjectIndex]);
  const updateProjectTitle = useStore(s => s.updateProjectTitle);
  const setMainPlaylistUri = useStore(s => s.setMainPlaylistUri);
  
  function EditProjectTitle () {
    const [newTitle, setNewTitle] = useState(currentProject.title || '');
    return (
      <Dialog>

        <DialogTrigger asChild>
          <Button variant="outline" className="ml-4">
            <Pencil className="w-6 h-6 text-white" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Project Title</DialogTitle>
          </DialogHeader>
          <div>

            <Input
              type="text"
              placeholder="Enter new project title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>
          <DialogFooter>

            <Button
              className="mt-4"
              onClick={() => {
                updateProjectTitle(newTitle);
                setNewTitle(''); // Clear input after saving
                toast.success('Project title updated successfully!')
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = songs.findIndex(song => song.id === active.id);
      const newIndex = songs.findIndex(song => song.id === over.id);

      moveSong(oldIndex, newIndex);
    }
  };

  const handleMoveUp = (index: number) => {
    if (index > 0) {
      moveSong(index, index - 1);
    }
  };

  const handleMoveDown = (index: number) => {
    if (index < songs.length - 1) {
      moveSong(index, index + 1);
    }
  };

  const handleCreatePlaylist = async () => {
    if (!spotified || songs.length === 0) return;

    setIsCreatingPlaylist(true);
    try {
      // Get user profile to get user ID
      const userProfile = await spotified.user.getCurrentUserProfile();
      const userId = userProfile.id;

      // Create playlist
      const playlist = await createPlaylist(
        spotified,
        userId,
        currentProject.title
      );

      console.log('Created playlist:', playlist);

      // Add tracks to playlist
      const trackUris = songs.map(song => song.uri);
      await addTracksToPlaylist(spotified, playlist.id!, trackUris);

      setMainPlaylistUri(playlist.href || '');

      setPlaylistId(playlist.id!);
      toast.success(`🎉 Created playlist "${currentProject.title}" with ${songs.length} tracks!`);

    } catch (error) {
      console.error('Error creating playlist:', error);
      toast.error('Failed to create playlist. Please try again.');
    } finally {
      setIsCreatingPlaylist(false);
    }
  };

  const duplicateCount = songs.filter(song => song.duplicate).length;
  const uniqueCount = songs.length - duplicateCount;

  if (songs.length === 0) {
    return (
      <div className="text-center py-12">
        <Music className="w-16 h-16 mx-auto mb-4 text-gray-500" />
        <h3 className="text-xl font-semibold text-gray-300 mb-2">
          No tracks yet
        </h3>
        <p className="text-gray-500">
          Search and confirm artists to start building your playlist
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 h-[calc(100vh-200px)] overflow-y-auto">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white mb-2">
          {currentProject.title ? currentProject.title : "Your Playlist Tracks"}
          <EditProjectTitle />
        </h2>
        <div className="flex items-center justify-center space-x-4 text-sm text-gray-400">
          <span className="flex items-center">
            <Music className="w-4 h-4 mr-1" />
            {songs.length} total tracks
          </span>
          <span>•</span>
          <span>{uniqueCount} unique tracks</span>
          {duplicateCount > 0 && (
            <>
              <span>•</span>
              <span className="text-yellow-400">{duplicateCount} duplicates</span>
            </>
          )}
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={songs.map(s => s.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
            {songs.map((song, index) => (
              <SortableItem
                key={song.id}
                song={song}
                index={index}
                onRemove={removeSong}
                onMoveUp={handleMoveUp}
                onMoveDown={handleMoveDown}
                totalSongs={songs.length}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <div className="pt-6 border-t border-white/10">
        {currentProject.playlistId ? (
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-2 text-green-400">
              <Check className="w-5 h-5" />
              <span className="font-medium">Playlist created successfully!</span>
            </div>
            <Button
              onClick={() => window.open(`https://open.spotify.com/playlist/${currentProject.playlistId}`, '_blank')}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Play className="w-4 h-4 mr-2" />
              Open in Spotify
            </Button>
          </div>
        ) : (
          <Button
            onClick={handleCreatePlaylist}
            disabled={isCreatingPlaylist || songs.length === 0 || !spotified}
            className="w-full bg-gradient-to-r from-neon-purple via-neon-pink to-neon-teal hover:from-neon-purple/80 hover:via-neon-pink/80 hover:to-neon-teal/80 text-white font-bold py-4 text-lg shadow-lg shadow-neon-purple/25"
          >
            {isCreatingPlaylist ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Creating playlist...
              </>
            ) : (
              <>
                <Play className="w-5 h-5 mr-2" />
                Create Spotify Playlist ({songs.length} tracks)
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}