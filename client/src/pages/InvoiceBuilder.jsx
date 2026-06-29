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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {invoiceId ? 'Edit Invoice' : 'Create New Invoice'}
          </h1>
          <p className="mt-2 text-gray-600">Build and send invoices to your clients</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
          <div>
            <label htmlFor="clientId" className="block text-sm font-medium text-gray-700 mb-2">
              Client <span className="text-red-500">*</span>
            </label>
            {isLoadingClients ? (
              <div className="animate-pulse bg-gray-200 h-10 rounded"></div>
            ) : (
              <select
                id="clientId"
                name="clientId"
                value={formData.clientId}
                onChange={handleClientChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            <div className="flex justify-between items-center mb-4">
              <label className="block text-sm font-medium text-gray-700">
                Line Items <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={addLineItem}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                + Add Item
              </button>
            </div>

            <div className="space-y-4">
              {formData.lineItems.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-4 items-end">
                  <div className="col-span-5">
                    <input
                      type="text"
                      placeholder="Description"
                      value={item.description}
                      onChange={(e) => handleLineItemChange(index, 'description', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="col-span-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => removeLineItem(index)}
                      disabled={formData.lineItems.length === 1}
                      className="px-3 py-2 text-red-600 hover:text-red-800 disabled:text-gray-400 disabled:cursor-not-allowed"
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
              <label htmlFor="tax" className="block text-sm font-medium text-gray-700 mb-2">
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="discount" className="block text-sm font-medium text-gray-700 mb-2">
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 mb-2">
                Due Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                id="dueDate"
                name="dueDate"
                value={formData.dueDate}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">{formatInr(calculations.subtotal)}</span>
              </div>
              {formData.tax > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax ({formData.tax}%):</span>
                  <span className="font-medium">{formatInr(calculations.taxAmount)}</span>
                </div>
              )}
              {formData.discount > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Discount ({formData.discount}%):</span>
                  <span className="font-medium">-{formatInr(calculations.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-gray-300">
                <span className="text-lg font-bold">Total:</span>
                <span className="text-lg font-bold text-blue-600">{formatInr(calculations.total)}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-4 pt-4">
            <button
              type="button"
              onClick={() => navigate('/invoices')}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveDraft}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save as Draft'}
            </button>
            <button
              type="button"
              onClick={handleSend}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
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
