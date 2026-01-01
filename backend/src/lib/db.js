import mongoose from "mongoose";

import { ENV } from "./env.js";

export const connectDB = async () => {
  try {
    if (!ENV.DB_URL) {
      throw new Error("DB_URL is not defined in environment variables");
    }
    const conn = await mongoose.connect(ENV.DB_URL);
    console.log("✅ Connected to MongoDB:", conn.connection.host);
  } catch (error) {
    console.error("❌ CRITICAL: Error connecting to MongoDB:", {
      message: error.message,
      url: ENV.DB_URL ? "Defined (Hidden)" : "UNDEFINED"
    });
    // In a serverless function, we might not want to process.exit(1) as it could kill the container for others
    // but on Vercel it's usually fine to throw and let the function fail
    throw error;
  }
};
