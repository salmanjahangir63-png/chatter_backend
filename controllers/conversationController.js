const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const moment = require("moment");
var objectIdValidation = require("../middleware/validation");
const commonResponse = require("../utils/commonResponse");
const ConversationType = require("../models/enum/ConversationType");



// ==================== Send Message =======================

exports.sendMessage = async (req, res, next) => {
    const sender = req.body.sender;
    const conversationId = req.body.conversationId;
    const receiver = req.body.receiver;
    var content = req.body.content;

    console.log(req.body);

    const type = req.body.type;
    if (!content) {
        content = req.file.filename;
    }
    if (type === ConversationType.PRIVATE) {
        if (conversationId) {
            var singleConversation = await Conversation.findById(conversationId);
            if (singleConversation) {
                try {
                    singleConversation.content = content;
                    singleConversation.timestamp = new Date();

                    const message = await Message.create({
                        sender: sender,
                        receiver: receiver,
                        content: content,
                    });
                    await singleConversation.save();

                    return res
                        .status(200)
                        .send(
                            commonResponse.createSuccessResponse("Message sent", message)
                        );
                } catch (error) {
                    return res
                        .status(500)
                        .send(
                            commonResponse.createErrorResponse(
                                "Error in sending message " + error
                            )
                        );
                }
            } else {
                try {
                    await Conversation.create({
                        type: type,
                        sender: sender,
                        receiver: receiver,
                        content: content,
                    });
                    const message = await Message.create({
                        sender: sender,
                        receiver: receiver,
                        content: content,
                    });
                    return res
                        .status(200)
                        .send(
                            commonResponse.createSuccessResponse("Message sent", message)
                        );
                } catch (error) {
                    return res
                        .status(500)
                        .send(
                            commonResponse.createErrorResponse(
                                "Error in sending message " + error
                            )
                        );
                }
            }
        } else {
            var singleConversation = await Conversation.findOne({
                $or: [
                    { $and: [{ sender: sender }, { receiver: receiver }] },
                    { $and: [{ sender: receiver }, { receiver: sender }] },
                ],
            });
            if (singleConversation) {
                try {
                    singleConversation.content = content;
                    singleConversation.timestamp = new Date();

                    const message = await Message.create({
                        sender: sender,
                        receiver: receiver,
                        content: content,
                    });
                    await singleConversation.save();

                    return res
                        .status(200)
                        .send(
                            commonResponse.createSuccessResponse("Message sent", message)
                        );
                } catch (error) {
                    return res
                        .status(500)
                        .send(
                            commonResponse.createErrorResponse(
                                "Error in sending message " + error
                            )
                        );
                }
            } else {
                try {
                    await Conversation.create({
                        type: type,
                        sender: sender,
                        receiver: receiver,
                        content: content,
                    });
                    const message = await Message.create({
                        sender: sender,
                        receiver: receiver,
                        content: content,
                    });
                    return res
                        .status(200)
                        .send(
                            commonResponse.createSuccessResponse("Message sent", message)
                        );
                } catch (error) {
                    return res
                        .status(500)
                        .send(
                            commonResponse.createErrorResponse(
                                "Error in sending message " + error
                            )
                        );
                }
            }
        }
    }
};

// =================== Get all Conversations =======================

exports.getAllConversations = (req, res, next) => {

    const userId = req.user._id;
    Conversation.find({
        $or: [
            { sender: userId },
            { receiver: userId },
            { members: { $in: [userId] } },
        ],
    })
       . populate({
            path: "members",
            select: "name profileImage",
        })
        .populate({
            path: "sender receiver",
            select: "name profileImage",
        })
        .then((conversations) => {
            const formattedConversations = conversations.map((conversation) => {
                const calTimeAgo = moment(conversation.timestamp).fromNow();
                const timeAgo =
                    calTimeAgo === "a few seconds ago" ? "Just now" : calTimeAgo;
                return {
                    ...conversation.toObject(),
                    timeAgo,
                };
            });
            return res
                .status(200)
                .send(
                    commonResponse.createSuccessResponse(
                        "All conversations fetched!",
                        formattedConversations
                    )
                );
        })
        .catch((error) => {
            return res
                .status(500)
                .send(
                    commonResponse.createErrorResponse(
                        "Error in fetching all conversations " + error
                    )
                );
        });
};

// ================== Get all messages =====================

exports.getAllMessages = (req, res, next) => {

    const conversationId = req.query.conversationId;

    if (!conversationId) {
        return res
            .status(200)
            .send(
                commonResponse.createSuccessResponse(
                    "No message yet",
                    []
                )
            );
    }
    Message.find({ conversation: conversationId })
        .populate({
            path: "members",
            select: "name profileImage",
        })
        // .populate({
        //     path: "sender receiver",
        //     select: "name profileImage",
        // })
        .then((messages) => {
            const formattedMessages = messages.map((message) => {
                const calTimeAgo = moment(message.timestamp).fromNow();
                const timeAgo =
                    calTimeAgo === "a few seconds ago" ? "Just now" : calTimeAgo;
                return {
                    ...message.toObject(),
                    timeAgo,
                };
            });
            return res
                .status(200)
                .send(
                    commonResponse.createSuccessResponse(
                        "All messages fetched!",
                        formattedMessages
                    )
                );
        })
        .catch((error) => {
            return res
                .status(500)
                .send(
                    commonResponse.createErrorResponse(
                        "Error in fetching all messages " + error
                    )
                );
        });

};

// ================== Delete Message ===========================

exports.deleteMessage = async (req, res, next) => {
    const sender = req.user._id;
    const receiver = req.body.receiver;
    const event = req.body.eventId;
    try {
        await Message.findOneAndDelete({
            $or: [
                { $and: [{ sender: sender }, { receiver: receiver }] },
                { $and: [{ sender: receiver }, { receiver: sender }] },
                { event: event },
            ],
        });
        const lastMessage = await Message.find({
            $or: [
                { $and: [{ sender: sender }, { receiver: receiver }] },
                { $and: [{ sender: receiver }, { receiver: sender }] },
                { event: event },
            ],
        }).sort({ createdAt: -1 });

        const conversatoin = await Conversation.findOneAndUpdate({
            $or: [
                { $and: [{ sender: sender }, { receiver: receiver }] },
                { $and: [{ sender: receiver }, { receiver: sender }] },
                { event: event },
            ],
        });
        conversatoin.content = lastMessage.content;
        conversatoin.timestamp = new Date();
        await conversatoin.save();
    } catch (error) {
        console.error("Error retrieving last message:", error);
    }
};

// ================== Delete Conversation ======================
exports.deleteConversation = async (req, res, next) => {
    const event = req.body.eventId;
    const sender = req.body.sender;
    const receiver = req.body.receiver;
    try {
        // Delete the conversation
        await Conversation.findOneAndDelete({
            $or: [
                { $and: [{ sender: sender }, { receiver: receiver }] },
                { $and: [{ sender: receiver }, { receiver: sender }] },
                { event: event },
            ],
        });

        await Message.deleteMany({
            $or: [
                { $and: [{ sender: sender }, { receiver: receiver }] },
                { $and: [{ sender: receiver }, { receiver: sender }] },
                { event: event },
            ],
        });
    } catch (error) {
        res.status(500).send(commonResponse.createErrorResponse(error));
    }
};