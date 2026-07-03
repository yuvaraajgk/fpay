import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatInr } from '../utils/currency';

const STATUS_STYLES = {
  paid: 'bg-emerald-50 text-emerald-700',
  overdue: 'bg-rose-50 text-rose-700',
  sent: 'bg-sky-50 text-sky-700',
  declined: 'bg-orange-100 text-orange-900',
  cancelled: 'bg-slate-200 text-slate-800',
  expired: 'bg-amber-100 text-amber-900'
};

const getStatusStyle = (status) => STATUS_STYLES[status] || 'bg-slate-100 text-slate-600';

const formatDate = (dateString) =>
  new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

const StatCard = ({ label, value, accent, hint }) => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-5">
    <p className="text-xs font-medium text-ink-500 uppercase tracking-wide">{label}</p>
    <p className={`font-display text-2xl font-bold mt-2 ${accent || 'text-ink-900'}`}>{value}</p>
    {hint && <p className="text-xs text-ink-500 mt-1">{hint}</p>}
  </div>
);

const RevenueChart = ({ title, subtitle, data, dataKey, gradientId }) => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-6">
    <div className="flex items-center justify-between mb-4">
      <h3 className="font-display font-semibold text-ink-900">{title}</h3>
      {subtitle && (
        <span className="text-xs text-ink-500 bg-slate-100 px-2 py-1 rounded-md">{subtitle}</span>
      )}
    </div>
    {data && data.length > 0 ? (
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.18} />
              <stop offset="100%" stopColor="#4f46e5" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey={dataKey} tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={70}
            tickFormatter={(v) => formatInr(v).replace('.00', '')} />
          <Tooltip formatter={(value) => formatInr(value)} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }} />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="#4f46e5"
            strokeWidth={2.5}
            fill={`url(#${gradientId})`}
            dot={{ r: 3, fill: '#4f46e5', strokeWidth: 0 }}
            activeDot={{ r: 5 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    ) : (
      <div className="flex items-center justify-center h-64 text-ink-500 text-sm">
        No revenue data available
      </div>
    )}
  </div>
);

const DashboardStats = ({ stats, revenueData, yearlyRevenueData, recentInvoices, isLoading }) => {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard label="Total earned" value={formatInr(stats?.totalEarned || 0)} />
        <StatCard label="Total pending" value={formatInr(stats?.totalPending || 0)} />
        <StatCard label="Total overdue" value={formatInr(stats?.totalOverdue || 0)} accent="text-rose-600" />
        <StatCard label="Total invoices" value={stats?.totalInvoices || 0} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <RevenueChart
          title="Monthly revenue"
          subtitle="Last 12 months"
          data={revenueData}
          dataKey="month"
          gradientId="monthlyRevenueFill"
        />
        <RevenueChart
          title="Yearly revenue"
          subtitle="Last 5 years"
          data={yearlyRevenueData}
          dataKey="year"
          gradientId="yearlyRevenueFill"
        />
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-6">
        <h3 className="font-display font-semibold text-ink-900 mb-4">Recent invoices</h3>
        {recentInvoices && recentInvoices.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {recentInvoices.map((invoice) => (
              <div key={invoice._id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-ink-900">
                    {invoice.invoiceNumber}
                    <span className="text-ink-400 font-normal"> — {invoice.clientId?.name || 'N/A'}</span>
                  </p>
                  <p className="text-xs text-ink-500 mt-0.5">{formatDate(invoice.createdAt)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-ink-900">{formatInr(invoice.total)}</span>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusStyle(invoice.status)}`}>
                    {invoice.status.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-ink-500 text-sm">No recent invoices</div>
        )}
      </div>
    </div>
  );
};

export default DashboardStats;
