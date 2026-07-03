import React, { useState, useEffect } from 'react';

const formatInvoiceApiError = (err) => {
  const d = err.response?.data;
  if (Array.isArray(d?.errors) && d.errors.length) {
    const first = d.errors[0];
    if (typeof first === 'string') return d.errors.join(' ');
    if (typeof first?.msg === 'string') {
      return d.errors.map((e) => e.msg || e).join(' ');
    }
  }
  return d?.message || err.message || 'Request failed';
};
import { useNavigate, useParams } from 'react-router-dom';
import { getClients } from '../services/clientService';
import { createInvoice, updateInvoice, sendInvoice, getInvoice } from '../services/invoiceService';
import { formatInr } from '../utils/currency';

const InvoiceBuilder = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const invoiceId = id;
  const [clients, setClients] = useState([]);
  const [isLoadingClients, setIsLoadingClients] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  
  const [formData, setFormData] = useState({
    clientId: '',
    lineItems: [{ description: '', quantity: 1, unitPrice: 0 }],
    tax: 0,
    discount: 0,
    dueDate: '',
    status: 'draft'
  });

  const [calculations, setCalculations] = useState({
    subtotal: 0,
    taxAmount: 0,
    discountAmount: 0,
    total: 0
  });

  useEffect(() => {
    loadClients();
    if (invoiceId) {
      loadInvoiceData();
    }
  }, [invoiceId]);

  const loadInvoiceData = async () => {
    try {
      const response = await getInvoice(invoiceId);
      const invoice = response.invoice;
      setFormData({
        clientId: invoice.clientId._id || invoice.clientId,
        lineItems: invoice.lineItems || [{ description: '', quantity: 1, unitPrice: 0 }],
        tax: invoice.tax || 0,
        discount: invoice.discount || 0,
        dueDate: invoice.dueDate ? new Date(invoice.dueDate).toISOString().split('T')[0] : '',
        status: invoice.status || 'draft'
      });
    } catch (err) {
      console.error('Error loading invoice:', err);
      setError('Failed to load invoice');
    }
  };

  useEffect(() => {
    calculateTotals();
  }, [formData.lineItems, formData.tax, formData.discount]);

  const loadClients = async () => {
    try {
      setIsLoadingClients(true);
      const response = await getClients();
      setClients(response.clients || []);
    } catch (err) {
      console.error('Error loading clients:', err);
      setError('Failed to load clients');
    } finally {
      setIsLoadingClients(false);
    }
  };


  const calculateTotals = () => {
    const subtotal = formData.lineItems.reduce((sum, item) => {
      const quantity = parseFloat(item.quantity) || 0;
      const unitPrice = parseFloat(item.unitPrice) || 0;
      return sum + (quantity * unitPrice);
    }, 0);

    const taxAmount = (subtotal * (formData.tax || 0)) / 100;

    const subtotalWithTax = subtotal + taxAmount;

    const discountAmount = (subtotalWithTax * (formData.discount || 0)) / 100;

    const total = subtotalWithTax - discountAmount;

    setCalculations({
      subtotal: Math.round(subtotal * 100) / 100,
      taxAmount: Math.round(taxAmount * 100) / 100,
      discountAmount: Math.round(discountAmount * 100) / 100,
      total: Math.round(total * 100) / 100
    });
  };

  const handleClientChange = (e) => {
    setFormData({ ...formData, clientId: e.target.value });
  };

  const handleLineItemChange = (index, field, value) => {
    const updatedLineItems = [...formData.lineItems];
    updatedLineItems[index][field] = value;
    setFormData({ ...formData, lineItems: updatedLineItems });
  };

  const addLineItem = () => {
    setFormData({
      ...formData,
      lineItems: [...formData.lineItems, { description: '', quantity: 1, unitPrice: 0 }]
    });
  };

  const removeLineItem = (index) => {
    if (formData.lineItems.length > 1) {
      const updatedLineItems = formData.lineItems.filter((_, i) => i !== index);
      setFormData({ ...formData, lineItems: updatedLineItems });
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const validateForm = () => {
    if (!formData.clientId) {
      setError('Please select a client');
      return false;
    }
    if (!formData.dueDate) {
      setError('Please select a due date');
      return false;
    }
    if (formData.lineItems.some(item => !item.description.trim())) {
      setError('All line items must have a description');
      return false;
    }
    return true;
  };

  const handleSaveDraft = async () => {
    if (!validateForm()) return;

    try {
      setIsSubmitting(true);
      setError(null);

      const invoiceData = {
        ...formData,
        status: 'draft'
      };

      if (invoiceId) {
        await updateInvoice(invoiceId, invoiceData);
      } else {
        await createInvoice(invoiceData);
      }

      navigate('/invoices');
    } catch (err) {
      console.error('Error saving invoice:', err);
      setError(formatInvoiceApiError(err) || 'Failed to save invoice');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSend = async () => {
    if (!validateForm()) return;

    try {
      setIsSubmitting(true);
      setError(null);

      if (invoiceId) {
        await updateInvoice(invoiceId, formData);
        await sendInvoice(invoiceId);
      } else {
        const response = await createInvoice(formData);
        await sendInvoice(response.invoice._id);
      }

      navigate('/invoices');
    } catch (err) {
      console.error('Error sending invoice:', err);
      setError(formatInvoiceApiError(err) || 'Failed to send invoice');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold text-ink-900">
            {invoiceId ? 'Edit Invoice' : 'Create New Invoice'}
          </h1>
          <p className="mt-1 text-ink-500 text-sm">Build and send invoices to your clients</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-lg">
            <p className="text-rose-800 text-sm">{error}</p>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-6 space-y-6">
          <div>
            <label htmlFor="clientId" className="block text-sm font-medium text-ink-700 mb-1.5">
              Client <span className="text-rose-500">*</span>
            </label>
            {isLoadingClients ? (
              <div className="animate-pulse bg-slate-100 h-10 rounded-lg"></div>
            ) : (
              <select
                id="clientId"
                name="clientId"
                value={formData.clientId}
                onChange={handleClientChange}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-brand-400 focus:border-transparent text-sm"
              >
                <option value="">Select a client</option>
                {clients.map((client) => (
                  <option key={client._id} value={client._id}>
                    {client.name} {client.company && `- ${client.company}`}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-ink-700">
                Line Items <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={addLineItem}
                className="px-3 py-1.5 text-xs font-medium bg-gradient-to-b from-ink-700 to-ink-900 hover:from-ink-800 hover:to-ink-900 text-white rounded-lg transition-colors"
              >
                + Add Item
              </button>
            </div>

            <div className="space-y-4">
              <div className="hidden sm:grid grid-cols-12 gap-4 text-xs font-medium text-ink-500 uppercase tracking-wide">
                <div className="col-span-5">Description</div>
                <div className="col-span-2">Qty</div>
                <div className="col-span-3">Unit Price</div>
                <div className="col-span-2"></div>
              </div>
              {formData.lineItems.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-4 items-end">
                  <div className="col-span-5">
                    <input
                      type="text"
                      placeholder="Description"
                      value={item.description}
                      onChange={(e) => handleLineItemChange(index, 'description', e.target.value)}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-400 text-sm"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => handleLineItemChange(index, 'quantity', e.target.value)}
                      min="0"
                      step="0.01"
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-400 text-sm"
                    />
                  </div>
                  <div className="col-span-3">
                    <input
                      type="number"
                      placeholder="Unit Price"
                      value={item.unitPrice}
                      onChange={(e) => handleLineItemChange(index, 'unitPrice', e.target.value)}
                      min="0"
                      step="0.01"
                      className="no-spinner w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-400 text-sm"
                    />
                  </div>
                  <div className="col-span-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => removeLineItem(index)}
                      disabled={formData.lineItems.length === 1}
                      className="px-3 py-2 text-rose-600 hover:text-rose-700 text-sm disabled:text-ink-400 disabled:cursor-not-allowed"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="tax" className="block text-sm font-medium text-ink-700 mb-1.5">
                Tax (%)
              </label>
              <input
                type="number"
                id="tax"
                name="tax"
                value={formData.tax}
                onChange={handleInputChange}
                min="0"
                max="100"
                step="0.01"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-400 text-sm"
              />
            </div>
            <div>
              <label htmlFor="discount" className="block text-sm font-medium text-ink-700 mb-1.5">
                Discount (%)
              </label>
              <input
                type="number"
                id="discount"
                name="discount"
                value={formData.discount}
                onChange={handleInputChange}
                min="0"
                max="100"
                step="0.01"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-400 text-sm"
              />
            </div>
            <div>
              <label htmlFor="dueDate" className="block text-sm font-medium text-ink-700 mb-1.5">
                Due Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                id="dueDate"
                name="dueDate"
                value={formData.dueDate}
                onChange={handleInputChange}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-400 text-sm"
              />
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-ink-600">Subtotal:</span>
                <span className="font-medium text-ink-900">{formatInr(calculations.subtotal)}</span>
              </div>
              {formData.tax > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-ink-600">Tax ({formData.tax}%):</span>
                  <span className="font-medium text-ink-900">{formatInr(calculations.taxAmount)}</span>
                </div>
              )}
              {formData.discount > 0 && (
                <div className="flex justify-between text-sm text-rose-600">
                  <span>Discount ({formData.discount}%):</span>
                  <span className="font-medium">-{formatInr(calculations.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-slate-200">
                <span className="text-base font-semibold text-ink-900">Total:</span>
                <span className="font-display text-lg font-bold text-brand-600">{formatInr(calculations.total)}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={() => navigate('/invoices')}
              className="px-5 py-2.5 border border-slate-200 rounded-lg text-ink-700 text-sm font-medium hover:bg-slate-50"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveDraft}
              className="px-5 py-2.5 bg-slate-200 text-ink-700 text-sm font-medium rounded-lg hover:bg-slate-300 disabled:opacity-50"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save as Draft'}
            </button>
            <button
              type="button"
              onClick={handleSend}
              className="px-5 py-2.5 bg-gradient-to-b from-ink-700 to-ink-900 hover:from-ink-800 hover:to-ink-900 text-white text-sm font-medium rounded-lg shadow-soft disabled:opacity-50 transition-colors"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Sending...' : 'Send Invoice'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceBuilder;
