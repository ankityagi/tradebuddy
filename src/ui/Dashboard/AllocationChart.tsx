import React, { useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import type { AllocationData } from './utils';
import { formatCurrency } from './utils';

interface AllocationChartProps {
  byTicker: AllocationData[];
  byStrategy: AllocationData[];
}

type ViewMode = 'ticker' | 'strategy';

export function AllocationChart({ byTicker, byStrategy }: AllocationChartProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('ticker');

  const data = viewMode === 'ticker' ? byTicker : byStrategy;
  const isEmpty = data.length === 0;

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-white">Position Allocation</h3>
        <div className="flex bg-gray-900 rounded-lg p-1">
          <button
            onClick={() => setViewMode('ticker')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              viewMode === 'ticker'
                ? 'bg-gray-700 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            By Ticker
          </button>
          <button
            onClick={() => setViewMode('strategy')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              viewMode === 'strategy'
                ? 'bg-gray-700 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            By Strategy
          </button>
        </div>
      </div>

      <div className="h-64">
        {isEmpty ? (
          <div className="h-full flex items-center justify-center text-gray-500">
            No open positions to display.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
                nameKey="name"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                labelStyle={{ color: '#F9FAFB' }}
              />
              <Legend wrapperStyle={{ color: '#9CA3AF' }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
