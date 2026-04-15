import axios from 'axios';

const API_URL = '/api/invoices';

// Get token from localStorage
const getAuthToken = () => {
  return localStorage.getItem('token');
};

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle 401 errors (unauthorized)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Create a new invoice
export const createInvoice = async (invoiceData) => {
  const response = await api.post('/', invoiceData);
  return response.data;
};

// Get all invoices with optional filters
export const getInvoices = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.status) params.append('status', filters.status);
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);
  
  const queryString = params.toString();
  const url = queryString ? `/?${queryString}` : '/';
  
  const response = await api.get(url);
  return response.data;
};

// Get a single invoice by ID
export const getInvoice = async (id) => {
  const response = await api.get(`/${id}`);
  return response.data;
};

// Update an invoice
export const updateInvoice = async (id, invoiceData) => {
  const response = await api.put(`/${id}`, invoiceData);
  return response.data;
};

// Send invoice (mark as sent, create payment link, send email)
export const sendInvoice = async (id) => {
  const response = await api.post(`/${id}/send`);
  return response.data;
};

// Mark invoice as overdue
export const markOverdue = async (id, sendReminder = false) => {
  const response = await api.post(`/${id}/mark-overdue`, { sendReminder });
  return response.data;
};

// Send overdue reminder email
export const sendOverdueReminder = async (id) => {
  const response = await api.post(`/${id}/send-reminder`);
  return response.data;
};
