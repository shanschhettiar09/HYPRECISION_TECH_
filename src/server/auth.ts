import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import {
  getAdminPasswordHash,
  claimAdminPasswordHash,
  hasAdminPasswordHash,
} from './db.ts';

// Ephemeral per-process fallback signing key when SESSION_SECRET env var is unset
const SESSION_SECRET =
  process.env.SESSION_SECRET && process.env.SESSION_SECRET.trim().length >= 16
    ? process.env.SESSION_SECRET.trim()
    : crypto.randomBytes(32).toString('hex');

const TOKEN_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_FAILED_ATTEMPTS = 5;

const failedAttemptsByIp = new Map<string, { count: number; resetAt: number }>();
const revokedTokenIds = new Set<string>();

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
}

export function checkAuthRateLimit(req: Request): {
  allowed: boolean;
  retryAfterSeconds?: number;
} {
  const ip = getClientIp(req);
  const entry = failedAttemptsByIp.get(ip);
  const now = Date.now();
  if (!entry) return { allowed: true };
  if (now >= entry.resetAt) {
    failedAttemptsByIp.delete(ip);
    return { allowed: true };
  }
  if (entry.count >= MAX_FAILED_ATTEMPTS) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
    };
  }
  return { allowed: true };
}

export function recordAuthFailure(req: Request): void {
  const ip = getClientIp(req);
  const now = Date.now();
  const entry = failedAttemptsByIp.get(ip);
  if (!entry || now >= entry.resetAt) {
    failedAttemptsByIp.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
  } else {
    entry.count += 1;
  }
}

export function clearAuthFailures(req: Request): void {
  failedAttemptsByIp.delete(getClientIp(req));
}

function hashPasswordScrypt(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

function verifyPasswordScrypt(password: string, stored: string): boolean {
  const parts = stored.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const [, salt, expectedHex] = parts;
  if (!salt || !expectedHex) return false;
  const expected = Buffer.from(expectedHex, 'hex');
  const actual = crypto.scryptSync(password, salt, 64);
  if (expected.length !== actual.length) return false;
  return crypto.timingSafeEqual(expected, actual);
}

function constantTimeCompareStrings(a: string, b: string): boolean {
  const digestA = crypto.createHash('sha256').update(a).digest();
  const digestB = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(digestA, digestB);
}

export function getAdminAuthMode(): 'env' | 'claimed' | 'unclaimed' {
  const envPass = process.env.ADMIN_PASSCODE?.trim();
  if (envPass) return 'env';
  if (hasAdminPasswordHash()) return 'claimed';
  return 'unclaimed';
}

export function verifyAdminPasscode(passcode: string): boolean {
  if (typeof passcode !== 'string' || passcode.length === 0) return false;

  const envPass = process.env.ADMIN_PASSCODE?.trim();
  // Configured process.env passcode always overrides any claimed fallback hash
  if (envPass) {
    return constantTimeCompareStrings(passcode, envPass);
  }

  const storedHash = getAdminPasswordHash();
  if (!storedHash) return false;
  return verifyPasswordScrypt(passcode, storedHash);
}

export function claimInitialAdminPasscode(passcode: string): {
  ok: boolean;
  error?: string;
} {
  if (typeof passcode !== 'string' || passcode.trim().length < 8) {
    return { ok: false, error: 'Admin passcode must be at least 8 characters.' };
  }
  if (passcode.length > 128) {
    return { ok: false, error: 'Admin passcode exceeds maximum length.' };
  }

  if (process.env.ADMIN_PASSCODE?.trim()) {
    return {
      ok: false,
      error: 'Admin passcode is already managed via environment secrets.',
    };
  }

  const hashed = hashPasswordScrypt(passcode);
  const claimed = claimAdminPasswordHash(hashed);
  if (!claimed) {
    return {
      ok: false,
      error: 'Admin passcode has already been claimed.',
    };
  }
  return { ok: true };
}

interface AdminSessionPayload {
  role: 'admin';
  iat: number;
  exp: number;
  jti: string;
}

export function issueAdminToken(): { token: string; expiresInMs: number } {
  const now = Date.now();
  const payload: AdminSessionPayload = {
    role: 'admin',
    iat: now,
    exp: now + TOKEN_TTL_MS,
    jti: crypto.randomBytes(12).toString('hex'),
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(encodedPayload)
    .digest('base64url');
  return {
    token: `${encodedPayload}.${sig}`,
    expiresInMs: TOKEN_TTL_MS,
  };
}

export function verifyAdminToken(token: string | undefined | null): AdminSessionPayload | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encodedPayload, providedSig] = parts;
  if (!encodedPayload || !providedSig) return null;

  const expectedSig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(encodedPayload)
    .digest('base64url');

  const bufProvided = Buffer.from(providedSig, 'utf8');
  const bufExpected = Buffer.from(expectedSig, 'utf8');
  if (bufProvided.length !== bufExpected.length) return null;
  if (!crypto.timingSafeEqual(bufProvided, bufExpected)) return null;

  try {
    const parsed = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf8')
    ) as AdminSessionPayload;
    if (
      parsed.role !== 'admin' ||
      typeof parsed.exp !== 'number' ||
      typeof parsed.jti !== 'string' ||
      Date.now() >= parsed.exp ||
      revokedTokenIds.has(parsed.jti)
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || typeof authHeader !== 'string') return null;
  if (!authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice(7).trim() || null;
}

export function isAdminAuthenticated(req: Request): boolean {
  const token = extractBearerToken(req);
  return verifyAdminToken(token) !== null;
}

export function revokeAdminTokenFromRequest(req: Request): void {
  const token = extractBearerToken(req);
  const parsed = verifyAdminToken(token);
  if (parsed?.jti) {
    revokedTokenIds.add(parsed.jti);
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!isAdminAuthenticated(req)) {
    res.status(401).json({ error: 'Admin authentication required.' });
    return;
  }
  next();
}
