import { useState } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { 
  Plus, 
  FolderOpen, 
  Music, 
  Users,
  // Trash2,
  // Edit3
} from 'lucide-react';
import { useStore } from '../lib/store';
import { toast } from 'sonner';
import type { PlaylistProject } from '../types';

export function ProjectManager() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');

  const projects = useStore(s => s.projects);
  const currentProjectIndex = useStore(s => s.currentProjectIndex);
  const addProject = useStore(s => s.addProject);
  const setCurrentProject = useStore(s => s.setCurrentProject);

  const handleCreateProject = () => {
    if (!newProjectTitle.trim()) {
      toast.error('Please enter a project title');
      return;
    }

    const newProject: PlaylistProject = {
      title: newProjectTitle.trim(),
      description: newProjectDescription.trim() || undefined,
      playlistId: undefined,
      artists: [], // Start with empty artist list for custom projects
      combinedSongs: []
    };

    addProject(newProject);
    setCurrentProject(projects.length); // Switch to the new project
    setIsCreateDialogOpen(false);
    setNewProjectTitle('');
    setNewProjectDescription('');
    
    toast.success(`✨ Created new project: ${newProject.title}`);
  };

  const handleSwitchProject = (index: number) => {
    setCurrentProject(index);
    toast.info(`Switched to: ${projects[index].title}`);
  };

  return (
    <div className="flex items-center space-x-3">
      {/* Current Project Info */}
      <div className="text-right text-sm">
        <p className="text-white font-medium">{projects[currentProjectIndex]?.title}</p>
        <p className="text-gray-400">
          {projects[currentProjectIndex]?.combinedSongs.length || 0} tracks • {projects[currentProjectIndex]?.artists.filter(a => a.confirmed).length || 0} artists
        </p>
      </div>

      {/* Project Selector */}
      {projects.length > 1 && (
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10">
              <FolderOpen className="w-4 h-4 mr-2" />
              Switch Project
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-black/90 backdrop-blur-md border-white/20 text-white">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold bg-gradient-to-r from-neon-purple to-neon-pink bg-clip-text text-transparent">
                Your Projects
              </DialogTitle>
              <DialogDescription className="text-gray-300">
                Switch between your playlist projects
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {projects.map((project, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    index === currentProjectIndex
                      ? 'border-neon-purple bg-neon-purple/10'
                      : 'border-white/10 bg-white/5 hover:bg-white/10'
                  }`}
                  onClick={() => handleSwitchProject(index)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-white">{project.title}</h4>
                      {project.description && (
                        <p className="text-sm text-gray-400 mt-1">{project.description}</p>
                      )}
                      <div className="flex items-center space-x-3 mt-2 text-xs text-gray-400">
                        <span className="flex items-center">
                          <Music className="w-3 h-3 mr-1" />
                          {project.combinedSongs.length} tracks
                        </span>
                        <span className="flex items-center">
                          <Users className="w-3 h-3 mr-1" />
                          {project.artists.filter(a => a.confirmed).length} artists
                        </span>
                      </div>
                    </div>
                    
                    {index === currentProjectIndex && (
                      <Badge variant="secondary" className="bg-neon-purple/20 text-neon-purple border-neon-purple/30">
                        Current
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Create New Project */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogTrigger asChild>
          <Button 
            size="sm" 
            className="bg-gradient-to-r from-neon-teal to-neon-purple hover:from-neon-teal/80 hover:to-neon-purple/80"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </Button>
        </DialogTrigger>
        <DialogContent className="bg-black/90 backdrop-blur-md border-white/20 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold bg-gradient-to-r from-neon-purple to-neon-pink bg-clip-text text-transparent">
              Create New Project
            </DialogTitle>
            <DialogDescription className="text-gray-300">
              Start a new playlist project for your festival or event
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="title" className="text-white">Project Title</Label>
              <Input
                id="title"
                value={newProjectTitle}
                onChange={(e) => setNewProjectTitle(e.target.value)}
                placeholder="e.g., My Festival Playlist"
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-neon-purple"
              />
            </div>
            
            <div>
              <Label htmlFor="description" className="text-white">Description (Optional)</Label>
              <Input
                id="description"
                value={newProjectDescription}
                onChange={(e) => setNewProjectDescription(e.target.value)}
                placeholder="e.g., Custom playlist for my favorite artists"
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-neon-purple"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
              className="border-white/20 text-white hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateProject}
              className="bg-gradient-to-r from-neon-purple to-neon-pink hover:from-neon-purple/80 hover:to-neon-pink/80"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}