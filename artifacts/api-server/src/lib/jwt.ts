import jwt from 'jsonwebtoken';

const SECRET = process.env.SESSION_SECRET ?? 'crm-dialer-secret-key-2024';
const EXPIRES = '7d';

export interface JwtPayload {
  id: number;
  username: string;
  role: 'admin' | 'agent';
  name: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, SECRET) as JwtPayload;
}
