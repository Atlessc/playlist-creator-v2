import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/home';
import CallbackPage from './pages/CallbackPage';
import { Toaster } from 'sonner';
import { TooltipProvider } from './components/ui/tooltip';

function App() {
  return (
    <Router>
      <TooltipProvider>

        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/callback" element={<CallbackPage />} />
        </Routes>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'rgba(88, 28, 135, 0.95)',
              color: 'white',
              border: '1px solid rgba(139, 92, 246, 0.3)',
            },
          }}
        />
      </TooltipProvider>
    </Router>
  );
}

export default App;