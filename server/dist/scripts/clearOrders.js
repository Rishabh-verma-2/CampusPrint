"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * One-shot cleanup script — deletes all PrintJob and Payment records.
 * Run once: npx ts-node src/scripts/clearOrders.ts
 */
require("../config/env"); // load .env before anything else
const mongoose_1 = __importDefault(require("mongoose"));
const env_1 = require("../config/env");
async function clearOrders() {
    console.log('Connecting to MongoDB...');
    await mongoose_1.default.connect(env_1.env.MONGO_URI);
    console.log('Connected.');
    // Dynamically import models AFTER mongoose is connected
    const { PrintJob } = await Promise.resolve().then(() => __importStar(require('../models/PrintJob')));
    const { Payment } = await Promise.resolve().then(() => __importStar(require('../models/Payment')));
    const [jobResult, paymentResult] = await Promise.all([
        PrintJob.deleteMany({}),
        Payment.deleteMany({}),
    ]);
    console.log(`Deleted ${jobResult.deletedCount} PrintJob documents`);
    console.log(`Deleted ${paymentResult.deletedCount} Payment documents`);
    console.log('Done. All orders cleared.');
    await mongoose_1.default.disconnect();
    process.exit(0);
}
clearOrders().catch((err) => {
    console.error('Error clearing orders:', err);
    process.exit(1);
});
//# sourceMappingURL=clearOrders.js.map