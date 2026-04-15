import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getInvoices, sendInvoice as sendInvoiceRequest } from '../services/invoiceService';
import { formatInr } from '../utils/currency';

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

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      case 'sent':
        return 'bg-blue-100 text-blue-800';
      case 'declined':
        return 'bg-orange-100 text-orange-900';
      case 'cancelled':
        return 'bg-gray-200 text-gray-800';
      case 'expired':
        return 'bg-amber-100 text-amber-900';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Dashboard Link */}
        <Link
          to="/"
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6 text-sm"
        >
          <span className="mr-2">←</span> Back to Dashboard
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Invoices</h1>
              <p className="mt-2 text-gray-600">Manage and track your invoices</p>
            </div>
            <button
              onClick={() => navigate('/invoices/new')}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            >
              + Create Invoice
            </button>
          </div>
        </div>

        {/* Status Filters */}
        <div className="mb-6">
          <div className="flex space-x-2">
            {['all', 'draft', 'sent', 'paid', 'overdue', 'declined', 'cancelled', 'expired'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                }`}
              >
                {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {/* Invoices Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg">No invoices found.</p>
              <p className="text-sm mt-2">Create your first invoice to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Invoice #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Due Date
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invoices.map((invoice) => (
                    <tr key={invoice._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {invoice.invoiceNumber}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {invoice.clientId?.name || 'N/A'}
                        </div>
                        {invoice.clientId?.company && (
                          <div className="text-sm text-gray-500">
                            {invoice.clientId.company}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm font-medium text-gray-900">
                          {formatInr(invoice.total)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                            invoice.status
                          )}`}
                        >
                          {invoice.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(invoice.dueDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => handleView(invoice._id)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            View
                          </button>
                          {invoice.status === 'draft' && (
                            <button
                              onClick={() => handleEdit(invoice._id)}
                              className="text-gray-600 hover:text-gray-900"
                            >
                              Edit
                            </button>
                          )}
                          {invoice.status !== 'paid' && (
                            <button
                              onClick={() => handleSendPaymentLink(invoice._id)}
                              className="text-green-600 hover:text-green-900"
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
