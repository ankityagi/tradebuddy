import React from 'react';
import { Link } from 'react-router-dom';

export type TrendDirection = 'up' | 'down' | 'neutral';

interface StatCardProps {
  title: string;
  value: string;
  trend?: TrendDirection;
  subtitle?: string;
  href?: string;
}

export function StatCard({ title, value, trend = 'neutral', subtitle, href }: StatCardProps) {
  const trendColors: Record<TrendDirection, string> = {
    up: 'text-green-600',
    down: 'text-red-600',
    neutral: 'text-gray-900',
  };

  const trendIcons: Record<TrendDirection, string> = {
    up: '\u2191',
    down: '\u2193',
    neutral: '',
  };

  const content = (
    <>
      <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">{title}</p>
      <div className="mt-2 flex items-baseline">
        <p className={`text-2xl font-semibold ${trendColors[trend]}`}>
          {trendIcons[trend] && <span className="mr-1">{trendIcons[trend]}</span>}
          {value}
        </p>
      </div>
      {subtitle && (
        <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
      )}
    </>
  );

  if (href) {
    return (
      <Link
        to={href}
        className="bg-white rounded-lg shadow p-6 block hover:shadow-md transition-shadow cursor-pointer"
      >
        {content}
      </Link>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {content}
    </div>
  );
}
