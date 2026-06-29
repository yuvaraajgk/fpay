import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || '';
const API_URL = `${BASE}/api/invoices`;

const getAuthToken = () => {
  return localStorage.getItem('token');
};

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

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

export const createInvoice = async (invoiceData) => {
  const response = await api.post('/', invoiceData);
  return response.data;
};

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

export const getInvoice = async (id) => {
  const response = await api.get(`/${id}`);
  return response.data;
};

export const updateInvoice = async (id, invoiceData) => {
  const response = await api.put(`/${id}`, invoiceData);
  return response.data;
};

export const sendInvoice = async (id) => {
  const response = await api.post(`/${id}/send`);
  return response.data;
};

export const markOverdue = async (id, sendReminder = false) => {
  const response = await api.post(`/${id}/mark-overdue`, { sendReminder });
  return response.data;
};

export const sendOverdueReminder = async (id) => {
  const response = await api.post(`/${id}/send-reminder`);
  return response.data;
};
