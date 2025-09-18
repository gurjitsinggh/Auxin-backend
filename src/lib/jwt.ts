import jwt, { SignOptions } from 'jsonwebtoken';
import { IUser } from '../models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Ensure JWT_SECRET is a string
const secretKey: string = typeof JWT_SECRET === 'string' ? JWT_SECRET : 'fallback-secret-key';

export interface JWTPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

export const generateToken = (user: IUser): string => {
  const payload: JWTPayload = {
    userId: user._id,
    email: user.email
  };

  const options: SignOptions = {
    expiresIn: JWT_EXPIRES_IN as any
  };

  return jwt.sign(payload, secretKey, options);
};

export const verifyToken = (token: string): JWTPayload => {
  try {
    return jwt.verify(token, secretKey) as JWTPayload;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

export const generateRefreshToken = (user: IUser): string => {
  const payload = {
    userId: user._id,
    type: 'refresh'
  };

  const options: SignOptions = {
    expiresIn: '30d' as any
  };

  return jwt.sign(payload, secretKey, options);
};

// Decode JWT token without verification (for debugging/inspection)
export const decodeToken = (token: string): JWTPayload | null => {
  try {
    return jwt.decode(token) as JWTPayload;
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
};

// Check if token is expired (without verification)
export const isTokenExpired = (token: string): boolean => {
  try {
    const decoded = jwt.decode(token) as JWTPayload;
    if (!decoded || !decoded.exp) return true;
    
    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp < currentTime;
  } catch (error) {
    return true;
  }
};

// Get token expiration date
export const getTokenExpiration = (token: string): Date | null => {
  try {
    const decoded = jwt.decode(token) as JWTPayload;
    if (!decoded || !decoded.exp) return null;
    
    return new Date(decoded.exp * 1000);
  } catch (error) {
    return null;
  }
};
