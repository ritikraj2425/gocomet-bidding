import axios from 'axios';
import type { User, Rfq, Bid, BidSubmitPayload, Setting, MyBid } from '../types';

const api = axios.create({
  baseURL: '',
  headers: { 'Content-Type': 'application/json' },
});


api.interceptors.request.use((config) => {
  const token = localStorage.getItem('supplier_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('supplier_token');
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

// Auth
export const authApi = {
  login: (data: { email: string; password: string }) => api.post('/api/auth/login', data),
  register: (data: { email: string; password: string; name: string; company?: string; phone?: string }) =>
    api.post('/api/auth/register', { ...data, role: 'SUPPLIER' }),
  getMe: () => api.get<User>('/api/auth/me'),
};

// RFQs
export const rfqsApi = {
  list: (params?: Record<string, string>) => api.get<Rfq[]>('/api/rfqs', { params }),
  getById: (id: string) => api.get<Rfq>(`/api/rfqs/${id}`),
};

// Bids
export const bidsApi = {
  listForRfq: (rfqId: string) => api.get<Bid[]>(`/api/rfqs/${rfqId}/bids`),
  submitBid: (rfqId: string, data: BidSubmitPayload) => api.post(`/api/rfqs/${rfqId}/bids`, data),
  getMyBids: () => api.get<MyBid[]>('/api/bids/my-bids'),
};


// Activity
export const activityApi = {
  listForRfq: (rfqId: string) => api.get(`/api/rfqs/${rfqId}/activity`),
};

// Settings
export const settingsApi = {
  list: (params?: Record<string, string>) => api.get<Setting[]>('/api/settings', { params }),
};

export default api;
