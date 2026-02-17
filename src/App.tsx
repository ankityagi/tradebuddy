import React from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Dashboard } from './ui/Dashboard';
import { TradesTable } from './ui/TradesTable';
import { TradeForm } from './ui/TradeForm';
import { PastePanel } from './ui/PastePanel';
import { SheetSetup } from './ui/SheetSetup';
import { Privacy } from './ui/Privacy';
import { Terms } from './ui/Terms';
import { LandingPage } from './ui/LandingPage';

function Navigation() {
  const location = useLocation();
  const { user, signOut, sheetUrl, disconnectSheet } = useAuth();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <nav className="bg-gray-900 border-b border-gray-800 text-white">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <Link to="/" className="flex items-center gap-3">
              <img src="/logo.svg" alt="TradeBuddy" className="w-8 h-8" />
              <span className="text-xl font-bold">TradeBuddy</span>
            </Link>
            {user && sheetUrl && (
              <div className="flex space-x-1">
                <Link
                  to="/"
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    isActive('/') ? 'bg-emerald-500/20 text-emerald-400 font-semibold' : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  Dashboard
                </Link>
                <Link
                  to="/trades"
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    isActive('/trades') ? 'bg-emerald-500/20 text-emerald-400 font-semibold' : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  My Trades
                </Link>
                <Link
                  to="/new"
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    isActive('/new') ? 'bg-emerald-500/20 text-emerald-400 font-semibold' : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  New Trade
                </Link>
                <Link
                  to="/paste"
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    isActive('/paste') ? 'bg-emerald-500/20 text-emerald-400 font-semibold' : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  Paste Trade
                </Link>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <div className="flex items-center gap-2">
                  <img
                    src={user.picture}
                    alt={user.name}
                    className="w-8 h-8 rounded-full ring-2 ring-gray-700"
                  />
                  <span className="text-sm text-gray-400 hidden sm:inline">{user.email}</span>
                </div>
                {sheetUrl && (
                  <button
                    onClick={disconnectSheet}
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                    title="Disconnect sheet"
                  >
                    Change Sheet
                  </button>
                )}
                <button
                  onClick={signOut}
                  className="text-sm bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg transition-colors"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <span className="text-sm text-gray-500">Google Sheets Powered</span>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

function AppContent() {
  const { isSignedIn, sheetUrl, isLoading } = useAuth();

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⏳</div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Not signed in - show landing page
  if (!isSignedIn) {
    return <LandingPage />;
  }

  // Signed in but no sheet connected - show setup page
  if (!sheetUrl) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Navigation />
        <main className="container mx-auto px-6 py-8">
          <SheetSetup />
        </main>
      </div>
    );
  }

  // Fully authenticated with sheet - show main app
  return (
    <div className="min-h-screen bg-gray-900">
      <Navigation />
      <main className="container mx-auto px-6 py-8">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/trades" element={<TradesTable />} />
          <Route path="/new" element={<TradeForm />} />
          <Route path="/edit/:id" element={<TradeForm />} />
          <Route path="/paste" element={<PastePanel />} />
        </Routes>
      </main>
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public pages - no auth required */}
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        {/* Main app - wrapped in AuthProvider */}
        <Route
          path="*"
          element={
            <AuthProvider>
              <AppContent />
            </AuthProvider>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
