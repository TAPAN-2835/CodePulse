import express from "express";
import path from "path";
import cors from "cors";
import { serve } from "inngest/express";
import { clerkMiddleware } from "@clerk/express";

import { ENV } from "./lib/env.js";
import { connectDB } from "./lib/db.js";
import { inngest, functions } from "./lib/inngest.js";

import chatRoutes from "./routes/chatRoutes.js";
import sessionRoutes from "./routes/sessionRoute.js";

const app = express();

const __dirname = path.resolve();

// debug logging for all requests - MOVE TO TOP
app.use((req, res, next) => {
  console.log(`[DEBUG] ${req.method} ${req.url}`);
  next();
});

// middleware
app.use(express.json());
// credentials:true meaning?? => server allows a browser to include cookies on request
const allowedOrigins = [ENV.CLIENT_URL, "http://localhost:5173", "https://code-pulse-tau.vercel.app"].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== "production") {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);
app.use(clerkMiddleware()); // this adds auth field to request object: req.auth()

app.use("/api/inngest", serve({ client: inngest, functions }));
app.use("/api/chat", chatRoutes);
app.use("/api/sessions", sessionRoutes);

app.get("/api/test", (req, res) => {
  res.status(200).json({ status: "ok", message: "API is accessible" });
});

app.get("/health", (req, res) => {
  res.status(200).json({ msg: "api is up and running" });
});

// make our app ready for deployment
if (ENV.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/dist")));

  app.get("/{*any}", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend", "dist", "index.html"));
  });
}

const startServer = async () => {
  try {
    await connectDB();
    if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
      app.listen(ENV.PORT, () => console.log("Server is running on port:", ENV.PORT));
    }
  } catch (error) {
    console.error("💥 Error starting the server", error);
  }
};

if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
  startServer();
} else {
  // in production/vercel, we still need to connect to DB
  connectDB().catch(err => console.error("Database connection failed", err));
}

export default app;
