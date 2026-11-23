import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { db } from './db.ts';
import type { UserRecord } from './types.ts';

export interface AuthenticatedRequest extends Request {
  user?: Omit<UserRecord, 'password_hash'>;
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  const derived = crypto.scryptSync(password, salt, 64);
  const keyBuf = Buffer.from(keyHex, 'hex');
  if (derived.length !== keyBuf.length) return false;
  return crypto.timingSafeEqual(derived, keyBuf);
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function createSession(userId: string): string {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const now = new Date();
  const expires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  db.prepare(
    'INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)'
  ).run(tokenHash, userId, expires.toISOString(), now.toISOString());
  return rawToken;
}

export const ALLOWED_SECURITY_QUESTION_KEYS = [
  'birth_city',
  'first_school',
  'childhood_nickname',
  'mother_name',
  'favorite_teacher',
  'favorite_pet_or_book',
] as const;

export type SecurityQuestionKey = (typeof ALLOWED_SECURITY_QUESTION_KEYS)[number];

export function normalizeSecurityAnswer(answer: string): string {
  return answer.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function revokeSession(rawToken: string): void {
  const tokenHash = hashToken(rawToken);
  db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash);
}

export function revokeAllUserSessions(userId: string): void {
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required. Please sign in.' });
    return;
  }
  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) {
    res.status(401).json({ error: 'Missing bearer token.' });
    return;
  }

  const tokenHash = hashToken(token);
  const row = db
    .prepare(
      `SELECT u.id, u.email, u.full_name, u.role, u.created_at, s.expires_at
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ?`
    )
    .get(tokenHash) as
    | {
        id: string;
        email: string;
        full_name: string;
        role: 'student' | 'developer';
        created_at: string;
        expires_at: string;
      }
    | undefined;

  if (!row) {
    res.status(401).json({ error: 'Session is invalid or expired. Please sign in again.' });
    return;
  }

  if (new Date(row.expires_at).getTime() < Date.now()) {
    db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash);
    res.status(401).json({ error: 'Session expired. Please sign in again.' });
    return;
  }

  req.user = {
    id: row.id,
    email: row.email,
    full_name: row.full_name,
    role: row.role,
    created_at: row.created_at,
  };
  next();
}
