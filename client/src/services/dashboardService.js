import axios from 'axios';

const API_URL = '/api/dashboard';

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

// Get dashboard statistics
export const getDashboardStats = async () => {
  const response = await api.get('/stats');
  return response.data;
};

// Get monthly revenue data
export const getMonthlyRevenue = async (year) => {
  const params = year ? { year } : {};
  const response = await api.get('/revenue', { params });
  return response.data;
};

// Get yearly revenue data
export const getYearlyRevenue = async () => {
  const response = await api.get('/yearly-revenue');
  return response.data;
};

// Get recent invoices
export const getRecentInvoices = async (limit = 5) => {
  const response = await api.get('/recent-invoices', { params: { limit } });
  return response.data;
};
