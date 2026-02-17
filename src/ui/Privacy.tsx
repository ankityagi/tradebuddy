import React from 'react';
import { Link } from 'react-router-dom';

export function Privacy() {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-blue-600 text-white shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="text-2xl font-bold">TradeBuddy</Link>
          </div>
        </div>
      </nav>
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
        <p className="text-gray-500 mb-8">Last updated: February 2025</p>

        <div className="prose prose-blue space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-3">Overview</h2>
            <p className="text-gray-700">
              TradeBuddy is a personal trade tracking application. We are committed to protecting your privacy
              and being transparent about how we handle your data.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Data We Access</h2>
            <p className="text-gray-700 mb-2">When you sign in with Google, we request access to:</p>
            <ul className="list-disc list-inside text-gray-700 space-y-1">
              <li><strong>Email address</strong> - To identify your account</li>
              <li><strong>Profile information</strong> - Your name and profile picture for display</li>
              <li><strong>Google Sheets</strong> - To read and write your trade data to your own spreadsheet</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">How We Use Your Data</h2>
            <ul className="list-disc list-inside text-gray-700 space-y-1">
              <li>Your trade data is stored in <strong>your own Google Sheet</strong> that you control</li>
              <li>We do not store your trade data on our servers</li>
              <li>We do not sell or share your personal information with third parties</li>
              <li>Authentication tokens are stored locally in your browser only</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Data Storage</h2>
            <p className="text-gray-700">
              TradeBuddy operates as a client-side application. Your data is stored in:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-1 mt-2">
              <li><strong>Your Google Sheet</strong> - Trade records you choose to sync</li>
              <li><strong>Browser local storage</strong> - Session preferences and cached data</li>
              <li><strong>IndexedDB</strong> - Local trade data for offline access</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Third-Party Services</h2>
            <p className="text-gray-700">
              We use Google OAuth and Google Sheets API. Your use of these services is governed by{' '}
              <a href="https://policies.google.com/privacy" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
                Google's Privacy Policy
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Your Rights</h2>
            <p className="text-gray-700">You can:</p>
            <ul className="list-disc list-inside text-gray-700 space-y-1 mt-2">
              <li>Revoke app access anytime via your Google Account settings</li>
              <li>Delete your Google Sheet to remove all synced trade data</li>
              <li>Clear browser data to remove local storage</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Contact</h2>
            <p className="text-gray-700">
              For privacy-related questions, please open an issue on our{' '}
              <a href="https://github.com/ankityagi/tradebuddy" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
                GitHub repository
              </a>.
            </p>
          </section>
        </div>

        <div className="mt-8 pt-6 border-t">
          <Link to="/" className="text-blue-600 hover:underline">&larr; Back to TradeBuddy</Link>
        </div>
      </main>
    </div>
  );
}
