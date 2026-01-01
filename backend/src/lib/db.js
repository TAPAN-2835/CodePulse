import mongoose from "mongoose";

import { ENV } from "./env.js";

export const connectDB = async () => {
  try {
    if (!ENV.DB_URL) {
      console.error("❌ CRITICAL: DB_URL is not defined in environment variables!");
      throw new Error("DB_URL is missing");
    }

    console.log("[DEBUG] Connecting to MongoDB...");
    const conn = await mongoose.connect(ENV.DB_URL);
    console.log("✅ Connected to MongoDB:", conn.connection.host);
  } catch (error) {
    console.error("❌ CRITICAL: Error connecting to MongoDB:", {
      message: error.message,
      stack: error.stack,
      urlDefined: !!ENV.DB_URL
    });
    throw error;
  }
};
