const mongoose = require("mongoose");
var mongoosePaginate = require("mongoose-paginate-v2");
const ConversationType = require("../models/enum/ConversationType");

const conversationSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: Object.values(ConversationType),
        required: true,
    },
    event: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Event",
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    receiver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
    members: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
    ],
    content: {
        type: String,
        required: true,
    },
    unreadCounts: {
        type: Map,
        of: Number,
        default: {},
    },
    readBy: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
    ],
    timestamp: {
        type: Date,
        default: Date.now,
    },
});

conversationSchema.plugin(mongoosePaginate);
const Conversation = mongoose.model("Conversation", conversationSchema);

module.exports = Conversation;