import axios from 'axios';

const api = axios.create({
  baseURL: '',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('admin_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/api/auth/login', { email, password }),
  getMe: () => api.get('/api/auth/me'),
};

// Users
export const usersApi = {
  list: (params?: Record<string, string>) => api.get('/api/users', { params }),
  create: (data: Record<string, unknown>) => api.post('/api/users', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/api/users/${id}`, data),
  delete: (id: string) => api.delete(`/api/users/${id}`),
  toggleStatus: (id: string) => api.patch(`/api/users/${id}/toggle-status`),
};

// RFQs
export const rfqsApi = {
  list: (params?: Record<string, string>) => api.get('/api/rfqs', { params }),
  getById: (id: string) => api.get(`/api/rfqs/${id}`),
  create: (data: Record<string, unknown>) => api.post('/api/rfqs', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/api/rfqs/${id}`, data),
  updateStatus: (id: string, status: string) =>
    api.patch(`/api/rfqs/${id}/status?status=${status}`),
  delete: (id: string) => api.delete(`/api/rfqs/${id}`),
  resetDemo: () => api.post('/api/rfqs/reset-demo-auctions'),
};


// Bids
export const bidsApi = {
  listForRfq: (rfqId: string) => api.get(`/api/rfqs/${rfqId}/bids`),
};

// Activity
export const activityApi = {
  listForRfq: (rfqId: string) => api.get(`/api/rfqs/${rfqId}/activity`),
};

// Settings
export const settingsApi = {
  list: (params?: Record<string, string>) => api.get('/api/settings', { params }),
  update: (key: string, value: string) => api.put(`/api/settings/${key}`, { value }),
  create: (data: Record<string, unknown>) => api.post('/api/settings', data),
};

export default api;

