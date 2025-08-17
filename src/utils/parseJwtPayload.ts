import type { JwtPayload } from 'jsonwebtoken';

const parseJWTPayload = (payload: string | JwtPayload): number => {
  if (typeof payload === 'string' || typeof payload.id !== 'number') {
    throw new Error('Invalid token');
  }

  return payload.id;
};

export default parseJWTPayload;
