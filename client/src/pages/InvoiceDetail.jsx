import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getInvoice, sendInvoice as sendInvoiceRequest } from '../services/invoiceService';
import { formatInr } from '../utils/currency';

const STATUS_STYLES = {
  paid: 'bg-emerald-50 text-emerald-700',
  overdue: 'bg-rose-50 text-rose-700',
  sent: 'bg-sky-50 text-sky-700',
  declined: 'bg-orange-100 text-orange-900',
  cancelled: 'bg-slate-200 text-slate-800',
  expired: 'bg-amber-100 text-amber-900'
};

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

  const getStatusStyle = (status) => STATUS_STYLES[status] || 'bg-slate-100 text-slate-600';

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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600 mx-auto"></div>
          <p className="mt-4 text-ink-500">Loading invoice...</p>
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-rose-600 text-xl mb-4">Error</div>
          <p className="text-ink-500">{error || 'Invoice not found'}</p>
          <button
            onClick={() => navigate('/invoices')}
            className="mt-4 px-4 py-2 bg-gradient-to-b from-ink-700 to-ink-900 text-white rounded-lg hover:from-ink-800 hover:to-ink-900"
          >
            Back to Invoices
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <button
            onClick={() => navigate('/invoices')}
            className="text-brand-600 hover:text-brand-700 mb-4 text-sm"
          >
            ← Back to Invoices
          </button>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="font-display text-2xl font-bold text-ink-900">Invoice Details</h1>
              <p className="mt-1 text-ink-500 text-sm">Invoice {invoice.invoiceNumber}</p>
            </div>
            <span
              className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getStatusStyle(
                invoice.status
              )}`}
            >
              {invoice.status.toUpperCase()}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-6">
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="text-xs font-medium text-ink-500 uppercase tracking-wide mb-1.5">Invoice Number</h3>
                  <p className="text-base font-semibold text-ink-900">{invoice.invoiceNumber}</p>
                </div>
                <div>
                  <h3 className="text-xs font-medium text-ink-500 uppercase tracking-wide mb-1.5">Due Date</h3>
                  <p className="text-base text-ink-900">{formatDate(invoice.dueDate)}</p>
                </div>
                <div>
                  <h3 className="text-xs font-medium text-ink-500 uppercase tracking-wide mb-1.5">Date Created</h3>
                  <p className="text-base text-ink-900">{formatDate(invoice.createdAt)}</p>
                </div>
                <div>
                  <h3 className="text-xs font-medium text-ink-500 uppercase tracking-wide mb-1.5">Status</h3>
                  <span
                    className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getStatusStyle(
                      invoice.status
                    )}`}
                  >
                    {invoice.status.toUpperCase()}
                  </span>
                  {invoice.status === 'paid' && invoice.paidAt && (
                    <p className="text-sm text-ink-700 mt-2">
                      <span className="font-medium text-ink-500">Paid on </span>
                      {formatDateTime(invoice.paidAt)}
                    </p>
                  )}
                  {invoice.status === 'paid' && !invoice.paidAt && (
                    <p className="text-xs text-ink-500 mt-2">Payment date not on record</p>
                  )}
                </div>
              </div>

              <div className="border-t border-slate-100 pt-6">
                <h3 className="text-xs font-medium text-ink-500 uppercase tracking-wide mb-2">Bill To</h3>
                <div className="text-ink-900 text-sm">
                  <p className="font-semibold">{invoice.clientId?.name}</p>
                  {invoice.clientId?.company && <p>{invoice.clientId.company}</p>}
                  {invoice.clientId?.email && <p>{invoice.clientId.email}</p>}
                  {invoice.clientId?.phone && <p>{invoice.clientId.phone}</p>}
                  {invoice.clientId?.address && <p className="mt-2">{invoice.clientId.address}</p>}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-6">
              <h3 className="font-display font-semibold text-ink-900 mb-4">Line Items</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="pb-3 text-left text-xs font-medium text-ink-500 uppercase tracking-wide">
                        Description
                      </th>
                      <th className="pb-3 text-right text-xs font-medium text-ink-500 uppercase tracking-wide">
                        Quantity
                      </th>
                      <th className="pb-3 text-right text-xs font-medium text-ink-500 uppercase tracking-wide">
                        Unit Price
                      </th>
                      <th className="pb-3 text-right text-xs font-medium text-ink-500 uppercase tracking-wide">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invoice.lineItems.map((item, index) => {
                      const amount = item.quantity * item.unitPrice;
                      return (
                        <tr key={index}>
                          <td className="py-3 text-ink-900">{item.description}</td>
                          <td className="py-3 text-ink-500 text-right">
                            {item.quantity}
                          </td>
                          <td className="py-3 text-ink-500 text-right">
                            {formatInr(item.unitPrice)}
                          </td>
                          <td className="py-3 font-medium text-ink-900 text-right">
                            {formatInr(amount)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-6">
              <div className="flex justify-end">
                <div className="w-64 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-ink-600">Subtotal:</span>
                    <span className="font-medium text-ink-900">{formatInr(invoice.subtotal)}</span>
                  </div>
                  {invoice.tax > 0 && (
                    <div className="flex justify-between">
                      <span className="text-ink-600">Tax ({invoice.tax}%):</span>
                      <span className="font-medium text-ink-900">
                        {formatInr((invoice.subtotal * invoice.tax) / 100)}
                      </span>
                    </div>
                  )}
                  {invoice.discount > 0 && (
                    <div className="flex justify-between text-rose-600">
                      <span>Discount ({invoice.discount}%):</span>
                      <span className="font-medium">
                        -
                        {formatInr(
                          (invoice.total / (1 - invoice.discount / 100)) * (invoice.discount / 100)
                        )}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-slate-200">
                    <span className="text-base font-semibold text-ink-900">Total:</span>
                    <span className="font-display text-lg font-bold text-brand-600">
                      {formatInr(invoice.total)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-6">
              <h3 className="font-display font-semibold text-ink-900 mb-4">Bill payment</h3>
              <div
                className={`rounded-xl border p-4 mb-4 ${
                  isPaid
                    ? 'border-emerald-200 bg-emerald-50'
                    : 'border-amber-200 bg-amber-50'
                }`}
              >
                <p className="text-xs font-medium uppercase tracking-wide text-ink-500 mb-1">
                  Payment status
                </p>
                <p
                  className={`font-display text-2xl font-bold ${
                    isPaid ? 'text-emerald-700' : 'text-amber-900'
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
                  <p className="text-sm text-emerald-800 mt-2">
                    Recorded from Razorpay when payment completed.
                  </p>
                )}
                {isPaid && invoice.paidAt && (
                  <p className="text-sm text-emerald-900 mt-3">
                    <span className="font-medium">Paid on: </span>
                    {formatDateTime(invoice.paidAt)}
                  </p>
                )}
                {isPaid && invoice.razorpayPaymentId && (
                  <p className="text-xs text-ink-500 mt-2 break-all">
                    <span className="font-medium text-ink-700">Payment ID: </span>
                    <span className="font-mono">{invoice.razorpayPaymentId}</span>
                  </p>
                )}
              </div>

              <div className="space-y-3">
                {invoice.status === 'draft' && (
                  <button
                    onClick={() => navigate(`/invoices/${id}/edit`)}
                    className="w-full px-4 py-2.5 bg-slate-200 text-ink-700 text-sm font-medium rounded-lg hover:bg-slate-300 disabled:opacity-50"
                    disabled={isActionLoading}
                  >
                    Edit invoice
                  </button>
                )}
                {!isPaid && (
                  <button
                    onClick={handleSendPaymentLink}
                    className="w-full px-4 py-2.5 bg-gradient-to-b from-ink-700 to-ink-900 hover:from-ink-800 hover:to-ink-900 text-white text-sm font-medium rounded-lg shadow-soft disabled:opacity-50"
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
                    className="block w-full px-4 py-2.5 bg-white border border-slate-200 text-ink-700 rounded-lg hover:bg-slate-50 text-center text-sm font-medium"
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
