import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkeyforwhatsappblast';

export interface TokenPayload {
  userId: string;
  roleId: number;
}

export const generateToken = (payload: TokenPayload, expiresIn: string | number = '1d'): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: expiresIn as any });
};

export const verifyToken = (token: string): TokenPayload | null => {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (error) {
    return null;
  }
};
