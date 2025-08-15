import { JwtPayload } from 'jsonwebtoken';

const parseJWTPayload = (payload: string | JwtPayload) => {
  if (typeof payload === 'string' || typeof payload.id !== 'number') {
    throw new Error('Invalid token');
  }

  return payload.id;
};

export default parseJWTPayload;
