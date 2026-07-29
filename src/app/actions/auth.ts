'use server';

import { cookies } from 'next/headers';

import { ADMIN_PASSWORD, ADMIN_SESSION_COOKIE, ADMIN_SESSION_MAX_AGE_SECONDS } from '@/lib/admin-auth';

export interface AdminLoginResult {
  success: boolean;
  error?: string;
}

export async function adminLogin(password: string): Promise<AdminLoginResult> {
  if (password !== ADMIN_PASSWORD) {
    return { success: false, error: 'Incorrect password.' };
  }

  cookies().set(ADMIN_SESSION_COOKIE, ADMIN_PASSWORD, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
  });

  return { success: true };
}

export async function adminLogout(): Promise<void> {
  cookies().delete(ADMIN_SESSION_COOKIE);
}
