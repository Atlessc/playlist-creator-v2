import { SessionManager } from '@/components/playlist/session-manager';
import { ArtistAccordion } from '@/components/artists/artist-accordion';
import { ArtistTracks } from '@/components/tracks/artist-tracks';
import { PlaylistManager } from '@/components/playlist/playlist-manager';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Music, Users, List, Settings } from 'lucide-react';
// import './App.css';

export function MainApp() {
  return (
    <div className="min-h-screen pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Session Management */}
          <SessionManager />
          
          {/* Main Content Tabs */}
          <Tabs defaultValue="artists" className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-purple-900/50 border-purple-500/30">
              <TabsTrigger 
                value="artists" 
                className="flex items-center space-x-2 data-[state=active]:bg-purple-600 data-[state=active]:text-white"
              >
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Artists</span>
              </TabsTrigger>
              <TabsTrigger 
                value="tracks"
                className="flex items-center space-x-2 data-[state=active]:bg-purple-600 data-[state=active]:text-white"
              >
                <Music className="h-4 w-4" />
                <span className="hidden sm:inline">Tracks</span>
              </TabsTrigger>
              <TabsTrigger 
                value="playlist"
                className="flex items-center space-x-2 data-[state=active]:bg-purple-600 data-[state=active]:text-white"
              >
                <List className="h-4 w-4" />
                <span className="hidden sm:inline">Playlist</span>
              </TabsTrigger>
              <TabsTrigger 
                value="sessions"
                className="flex items-center space-x-2 data-[state=active]:bg-purple-600 data-[state=active]:text-white"
              >
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Sessions</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="artists" className="mt-6">
              <ArtistAccordion />
            </TabsContent>
            
            <TabsContent value="tracks" className="mt-6">
              <ArtistTracks />
            </TabsContent>
            
            <TabsContent value="playlist" className="mt-6">
              <PlaylistManager />
            </TabsContent>
            
            <TabsContent value="sessions" className="mt-6">
              <SessionManager />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}


