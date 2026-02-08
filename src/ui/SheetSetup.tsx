import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { isValidSheetUrl, extractSpreadsheetId } from '../services/auth';
import { validateSheetAccess, initializeSummaryTab, getSheetTabs } from '../services/sheets';

export function SheetSetup() {
  const { user, setSheetUrl } = useAuth();
  const [url, setUrl] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    if (!url.trim()) {
      setError('Please enter a Google Sheets URL');
      return;
    }

    if (!isValidSheetUrl(url)) {
      setError('Please enter a valid Google Sheets URL');
      return;
    }

    setIsValidating(true);
    setError(null);

    try {
      // Validate access
      await validateSheetAccess(url);

      // Initialize Summary tab if needed
      const spreadsheetId = extractSpreadsheetId(url)!;
      await initializeSummaryTab(spreadsheetId);

      // Save and proceed
      setSheetUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to sheet');
    } finally {
      setIsValidating(false);
    }
  };

  const handleCreateNew = async () => {
    setError('Creating new sheets is not yet implemented. Please create a sheet manually in Google Drive and paste the URL here.');
  };

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-lg w-full">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Connect Your Sheet</h1>
          {user && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <img
                src={user.picture}
                alt={user.name}
                className="w-8 h-8 rounded-full"
              />
              <span>{user.email}</span>
            </div>
          )}
        </div>

        <p className="text-gray-600 mb-6">
          Connect your Google Sheet to start tracking trades. You can use an existing sheet or create a new one.
        </p>

        {/* Create New Option */}
        <div className="mb-6">
          <button
            onClick={handleCreateNew}
            className="w-full bg-blue-600 text-white rounded-lg px-6 py-3 font-semibold hover:bg-blue-700 transition-colors"
          >
            Create New TradeBuddy Sheet
          </button>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Creates a new sheet in your Google Drive with the required structure
          </p>
        </div>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">or use existing sheet</span>
          </div>
        </div>

        {/* Connect Existing Sheet */}
        <div className="space-y-4">
          <div>
            <label htmlFor="sheet-url" className="block text-sm font-medium text-gray-700 mb-1">
              Google Sheets URL
            </label>
            <input
              id="sheet-url"
              type="url"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setError(null);
              }}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                error ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          </div>

          <button
            onClick={handleConnect}
            disabled={isValidating || !url.trim()}
            className="w-full bg-gray-800 text-white rounded-lg px-6 py-3 font-semibold hover:bg-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isValidating ? 'Validating...' : 'Connect Existing Sheet'}
          </button>
        </div>

        {/* Help Section */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-blue-800 mb-2">Sheet Requirements</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Must be a Google Sheets document</li>
            <li>• You must have edit access</li>
            <li>• App will create tabs for each ticker + Summary</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
