const BASE = import.meta.env.VITE_API_URL as string;

function getToken(): string | null {
  return localStorage.getItem('sk_admin_token');
}

function clearSession(): void {
  localStorage.removeItem('sk_admin_token');
  localStorage.removeItem('sk_admin_user');
}

export async function apiFetch<T = unknown>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers as Record<string, string> | undefined),
    },
  });

  // Auto-logout on 401 (expired/invalid token) for authenticated requests
  const isLoginRequest = path.includes('/auth/login');
  if (res.status === 401 && !isLoginRequest) {
    clearSession();
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
    throw new Error('Session expired. Please log in again.');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
