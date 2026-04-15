import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getInvoice, sendInvoice as sendInvoiceRequest } from '../services/invoiceService';
import { formatInr } from '../utils/currency';

const InvoiceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  const fetchInvoice = async (options = {}) => {
    const { silent } = options;
    try {
      if (!silent) {
        setIsLoading(true);
        setError(null);
      }
      const response = await getInvoice(id);
      setInvoice(response.invoice);
    } catch (err) {
      console.error('Error fetching invoice:', err);
      if (!silent) {
        setError(err.response?.data?.message || 'Failed to load invoice');
      }
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  };

  const isPaid = invoice?.status === 'paid';

  const handleSendPaymentLink = async () => {
    if (
      !window.confirm(
        'Email the Razorpay payment link for this bill to the client?'
      )
    ) {
      return;
    }

    setIsActionLoading(true);
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
      setIsActionLoading(false);
    }
    try {
      await fetchInvoice({ silent: true });
    } catch (e) {
      console.error('Error refreshing invoice:', e);
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
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading invoice...</p>
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">Error</div>
          <p className="text-gray-600">{error || 'Invoice not found'}</p>
          <button
            onClick={() => navigate('/invoices')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Invoices
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/invoices')}
            className="text-blue-600 hover:text-blue-800 mb-4"
          >
            ← Back to Invoices
          </button>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Invoice Details</h1>
              <p className="mt-2 text-gray-600">Invoice {invoice.invoiceNumber}</p>
            </div>
            <span
              className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(
                invoice.status
              )}`}
            >
              {invoice.status.toUpperCase()}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Invoice Info */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Invoice Number</h3>
                  <p className="text-lg font-semibold">{invoice.invoiceNumber}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Due Date</h3>
                  <p className="text-lg">{formatDate(invoice.dueDate)}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Date Created</h3>
                  <p className="text-lg">{formatDate(invoice.createdAt)}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Status</h3>
                  <span
                    className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(
                      invoice.status
                    )}`}
                  >
                    {invoice.status.toUpperCase()}
                  </span>
                  {invoice.status === 'paid' && invoice.paidAt && (
                    <p className="text-sm text-gray-700 mt-2">
                      <span className="font-medium text-gray-600">Paid on </span>
                      {formatDateTime(invoice.paidAt)}
                    </p>
                  )}
                  {invoice.status === 'paid' && !invoice.paidAt && (
                    <p className="text-xs text-gray-500 mt-2">Payment date not on record</p>
                  )}
                </div>
              </div>

              {/* Client Info */}
              <div className="border-t pt-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Bill To</h3>
                <div className="text-gray-900">
                  <p className="font-semibold">{invoice.clientId?.name}</p>
                  {invoice.clientId?.company && <p>{invoice.clientId.company}</p>}
                  {invoice.clientId?.email && <p>{invoice.clientId.email}</p>}
                  {invoice.clientId?.phone && <p>{invoice.clientId.phone}</p>}
                  {invoice.clientId?.address && <p className="mt-2">{invoice.clientId.address}</p>}
                </div>
              </div>
            </div>

            {/* Line Items */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">Line Items</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Description
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Quantity
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Unit Price
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {invoice.lineItems.map((item, index) => {
                      const amount = item.quantity * item.unitPrice;
                      return (
                        <tr key={index}>
                          <td className="px-6 py-4 text-sm text-gray-900">{item.description}</td>
                          <td className="px-6 py-4 text-sm text-gray-500 text-right">
                            {item.quantity}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500 text-right">
                            {formatInr(item.unitPrice)}
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900 text-right">
                            {formatInr(amount)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-medium">{formatInr(invoice.subtotal)}</span>
                  </div>
                  {invoice.tax > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tax ({invoice.tax}%):</span>
                      <span className="font-medium">
                        {formatInr((invoice.subtotal * invoice.tax) / 100)}
                      </span>
                    </div>
                  )}
                  {invoice.discount > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Discount ({invoice.discount}%):</span>
                      <span className="font-medium">
                        -
                        {formatInr(
                          (invoice.total / (1 - invoice.discount / 100)) * (invoice.discount / 100)
                        )}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-gray-300">
                    <span className="text-lg font-bold">Total:</span>
                    <span className="text-lg font-bold text-blue-600">
                      {formatInr(invoice.total)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">Bill payment</h3>
              <div
                className={`rounded-xl border-2 p-4 mb-4 ${
                  isPaid
                    ? 'border-green-200 bg-green-50'
                    : 'border-amber-200 bg-amber-50'
                }`}
              >
                <p className="text-xs font-medium uppercase tracking-wide text-gray-600 mb-1">
                  Payment status
                </p>
                <p
                  className={`text-2xl font-bold ${
                    isPaid ? 'text-green-800' : 'text-amber-900'
                  }`}
                >
                  {isPaid ? 'Paid' : 'Pending'}
                </p>
                {!isPaid && (
                  <p className="text-sm text-amber-800 mt-2">
                    Updates automatically when the client pays through Razorpay.
                  </p>
                )}
                {isPaid && (
                  <p className="text-sm text-green-800 mt-2">
                    Recorded from Razorpay when payment completed.
                  </p>
                )}
                {isPaid && invoice.paidAt && (
                  <p className="text-sm text-green-900 mt-3">
                    <span className="font-medium">Paid on: </span>
                    {formatDateTime(invoice.paidAt)}
                  </p>
                )}
                {isPaid && invoice.razorpayPaymentId && (
                  <p className="text-xs text-gray-600 mt-2 break-all">
                    <span className="font-medium text-gray-700">Payment ID: </span>
                    <span className="font-mono">{invoice.razorpayPaymentId}</span>
                  </p>
                )}
              </div>

              <div className="space-y-3">
                {invoice.status === 'draft' && (
                  <button
                    onClick={() => navigate(`/invoices/${id}/edit`)}
                    className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
                    disabled={isActionLoading}
                  >
                    Edit invoice
                  </button>
                )}
                {!isPaid && (
                  <button
                    onClick={handleSendPaymentLink}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
                    disabled={isActionLoading}
                  >
                    {isActionLoading ? 'Sending…' : 'Send payment link to user'}
                  </button>
                )}
                {invoice.pdfUrl && (
                  <a
                    href={invoice.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 text-center text-sm"
                  >
                    Download PDF
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceDetail;
