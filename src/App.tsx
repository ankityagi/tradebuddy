import React from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TradesTable } from './ui/TradesTable';
import { TradeForm } from './ui/TradeForm';
import { PastePanel } from './ui/PastePanel';
import { SignIn } from './ui/SignIn';
import { SheetSetup } from './ui/SheetSetup';

function Navigation() {
  const location = useLocation();
  const { user, signOut, sheetUrl, disconnectSheet } = useAuth();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <nav className="bg-blue-600 text-white shadow-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <h1 className="text-2xl font-bold">TradeBuddy</h1>
            {user && sheetUrl && (
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
                  to="/new"
                  className={`px-4 py-2 rounded transition-colors ${
                    isActive('/new') ? 'bg-blue-700 font-semibold' : 'hover:bg-blue-500'
                  }`}
                >
                  New Trade
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
            )}
          </div>
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <div className="flex items-center gap-2">
                  <img
                    src={user.picture}
                    alt={user.name}
                    className="w-8 h-8 rounded-full"
                  />
                  <span className="text-sm hidden sm:inline">{user.email}</span>
                </div>
                {sheetUrl && (
                  <button
                    onClick={disconnectSheet}
                    className="text-sm opacity-75 hover:opacity-100"
                    title="Disconnect sheet"
                  >
                    Change Sheet
                  </button>
                )}
                <button
                  onClick={signOut}
                  className="text-sm bg-blue-700 px-3 py-1 rounded hover:bg-blue-800"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <span className="text-sm opacity-75">Google Sheets Powered</span>
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

  // Not signed in - show sign in page
  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          <SignIn />
        </main>
      </div>
    );
  }

  // Signed in but no sheet connected - show setup page
  if (!sheetUrl) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          <SheetSetup />
        </main>
      </div>
    );
  }

  // Fully authenticated with sheet - show main app
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<TradesTable />} />
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
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}
