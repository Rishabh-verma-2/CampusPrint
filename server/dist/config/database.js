"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDatabase = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const env_1 = require("./env");
const connectDatabase = async (retries = 5, delay = 5000) => {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const conn = await mongoose_1.default.connect(env_1.env.MONGO_URI, {
                serverSelectionTimeoutMS: 5000,
            });
            console.log(`✅ MongoDB connected: ${conn.connection.host}`);
            return;
        }
        catch (error) {
            console.error(`❌ MongoDB connection attempt ${attempt}/${retries} failed:`, error?.message || error);
            if (attempt < retries) {
                console.log(`⏳ Retrying in ${delay / 1000}s... (Ensure your IP is whitelisted in MongoDB Atlas Network Access)`);
                await new Promise((res) => setTimeout(res, delay));
            }
            else {
                console.error('\n⚠️ Could not connect to MongoDB Atlas after multiple attempts.');
                console.error('👉 TIP: Open MongoDB Atlas -> Security -> Network Access -> Add IP Address (allow current IP or 0.0.0.0/0).\n');
                process.exit(1);
            }
        }
    }
};
exports.connectDatabase = connectDatabase;
mongoose_1.default.connection.on('disconnected', () => {
    console.warn('⚠️  MongoDB disconnected');
});
mongoose_1.default.connection.on('error', (err) => {
    console.error('❌ MongoDB error:', err);
});
//# sourceMappingURL=database.js.map