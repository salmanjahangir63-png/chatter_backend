const mongoose = require("mongoose");
const FriendRequestStatus = require('./enum/FriendRequestStatus');

const friendRequestSchema = new mongoose.Schema({
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    receiver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    message: { type: String },
    status: {
        type: String,
        enum: Object.values(FriendRequestStatus),
        default: FriendRequestStatus.PENDING
    }

});


const FriendRequest = mongoose.model("FriendRequest", friendRequestSchema);

module.exports = FriendRequest;