import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || '';
const API_URL = `${BASE}/api/public`;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getInvoiceForPayment = async (invoiceId) => {
  const response = await api.get(`/invoice/${invoiceId}`);
  return response.data;
};

export const confirmPaymentAfterRedirect = async (invoiceId, razorpayPaymentId) => {
  const response = await api.post(`/invoice/${invoiceId}/confirm-payment`, {
    razorpayPaymentId
  });
  return response.data;
};
