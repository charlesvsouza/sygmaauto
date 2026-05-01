import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const PROD_API_FALLBACK = 'https://oficina360-api.railway.app';
const API_URL = (import.meta.env.VITE_API_URL || (import.meta.env.PROD ? PROD_API_FALLBACK : 'http://localhost:3000')).replace(/\/+$/, '');

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = useAuthStore.getState().refreshToken;
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_URL}/auth/refresh`, {
            refreshToken,
          });
          const { accessToken, refreshToken: newRefreshToken } = response.data;
          useAuthStore.getState().login(
            useAuthStore.getState().user!,
            useAuthStore.getState().tenant!,
            accessToken,
            newRefreshToken
          );
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        } catch {
          useAuthStore.getState().logout();
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (data: { name: string; email: string; password: string; tenantName?: string; document?: string; taxId?: string; companyType?: string }) =>
    api.post('/auth/register', data),

  refresh: (refreshToken: string) =>
    api.post('/auth/refresh', { refreshToken }),
};

export const tenantsApi = {
  getMe: () => api.get('/tenants/me'),
  update: (data: any) => api.patch('/tenants/me', data),
};

export const usersApi = {
  getAll: () => api.get('/users'),
  getById: (id: string) => api.get(`/users/${id}`),
  create: (data: any) => api.post('/users', data),
  update: (id: string, data: any) => api.patch(`/users/${id}`, data),
  delete: (id: string) => api.delete(`/users/${id}`),
};

export const customersApi = {
  getAll: () => api.get('/customers'),
  getById: (id: string) => api.get(`/customers/${id}`),
  create: (data: any) => api.post('/customers', data),
  update: (id: string, data: any) => api.patch(`/customers/${id}`, data),
  delete: (id: string) => api.delete(`/customers/${id}`),
};

export const vehiclesApi = {
  getAll: () => api.get('/vehicles'),
  getById: (id: string) => api.get(`/vehicles/${id}`),
  create: (data: any) => api.post('/vehicles', data),
  update: (id: string, data: any) => api.patch(`/vehicles/${id}`, data),
  delete: (id: string) => api.delete(`/vehicles/${id}`),
  searchByPlate: (plate: string) => api.get(`/vehicles/search/plate/${plate}`),
};

export const serviceOrdersApi = {
  getAll: (status?: string) =>
    api.get('/service-orders', { params: status ? { status } : {} }),
  getById: (id: string) => api.get(`/service-orders/${id}`),
  create: (data: any) => api.post('/service-orders', data),
  update: (id: string, data: any) => api.patch(`/service-orders/${id}`, data),
  delete: (id: string, reason?: string) => api.delete(`/service-orders/${id}`, { data: { reason } }),
  syncPrices: (id: string) => api.post(`/service-orders/${id}/sync-prices`),
  requestApproval: (id: string) => api.post(`/service-orders/${id}/request-approval`),
  addItem: (id: string, data: any) => api.post(`/service-orders/${id}/items`, data),
  removeItem: (id: string, itemId: string) => api.delete(`/service-orders/${id}/items/${itemId}`),
  updateItem: (id: string, itemId: string, data: any) => api.patch(`/service-orders/${id}/items/${itemId}`, data),
  updateStatus: (id: string, data: { status: string }) => api.patch(`/service-orders/${id}/status`, data),
  importPdf: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/service-orders/import-pdf', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};




export const servicesApi = {
  getAll: () => api.get('/services'),
  getById: (id: string) => api.get(`/services/${id}`),
  create: (data: any) => api.post('/services', data),
  update: (id: string, data: any) => api.patch(`/services/${id}`, data),
  delete: (id: string) => api.delete(`/services/${id}`),
};

export const inventoryApi = {
  getAllParts: () => api.get('/inventory/parts'),
  getPartById: (id: string) => api.get(`/inventory/parts/${id}`),
  createPart: (data: any) => api.post('/inventory/parts', data),
  updatePart: (id: string, data: any) => api.patch(`/inventory/parts/${id}`, data),
  deletePart: (id: string) => api.delete(`/inventory/parts/${id}`),
  createMovement: (data: any) => api.post('/inventory/movements', data),
  getStockReport: () => api.get('/inventory/stock-report'),
};

export const financialApi = {
  getAll: (startDate?: string, endDate?: string) =>
    api.get('/financial', { params: { startDate, endDate } }),
  getSummary: (startDate?: string, endDate?: string) =>
    api.get('/financial/summary', { params: { startDate, endDate } }),
  create: (data: any) => api.post('/financial', data),
  delete: (id: string) => api.delete(`/financial/${id}`),
};

export const subscriptionsApi = {
  getCurrent: () => api.get('/subscriptions/current'),
  getPlans: () => api.get('/subscriptions/plans'),
  changePlan: (plan: string) => api.post('/subscriptions/change-plan', { plan }),
  cancel: () => api.post('/subscriptions/cancel'),
};

export const managementApi = {
  setup: (data: any) => api.post('/management/setup', data),
  listTenants: () => api.get('/management/tenants'),
};

export const suppliersApi = {
  getAll: () => api.get('/suppliers'),
  getById: (id: string) => api.get(`/suppliers/${id}`),
  create: (data: any) => api.post('/suppliers', data),
  update: (id: string, data: any) => api.patch(`/suppliers/${id}`, data),
  delete: (id: string) => api.delete(`/suppliers/${id}`),
};