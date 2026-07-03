import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getInvoices, sendInvoice as sendInvoiceRequest } from '../services/invoiceService';
import { formatInr } from '../utils/currency';

const STATUS_STYLES = {
  paid: 'bg-emerald-50 text-emerald-700',
  overdue: 'bg-rose-50 text-rose-700',
  sent: 'bg-sky-50 text-sky-700',
  declined: 'bg-orange-100 text-orange-900',
  cancelled: 'bg-slate-200 text-slate-800',
  expired: 'bg-amber-100 text-amber-900'
};

const Invoices = () => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchInvoices();
  }, [statusFilter]);

  const fetchInvoices = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const filters = statusFilter !== 'all' ? { status: statusFilter } : {};
      const response = await getInvoices(filters);
      setInvoices(response.invoices || []);
    } catch (err) {
      console.error('Error fetching invoices:', err);
      setError(err.response?.data?.message || 'Failed to load invoices');
    } finally {
      setIsLoading(false);
    }
  };

  const handleView = (id) => {
    navigate(`/invoices/${id}`);
  };

  const handleEdit = (id) => {
    navigate(`/invoices/${id}/edit`);
  };

  const handleSendPaymentLink = async (id) => {
    if (!window.confirm('Email the Razorpay payment link for this bill to the client?')) {
      return;
    }

    try {
      const payload = await sendInvoiceRequest(id);
      window.alert(
        payload.message ||
          (payload.emailError
            ? `Email issue: ${payload.emailError}`
            : 'Payment link sent.')
      );
    } catch (err) {
      console.error('Error sending payment link:', err);
      const detail =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message;
      window.alert(detail || 'Failed to send payment link');
    } finally {
      await fetchInvoices();
    }
  };

  const getStatusStyle = (status) => STATUS_STYLES[status] || 'bg-slate-100 text-slate-600';

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link
          to="/"
          className="inline-flex items-center text-ink-500 hover:text-ink-900 mb-6 text-sm"
        >
          <span className="mr-2">←</span> Back to Dashboard
        </Link>

        <div className="mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="font-display text-2xl font-bold text-ink-900">Invoices</h1>
              <p className="mt-1 text-ink-500 text-sm">Manage and track your invoices</p>
            </div>
            <button
              onClick={() => navigate('/invoices/new')}
              className="px-5 py-2.5 bg-gradient-to-b from-ink-700 to-ink-900 hover:from-ink-800 hover:to-ink-900 text-white text-sm font-medium rounded-lg shadow-soft transition-colors"
            >
              + Create Invoice
            </button>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            {['all', 'draft', 'sent', 'paid', 'overdue'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  statusFilter === status
                    ? 'bg-ink-900 text-white'
                    : 'bg-white text-ink-600 hover:bg-slate-50 border border-slate-200'
                }`}
              >
                {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-lg">
            <p className="text-rose-800 text-sm">{error}</p>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600"></div>
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-12 text-ink-500">
              <p className="text-lg">No invoices found.</p>
              <p className="text-sm mt-2">Create your first invoice to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-ink-500 uppercase tracking-wide">
                      Invoice #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-ink-500 uppercase tracking-wide">
                      Client
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-ink-500 uppercase tracking-wide">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-ink-500 uppercase tracking-wide">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-ink-500 uppercase tracking-wide">
                      Due Date
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-ink-500 uppercase tracking-wide">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {invoices.map((invoice) => (
                    <tr key={invoice._id} className="hover:bg-slate-50/70">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-ink-900">
                          {invoice.invoiceNumber}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-ink-900">
                          {invoice.clientId?.name || 'N/A'}
                        </div>
                        {invoice.clientId?.company && (
                          <div className="text-sm text-ink-500">
                            {invoice.clientId.company}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm font-medium text-ink-900">
                          {formatInr(invoice.total)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${getStatusStyle(
                            invoice.status
                          )}`}
                        >
                          {invoice.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-ink-500">
                        {formatDate(invoice.dueDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-3">
                          <button
                            onClick={() => handleView(invoice._id)}
                            className="text-brand-600 hover:text-brand-700"
                          >
                            View
                          </button>
                          {invoice.status === 'draft' && (
                            <button
                              onClick={() => handleEdit(invoice._id)}
                              className="text-ink-500 hover:text-ink-900"
                            >
                              Edit
                            </button>
                          )}
                          {invoice.status !== 'paid' && (
                            <button
                              onClick={() => handleSendPaymentLink(invoice._id)}
                              className="text-emerald-600 hover:text-emerald-700"
                            >
                              Send link
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Invoices;
