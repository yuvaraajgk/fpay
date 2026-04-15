import axios from 'axios';

const API_URL = '/api/public';

// Create axios instance for public endpoints (no auth required)
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Get invoice details for payment page (public, no auth required)
export const getInvoiceForPayment = async (invoiceId) => {
  const response = await api.get(`/invoice/${invoiceId}`);
  return response.data;
};

/** After Razorpay redirects with razorpay_payment_id — server verifies with Razorpay and marks invoice paid */
export const confirmPaymentAfterRedirect = async (invoiceId, razorpayPaymentId) => {
  const response = await api.post(`/invoice/${invoiceId}/confirm-payment`, {
    razorpayPaymentId
  });
  return response.data;
};
