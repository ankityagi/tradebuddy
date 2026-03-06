import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { Campaign, Trade } from '../../domain/types';
import { getCampaigns, getAllTrades } from '../../data/repo';
import { WheelCampaignCard } from './WheelCampaignCard';
import { PMCCCampaignCard } from './PMCCCampaignCard';

export function StrategiesPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [allCampaigns, allTrades] = await Promise.all([getCampaigns(), getAllTrades()]);
        // Sort: active first, then by startedAt descending
        allCampaigns.sort((a, b) => {
          if (a.status !== b.status) return a.status === 'active' ? -1 : 1;
          return new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime();
        });
        setCampaigns(allCampaigns);
        setTrades(allTrades);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const active = campaigns.filter(c => c.status === 'active');
  const completed = campaigns.filter(c => c.status === 'completed');

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-400">Loading campaigns...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-white">Strategy Campaigns</h2>
        <Link
          to="/paste"
          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-semibold text-sm transition-colors"
        >
          + New Trade
        </Link>
      </div>

      {campaigns.length === 0 ? (
        <div className="bg-gray-800 rounded-2xl border border-gray-700 p-12 text-center">
          <h3 className="text-xl font-semibold text-white mb-2">No campaigns yet</h3>
          <p className="text-gray-400 mb-6">
            Start a Wheel or PMCC campaign by pasting a trade confirmation.
            Sell a CSP to start a Wheel, or buy a LEAPS call to start a PMCC.
          </p>
          <Link
            to="/paste"
            className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-colors font-semibold"
          >
            Paste Trade
          </Link>
        </div>
      ) : (
        <>
          {/* Active campaigns */}
          {active.length > 0 && (
            <section className="mb-8">
              <h3 className="text-lg font-semibold text-white mb-4">
                Active <span className="text-gray-400 font-normal text-sm">({active.length})</span>
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {active.map(c => renderCard(c, trades))}
              </div>
            </section>
          )}

          {/* Completed campaigns */}
          {completed.length > 0 && (
            <section>
              <h3 className="text-lg font-semibold text-white mb-4">
                Completed <span className="text-gray-400 font-normal text-sm">({completed.length})</span>
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {completed.map(c => renderCard(c, trades))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function renderCard(campaign: Campaign, trades: Trade[]) {
  if (campaign.type === 'wheel') {
    return <WheelCampaignCard key={campaign.id} campaign={campaign} trades={trades} />;
  }
  return <PMCCCampaignCard key={campaign.id} campaign={campaign} trades={trades} />;
}
