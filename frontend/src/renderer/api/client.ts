import axios from 'axios';

const API_BASE = 'http://localhost:3001/api';

export const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('hms_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('hms_token');
      localStorage.removeItem('hms_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  me: () => api.get('/auth/me'),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/auth/change-password', { currentPassword, newPassword }),
};

export const patientApi = {
  list: (params?: object) => api.get('/patients', { params }),
  get: (id: string) => api.get(`/patients/${id}`),
  create: (data: object) => api.post('/patients', data),
  update: (id: string, data: object) => api.put(`/patients/${id}`, data),
  addVitals: (id: string, data: object) => api.post(`/patients/${id}/vitals`, data),
  getByQR: (qr: string) => api.get(`/patients/qr/${qr}`),
};

export const staffApi = {
  list: (params?: object) => api.get('/staff', { params }),
  get: (id: string) => api.get(`/staff/${id}`),
  create: (data: object) => api.post('/staff', data),
  update: (id: string, data: object) => api.put(`/staff/${id}`, data),
};

export const shiftApi = {
  list: (params?: object) => api.get('/shifts', { params }),
  create: (data: object) => api.post('/shifts', data),
  clockIn: (shiftId: string) => api.post('/attendance/clock-in', { shiftId }),
  clockOut: (attendanceId: string) => api.post('/attendance/clock-out', { attendanceId }),
  requestLeave: (data: object) => api.post('/leave', data),
  reviewLeave: (id: string, status: string) => api.put(`/leave/${id}`, { status }),
};

export const hospitalApi = {
  list: () => api.get('/hospitals'),
  get: (id: string) => api.get(`/hospitals/${id}`),
  create: (data: object) => api.post('/hospitals', data),
  update: (id: string, data: object) => api.put(`/hospitals/${id}`, data),
  departments: (params?: object) => api.get('/departments', { params }),
  createDepartment: (data: object) => api.post('/departments', data),
  beds: (params?: object) => api.get('/beds', { params }),
  admit: (data: object) => api.post('/admissions', data),
  discharge: (data: object) => api.post('/admissions/discharge', data),
};

export const visitApi = {
  list: (params?: object) => api.get('/visits', { params }),
  get: (id: string) => api.get(`/visits/${id}`),
  create: (data: object) => api.post('/visits', data),
  update: (id: string, data: object) => api.put(`/visits/${id}`, data),
  prescribe: (data: object) => api.post('/prescriptions', data),
};

export const pharmacyApi = {
  drugs: (params?: object) => api.get('/drugs', { params }),
  createDrug: (data: object) => api.post('/drugs', data),
  inventory: (params?: object) => api.get('/inventory', { params }),
  restock: (data: object) => api.post('/inventory', data),
  dispense: (data: object) => api.post('/dispense', data),
};

export const labApi = {
  orders: (params?: object) => api.get('/lab-orders', { params }),
  createOrder: (data: object) => api.post('/lab-orders', data),
  submitResult: (data: object) => api.post('/lab-orders/result', data),
  radiologyOrders: (params?: object) => api.get('/radiology-orders', { params }),
  createRadiology: (data: object) => api.post('/radiology-orders', data),
  submitReport: (id: string, data: object) => api.put(`/radiology-orders/${id}/report`, data),
};

export const billingApi = {
  invoices: (params?: object) => api.get('/invoices', { params }),
  createInvoice: (data: object) => api.post('/invoices', data),
  pay: (data: object) => api.post('/payments', data),
  stats: (params?: object) => api.get('/dashboard/stats', { params }),
};

export const appointmentApi = {
  list: (params?: object) => api.get('/appointments', { params }),
  create: (data: object) => api.post('/appointments', data),
  update: (id: string, data: object) => api.put(`/appointments/${id}`, data),
};
