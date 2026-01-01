import { createClerkClient, requireAuth } from "@clerk/express";
import User from "../models/User.js";
import { upsertStreamUser } from "../lib/stream.js";

const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

export const protectRoute = [
  requireAuth(),
  async (req, res, next) => {
    try {
      const clerkId = req.auth().userId;

      if (!clerkId) return res.status(401).json({ message: "Unauthorized - invalid token" });

      // find user in db by clerk ID
      let user = await User.findOne({ clerkId });

      // if user not found, sync from Clerk
      if (!user) {
        console.log("User not found in DB, syncing from Clerk:", clerkId);
        try {
          const clerkUser = await clerkClient.users.getUser(clerkId);
          if (clerkUser) {
            user = await User.create({
              clerkId: clerkUser.id,
              email: clerkUser.emailAddresses[0]?.emailAddress,
              name: `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || clerkUser.username || "User",
              profileImage: clerkUser.imageUrl,
            });

            // also sync to stream
            await upsertStreamUser({
              id: user.clerkId,
              name: user.name,
              image: user.profileImage,
            });

            console.log("User successfully synced from Clerk:", clerkId);
          }
        } catch (clerkError) {
          console.error("Error fetching user from Clerk:", clerkError);
          return res.status(404).json({ message: "User not found and sync failed" });
        }
      }

      if (!user) return res.status(404).json({ message: "User not found" });

      // attach user to req
      req.user = user;

      next();
    } catch (error) {
      console.error("Error in protectRoute middleware", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  },
];
