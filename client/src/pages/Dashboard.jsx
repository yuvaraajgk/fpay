import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardStats from '../components/DashboardStats';
import { getDashboardStats, getMonthlyRevenue, getYearlyRevenue, getRecentInvoices } from '../services/dashboardService';

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [revenueData, setRevenueData] = useState([]);
  const [yearlyRevenueData, setYearlyRevenueData] = useState([]);
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [statsResponse, revenueResponse, yearlyResponse, invoicesResponse] = await Promise.all([
        getDashboardStats(),
        getMonthlyRevenue(),
        getYearlyRevenue(),
        getRecentInvoices(5)
      ]);

      setStats(statsResponse.stats);
      setRevenueData(revenueResponse.revenueData || []);
      setYearlyRevenueData(yearlyResponse.revenueData || []);
      setRecentInvoices(invoicesResponse.invoices || []);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err.response?.data?.message || 'Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold text-ink-900">Dashboard</h1>
          <p className="mt-1 text-ink-500 text-sm">Overview of your freelance business</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-lg">
            <p className="text-rose-800 text-sm">{error}</p>
          </div>
        )}

        <div className="mb-8 flex flex-wrap gap-3">
          <button
            onClick={() => navigate('/invoices/new')}
            className="px-4 py-2.5 bg-gradient-to-b from-ink-700 to-ink-900 hover:from-ink-800 hover:to-ink-900 text-white text-sm font-medium rounded-lg shadow-soft transition-colors"
          >
            + Create Invoice
          </button>
          <button
            onClick={() => navigate('/clients')}
            className="px-4 py-2.5 bg-white border border-slate-200 text-ink-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
          >
            Manage Clients
          </button>
          <button
            onClick={() => navigate('/invoices')}
            className="px-4 py-2.5 bg-white border border-slate-200 text-ink-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
          >
            View All Invoices
          </button>
        </div>

        <DashboardStats
          stats={stats}
          revenueData={revenueData}
          yearlyRevenueData={yearlyRevenueData}
          recentInvoices={recentInvoices}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
};

export default Dashboard;
