import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { PastePanel } from './ui/PastePanel';

function Navigation() {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="bg-blue-600 text-white shadow-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <h1 className="text-2xl font-bold">TradeBuddy</h1>
            <div className="flex space-x-4">
              <Link
                to="/"
                className={`px-4 py-2 rounded transition-colors ${
                  isActive('/') ? 'bg-blue-700 font-semibold' : 'hover:bg-blue-500'
                }`}
              >
                My Trades
              </Link>
              <Link
                to="/paste"
                className={`px-4 py-2 rounded transition-colors ${
                  isActive('/paste') ? 'bg-blue-700 font-semibold' : 'hover:bg-blue-500'
                }`}
              >
                Paste Trade
              </Link>
            </div>
          </div>
          <div className="text-sm opacity-75">Local-Only MVP</div>
        </div>
      </div>
    </nav>
  );
}

function HomePage() {
  return (
    <div className="text-center py-16">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">My Trades</h2>
      <p className="text-gray-600 mb-8">No trades yet. Paste a broker confirmation to get started.</p>
      <Link
        to="/paste"
        className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
      >
        Paste Trade Confirmation
      </Link>
    </div>
  );
}

function AppContent() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/paste" element={<PastePanel />} />
        </Routes>
      </main>
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
