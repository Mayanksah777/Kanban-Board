import axios from 'axios';
import { clearAuth, getAuth, setAuth } from '../store/authStore';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL
});

let refreshPromise = null;

api.interceptors.request.use((config) => {
  const auth = getAuth();
  if (auth?.accessToken) {
    config.headers.Authorization = `Bearer ${auth.accessToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    const isAuthEndpoint = originalRequest?.url?.includes('/auth/login') || originalRequest?.url?.includes('/auth/register') || originalRequest?.url?.includes('/auth/refresh');

    if (status !== 401 || !originalRequest || originalRequest._retry || isAuthEndpoint) {
      throw error;
    }

    const auth = getAuth();
    if (!auth?.refreshToken) {
      clearAuth();
      throw error;
    }

    originalRequest._retry = true;

    if (!refreshPromise) {
      refreshPromise = axios
        .post(`${API_URL}/auth/refresh`, { refreshToken: auth.refreshToken })
        .then((response) => response.data)
        .finally(() => {
          refreshPromise = null;
        });
    }

    try {
      const tokens = await refreshPromise;
      const nextAuth = {
        ...auth,
        ...tokens
      };

      setAuth(nextAuth);
      originalRequest.headers.Authorization = `Bearer ${tokens.accessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      clearAuth();
      throw refreshError;
    }
  }
);

export async function register(payload) {
  const { data } = await api.post('/auth/register', payload);
  return data;
}

export async function login(payload) {
  const { data } = await api.post('/auth/login', payload);
  return data;
}

export async function logout(payload) {
  await api.post('/auth/logout', payload);
}

export async function getBoardState(boardId) {
  const { data } = await api.get(`/boards/${boardId}/state`);
  return data;
}

export async function getWorkspaces() {
  const { data } = await api.get('/workspaces');
  return data;
}

export async function createWorkspace(payload) {
  const { data } = await api.post('/workspaces', payload);
  return data;
}

export async function addWorkspaceMember(workspaceId, payload) {
  const { data } = await api.post(`/workspaces/${workspaceId}/members`, payload);
  return data;
}

export async function getBoards(workspaceId) {
  const params = workspaceId ? { workspaceId } : undefined;
  const { data } = await api.get('/boards', { params });
  return data;
}

export async function createBoard(payload) {
  const { data } = await api.post('/boards', payload);
  return data;
}

export async function getBoard(boardId) {
  const { data } = await api.get(`/boards/${boardId}`);
  return data;
}

export async function createCard(payload) {
  const { data } = await api.post('/cards', payload);
  return data;
}

export default api;
