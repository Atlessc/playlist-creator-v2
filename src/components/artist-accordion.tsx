import { useState } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { AlbumBrowser } from './AlbumBrowser';
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from './ui/accordion';
import { 
  Music, 
  Check, 
  X, 
  Loader2, 
  Search,
  Star,
  Plus,
  Volume2
} from 'lucide-react';
import { searchArtistByName } from '../services/spotifyService';
import { useStore } from '../lib/store';
import { toast } from 'sonner';
import type { ArtistInfo } from '../types';
import Spotified from 'spotified';
import { ArtistManager } from './ArtistManager';

interface ArtistAccordionProps {
  artists: ArtistInfo[];
  spotified: Spotified | null;
  onFetchSongs: (artist: ArtistInfo) => void;
  loadingArtist: string | null;
}

export function ArtistAccordion({ 
  artists, 
  spotified, 
  onFetchSongs, 
  loadingArtist 
}: ArtistAccordionProps) {
  const [searchResults, setSearchResults] = useState<{[key: string]: any[]}>({});
  const [searchLoading, setSearchLoading] = useState<string | null>(null);
  
  const confirmArtist = useStore(s => s.confirmArtist);
  const undoArtist = useStore(s => s.undoArtist);

  const handleSearchArtist = async (artistName: string) => {
    if (!spotified) return;
    
    setSearchLoading(artistName);
    try {
      const results = await searchArtistByName(spotified, artistName);
      setSearchResults(prev => ({ ...prev, [artistName]: results }));
      
      if (results.length === 1) {
        // Auto-confirm if only one result
        confirmArtist(artistName, results[0]);
        toast.success(`✨ Found ${results[0].name}!`);
      } else if (results.length === 0) {
        toast.error(`❌ No artists found for "${artistName}"`);
      } else {
        toast.info(`🔍 Found ${results.length} artists for "${artistName}"`);
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error(`Failed to search for ${artistName}`);
    } finally {
      setSearchLoading(null);
    }
  };

  const handleConfirmArtist = (artistName: string, spotifyArtist: any) => {
    confirmArtist(artistName, spotifyArtist);
    setSearchResults(prev => ({ ...prev, [artistName]: [] }));
    toast.success(`✅ Confirmed ${spotifyArtist.name}!`);
  };

  const handleUndoArtist = (artistName: string) => {
    undoArtist(artistName);
    toast.info(`↩️ Reset ${artistName}`);
  };

  const formatFollowers = (followers: number) => {
    if (followers >= 1000000) {
      return `${(followers / 1000000).toFixed(1)}M`;
    } else if (followers >= 1000) {
      return `${(followers / 1000).toFixed(0)}K`;
    }
    return followers.toString();
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-neon-purple to-neon-pink bg-clip-text text-transparent mb-2">
          Festival Artists
        </h2>
        <p className="text-gray-300">
          Search and confirm artists from the Beyond Wonderland 2025 lineup
        </p>
      </div>
      <ArtistManager />

      <Accordion type="multiple" className="space-y-4">
        {artists.map((artist) => (
          <AccordionItem 
            key={artist.name} 
            value={artist.name}
            className="border border-white/10 rounded-lg bg-black/20 backdrop-blur-sm"
          >
            <AccordionTrigger className="px-6 py-4 hover:no-underline group">
              <div className="flex items-center justify-between w-full mr-4">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${
                    artist.confirmed 
                      ? 'bg-green-400 shadow-lg shadow-green-400/50' 
                      : 'bg-gray-500'
                  }`} />
                  <span className="text-lg font-medium text-white group-hover:text-neon-purple transition-colors">
                    {artist.name}
                  </span>
                  {artist.confirmed && (
                    <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/30">
                      <Check className="w-3 h-3 mr-1" />
                      Confirmed
                    </Badge>
                  )}
                  {artist.songs.length > 0 && (
                    <Badge variant="outline" className="border-neon-teal/50 text-neon-teal">
                      <Music className="w-3 h-3 mr-1" />
                      {artist.songs.length} tracks
                    </Badge>
                  )}
                </div>
              </div>
            </AccordionTrigger>
            
            <AccordionContent className="px-6 pb-6">
              <div className="space-y-4">
                {!artist.confirmed ? (
                  <div className="space-y-4">
                    <Button
                      onClick={() => handleSearchArtist(artist.name)}
                      disabled={searchLoading === artist.name}
                      className="w-full bg-gradient-to-r from-neon-purple to-neon-pink hover:from-neon-purple/80 hover:to-neon-pink/80 text-white font-medium py-3"
                    >
                      {searchLoading === artist.name ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Searching...
                        </>
                      ) : (
                        <>
                          <Search className="w-4 h-4 mr-2" />
                          Search on Spotify
                        </>
                      )}
                    </Button>

                    {searchResults[artist.name]?.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-gray-300">
                          Choose the correct artist:
                        </h4>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {searchResults[artist.name].map((result) => (
                            <div
                              key={result.id}
                              className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                            >
                              <div className="flex items-center space-x-3">
                                {result.images?.[0] && (
                                  <img
                                    src={result.images[0].url}
                                    alt={result.name}
                                    className="w-12 h-12 rounded-full object-cover"
                                  />
                                )}
                                <div>
                                  <p className="font-medium text-white">{result.name}</p>
                                  <div className="flex items-center space-x-2 text-sm text-gray-400">
                                    <span className="flex items-center">
                                      <Star className="w-3 h-3 mr-1" />
                                      {result.popularity}% popular
                                    </span>
                                    {result.followers?.total && (
                                      <span className="flex items-center">
                                        <Volume2 className="w-3 h-3 mr-1" />
                                        {formatFollowers(result.followers.total)} followers
                                      </span>
                                    )}
                                  </div>
                                  {result.genres?.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {result.genres.slice(0, 3).map((genre: string) => (
                                        <Badge
                                          key={genre}
                                          variant="outline"
                                          className="text-xs border-gray-600 text-gray-400"
                                        >
                                          {genre}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <Button
                                size="sm"
                                onClick={() => handleConfirmArtist(artist.name, result)}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <Check className="w-4 h-4 mr-1" />
                                Select
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {artist.spotifyData && (
                      <div className="flex items-center justify-between p-4 rounded-lg bg-green-500/10 border border-green-500/30">
                        <div className="flex items-center space-x-3">
                          {artist.spotifyData.images?.[0] && (
                            <img
                              src={artist.spotifyData.images[0].url}
                              alt={artist.spotifyData.name}
                              className="w-16 h-16 rounded-full object-cover ring-2 ring-green-400/50"
                            />
                          )}
                          <div>
                            <p className="font-semibold text-white text-lg">
                              {artist.spotifyData.name}
                            </p>
                            <div className="flex items-center space-x-3 text-sm text-gray-300">
                              <span className="flex items-center">
                                <Star className="w-3 h-3 mr-1" />
                                {artist.spotifyData.popularity}% popular
                              </span>
                              {artist.spotifyData.followers?.total && (
                                <span className="flex items-center">
                                  <Volume2 className="w-3 h-3 mr-1" />
                                  {formatFollowers(artist.spotifyData.followers.total)} followers
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUndoArtist(artist.name)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        >
                          <X className="w-4 h-4 mr-1" />
                          Reset
                        </Button>
                      </div>
                    )}

                    <div className="flex space-x-3">
                      <Button
                        onClick={() => onFetchSongs(artist)}
                        disabled={loadingArtist === artist.name || !artist.spotifyId}
                        className="flex-1 bg-gradient-to-r from-neon-teal to-neon-purple hover:from-neon-teal/80 hover:to-neon-purple/80"
                      >
                        {loadingArtist === artist.name ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Fetching tracks...
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4 mr-2" />
                            {artist.songs.length > 0 ? 'Fetch more songs' : 'Fetch top tracks'}
                          </>
                        )}
                      </Button>
                      <AlbumBrowser artist={artist} spotified={spotified} />
                    </div>

                    {artist.songs.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-gray-300 flex items-center">
                          <Music className="w-4 h-4 mr-2" />
                          Fetched Tracks ({artist.songs.length})
                        </h4>
                        <div className="max-h-48 overflow-y-auto space-y-1">
                          {artist.songs.map((song) => (
                            <div
                              key={song.id}
                              className={`p-2 rounded text-sm truncate ${
                                song.duplicate 
                                  ? 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-300' 
                                  : 'bg-white/5 text-gray-300'
                              }`}
                            >
                              <div className="flex justify-between items-center">
                                <span className="font-medium">{song.title}</span>
                                {song.duplicate && (
                                  <Badge variant="outline" className="text-xs border-yellow-500/50 text-yellow-400">
                                    Duplicate
                                  </Badge>
                                )}
                              </div>
                              <div className="text-xs opacity-75">{song.album}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}