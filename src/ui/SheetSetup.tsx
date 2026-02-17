import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { initializeSummaryTab } from '../services/sheets';
import { loadPickerApi, openSpreadsheetPicker, createNewSpreadsheet } from '../services/picker';
import { extractSpreadsheetId } from '../services/auth';

export function SheetSetup() {
  const { user, accessToken, setSheetUrl } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isPickerReady, setIsPickerReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  // Load Google Picker API on mount
  useEffect(() => {
    loadPickerApi()
      .then(() => setIsPickerReady(true))
      .catch((err) => {
        console.error('Failed to load Picker API:', err);
        setError('Failed to load Google Picker. Please refresh the page.');
      });
  }, []);

  const handlePickSheet = async () => {
    if (!accessToken) {
      setError('Not authenticated. Please sign in again.');
      return;
    }

    setError(null);
    setStatus(null);

    try {
      openSpreadsheetPicker(
        accessToken,
        async (spreadsheetId, spreadsheetUrl, name) => {
          setIsLoading(true);
          setStatus(`Connecting to "${name}"...`);

          try {
            // Initialize Summary tab if needed
            await initializeSummaryTab(spreadsheetId);
            setSheetUrl(spreadsheetUrl);
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to initialize sheet');
            setIsLoading(false);
            setStatus(null);
          }
        },
        () => {
          // User cancelled - do nothing
          setStatus(null);
        }
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open picker');
    }
  };

  const handleCreateNew = async () => {
    if (!accessToken) {
      setError('Not authenticated. Please sign in again.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setStatus('Creating new spreadsheet...');

    try {
      const { id, url } = await createNewSpreadsheet(accessToken);
      setStatus('Initializing spreadsheet...');

      // Initialize Summary tab
      await initializeSummaryTab(id);

      setSheetUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create spreadsheet');
      setIsLoading(false);
      setStatus(null);
    }
  };

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center">
      <div className="bg-gray-800 rounded-2xl border border-gray-700 p-8 max-w-lg w-full shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">Connect Your Sheet</h1>
          {user && (
            <div className="flex items-center gap-2">
              <img
                src={user.picture}
                alt={user.name}
                className="w-8 h-8 rounded-full ring-2 ring-gray-700"
              />
            </div>
          )}
        </div>

        <p className="text-gray-400 mb-6">
          Connect a Google Sheet to store your trades. Your data stays in your own Google Drive.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}

        {status && (
          <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm flex items-center gap-2">
            <span className="animate-spin">⏳</span>
            {status}
          </div>
        )}

        {/* Create New Option */}
        <div className="mb-4">
          <button
            onClick={handleCreateNew}
            disabled={isLoading}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl px-6 py-4 font-semibold transition-all transform hover:scale-[1.02] shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {isLoading ? 'Creating...' : 'Create New TradeBuddy Sheet'}
          </button>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Creates a new sheet in your Google Drive with the required structure
          </p>
        </div>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-700"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-3 bg-gray-800 text-gray-500">or</span>
          </div>
        </div>

        {/* Pick Existing Sheet */}
        <div className="mb-4">
          <button
            onClick={handlePickSheet}
            disabled={isLoading || !isPickerReady}
            className="w-full bg-gray-700 hover:bg-gray-600 text-white rounded-xl px-6 py-4 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            {!isPickerReady ? 'Loading...' : 'Choose from Google Drive'}
          </button>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Select an existing spreadsheet from your Google Drive
          </p>
        </div>

        {/* Help Section */}
        <div className="mt-8 p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
          <h3 className="font-semibold text-emerald-400 mb-2 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Privacy First
          </h3>
          <ul className="text-sm text-gray-400 space-y-1">
            <li>• We can only access sheets you explicitly select</li>
            <li>• Your other Google Drive files remain private</li>
            <li>• Revoke access anytime in Google Account settings</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
