import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { SpotifyCallback } from '@/components/auth/spotify-callback';
import { AuthGuard } from '@/components/auth/auth-guard';
// import './App.css';
import { MainApp } from '@/pages/home';



function App() {
  return (
    <Router>
      <div className="min-h-screen">
        <Routes>
          <Route path="/callback" element={

            <SpotifyCallback />
            } />
          <Route 
            path="/" 
            element={
              <AuthGuard>
                <MainApp />
              </AuthGuard>
            } 
          />
        </Routes>
        
        <Toaster 
          position="top-right"
          toastOptions={{
            style: {
              background: 'rgba(88, 28, 135, 0.95)',
              color: 'white',
              border: '1px solid rgba(139, 92, 246, 0.3)',
            },
          }}
        />
      </div>
    </Router>
  );
}

export default App;
