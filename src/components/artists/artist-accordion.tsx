import { useState } from 'react';
import { usePlaylistStore } from '@/store/playlist-store';
import { SpotifyService } from '@/services/spotify-service';
import { BEYOND_WONDERLAND_ARTISTS } from '../../data/festival-artists';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Music, Users, CheckCircle, X, Loader2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import type { SpotifyArtist } from '@/store/playlist-store';

export function ArtistAccordion() {
  const { 
    currentSession,
    setArtistLoading,
    setSpotifyArtist,
    confirmArtist,
    clearArtist
  } = usePlaylistStore();
  
  const [searchResults, setSearchResults] = useState<Record<string, SpotifyArtist[]>>({});

  if (!currentSession) {
    return (
      <Card className="border-purple-500/30 bg-purple-900/20 backdrop-blur-sm">
        <CardContent className="pt-6 text-center">
          <Music className="h-12 w-12 text-purple-400 mx-auto mb-4" />
          <p className="text-purple-300">Create a playlist session to start adding artists</p>
        </CardContent>
      </Card>
    );
  }

  const handleSearchArtist = async (artistName: string) => {
    setArtistLoading(artistName, true);
    
    try {
      const results = await SpotifyService.searchArtists(artistName, 5);
      setSearchResults(prev => ({ ...prev, [artistName]: results }));
      
      if (results.length === 1) {
        // Auto-select if only one result
        setSpotifyArtist(artistName, results[0]);
        toast.success(`Found ${results[0].name} on Spotify!`);
      } else if (results.length === 0) {
        toast.error(`No artists found for "${artistName}"`);
      } else {
        toast.success(`Found ${results.length} possible matches for "${artistName}"`);
      }
    } catch (error) {
      console.error('Error searching artist:', error);
      toast.error(`Failed to search for "${artistName}"`);
    } finally {
      setArtistLoading(artistName, false);
    }
  };

  const handleSelectArtist = (artistName: string, spotifyArtist: SpotifyArtist) => {
    setSpotifyArtist(artistName, spotifyArtist);
    toast.success(`Selected ${spotifyArtist.name}!`);
  };

  const handleConfirmArtist = (artistName: string) => {
    confirmArtist(artistName);
    toast.success(`${artistName} confirmed! You can now fetch their tracks.`);
  };

  const handleClearArtist = (artistName: string) => {
    clearArtist(artistName);
    setSearchResults(prev => {
      const { [artistName]: removed, ...rest } = prev;
      return rest;
    });
    toast.success(`Cleared ${artistName} selection`);
  };

  const getArtistStatus = (artistName: string) => {
    const artistSession = currentSession.artists[artistName];
    if (!artistSession) return 'not-searched';
    if (artistSession.isLoading) return 'loading';
    if (artistSession.isConfirmed) return 'confirmed';
    if (artistSession.spotifyArtist) return 'selected';
    return 'not-searched';
  };

  const renderArtistContent = (artistName: string) => {
    const artistSession = currentSession.artists[artistName];
    const status = getArtistStatus(artistName);
    const results = searchResults[artistName] || [];

    if (status === 'loading') {
      return (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-purple-400 mr-2" />
          <span className="text-purple-300">Searching Spotify...</span>
        </div>
      );
    }

    if (status === 'confirmed') {
      const artist = artistSession!.spotifyArtist!;
      return (
        <div className="space-y-4">
          <div className="flex items-start space-x-4 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
            <Avatar className="h-16 w-16">
              <AvatarImage src={artist.images[0]?.url} />
              <AvatarFallback className="bg-green-500/20 text-green-300">
                {artist.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <h4 className="font-semibold text-white">{artist.name}</h4>
                <CheckCircle className="h-5 w-5 text-green-400" />
                <Badge variant="outline" className="border-green-500/50 text-green-300">
                  Confirmed
                </Badge>
              </div>
              
              <div className="space-y-2 text-sm text-purple-300">
                <div className="flex items-center space-x-4">
                  <span className="flex items-center">
                    <Users className="h-4 w-4 mr-1" />
                    {artist.followers.total.toLocaleString()} followers
                  </span>
                  <a
                    href={artist.external_urls.spotify}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-green-400 hover:text-green-300"
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    View on Spotify
                  </a>
                </div>
                
                {artist.genres.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {artist.genres.slice(0, 3).map(genre => (
                      <Badge key={genre} variant="secondary" className="text-xs bg-purple-500/20 text-purple-300">
                        {genre}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleClearArtist(artistName)}
              className="text-red-400 border-red-500/50 hover:bg-red-500/20"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      );
    }

    if (status === 'selected' && artistSession?.spotifyArtist) {
      const artist = artistSession.spotifyArtist;
      return (
        <div className="space-y-4">
          <div className="flex items-start space-x-4 p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
            <Avatar className="h-16 w-16">
              <AvatarImage src={artist.images[0]?.url} />
              <AvatarFallback className="bg-purple-500/20 text-purple-300">
                {artist.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <h4 className="font-semibold text-white mb-2">{artist.name}</h4>
              <div className="space-y-2 text-sm text-purple-300">
                <div className="flex items-center space-x-4">
                  <span className="flex items-center">
                    <Users className="h-4 w-4 mr-1" />
                    {artist.followers.total.toLocaleString()} followers
                  </span>
                  <a
                    href={artist.external_urls.spotify}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-purple-400 hover:text-purple-300"
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    View on Spotify
                  </a>
                </div>
                
                {artist.genres.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {artist.genres.slice(0, 3).map(genre => (
                      <Badge key={genre} variant="secondary" className="text-xs bg-purple-500/20 text-purple-300">
                        {genre}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex space-x-2">
            <Button
              onClick={() => handleConfirmArtist(artistName)}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Confirm Artist
            </Button>
            <Button
              variant="outline"
              onClick={() => handleClearArtist(artistName)}
              className="text-red-400 border-red-500/50 hover:bg-red-500/20"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      );
    }

    if (results.length > 1) {
      return (
        <div className="space-y-4">
          <p className="text-purple-300 text-sm">
            Multiple artists found. Please select the correct one:
          </p>
          
          <div className="space-y-2">
            {results.map((artist) => (
              <div
                key={artist.id}
                className="flex items-center space-x-3 p-3 bg-purple-800/30 hover:bg-purple-700/40 rounded-lg cursor-pointer transition-colors"
                onClick={() => handleSelectArtist(artistName, artist)}
              >
                <Avatar className="h-12 w-12">
                  <AvatarImage src={artist.images[0]?.url} />
                  <AvatarFallback className="bg-purple-500/20 text-purple-300">
                    {artist.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1">
                  <h5 className="font-medium text-white">{artist.name}</h5>
                  <div className="flex items-center space-x-3 text-sm text-purple-300">
                    <span className="flex items-center">
                      <Users className="h-3 w-3 mr-1" />
                      {artist.followers.total.toLocaleString()}
                    </span>
                    {artist.genres.length > 0 && (
                      <span className="flex items-center">
                        <Music className="h-3 w-3 mr-1" />
                        {artist.genres[0]}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <Button
            variant="outline"
            onClick={() => handleClearArtist(artistName)}
            className="w-full text-red-400 border-red-500/50 hover:bg-red-500/20"
          >
            Cancel Search
          </Button>
        </div>
      );
    }

    return (
      <div className="text-center py-8">
        <Button
          onClick={() => handleSearchArtist(artistName)}
          className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
        >
          <Search className="mr-2 h-4 w-4" />
          Search on Spotify
        </Button>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent">
          Festival Artists
        </h2>
        <p className="text-purple-300">
          Click on an artist to search for them on Spotify and add their tracks to your playlist
        </p>
      </div>

      <Accordion type="single" collapsible className="space-y-2">
        {BEYOND_WONDERLAND_ARTISTS.map((artist) => {
          const status = getArtistStatus(artist);
          const StatusIcon = status === 'confirmed' ? CheckCircle : 
                           status === 'selected' ? Music : 
                           status === 'loading' ? Loader2 : Search;
          
          return (
            <AccordionItem
              key={artist}
              value={artist}
              className="border border-purple-500/30 rounded-lg bg-purple-900/20 backdrop-blur-sm data-[state=open]:bg-purple-800/30"
            >
              <AccordionTrigger className="px-4 hover:no-underline">
                <div className="flex items-center space-x-3">
                  <StatusIcon className={`h-5 w-5 ${
                    status === 'confirmed' ? 'text-green-400' :
                    status === 'selected' ? 'text-purple-400' :
                    status === 'loading' ? 'text-yellow-400 animate-spin' :
                    'text-gray-400'
                  }`} />
                  <span className="text-white font-medium">{artist}</span>
                  {status === 'confirmed' && (
                    <Badge variant="outline" className="border-green-500/50 text-green-300">
                      Ready
                    </Badge>
                  )}
                  {status === 'selected' && (
                    <Badge variant="outline" className="border-purple-500/50 text-purple-300">
                      Selected
                    </Badge>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                {renderArtistContent(artist)}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}