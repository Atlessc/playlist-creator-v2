import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/home';
import CallbackPage from './pages/CallbackPage';
import { Toaster } from 'sonner';

function App() {
  return (
    <Router>
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
    </Router>
  );
}

export default App;