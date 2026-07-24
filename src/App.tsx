import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import HomePage from './pages/home';
import CallbackPage from './pages/CallbackPage';
import BulkImportPage from './pages/BulkImportPage';
import { Toaster } from 'sonner';
import { TooltipProvider } from './components/ui/tooltip';

function BulkImportShortcut() {
  const { pathname } = useLocation();
  if (pathname === '/bulk') return null;

  return (
    <Link
      to="/bulk"
      className="fixed bottom-5 left-5 z-[70] rounded-full border border-white/20 bg-black/70 px-4 py-2 text-sm font-semibold text-white shadow-lg backdrop-blur-md transition hover:bg-black/90"
    >
      Bulk JSON Import
    </Link>
  );
}

function App() {
  return (
    <Router>
      <TooltipProvider>
        <BulkImportShortcut />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/callback" element={<CallbackPage />} />
          <Route path="/bulk" element={<BulkImportPage />} />
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
