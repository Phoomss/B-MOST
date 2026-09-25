'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getAuthToken, getStoredUser, setStoredUser, clearAuthToken, api } from '../lib/api';

export interface AuthUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  walletAddress?: string | null;
  organizationId?: string;
  organization?: {
    id: string;
    name: string;
    code: string;
    type: string;
  };
}

export function useAuth(options: { requireAuth?: boolean; redirectIfAuthed?: boolean } = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    clearAuthToken();
    setUser(null);
    router.push('/login');
  }, [router]);

  useEffect(() => {
    let isMounted = true;

    async function checkAuth() {
      const token = getAuthToken();

      if (!token) {
        if (isMounted) {
          setUser(null);
          setLoading(false);
        }
        if (options.requireAuth && pathname !== '/login') {
          router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
        }
        return;
      }

      // Check stored user first for instantaneous UI rendering
      const stored = getStoredUser();
      if (stored && isMounted) {
        setUser(stored);
      }

      // Validate with /auth/me
      try {
        const profile = await api.auth.me();
        if (isMounted) {
          setUser(profile);
          setStoredUser(profile);
        }
        if (options.redirectIfAuthed && pathname === '/login') {
          router.replace('/');
        }
      } catch (err) {
        // Token invalid or expired
        if (isMounted) {
          clearAuthToken();
          setUser(null);
        }
        if (options.requireAuth) {
          router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, [pathname, options.requireAuth, options.redirectIfAuthed, router]);

  return {
    user,
    loading,
    isAuthenticated: Boolean(user || getAuthToken()),
    logout,
  };
}
