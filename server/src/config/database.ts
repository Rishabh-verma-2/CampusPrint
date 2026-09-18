import mongoose from 'mongoose';
import { env } from './env';

export const connectDatabase = async (retries = 5, delay = 5000): Promise<void> => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const conn = await mongoose.connect(env.MONGO_URI, {
        serverSelectionTimeoutMS: 5000,
      });
      console.log(`✅ MongoDB connected: ${conn.connection.host}`);
      return;
    } catch (error: any) {
      console.error(`❌ MongoDB connection attempt ${attempt}/${retries} failed:`, error?.message || error);
      if (attempt < retries) {
        console.log(`⏳ Retrying in ${delay / 1000}s... (Ensure your IP is whitelisted in MongoDB Atlas Network Access)`);
        await new Promise((res) => setTimeout(res, delay));
      } else {
        console.error('\n⚠️ Could not connect to MongoDB Atlas after multiple attempts.');
        console.error('👉 TIP: Open MongoDB Atlas -> Security -> Network Access -> Add IP Address (allow current IP or 0.0.0.0/0).\n');
        process.exit(1);
      }
    }
  }
};

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB error:', err);
});
