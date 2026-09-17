"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const path_1 = __importDefault(require("path"));
const env_1 = require("./config/env");
const errorHandler_1 = require("./middleware/errorHandler");
// Routes
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const documentRoutes_1 = __importDefault(require("./routes/documentRoutes"));
const vendorRoutes_1 = __importDefault(require("./routes/vendorRoutes"));
const printJobRoutes_1 = __importDefault(require("./routes/printJobRoutes"));
const paymentRoutes_1 = __importDefault(require("./routes/paymentRoutes"));
const adminRoutes_1 = __importDefault(require("./routes/adminRoutes"));
const notificationRoutes_1 = __importDefault(require("./routes/notificationRoutes"));
const app = (0, express_1.default)();
// ─── Security ─────────────────────────────────────────────────────────────────
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow serving files
}));
app.use((0, cors_1.default)({
    origin: env_1.env.CLIENT_URL.split(',').map((s) => s.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}));
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: env_1.env.isDev() ? 10000 : 200,
    message: { success: false, message: 'Too many requests', code: 'RATE_LIMIT' },
});
app.use('/api', limiter);
// ─── Body Parsing ──────────────────────────────────────────────────────────────
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
app.use((0, cookie_parser_1.default)());
// ─── Static Files (local uploads in dev) ──────────────────────────────────────
app.use('/uploads', express_1.default.static(path_1.default.resolve(process.cwd(), env_1.env.UPLOADS_DIR || 'uploads')));
// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes_1.default);
app.use('/api/documents', documentRoutes_1.default);
app.use('/api/vendors', vendorRoutes_1.default);
app.use('/api/print-jobs', printJobRoutes_1.default);
app.use('/api/payments', paymentRoutes_1.default);
app.use('/api/admin', adminRoutes_1.default);
app.use('/api/notifications', notificationRoutes_1.default);
// ─── Health Check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
    res.json({ success: true, message: 'CampusPrint API running', timestamp: new Date().toISOString() });
});
// ─── Error Handler ─────────────────────────────────────────────────────────────
app.use(errorHandler_1.errorHandler);
exports.default = app;
//# sourceMappingURL=app.js.map