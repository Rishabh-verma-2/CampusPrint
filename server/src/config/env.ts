import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const required = (key: string): string => {
  const val = process.env[key];
  if (!val) {
    console.warn(`⚠️  Missing env var: ${key} (using default or empty)`);
    return '';
  }
  return val;
};

const optional = (key: string, fallback: string = ''): string => {
  return process.env[key] ?? fallback;
};

export const env = {
  NODE_ENV: optional('NODE_ENV', 'development'),
  PORT: parseInt(optional('PORT', '5001'), 10),

  MONGO_URI: optional('MONGO_URI', 'mongodb://localhost:27017/campusprint'),

  JWT_SECRET: optional('JWT_SECRET', 'campusprint_dev_jwt_secret_change_in_prod'),
  JWT_EXPIRES_IN: optional('JWT_EXPIRES_IN', '7d'),
  JWT_REFRESH_SECRET: optional('JWT_REFRESH_SECRET', 'campusprint_dev_refresh_secret_change_in_prod'),
  JWT_REFRESH_EXPIRES_IN: optional('JWT_REFRESH_EXPIRES_IN', '30d'),

  CLIENT_URL: optional('CLIENT_URL', 'http://localhost:5173'),

  CLOUDINARY_CLOUD_NAME: optional('CLOUDINARY_CLOUD_NAME', ''),
  CLOUDINARY_API_KEY: optional('CLOUDINARY_API_KEY', ''),
  CLOUDINARY_API_SECRET: optional('CLOUDINARY_API_SECRET', ''),

  CASHFREE_APP_ID: optional('CASHFREE_APP_ID', ''),
  CASHFREE_SECRET_KEY: optional('CASHFREE_SECRET_KEY', ''),
  CASHFREE_ENV: optional('CASHFREE_ENV', 'TEST'),
  CASHFREE_API_VERSION: optional('CASHFREE_API_VERSION', '2025-01-01'),

  // Public URLs used to build return_url and notify_url for Cashfree
  BACKEND_URL: optional('BACKEND_URL', 'http://localhost:5001'),
  FRONTEND_URL: optional('FRONTEND_URL', 'http://localhost:5173'),

  RESEND_API_KEY: optional('RESEND_API_KEY', ''),

  SOCKET_CORS_ORIGIN: optional('SOCKET_CORS_ORIGIN', 'http://localhost:5173'),

  UPLOADS_DIR: optional('UPLOADS_DIR', 'uploads'),

  isProd: () => process.env.NODE_ENV === 'production',
  isDev: () => process.env.NODE_ENV !== 'production',
};
