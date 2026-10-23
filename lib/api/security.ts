import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';

export const idSchema = z.coerce.number().int().positive();

export function jsonError(message: string, status: number) {
  return NextResponse.json({ success: false, error: message, message }, { status });
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown error';
}

export function getClientIp(request: Request) {
  const forwardedFor = request.headers.get('x-forwarded-for');
  return forwardedFor?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
}

export function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  if (!host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function requireSession(requestedRole?: 'admin' | 'team') {
  const session = await auth();
  if (!session?.user?.id || !session.user.accountType) {
    return { session: null, response: jsonError('Unauthorized', 401) } as const;
  }

  if (requestedRole && session.user.accountType !== requestedRole) {
    return { session: null, response: jsonError('Forbidden', 403) } as const;
  }

  const accountId = Number(session.user.id);
  if (!Number.isSafeInteger(accountId) || accountId <= 0) {
    return { session: null, response: jsonError('Unauthorized', 401) } as const;
  }

  return { session, accountId, response: null } as const;
}

export async function readJson(request: Request) {
  try {
    return await request.json() as unknown;
  } catch {
    throw new Error('Invalid JSON body');
  }
}
