import { createClerkClient, requireAuth } from "@clerk/express";
import User from "../models/User.js";
import { upsertStreamUser } from "../lib/stream.js";

const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

export const protectRoute = [
  requireAuth(),
  async (req, res, next) => {
    try {
      const clerkId = req.auth().userId;
      console.log("[DEBUG] protectRoute - clerkId:", clerkId);

      if (!clerkId) {
        console.log("[DEBUG] protectRoute - No clerkId found in req.auth()");
        return res.status(401).json({ message: "Unauthorized - invalid token" });
      }

      // find user in db by clerk ID
      let user = await User.findOne({ clerkId });
      console.log("[DEBUG] protectRoute - User found in DB:", !!user);

      // if user not found, sync from Clerk
      if (!user) {
        console.log("[DEBUG] protectRoute - Syncing user from Clerk:", clerkId);
        try {
          const clerkUser = await clerkClient.users.getUser(clerkId);
          console.log("[DEBUG] protectRoute - Clerk user fetched successfully:", !!clerkUser);

          if (clerkUser) {
            const email = clerkUser.emailAddresses[0]?.emailAddress;

            // Check if user exists by email (to handle duplicate key error)
            user = await User.findOne({ email });

            if (user) {
              console.log("[DEBUG] protectRoute - User found by email, updating clerkId:", email);
              user.clerkId = clerkId;
              user.name = `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || clerkUser.username || "User";
              user.profileImage = clerkUser.imageUrl;
              await user.save();
            } else {
              console.log("[DEBUG] protectRoute - Creating new user in DB");
              user = await User.create({
                clerkId: clerkUser.id,
                email: email,
                name: `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || clerkUser.username || "User",
                profileImage: clerkUser.imageUrl,
              });
            }
            console.log("[DEBUG] protectRoute - User record ready:", user._id);

            // also sync to stream
            await upsertStreamUser({
              id: user.clerkId,
              name: user.name,
              image: user.profileImage,
            });
            console.log("[DEBUG] protectRoute - User synced to Stream");
          }
        } catch (clerkError) {
          console.error("[DEBUG] protectRoute - Error in sync process:", clerkError.message);
          return res.status(500).json({ message: "User sync failed", debug: clerkError.message });
        }
      }

      if (!user) {
        console.log("[DEBUG] protectRoute - User still not found after sync attempt");
        return res.status(404).json({ message: "User not found" });
      }

      // attach user to req
      req.user = user;
      console.log("[DEBUG] protectRoute - Successfully attached user to req");

      next();
    } catch (error) {
      console.error("CRITICAL: Error in protectRoute middleware:", {
        message: error.message,
        stack: error.stack,
        clerkId: req.auth()?.userId
      });
      res.status(500).json({
        message: "Internal Server Error in protectRoute",
        error: process.env.NODE_ENV === "development" ? error.message : undefined
      });
    }
  },
];
