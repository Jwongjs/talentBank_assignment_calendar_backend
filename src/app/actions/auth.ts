'use server';

import { redirect } from 'next/navigation';

import { isAdminEmail } from '@/lib/admin-auth';
import { createClient } from '@/lib/supabase/server';

export interface AdminLoginResult {
  success: boolean;
  error?: string;
}

export async function adminLogin(email: string, password: string): Promise<AdminLoginResult> {
  const supabase = createClient();

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { success: false, error: 'Incorrect email or password.' };
  }

  if (!isAdminEmail(email)) {
    await supabase.auth.signOut();
    return { success: false, error: 'This account is not authorized for admin access.' };
  }

  redirect('/admin');
}

export async function adminLogout(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
}

export interface SendRegistrationOtpResult {
  success: boolean;
  error?: string;
}

export async function sendRegistrationOtp(email: string): Promise<SendRegistrationOtpResult> {
  if (!email.trim()) {
    return { success: false, error: 'Email is required.' };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: { shouldCreateUser: true },
  });

  if (error) {
    return { success: false, error: 'Could not send a verification code. Please check the email and try again.' };
  }

  return { success: true };
}

export interface VerifyRegistrationOtpResult {
  success: boolean;
  error?: string;
}

export async function verifyRegistrationOtp(email: string, token: string): Promise<VerifyRegistrationOtpResult> {
  if (!token.trim()) {
    return { success: false, error: 'Enter the code we sent to your email.' };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.verifyOtp({
    email: email.trim(),
    token: token.trim(),
    type: 'email',
  });

  if (error) {
    return { success: false, error: 'That code is incorrect or has expired. Please request a new one.' };
  }

  return { success: true };
}
