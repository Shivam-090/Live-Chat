import express from "express";
import { protectRoute } from "../lib/middleware/auth.middleware";

const router = express.Router()

//apply protectRoute middleware to all routes below
router.use(protectRoute);

router.get("/", getRecommendedUsers);
router.get("/friends", getMyFriends);
router.post("/friend-request/:id", sendFriendRequest);
router.put("/accept-friend-request/:id", acceptFriendRequest);
export default router