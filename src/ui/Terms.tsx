import React from 'react';
import { Link } from 'react-router-dom';

export function Terms() {
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
        <h1 className="text-3xl font-bold text-white mb-6">Terms of Service</h1>
        <p className="text-gray-500 mb-8">Last updated: February 2025</p>

        <div className="space-y-8">
          <section className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-white mb-3">Acceptance of Terms</h2>
            <p className="text-gray-400">
              By using TradeBuddy, you agree to these Terms of Service. If you do not agree,
              please do not use the application.
            </p>
          </section>

          <section className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-white mb-3">Description of Service</h2>
            <p className="text-gray-400">
              TradeBuddy is a personal trade tracking tool that helps you log and analyze your trades.
              The application integrates with Google Sheets to store your trade data in your own spreadsheet.
            </p>
          </section>

          <section className="bg-yellow-500/10 rounded-xl border border-yellow-500/20 p-6">
            <h2 className="text-xl font-semibold text-yellow-400 mb-3">Not Financial Advice</h2>
            <p className="text-yellow-200/80">
              TradeBuddy is a tracking tool only. Nothing in this application constitutes financial advice,
              investment recommendations, or trading signals. Always do your own research and consult with
              qualified financial professionals before making investment decisions.
            </p>
          </section>

          <section className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-white mb-3">User Responsibilities</h2>
            <p className="text-gray-400 mb-3">You agree to:</p>
            <ul className="list-disc list-inside text-gray-400 space-y-2">
              <li>Use the application for lawful purposes only</li>
              <li>Maintain the security of your Google account</li>
              <li>Not attempt to reverse engineer or exploit the application</li>
              <li>Take responsibility for the accuracy of data you enter</li>
            </ul>
          </section>

          <section className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-white mb-3">Data Ownership</h2>
            <p className="text-gray-400">
              You retain full ownership of your trade data. Your data is stored in your own Google Sheet,
              which you control. We do not claim any ownership or rights to your trading data.
            </p>
          </section>

          <section className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-white mb-3">Disclaimer of Warranties</h2>
            <p className="text-gray-400 mb-3">
              TradeBuddy is provided "as is" without warranties of any kind. We do not guarantee that:
            </p>
            <ul className="list-disc list-inside text-gray-400 space-y-2">
              <li>The service will be uninterrupted or error-free</li>
              <li>Calculations or assessments are accurate</li>
              <li>The application will meet your specific requirements</li>
            </ul>
          </section>

          <section className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-white mb-3">Limitation of Liability</h2>
            <p className="text-gray-400">
              To the maximum extent permitted by law, TradeBuddy and its developers shall not be liable
              for any indirect, incidental, special, consequential, or punitive damages, including but
              not limited to loss of profits, data, or trading losses.
            </p>
          </section>

          <section className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-white mb-3">Changes to Terms</h2>
            <p className="text-gray-400">
              We may update these terms from time to time. Continued use of the application after
              changes constitutes acceptance of the new terms.
            </p>
          </section>

          <section className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-white mb-3">Open Source</h2>
            <p className="text-gray-400">
              TradeBuddy is open source software. The source code is available on{' '}
              <a href="https://github.com/ankityagi/tradebuddy" className="text-emerald-400 hover:text-emerald-300" target="_blank" rel="noopener noreferrer">
                GitHub
              </a>.
            </p>
          </section>

          <section className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-white mb-3">Contact</h2>
            <p className="text-gray-400">
              For questions about these terms, please open an issue on our{' '}
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
