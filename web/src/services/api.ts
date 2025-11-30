import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export interface Ticket {
  id: number;
  title: string;
  description: string;
  status: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Job {
  id: number;
  type: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'canceled';
  progress: number;
  total_items: number;
  processed_items: number;
  idempotency_key: string | null;
  metadata: any;
  error: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  items?: JobItem[];
}

export interface JobItem {
  id: number;
  job_id: number;
  item_id: number;
  status: 'succeeded' | 'failed';
  error: string | null;
  created_at: string;
}

export interface CreateJobRequest {
  ticketIds: number[];
  idempotencyKey?: string;
}

export const ticketApi = {
  list: async (page: number = 1, limit: number = 10) => {
    const response = await api.get('/tickets', { params: { page, limit } });
    return response.data;
  },
  get: async (id: number) => {
    const response = await api.get(`/tickets/${id}`);
    return response.data;
  },
  create: async (data: { title: string; description: string; status?: string }) => {
    const response = await api.post('/tickets', data);
    return response.data;
  },
  update: async (id: number, data: { title?: string; description?: string; status?: string }) => {
    const response = await api.put(`/tickets/${id}`, data);
    return response.data;
  },
  delete: async (id: number) => {
    const response = await api.delete(`/tickets/${id}`);
    return response.data;
  },
};

export const authApi = {
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },
};

export const jobApi = {
  create: async (data: CreateJobRequest) => {
    const response = await api.post('/jobs', data);
    return response.data;
  },
  list: async (filters?: { type?: string; status?: string; page?: number; limit?: number }) => {
    const response = await api.get('/jobs', { params: filters });
    return response.data;
  },
  get: async (id: number) => {
    const response = await api.get(`/jobs/${id}`);
    return response.data;
  },
  cancel: async (id: number) => {
    const response = await api.post(`/jobs/${id}/cancel`);
    return response.data;
  },
};

