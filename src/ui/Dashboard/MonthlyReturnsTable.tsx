import React from 'react';
import type { MonthlyData } from './utils';
import { formatCurrency } from './utils';

interface MonthlyReturnsTableProps {
  data: MonthlyData[];
}

export function MonthlyReturnsTable({ data }: MonthlyReturnsTableProps) {
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Returns</h3>
        <div className="text-gray-500 text-center py-8">
          No closed trades yet.
        </div>
      </div>
    );
  }

  // Show most recent months first
  const sortedData = [...data].reverse();

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Returns</h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 text-sm font-medium text-gray-500">Month</th>
              <th className="text-right py-2 text-sm font-medium text-gray-500">P&L</th>
              <th className="text-right py-2 text-sm font-medium text-gray-500">CSP</th>
              <th className="text-right py-2 text-sm font-medium text-gray-500">CC</th>
              <th className="text-right py-2 text-sm font-medium text-gray-500">Long</th>
            </tr>
          </thead>
          <tbody>
            {sortedData.map((row) => (
              <tr key={row.month} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 text-sm font-medium text-gray-900">
                  {row.displayMonth}
                </td>
                <td className={`py-3 text-sm text-right font-semibold ${
                  row.total >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatCurrency(row.total)}
                </td>
                <td className={`py-3 text-sm text-right ${
                  row.csp >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {row.csp !== 0 ? formatCurrency(row.csp) : '-'}
                </td>
                <td className={`py-3 text-sm text-right ${
                  row.cc >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {row.cc !== 0 ? formatCurrency(row.cc) : '-'}
                </td>
                <td className={`py-3 text-sm text-right ${
                  row.long >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {row.long !== 0 ? formatCurrency(row.long) : '-'}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-200 bg-gray-50">
              <td className="py-3 text-sm font-bold text-gray-900">Total</td>
              <td className={`py-3 text-sm text-right font-bold ${
                data.reduce((sum, r) => sum + r.total, 0) >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatCurrency(data.reduce((sum, r) => sum + r.total, 0))}
              </td>
              <td className={`py-3 text-sm text-right font-semibold ${
                data.reduce((sum, r) => sum + r.csp, 0) >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatCurrency(data.reduce((sum, r) => sum + r.csp, 0))}
              </td>
              <td className={`py-3 text-sm text-right font-semibold ${
                data.reduce((sum, r) => sum + r.cc, 0) >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatCurrency(data.reduce((sum, r) => sum + r.cc, 0))}
              </td>
              <td className={`py-3 text-sm text-right font-semibold ${
                data.reduce((sum, r) => sum + r.long, 0) >= 0 ? 'text-green-600' : 'text-red-600'
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
