import 'dotenv/config';

export const CLOUDINARY_URL = process.env.CLOUDINARY_URL as string;
export const DATABASE_URL = process.env.DATABASE_URL as string;
export const FRONTEND_URL = process.env.FRONTEND_URL as string;
export const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID as string;
export const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET as string;
export const JWT_SECRET = process.env.JWT_SECRET as string;
export const PORT = process.env.PORT ?? 3000;

if (
  !CLOUDINARY_URL ||
  !DATABASE_URL ||
  !FRONTEND_URL ||
  !GITHUB_CLIENT_ID ||
  !GITHUB_CLIENT_SECRET ||
  !JWT_SECRET
) {
  throw new Error('Missing environment variables');
}
