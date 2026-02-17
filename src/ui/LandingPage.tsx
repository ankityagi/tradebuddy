import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function LandingPage() {
  const { signIn, isLoading } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900">
      {/* Navigation */}
      <nav className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="TradeBuddy" className="w-10 h-10" />
            <span className="text-2xl font-bold text-white">TradeBuddy</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/privacy" className="text-gray-400 hover:text-white text-sm">
              Privacy
            </Link>
            <Link to="/terms" className="text-gray-400 hover:text-white text-sm">
              Terms
            </Link>
            <button
              onClick={signIn}
              disabled={isLoading}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-6 pt-16 pb-24">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-2 mb-6">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            <span className="text-emerald-400 text-sm font-medium">100% Free & Open Source</span>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
            Track Your Trades,
            <span className="text-emerald-400"> Own Your Data</span>
          </h1>

          <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
            The privacy-first options trading journal that stores everything in your own Google Sheet.
            No servers, no subscriptions, no compromises.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={signIn}
              disabled={isLoading}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all transform hover:scale-105 shadow-lg shadow-emerald-500/25 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {isLoading ? 'Signing in...' : 'Get Started with Google'}
            </button>
            <a
              href="https://github.com/ankityagi/tradebuddy"
              target="_blank"
              rel="noopener noreferrer"
              className="border border-gray-600 hover:border-gray-500 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all flex items-center justify-center gap-2"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
              </svg>
              View on GitHub
            </a>
          </div>
        </div>

        {/* App Preview */}
        <div className="mt-16 relative">
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent z-10 pointer-events-none"></div>
          <div className="bg-gray-800 rounded-2xl border border-gray-700 shadow-2xl overflow-hidden max-w-5xl mx-auto">
            {/* Browser Chrome */}
            <div className="bg-gray-900 px-4 py-3 flex items-center gap-2 border-b border-gray-700">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
              </div>
              <div className="flex-1 ml-4">
                <div className="bg-gray-800 rounded-lg px-4 py-1.5 text-gray-400 text-sm max-w-md">
                  tradebuddy-khaki.vercel.app
                </div>
              </div>
            </div>
            {/* App Screenshot Placeholder */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-8">
              <div className="grid grid-cols-3 gap-4">
                {/* Dashboard Card */}
                <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700">
                  <div className="text-gray-400 text-sm mb-2">Total P/L</div>
                  <div className="text-3xl font-bold text-emerald-400">+$2,847</div>
                  <div className="text-emerald-400 text-sm mt-1">↑ 12.4% this month</div>
                </div>
                <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700">
                  <div className="text-gray-400 text-sm mb-2">Win Rate</div>
                  <div className="text-3xl font-bold text-white">68%</div>
                  <div className="text-gray-400 text-sm mt-1">34 of 50 trades</div>
                </div>
                <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700">
                  <div className="text-gray-400 text-sm mb-2">Open Trades</div>
                  <div className="text-3xl font-bold text-blue-400">5</div>
                  <div className="text-gray-400 text-sm mt-1">$1,240 at risk</div>
                </div>
              </div>
              {/* Trade Table Preview */}
              <div className="mt-6 bg-gray-900/50 rounded-xl border border-gray-700 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-700">
                  <div className="text-white font-semibold">Recent Trades</div>
                </div>
                <div className="divide-y divide-gray-800">
                  {[
                    { ticker: 'SPY', type: 'Put Credit Spread', pl: '+$156', status: 'WIN' },
                    { ticker: 'AAPL', type: 'Call Debit Spread', pl: '+$89', status: 'WIN' },
                    { ticker: 'TSLA', type: 'Iron Condor', pl: '-$45', status: 'LOSS' },
                  ].map((trade, i) => (
                    <div key={i} className="px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <span className="text-white font-medium">{trade.ticker}</span>
                        <span className="text-gray-400 text-sm">{trade.type}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={trade.pl.startsWith('+') ? 'text-emerald-400' : 'text-red-400'}>
                          {trade.pl}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          trade.status === 'WIN' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {trade.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Privacy Section */}
      <section className="bg-gray-800/50 py-24">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Privacy First, Always
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Unlike other trading journals, we never see your data. Everything stays in your Google account.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-gray-900/50 rounded-2xl p-8 border border-gray-700 text-center">
              <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Your Sheet, Your Data</h3>
              <p className="text-gray-400">
                All trades stored in your own Google Sheet. We can only access files you explicitly select.
              </p>
            </div>

            <div className="bg-gray-900/50 rounded-2xl p-8 border border-gray-700 text-center">
              <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">No Servers</h3>
              <p className="text-gray-400">
                TradeBuddy runs entirely in your browser. No backend servers storing or processing your trades.
              </p>
            </div>

            <div className="bg-gray-900/50 rounded-2xl p-8 border border-gray-700 text-center">
              <div className="w-16 h-16 bg-purple-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Open Source</h3>
              <p className="text-gray-400">
                Every line of code is public on GitHub. Audit it yourself, contribute, or self-host.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Everything You Need
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Powerful features to track, analyze, and improve your options trading.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Feature 1 */}
            <div className="flex gap-6 items-start">
              <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Risk Calculator</h3>
                <p className="text-gray-400">
                  Automatic max risk, max reward, and risk/reward ratio calculations for every trade.
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="flex gap-6 items-start">
              <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Paste & Parse</h3>
                <p className="text-gray-400">
                  Copy your broker confirmation and paste it directly. We extract all the details automatically.
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="flex gap-6 items-start">
              <div className="w-12 h-12 bg-yellow-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Performance Dashboard</h3>
                <p className="text-gray-400">
                  Track your P/L, win rate, and performance metrics over time with visual charts.
                </p>
              </div>
            </div>

            {/* Feature 4 */}
            <div className="flex gap-6 items-start">
              <div className="w-12 h-12 bg-pink-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Google Sheets Sync</h3>
                <p className="text-gray-400">
                  Every trade syncs to your Google Sheet. Use Sheets' formulas, charts, and sharing features.
                </p>
              </div>
            </div>

            {/* Feature 5 */}
            <div className="flex gap-6 items-start">
              <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Trade Assessment</h3>
                <p className="text-gray-400">
                  Get instant feedback on your trade's risk profile before you enter.
                </p>
              </div>
            </div>

            {/* Feature 6 */}
            <div className="flex gap-6 items-start">
              <div className="w-12 h-12 bg-cyan-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Works Everywhere</h3>
                <p className="text-gray-400">
                  Responsive design works on desktop, tablet, and mobile. Track trades on the go.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="container mx-auto px-6">
          <div className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 rounded-3xl border border-gray-700 p-12 text-center max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to Take Control?
            </h2>
            <p className="text-gray-400 text-lg mb-8 max-w-xl mx-auto">
              Start tracking your trades in minutes. No credit card, no subscription, no catch.
            </p>
            <button
              onClick={signIn}
              disabled={isLoading}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all transform hover:scale-105 shadow-lg shadow-emerald-500/25 disabled:opacity-50"
            >
              {isLoading ? 'Signing in...' : 'Get Started Free'}
            </button>
            <p className="text-gray-500 text-sm mt-4">
              No account needed • Sign in with Google • Takes 30 seconds
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-12">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img src="/logo.svg" alt="TradeBuddy" className="w-8 h-8" />
              <span className="text-gray-400">TradeBuddy</span>
            </div>
            <div className="flex items-center gap-6 text-gray-400 text-sm">
              <Link to="/privacy" className="hover:text-white">Privacy Policy</Link>
              <Link to="/terms" className="hover:text-white">Terms of Service</Link>
              <a href="https://github.com/ankityagi/tradebuddy" target="_blank" rel="noopener noreferrer" className="hover:text-white">
                GitHub
              </a>
            </div>
            <p className="text-gray-500 text-sm">
              Built with privacy in mind
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
