import axios from 'axios';

const API_URL = '/api/clients';

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
      // Token expired or invalid
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Create a new client
export const createClient = async (clientData) => {
  const response = await api.post('/', clientData);
  return response.data;
};

// Get all clients for logged-in freelancer
export const getClients = async () => {
  const response = await api.get('/');
  return response.data;
};

// Get a single client by ID
export const getClient = async (id) => {
  const response = await api.get(`/${id}`);
  return response.data;
};

// Update a client
export const updateClient = async (id, clientData) => {
  const response = await api.put(`/${id}`, clientData);
  return response.data;
};

// Delete a client
export const deleteClient = async (id) => {
  const response = await api.delete(`/${id}`);
  return response.data;
};
