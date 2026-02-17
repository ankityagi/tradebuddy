import React from 'react';
import { Link } from 'react-router-dom';

export function Privacy() {
  return (
    <div className="min-h-screen bg-gray-900">
      <nav className="bg-gray-900 border-b border-gray-800 text-white">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3">
              <img src="/logo.svg" alt="TradeBuddy" className="w-8 h-8" />
              <span className="text-xl font-bold">TradeBuddy</span>
            </Link>
          </div>
        </div>
      </nav>
      <main className="container mx-auto px-6 py-8 max-w-3xl">
        <h1 className="text-3xl font-bold text-white mb-6">Privacy Policy</h1>
        <p className="text-gray-500 mb-8">Last updated: February 2025</p>

        <div className="space-y-8">
          <section className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-white mb-3">Overview</h2>
            <p className="text-gray-400">
              TradeBuddy is a personal trade tracking application. We are committed to protecting your privacy
              and being transparent about how we handle your data.
            </p>
          </section>

          <section className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-white mb-3">Data We Access</h2>
            <p className="text-gray-400 mb-3">When you sign in with Google, we request access to:</p>
            <ul className="list-disc list-inside text-gray-400 space-y-2">
              <li><span className="text-white font-medium">Email address</span> - To identify your account</li>
              <li><span className="text-white font-medium">Profile information</span> - Your name and profile picture for display</li>
              <li><span className="text-white font-medium">Google Sheets</span> - To read and write your trade data to your own spreadsheet</li>
            </ul>
          </section>

          <section className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-white mb-3">How We Use Your Data</h2>
            <ul className="list-disc list-inside text-gray-400 space-y-2">
              <li>Your trade data is stored in <span className="text-emerald-400 font-medium">your own Google Sheet</span> that you control</li>
              <li>We do not store your trade data on our servers</li>
              <li>We do not sell or share your personal information with third parties</li>
              <li>Authentication tokens are stored locally in your browser only</li>
            </ul>
          </section>

          <section className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-white mb-3">Data Storage</h2>
            <p className="text-gray-400 mb-3">
              TradeBuddy operates as a client-side application. Your data is stored in:
            </p>
            <ul className="list-disc list-inside text-gray-400 space-y-2">
              <li><span className="text-white font-medium">Your Google Sheet</span> - Trade records you choose to sync</li>
              <li><span className="text-white font-medium">Browser local storage</span> - Session preferences and cached data</li>
              <li><span className="text-white font-medium">IndexedDB</span> - Local trade data for offline access</li>
            </ul>
          </section>

          <section className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-white mb-3">Third-Party Services</h2>
            <p className="text-gray-400">
              We use Google OAuth and Google Sheets API. Your use of these services is governed by{' '}
              <a href="https://policies.google.com/privacy" className="text-emerald-400 hover:text-emerald-300" target="_blank" rel="noopener noreferrer">
                Google's Privacy Policy
              </a>.
            </p>
          </section>

          <section className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-white mb-3">Your Rights</h2>
            <p className="text-gray-400 mb-3">You can:</p>
            <ul className="list-disc list-inside text-gray-400 space-y-2">
              <li>Revoke app access anytime via your Google Account settings</li>
              <li>Delete your Google Sheet to remove all synced trade data</li>
              <li>Clear browser data to remove local storage</li>
            </ul>
          </section>

          <section className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-white mb-3">Contact</h2>
            <p className="text-gray-400">
              For privacy-related questions, please open an issue on our{' '}
              <a href="https://github.com/ankityagi/tradebuddy" className="text-emerald-400 hover:text-emerald-300" target="_blank" rel="noopener noreferrer">
                GitHub repository
              </a>.
            </p>
          </section>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-800">
          <Link to="/" className="text-emerald-400 hover:text-emerald-300">&larr; Back to TradeBuddy</Link>
        </div>
      </main>
    </div>
  );
}
