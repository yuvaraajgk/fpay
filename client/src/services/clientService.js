import axios from 'axios';

const API_URL = '/api/clients';

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

export const createClient = async (clientData) => {
  const response = await api.post('/', clientData);
  return response.data;
};

export const getClients = async () => {
  const response = await api.get('/');
  return response.data;
};

export const getClient = async (id) => {
  const response = await api.get(`/${id}`);
  return response.data;
};

export const updateClient = async (id, clientData) => {
  const response = await api.put(`/${id}`, clientData);
  return response.data;
};

export const deleteClient = async (id) => {
  const response = await api.delete(`/${id}`);
  return response.data;
};
