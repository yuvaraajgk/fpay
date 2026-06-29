import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { getInvoiceForPayment, confirmPaymentAfterRedirect } from '../services/publicService';
import { formatInr } from '../utils/currency';

const RAZORPAY_SCRIPT = 'https://checkout.razorpay.com/v1/checkout.js';

const PaymentPage = () => {
  const { invoiceId } = useParams();
  const [searchParams] = useSearchParams();
  const success = searchParams.get('success') === 'true';
  const razorpayPaymentId = searchParams.get('razorpay_payment_id');

  const [invoice, setInvoice] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [checkoutReady, setCheckoutReady] = useState(false);
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const [paymentConfirmError, setPaymentConfirmError] = useState(null);

  const loadInvoice = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await getInvoiceForPayment(invoiceId);
      setInvoice(response.invoice);
    } catch (err) {
      console.error('Error loading invoice:', err);
      setError(err.response?.data?.message || 'Failed to load invoice');
    } finally {
      setIsLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setIsLoading(true);
        setError(null);
        if (razorpayPaymentId) {
          setConfirmingPayment(true);
          setPaymentConfirmError(null);
          try {
            await confirmPaymentAfterRedirect(invoiceId, razorpayPaymentId);
            window.history.replaceState({}, '', `/invoice/${invoiceId}/pay`);
          } catch (err) {
            console.error('Confirm payment:', err);
            if (!cancelled) {
              setPaymentConfirmError(
                err.response?.data?.message || 'Could not confirm payment with the server'
              );
            }
          } finally {
            if (!cancelled) setConfirmingPayment(false);
          }
        }
        if (!cancelled) {
          const response = await getInvoiceForPayment(invoiceId);
          setInvoice(response.invoice);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Error loading invoice:', err);
          setError(err.response?.data?.message || 'Failed to load invoice');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [invoiceId, razorpayPaymentId]);

  useEffect(() => {
    if (!invoice?.razorpayOrderId || invoice.status === 'paid') {
      setCheckoutReady(false);
      return;
    }
    if (typeof window.Razorpay === 'function') {
      setCheckoutReady(true);
      return;
    }
    let cancelled = false;
    const existing = document.querySelector(`script[src="${RAZORPAY_SCRIPT}"]`);
    if (existing) {
      const onLoad = () => !cancelled && setCheckoutReady(true);
      existing.addEventListener('load', onLoad);
      if (typeof window.Razorpay === 'function') setCheckoutReady(true);
      return () => {
        cancelled = true;
        existing.removeEventListener('load', onLoad);
      };
    }
    const script = document.createElement('script');
    script.src = RAZORPAY_SCRIPT;
    script.async = true;
    script.onload = () => !cancelled && setCheckoutReady(true);
    document.body.appendChild(script);
    return () => {
      cancelled = true;
    };
  }, [invoice?.razorpayOrderId, invoice?.status]);

  const openRazorpayCheckout = () => {
    if (!invoice?.razorpayKeyId || !invoice?.razorpayOrderId || typeof window.Razorpay !== 'function') {
      window.alert('Payment checkout is not ready yet. Please wait a moment and try again.');
      return;
    }
    const options = {
      key: invoice.razorpayKeyId,
      order_id: invoice.razorpayOrderId,
      name: invoice.freelancerId?.businessName || invoice.freelancerId?.name || 'Invoice',
      description: `Invoice ${invoice.invoiceNumber}`,
      prefill: {
        name: invoice.clientId?.name || '',
        email: invoice.clientId?.email || ''
      },
      handler: async (response) => {
        if (response?.razorpay_payment_id) {
          try {
            await confirmPaymentAfterRedirect(invoiceId, response.razorpay_payment_id);
          } catch (err) {
            console.error('Confirm payment after checkout:', err);
          }
        }
        loadInvoice();
      },
      theme: { color: '#2563eb' }
    };
    const rzp = new window.Razorpay(options);
    rzp.open();
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">
            {confirmingPayment ? 'Confirming payment…' : 'Loading invoice...'}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">Error</div>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Invoice not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800 font-medium">Payment successful! Thank you for your payment.</p>
          </div>
        )}

        {paymentConfirmError && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-amber-900 font-medium">{paymentConfirmError}</p>
            <p className="text-amber-800 text-sm mt-2">
              If you were charged, the business dashboard should update when Razorpay delivers the webhook, or try
              refreshing this page in a moment.
            </p>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              {invoice.freelancerId?.logoUrl && (
                <img 
                  src={invoice.freelancerId.logoUrl} 
                  alt="Logo" 
                  className="h-12 mb-4"
                />
              )}
              <h1 className="text-3xl font-bold text-gray-900">
                {invoice.freelancerId?.businessName || invoice.freelancerId?.name || 'Invoice'}
              </h1>
              <p className="text-gray-600 mt-2">Invoice Payment</p>
            </div>
            <div className="text-right">
              <h2 className="text-2xl font-bold text-gray-900">INVOICE</h2>
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium mt-2 ${getStatusColor(invoice.status)}`}>
                {invoice.status.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Invoice Number</h3>
              <p className="text-lg font-semibold">{invoice.invoiceNumber}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Due Date</h3>
              <p className="text-lg">{formatDate(invoice.dueDate)}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Date Issued</h3>
              <p className="text-lg">{formatDate(invoice.createdAt)}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Status</h3>
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(invoice.status)}`}>
                {invoice.status.toUpperCase()}
              </span>
            </div>
          </div>

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

        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Line Items</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unit Price
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoice.lineItems.map((item, index) => {
                  const amount = item.quantity * item.unitPrice;
                  return (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                        {item.quantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                        {formatInr(item.unitPrice)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                        {formatInr(amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
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
                <span className="text-lg font-bold text-blue-600">{formatInr(invoice.total)}</span>
              </div>
            </div>
          </div>
        </div>

        {invoice.status !== 'paid' &&
          ['cancelled', 'expired'].includes(invoice.status) && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center text-amber-900">
              <p className="font-medium">This payment link is no longer active.</p>
              <p className="text-sm mt-2">Ask the business to resend the invoice with a new link.</p>
            </div>
          )}

        {invoice.status !== 'paid' &&
          !['cancelled', 'expired'].includes(invoice.status) &&
          (invoice.paymentMode === 'order' || invoice.razorpayOrderId) && (
            <div className="bg-white rounded-lg shadow-sm p-6 text-center">
              <h3 className="text-xl font-semibold mb-4">Make Payment</h3>
              {invoice.status === 'declined' && (
                <p className="text-amber-800 text-sm mb-4">
                  The last payment attempt did not go through. You can try again below.
                </p>
              )}
              <p className="text-gray-600 mb-6">
                Pay securely with Razorpay — payment goes directly to the business.
              </p>
              <button
                type="button"
                onClick={openRazorpayCheckout}
                disabled={!checkoutReady}
                className="inline-block px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {!checkoutReady ? 'Loading checkout…' : `Pay ${formatInr(invoice.total)}`}
              </button>
              {invoice.pdfUrl && (
                <div className="mt-4">
                  <a
                    href={invoice.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    Download PDF Invoice
                  </a>
                </div>
              )}
            </div>
          )}

        {invoice.status !== 'paid' &&
          !['cancelled', 'expired'].includes(invoice.status) &&
          invoice.paymentMode !== 'order' &&
          !invoice.razorpayOrderId &&
          invoice.stripePaymentLink && (
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <h3 className="text-xl font-semibold mb-4">Make Payment</h3>
            {invoice.status === 'declined' && (
              <p className="text-amber-800 text-sm mb-4">
                The last payment attempt did not go through. You can try again below.
              </p>
            )}
            <p className="text-gray-600 mb-6">
              Pay securely with Razorpay — payment goes directly to the business.
            </p>
            <a
              href={invoice.stripePaymentLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-lg shadow-sm transition-colors"
            >
              Pay {formatInr(invoice.total)}
            </a>
            {invoice.pdfUrl && (
              <div className="mt-4">
                <a
                  href={invoice.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  Download PDF Invoice
                </a>
              </div>
            )}
          </div>
        )}

        {invoice.status === 'paid' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
            <div className="text-green-600 text-4xl mb-4">✓</div>
            <h3 className="text-xl font-semibold text-green-800 mb-2">Invoice Paid</h3>
            <p className="text-green-700">This invoice has been paid successfully.</p>
            {(invoice.paidAt || invoice.razorpayPaymentId) && (
              <div className="mt-4 text-left max-w-md mx-auto space-y-2 text-sm">
                {invoice.paidAt && (
                  <p className="text-green-900">
                    <span className="font-medium text-green-800">Paid on: </span>
                    {formatDateTime(invoice.paidAt)}
                  </p>
                )}
                {invoice.razorpayPaymentId && (
                  <p className="text-green-800 break-all">
                    <span className="font-medium">Payment reference: </span>
                    <span className="font-mono text-xs sm:text-sm">{invoice.razorpayPaymentId}</span>
                  </p>
                )}
              </div>
            )}
            {invoice.pdfUrl && (
              <div className="mt-4">
                <a
                  href={invoice.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-700 hover:text-green-800 underline"
                >
                  Download PDF Invoice
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentPage;
