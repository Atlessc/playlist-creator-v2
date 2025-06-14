import { useState } from 'react';
import { usePlaylistStore } from '@/store/playlist-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Music, Calendar, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export function SessionManager() {
  const {
    currentSession,
    allSessions,
    createSession,
    loadSession,
    deleteSession,
    updateSessionName
  } = usePlaylistStore();
  
  const [newSessionName, setNewSessionName] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [editName, setEditName] = useState(currentSession?.name || '');

  const handleCreateSession = () => {
    if (!newSessionName.trim()) {
      toast.error('Please enter a playlist name');
      return;
    }
    
    createSession(newSessionName.trim());
    setNewSessionName('');
    setIsDialogOpen(false);
    toast.success('New playlist session created!');
  };

  const handleLoadSession = (sessionId: string) => {
    loadSession(sessionId);
    toast.success('Playlist session loaded!');
  };

  const handleDeleteSession = (sessionId: string, sessionName: string) => {
    if (window.confirm(`Are you sure you want to delete "${sessionName}"?`)) {
      deleteSession(sessionId);
      toast.success('Playlist session deleted');
    }
  };

  const handleUpdateName = () => {
    if (!editName.trim()) {
      toast.error('Please enter a valid name');
      return;
    }
    
    updateSessionName(editName.trim());
    setEditingName(false);
    toast.success('Playlist name updated!');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Current Session */}
      {currentSession ? (
        <Card className="border-purple-500/30 bg-purple-900/20 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Music className="h-6 w-6 text-purple-400" />
                {editingName ? (
                  <div className="flex items-center space-x-2">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="bg-purple-800/50 border-purple-500/50 text-white"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleUpdateName();
                        if (e.key === 'Escape') setEditingName(false);
                      }}
                    />
                    <Button size="sm" onClick={handleUpdateName}>Save</Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingName(false)}>
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div>
                    <CardTitle 
                      className="text-white cursor-pointer hover:text-purple-300"
                      onClick={() => {
                        setEditName(currentSession.name);
                        setEditingName(true);
                      }}
                    >
                      {currentSession.name}
                    </CardTitle>
                    <CardDescription className="text-purple-300">
                      Click to edit • Created {formatDate(currentSession.createdAt)}
                    </CardDescription>
                  </div>
                )}
              </div>
              
              <div className="text-sm text-purple-300">
                {Object.keys(currentSession.artists).length} artists • {currentSession.playlistOrder.length} tracks
              </div>
            </div>
          </CardHeader>
        </Card>
      ) : (
        <Card className="border-purple-500/30 bg-purple-900/20 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <Music className="h-12 w-12 text-purple-400 mx-auto" />
              <div>
                <h3 className="text-lg font-semibold text-white">No Active Session</h3>
                <p className="text-purple-300">Create a new playlist to get started</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Session Actions */}
      <div className="flex justify-center">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white">
              <Plus className="mr-2 h-4 w-4" />
              New Playlist
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-purple-900/95 border-purple-500/50 text-white">
            <DialogHeader>
              <DialogTitle>Create New Playlist</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-purple-300 mb-2 block">
                  Playlist Name
                </label>
                <Input
                  value={newSessionName}
                  onChange={(e) => setNewSessionName(e.target.value)}
                  placeholder="e.g., My Beyond Wonderland 2025 Mix"
                  className="bg-purple-800/50 border-purple-500/50 text-white placeholder:text-purple-400"
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateSession()}
                />
              </div>
              <div className="flex space-x-2">
                <Button onClick={handleCreateSession} className="flex-1">
                  Create Playlist
                </Button>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* All Sessions */}
      {allSessions.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">All Playlists</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {allSessions.map((session) => (
              <Card
                key={session.id}
                className={`border-purple-500/30 backdrop-blur-sm cursor-pointer transition-all duration-200 hover:scale-105 ${
                  currentSession?.id === session.id
                    ? 'bg-purple-500/30 border-purple-400'
                    : 'bg-purple-900/20 hover:bg-purple-800/30'
                }`}
                onClick={() => handleLoadSession(session.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-white text-sm font-medium line-clamp-2">
                        {session.name}
                      </CardTitle>
                      <CardDescription className="text-purple-300 text-xs">
                        <Calendar className="h-3 w-3 inline mr-1" />
                        {formatDate(session.createdAt)}
                      </CardDescription>
                    </div>
                    
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/20 h-8 w-8 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSession(session.id, session.name);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex justify-between text-xs text-purple-300">
                    <span>{Object.keys(session.artists).length} artists</span>
                    <span>{session.playlistOrder.length} tracks</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}