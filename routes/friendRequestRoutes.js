const express = require("express");
const router = express.Router();
const FriendRequestController = require("../controllers/friendRequestController");

// ================= Friend Request Routes =====================

router.get("/getAllFriendRequests", FriendRequestController.getAllRequests);
router.get("/getAllUsers", FriendRequestController.allUsers);
router.get("/userFriends", FriendRequestController.userFriends);

router.post("/sendFriendRequest", FriendRequestController.sendFriendRequest);
router.post(
  "/acceptFriendRequest",
  FriendRequestController.acceptFriendRequest
);
router.post(
  "/rejectFriendRequest",
  FriendRequestController.rejectFriendRequest
);
router.post("/unFriend", FriendRequestController.unFriendUser);
router.post("/checkFriend", FriendRequestController.checkFriend);

module.exports = router;