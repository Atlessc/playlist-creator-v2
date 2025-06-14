import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { usePlaylistStore } from '@/store/playlist-store';
import { SpotifyService } from '@/services/spotify-service';
import { toast } from 'sonner';
import { Loader2, Music } from 'lucide-react';

export function SpotifyCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setTokens } = usePlaylistStore();

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const error = searchParams.get('error');
      if (error) {
        toast.error('Authentication failed. Please try again.');
        return navigate('/');
      }
      if (!code) {
        toast.error('No authorization code received from Spotify.');
        return navigate('/');
      }
      try {
        const tokenData = await SpotifyService.exchangeCodeForToken(code);
        setTokens(tokenData.access_token, tokenData.refresh_token);
        SpotifyService.setAccessToken(tokenData.access_token);
        toast.success('Successfully connected to Spotify!');
        navigate('/');
      } catch (err) {
        toast.error('Failed to connect to Spotify. Please try again.');
        navigate('/');
      }
    };
    handleCallback();
  }, [searchParams, navigate, setTokens]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-800 to-teal-900 flex items-center justify-center">
      {/* background SVG via style prop to avoid escaping hell */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><path d='M20 20Q50 10 80 20T80 50Q50 60 20 50T20 20' fill='none' stroke='rgba(139,92,246,0.1)' stroke-width='2'/></svg>")`,
          backgroundRepeat: 'no-repeat',
          backgroundSize: 'cover',
        }}
      ></div>

      <div className="relative z-10 text-center space-y-6">
        <div className="flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full blur-lg opacity-75 animate-pulse"></div>
            <div className="relative bg-gradient-to-r from-purple-500 to-pink-500 p-4 rounded-full">
              <Music className="h-12 w-12 text-white" />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h1 className="text-3xl font-bold text-white">
            Connecting to Spotify
          </h1>
          <div className="flex items-center justify-center space-x-2 text-purple-300">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Please wait while we authenticate your account...</span>
          </div>
        </div>
      </div>
    </div>
  );
}
