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

      // Fetch all dashboard data in parallel
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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-gray-600">Overview of your freelance business</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {/* Quick Actions */}
        <div className="mb-6 flex space-x-4">
          <button
            onClick={() => navigate('/invoices/new')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            + Create Invoice
          </button>
          <button
            onClick={() => navigate('/clients')}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Manage Clients
          </button>
          <button
            onClick={() => navigate('/invoices')}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            View All Invoices
          </button>
        </div>

        {/* Dashboard Stats */}
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
