import mongoose from "mongoose";

import { ENV } from "./env.js";

let cachedConnection = null;

export const connectDB = async () => {
  if (cachedConnection) {
    console.log("[DEBUG] Using cached MongoDB connection");
    return cachedConnection;
  }

  try {
    if (!ENV.DB_URL) {
      console.error("❌ CRITICAL: DB_URL is not defined in environment variables!");
      throw new Error("DB_URL is missing");
    }

    console.log("[DEBUG] Connecting to MongoDB...");
    // disable buffering to fail fast on cold starts if connection is not ready
    mongoose.set("bufferCommands", false);

    const conn = await mongoose.connect(ENV.DB_URL, {
      serverSelectionTimeoutMS: 5000, // fail after 5s instead of default 30s
    });

    cachedConnection = conn;
    console.log("✅ Connected to MongoDB:", conn.connection.host);
    return conn;
  } catch (error) {
    console.error("❌ CRITICAL: Error connecting to MongoDB:", {
      message: error.message,
      stack: error.stack,
      urlDefined: !!ENV.DB_URL
    });
    throw error;
  }
};
