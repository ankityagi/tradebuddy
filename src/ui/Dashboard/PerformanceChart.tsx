import React from 'react';
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { MonthlyData } from './utils';
import { formatCurrency } from './utils';

interface PerformanceChartProps {
  data: MonthlyData[];
}

interface TooltipPayload {
  payload: MonthlyData;
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipPayload[]; label?: string }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;

  const rows: { label: string; value: number; color: string }[] = [];
  if (d.cc !== 0) rows.push({ label: 'Covered Call', value: d.cc, color: '#10B981' });
  if (d.csp !== 0) rows.push({ label: 'CSP', value: d.csp, color: '#3B82F6' });
  if (d.long !== 0) rows.push({ label: 'Long Options', value: d.long, color: '#8B5CF6' });
  if (d.losses !== 0) rows.push({ label: 'Losses', value: d.losses, color: '#EF4444' });

  return (
    <div style={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px', padding: '10px 14px' }}>
      <p style={{ color: '#F9FAFB', fontWeight: 600, marginBottom: 6 }}>{label}</p>
      {rows.map(r => (
        <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 24, marginBottom: 2 }}>
          <span style={{ color: r.color, fontSize: 12 }}>{r.label}</span>
          <span style={{ color: '#F9FAFB', fontSize: 12 }}>{formatCurrency(r.value)}</span>
        </div>
      ))}
      <div style={{ borderTop: '1px solid #374151', marginTop: 6, paddingTop: 6, display: 'flex', justifyContent: 'space-between', gap: 24 }}>
        <span style={{ color: '#9CA3AF', fontSize: 12 }}>Net P&L</span>
        <span style={{ color: d.total >= 0 ? '#10B981' : '#EF4444', fontWeight: 600, fontSize: 12 }}>{formatCurrency(d.total)}</span>
      </div>
    </div>
  );
}

export function PerformanceChart({ data }: PerformanceChartProps) {
  if (data.length === 0) {
    return (
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Monthly Performance</h3>
        <div className="h-64 flex items-center justify-center text-gray-500">
          No closed trades yet. Close some trades to see performance data.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Monthly Performance</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="displayMonth" tick={{ fontSize: 12, fill: '#9CA3AF' }} stroke="#4B5563" />
            <YAxis
              tickFormatter={(value) => `$${value.toLocaleString()}`}
              tick={{ fontSize: 12, fill: '#9CA3AF' }}
              stroke="#4B5563"
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={0} stroke="#6B7280" />
            <Bar dataKey="total" name="Net P&L" radius={[3, 3, 0, 0]}>
              {data.map((entry) => (
                <Cell
                  key={entry.month}
                  fill={entry.total >= 0 ? '#10B981' : '#EF4444'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
