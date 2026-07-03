import React from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AppLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const initials = (user?.name || user?.email || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('');

  const navLinkClass = (path) =>
    `px-3 py-2 rounded-lg font-medium transition-colors ${
      location.pathname.startsWith(path)
        ? 'text-brand-700 bg-brand-50'
        : 'text-ink-500 hover:text-ink-900 hover:bg-slate-100'
    }`;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-8 min-w-0">
            <Link to="/dashboard" className="flex items-center gap-2 shrink-0">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-b from-ink-700 to-ink-900 text-white flex items-center justify-center font-display font-bold text-sm">
                F
              </div>
              <span className="font-display font-bold tracking-tight text-ink-900">FreelancePay</span>
            </Link>
            <nav className="hidden sm:flex items-center gap-1 text-sm">
              <Link to="/dashboard" className={navLinkClass('/dashboard')}>Dashboard</Link>
              <Link to="/clients" className={navLinkClass('/clients')}>Clients</Link>
              <Link to="/invoices" className={navLinkClass('/invoices')}>Invoices</Link>
            </nav>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-sm text-ink-500 truncate max-w-[140px] sm:max-w-[220px] hidden sm:inline">
              {user?.name || user?.email}
            </span>
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-white flex items-center justify-center text-xs font-semibold">
              {initials}
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="px-3 py-1.5 text-sm font-medium text-ink-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-400"
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
