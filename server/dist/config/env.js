"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../.env') });
const required = (key) => {
    const val = process.env[key];
    if (!val) {
        console.warn(`⚠️  Missing env var: ${key} (using default or empty)`);
        return '';
    }
    return val;
};
const optional = (key, fallback = '') => {
    return process.env[key] ?? fallback;
};
exports.env = {
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
    RESEND_API_KEY: optional('RESEND_API_KEY', ''),
    SOCKET_CORS_ORIGIN: optional('SOCKET_CORS_ORIGIN', 'http://localhost:5173'),
    UPLOADS_DIR: optional('UPLOADS_DIR', 'uploads'),
    isProd: () => process.env.NODE_ENV === 'production',
    isDev: () => process.env.NODE_ENV !== 'production',
};
//# sourceMappingURL=env.js.map