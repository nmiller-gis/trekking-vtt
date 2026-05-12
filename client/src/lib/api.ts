import { useAuthStore } from '../store/authStore';

const BASE = '/api';

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = useAuthStore.getState().token;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Request failed');
  return data as T;
}

export interface RoomSummary {
  id: string;
  roomCode: string;
  name: string;
  lastActivity: number;
  createdAt?: number;
  lastStation?: string | null;
}

export const api = {
  register: (username: string, password: string) =>
    request<{ token: string; userId: string; username: string }>('POST', '/auth/register', { username, password }),

  login: (username: string, password: string) =>
    request<{ token: string; userId: string; username: string }>('POST', '/auth/login', { username, password }),

  myRooms: () => request<RoomSummary[]>('GET', '/rooms'),

  memberRooms: () => request<RoomSummary[]>('GET', '/rooms/member'),

  renameRoom: (roomCode: string, name: string) =>
    request<{ ok: boolean }>('PATCH', `/rooms/${roomCode}/name`, { name }),

  deleteRoom: (roomCode: string) =>
    request<{ ok: boolean }>('DELETE', `/rooms/${roomCode}`),

  leaveRoom: (roomCode: string) =>
    request<{ ok: boolean }>('DELETE', `/rooms/${roomCode}/membership`),
};
