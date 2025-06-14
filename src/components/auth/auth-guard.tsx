import { useEffect } from 'react';
import { 
  useNavigate, 
  // useLocation 
} from 'react-router-dom';
import { usePlaylistStore } from '../../store/playlist-store';
import { SpotifyService } from '../../services/spotify-service';
import { Button } from '@/components/ui/button';
import { Music, Sparkles } from 'lucide-react';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { 
    accessToken, 
    // setTokens, 
    clearTokens 
  } = usePlaylistStore();
  const navigate = useNavigate();
  // const location = useLocation();

  useEffect(() => {
    if (accessToken) {
      SpotifyService.setAccessToken(accessToken);
    }
  }, [accessToken]);

  const handleLogin = () => {
    window.location.href = SpotifyService.getAuthUrl();
  };

  const handleLogout = () => {
    clearTokens();
    navigate('/');
  };

  if (!accessToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-800 to-teal-900 flex items-center justify-center p-4">
      <div
  className="absolute inset-0 opacity-20"
>
      <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><path d='M20 20Q50 10 80 20T80 50Q50 60 20 50T20 20' fill='none' stroke='rgba(139,92,246,0.1)' stroke-width='2'/></svg></div>
        
        <div className="relative z-10 max-w-md w-full text-center space-y-8">
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full blur-lg opacity-75 animate-pulse"></div>
                <div className="relative bg-gradient-to-r from-purple-500 to-pink-500 p-4 rounded-full">
                  <Music className="h-12 w-12 text-white" />
                </div>
              </div>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-300 via-pink-300 to-teal-300 bg-clip-text text-transparent">
              Beyond Wonderland
            </h1>
            
            <h2 className="text-xl md:text-2xl font-semibold text-purple-200">
              Playlist Generator
            </h2>
            
            <p className="text-purple-300 leading-relaxed">
              Create magical playlists from your favorite festival artists. 
              Connect with Spotify to get started on your musical journey through Wonderland.
            </p>
          </div>

          <div className="space-y-4">
            <Button
              onClick={handleLogin}
              size="lg"
              className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-medium py-3 text-lg transition-all duration-200 transform hover:scale-105"
            >
              <Sparkles className="mr-2 h-5 w-5" />
              Connect with Spotify
            </Button>
            
            <p className="text-sm text-purple-400">
              We'll redirect you to Spotify to authorize access to your account
            </p>
          </div>
          
          <div className="pt-8 border-t border-purple-700/50">
            <p className="text-xs text-purple-400">
              Beyond Wonderland at the Gorge 2025 • Playlist Generator
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-800 to-teal-900">
      <div
  className="absolute inset-0 opacity-20"
  style={{
    backgroundImage: `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><path d='M20 20Q50 10 80 20T80 50Q50 60 20 50T20 20' fill='none' stroke='rgba(139,92,246,0.1)' stroke-width='2'/></svg>")`,
    backgroundRepeat: 'no-repeat',
    backgroundSize: 'cover',
  }}
/>

      
      <div className="relative z-10">
        <nav className="border-b border-purple-700/50 bg-black/20 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-3">
                <Music className="h-8 w-8 text-purple-400" />
                <span className="text-xl font-bold bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent">
                  Beyond Wonderland
                </span>
              </div>
              
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="border-purple-500/50 text-purple-300 hover:bg-purple-500/20"
              >
                Logout
              </Button>
            </div>
          </div>
        </nav>
        
        {children}
      </div>
    </div>
  );
}