import jwt from 'jsonwebtoken';

import { env } from '../config/env.js';

export type AuthRole = 'admin' | 'vendor' | 'member';

export interface AuthTokenPayload {
  sub: string;
  role: AuthRole;
  userId: number | string;
}

export const signToken = (payload: AuthTokenPayload): string => {
  // 2. Use jwt.sign
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as any,
  } as any);
};
export const verifyToken = (token: string): AuthTokenPayload => {
  // 3. Use jwt.verify
  return jwt.verify(token, env.JWT_SECRET) as AuthTokenPayload;
};