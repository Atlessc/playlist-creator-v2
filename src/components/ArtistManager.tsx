import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import { 
  // Plus, 
  UserPlus, 
  // Trash2,
  Users
} from 'lucide-react';
import { useStore } from '../lib/store';
import { toast } from 'sonner';

export function ArtistManager() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newArtistName, setNewArtistName] = useState('');

  const projects = useStore(s => s.projects);
  const currentProjectIndex = useStore(s => s.currentProjectIndex);
  const addArtistToProject = useStore(s => s.addArtistToProject);
  const currentProject = projects[currentProjectIndex];

  const handleAddArtist = () => {
    if (!newArtistName.trim()) {
      toast.error('Please enter an artist name');
      return;
    }

    const success = addArtistToProject(newArtistName.trim());
    if (success) {
      toast.success(`Added ${newArtistName.trim()} to the project`);
      setIsAddDialogOpen(false);
      setNewArtistName('');
    } else {
      toast.error('Artist already exists in this project');
    }
  };



  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Users className="w-5 h-5 text-neon-teal" />
          <h3 className="text-lg font-semibold text-white">
            Artists ({currentProject.artists.length})
          </h3>
        </div>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              size="sm" 
              className="bg-gradient-to-r from-neon-teal to-neon-purple hover:from-neon-teal/80 hover:to-neon-purple/80"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Add Artist
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-black/90 backdrop-blur-md border-white/20 text-white">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold bg-gradient-to-r from-neon-purple to-neon-pink bg-clip-text text-transparent">
                Add New Artist
              </DialogTitle>
              <DialogDescription className="text-gray-300">
                Add an artist to your custom playlist project
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Input
                  value={newArtistName}
                  onChange={(e) => setNewArtistName(e.target.value)}
                  placeholder="Enter artist name..."
                  className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-neon-purple"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleAddArtist();
                    }
                  }}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsAddDialogOpen(false)}
                className="border-white/20 text-white hover:bg-white/10"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddArtist}
                className="bg-gradient-to-r from-neon-purple to-neon-pink hover:from-neon-purple/80 hover:to-neon-pink/80"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Add Artist
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}