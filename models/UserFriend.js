const mongoose = require("mongoose");
const userFriendSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  friendId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  status: {
    type: Number,
    default: 0,
  },

});

const UserFriend = mongoose.model("UserFriend", userFriendSchema);

module.exports = UserFriend;