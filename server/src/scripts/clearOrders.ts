/**
 * One-shot cleanup script — deletes all PrintJob and Payment records.
 * Run once: npx ts-node src/scripts/clearOrders.ts
 */
import '../config/env'; // load .env before anything else
import mongoose from 'mongoose';
import { env } from '../config/env';

async function clearOrders(): Promise<void> {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(env.MONGO_URI);
  console.log('Connected.');

  // Dynamically import models AFTER mongoose is connected
  const { PrintJob } = await import('../models/PrintJob');
  const { Payment } = await import('../models/Payment');

  const [jobResult, paymentResult] = await Promise.all([
    PrintJob.deleteMany({}),
    Payment.deleteMany({}),
  ]);

  console.log(`Deleted ${jobResult.deletedCount} PrintJob documents`);
  console.log(`Deleted ${paymentResult.deletedCount} Payment documents`);
  console.log('Done. All orders cleared.');

  await mongoose.disconnect();
  process.exit(0);
}

clearOrders().catch((err) => {
  console.error('Error clearing orders:', err);
  process.exit(1);
});
