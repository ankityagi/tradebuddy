import React from 'react';
import type { MonthlyData } from './utils';
import { formatCurrency } from './utils';

interface MonthlyReturnsTableProps {
  data: MonthlyData[];
}

export function MonthlyReturnsTable({ data }: MonthlyReturnsTableProps) {
  if (data.length === 0) {
    return (
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Monthly Returns</h3>
        <div className="text-gray-500 text-center py-8">
          No closed trades yet.
        </div>
      </div>
    );
  }

  // Show most recent months first
  const sortedData = [...data].reverse();

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Monthly Returns</h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left py-2 text-sm font-medium text-gray-400">Month</th>
              <th className="text-right py-2 text-sm font-medium text-gray-400">P&L</th>
              <th className="text-right py-2 text-sm font-medium text-gray-400">CSP</th>
              <th className="text-right py-2 text-sm font-medium text-gray-400">CC</th>
              <th className="text-right py-2 text-sm font-medium text-gray-400">Long</th>
            </tr>
          </thead>
          <tbody>
            {sortedData.map((row) => (
              <tr key={row.month} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                <td className="py-3 text-sm font-medium text-white">
                  {row.displayMonth}
                </td>
                <td className={`py-3 text-sm text-right font-semibold ${
                  row.total >= 0 ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {formatCurrency(row.total)}
                </td>
                <td className={`py-3 text-sm text-right ${
                  row.csp >= 0 ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {row.csp !== 0 ? formatCurrency(row.csp) : '-'}
                </td>
                <td className={`py-3 text-sm text-right ${
                  row.cc >= 0 ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {row.cc !== 0 ? formatCurrency(row.cc) : '-'}
                </td>
                <td className={`py-3 text-sm text-right ${
                  row.long >= 0 ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {row.long !== 0 ? formatCurrency(row.long) : '-'}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-600 bg-gray-900/50">
              <td className="py-3 text-sm font-bold text-white">Total</td>
              <td className={`py-3 text-sm text-right font-bold ${
                data.reduce((sum, r) => sum + r.total, 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {formatCurrency(data.reduce((sum, r) => sum + r.total, 0))}
              </td>
              <td className={`py-3 text-sm text-right font-semibold ${
                data.reduce((sum, r) => sum + r.csp, 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {formatCurrency(data.reduce((sum, r) => sum + r.csp, 0))}
              </td>
              <td className={`py-3 text-sm text-right font-semibold ${
                data.reduce((sum, r) => sum + r.cc, 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {formatCurrency(data.reduce((sum, r) => sum + r.cc, 0))}
              </td>
              <td className={`py-3 text-sm text-right font-semibold ${
                data.reduce((sum, r) => sum + r.long, 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {formatCurrency(data.reduce((sum, r) => sum + r.long, 0))}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
