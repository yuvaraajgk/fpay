import React from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AppLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6 min-w-0">
            <Link
              to="/dashboard"
              className="text-lg font-bold text-gray-900 hover:text-blue-600 shrink-0"
            >
              FreelancePay
            </Link>
            <nav className="hidden sm:flex items-center gap-4 text-sm">
              <Link
                to="/dashboard"
                className="text-gray-600 hover:text-gray-900 font-medium"
              >
                Dashboard
              </Link>
              <Link
                to="/clients"
                className="text-gray-600 hover:text-gray-900 font-medium"
              >
                Clients
              </Link>
              <Link
                to="/invoices"
                className="text-gray-600 hover:text-gray-900 font-medium"
              >
                Invoices
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-sm text-gray-600 truncate max-w-[140px] sm:max-w-[220px]">
              {user?.name || user?.email}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Log out
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
