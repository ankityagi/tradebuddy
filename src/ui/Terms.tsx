import React from 'react';
import { Link } from 'react-router-dom';

export function Terms() {
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
        <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
        <p className="text-gray-500 mb-8">Last updated: February 2025</p>

        <div className="prose prose-blue space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-3">Acceptance of Terms</h2>
            <p className="text-gray-700">
              By using TradeBuddy, you agree to these Terms of Service. If you do not agree,
              please do not use the application.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Description of Service</h2>
            <p className="text-gray-700">
              TradeBuddy is a personal trade tracking tool that helps you log and analyze your trades.
              The application integrates with Google Sheets to store your trade data in your own spreadsheet.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Not Financial Advice</h2>
            <p className="text-gray-700 font-medium bg-yellow-50 p-4 rounded border border-yellow-200">
              TradeBuddy is a tracking tool only. Nothing in this application constitutes financial advice,
              investment recommendations, or trading signals. Always do your own research and consult with
              qualified financial professionals before making investment decisions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">User Responsibilities</h2>
            <p className="text-gray-700 mb-2">You agree to:</p>
            <ul className="list-disc list-inside text-gray-700 space-y-1">
              <li>Use the application for lawful purposes only</li>
              <li>Maintain the security of your Google account</li>
              <li>Not attempt to reverse engineer or exploit the application</li>
              <li>Take responsibility for the accuracy of data you enter</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Data Ownership</h2>
            <p className="text-gray-700">
              You retain full ownership of your trade data. Your data is stored in your own Google Sheet,
              which you control. We do not claim any ownership or rights to your trading data.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Disclaimer of Warranties</h2>
            <p className="text-gray-700">
              TradeBuddy is provided "as is" without warranties of any kind. We do not guarantee that:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-1 mt-2">
              <li>The service will be uninterrupted or error-free</li>
              <li>Calculations or assessments are accurate</li>
              <li>The application will meet your specific requirements</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Limitation of Liability</h2>
            <p className="text-gray-700">
              To the maximum extent permitted by law, TradeBuddy and its developers shall not be liable
              for any indirect, incidental, special, consequential, or punitive damages, including but
              not limited to loss of profits, data, or trading losses.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Changes to Terms</h2>
            <p className="text-gray-700">
              We may update these terms from time to time. Continued use of the application after
              changes constitutes acceptance of the new terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Open Source</h2>
            <p className="text-gray-700">
              TradeBuddy is open source software. The source code is available on{' '}
              <a href="https://github.com/ankityagi/tradebuddy" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
                GitHub
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Contact</h2>
            <p className="text-gray-700">
              For questions about these terms, please open an issue on our{' '}
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
