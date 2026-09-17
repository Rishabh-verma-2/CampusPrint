import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import path from 'path';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';

// Routes
import authRoutes from './routes/authRoutes';
import documentRoutes from './routes/documentRoutes';
import vendorRoutes from './routes/vendorRoutes';
import printJobRoutes from './routes/printJobRoutes';
import paymentRoutes from './routes/paymentRoutes';
import adminRoutes from './routes/adminRoutes';
import notificationRoutes from './routes/notificationRoutes';

const app = express();

// ─── Security ─────────────────────────────────────────────────────────────────

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow serving files
  })
);

app.use(
  cors({
    origin: env.CLIENT_URL.split(',').map((s) => s.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  })
);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.isDev() ? 10000 : 200,
  message: { success: false, message: 'Too many requests', code: 'RATE_LIMIT' },
});
app.use('/api', limiter);

// ─── Body Parsing ──────────────────────────────────────────────────────────────

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ─── Static Files (local uploads in dev) ──────────────────────────────────────

app.use(
  '/uploads',
  express.static(path.resolve(process.cwd(), env.UPLOADS_DIR || 'uploads'))
);

// ─── API Routes ───────────────────────────────────────────────────────────────

app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/print-jobs', printJobRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);

// ─── Health Check ──────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({ success: true, message: 'CampusPrint API running', timestamp: new Date().toISOString() });
});

// ─── Error Handler ─────────────────────────────────────────────────────────────

app.use(errorHandler);

export default app;
