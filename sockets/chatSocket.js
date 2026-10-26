const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const moment = require("moment");
const fcmNotification = require('../utils/fcmNotifications')
// Runs once per client connection. The client must send its JWT token
// when connecting (see README for the client-side example), the same
// token they got from /api/auth/login or /api/auth/register.
//

function initChatSocket(io) {
  // Runs before "connection" — rejects the socket entirely if the token
  // is missing or invalid, so no unauthenticated client reaches the app.
  io.use(async (socket, next) => {
    try {
      const authHeader = socket.handshake.headers.authorization;

      const token = authHeader?.startsWith("Bearer ")
        ? authHeader.substring(7)
        : null;

      if (!token) return next(new Error('Authentication token missing'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (!user) return next(new Error('User no longer exists'));

      socket.user = { id: user._id.toString(), name: user.name };
      next();
    } catch (error) {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`${socket.user.name} connected (${socket.id})`);


    socket.join(socket.user.id);



    socket.on('sendMessage', async ({ recipientId, content, type }) => {
      try {
        if (
          !recipientId ||
          typeof content !== 'string' ||
          !content.trim()
        ) {
          console.log('Invalid message: recipientId or content is missing.');
          return;
        }

        const senderId = String(socket.user.id);
        recipientId = String(recipientId);

        // Find an existing conversation between sender and receiver
        const singleConversation = await Conversation.findOne({
          $or: [
            {
              sender: socket.user.id,
              receiver: recipientId,
            },
            {
              sender: recipientId,
              receiver: socket.user.id,
            },
          ],
        });

        let conversationId;
        let message;

        if (singleConversation) {
          conversationId = singleConversation._id;

          const conversationRoom = `conversation:${conversationId}`;

          // Check whether receiver is viewing this conversation
          const roomSockets = await io
            .in(conversationRoom)
            .fetchSockets();

          const receiverIsInChat = roomSockets.some(
            (s) => String(s.data.userId) === recipientId
          );

          console.log('Receiver ID:', recipientId);
          console.log('Receiver is in chat:', receiverIsInChat);

          // Increment unread count if receiver is not viewing the chat
          if (!receiverIsInChat) {
            const updateResult = await Conversation.updateOne(
              { _id: conversationId },
              {
                $inc: {
                  [`unreadCounts.${recipientId}`]: 1,
                },
              }
            );

            console.log('Unread count increment result:', updateResult);
          }

          // Update conversation preview without saving a stale document
          await Conversation.updateOne(
            { _id: conversationId },
            {
              $set: {
                content: content.trim(),
                timestamp: new Date(),
              },
            }
          );

          // Create the message
          message = await Message.create({
            sender: socket.user.id,
            receiver: recipientId,
            content: content.trim(),
            conversation: conversationId,
          });

        } else {
          // Create a new conversation
          const newConversation = await Conversation.create({
            type: type || 'private',
            sender: socket.user.id,
            receiver: recipientId,
            content: content.trim(),
            timestamp: new Date(),
            readBy: [socket.user.id],
            unreadCounts: {
              [recipientId]: 1,
              [senderId]: 0,
            },
          });

          conversationId = newConversation._id;

          // Create the first message
          message = await Message.create({
            sender: socket.user.id,
            receiver: recipientId,
            content: content.trim(),
            conversation: conversationId,
          });
        }

        // Fetch the latest populated conversation
        const conversationDoc = await Conversation.findById(conversationId)
          .populate('members', 'name profileImage')
          .populate('sender receiver', 'name profileImage fcmToken');

        if (!conversationDoc) {
          throw new Error('Conversation not found after updating.');
        }

        // Fetch unreadCounts directly from MongoDB
        const rawConversation = await Conversation.collection.findOne(
          { _id: conversationDoc._id },
          {
            projection: {
              unreadCounts: 1,
            },
          }
        );

        // Convert Map fields to plain objects and build the payload
        const conversationPayload = {
          ...conversationDoc.toObject({ flattenMaps: true }),
          unreadCounts: rawConversation?.unreadCounts || {},
          timeAgo: (() => {
            const value = moment(conversationDoc.timestamp).fromNow();
            return value === 'a few seconds ago' ? 'Just now' : value;
          })(),
        };

        console.log(
          'Unread counts directly from MongoDB:',
          rawConversation?.unreadCounts
        );

        console.log(
          'Unread counts sent in payload:',
          conversationPayload.unreadCounts
        );
        const conversationRoom = `conversation:${conversationId}`;

        // Check whether receiver is viewing this conversation
        const roomSockets = await io
          .in(conversationRoom)
          .fetchSockets();

        const receiverIsInChat = roomSockets.some(
          (s) => String(s.data.userId) === recipientId
        );
        if (conversationDoc.receiver.fcmToken) {
          if (!receiverIsInChat) {
            void fcmNotification
              .sendNotification(
                conversationDoc.receiver.fcmToken,
                "New message",
                `${conversationDoc.sender.name} sent you a message`,
                {
                  type: 'chat',
                  conversation: JSON.stringify(conversationDoc),
                }
              )
              .catch((error) => {
                console.error("Failed to send chat notification:", error);
              });
          }

        }

        // Notify receiver about the message
        io.to(recipientId).emit('receiveMessage', {
          result: 'success',
          message: 'Message received',
          data: message,
        });

        // Update receiver's conversation list
        io.to(recipientId).emit(
          'conversationUpdated',
          conversationPayload
        );

        // Confirm message to sender
        socket.emit('receiveMessage', {
          result: 'success',
          message: 'Message sent',
          data: message,
        });

        // Update sender's conversation list
        socket.emit('conversationUpdated', conversationPayload);


      } catch (error) {
        console.error('Error sending message:', error);

        socket.emit('receiveMessage', {
          result: 'error',
          message: 'Error sending message',
          data: null,
        });
      }
    });




    socket.on('joinConversation', async ({ conversationId }) => {
      try {
        if (!conversationId) return;

        const conversation = await Conversation.findOne({
          _id: conversationId,
          $or: [
            { sender: socket.user.id },
            { receiver: socket.user.id },
          ],
        }).select('_id sender receiver');

        if (!conversation) {
          console.log('Conversation not found or access denied');
          return;
        }

        // Leave the previously active conversation room
        const previousRoom = socket.data.activeConversationRoom;

        if (previousRoom) {
          await socket.leave(previousRoom);
        }

        const room = `conversation:${conversation._id}`;

        await socket.join(room);

        // Store active conversation details on this socket
        socket.data.userId = String(socket.user.id);
        socket.data.activeConversationRoom = room;
        socket.data.activeConversationId = String(conversation._id);

        // Reset unread count for the current user
        await Conversation.updateOne(
          { _id: conversation._id },
          {
            $set: {
              [`unreadCounts.${socket.user.id}`]: 0,
            },
          }
        );

        const updatedConversation = await Conversation.findById(
          conversation._id
        )
          .populate('members', 'name profileImage')
          .populate('sender receiver', 'name profileImage');
        const calTimeAgo = moment(updatedConversation.timestamp).fromNow();
        const timeAgo =
          calTimeAgo === "a few seconds ago" ? "Just now" : calTimeAgo;

        socket.emit('conversationUpdated', { ...updatedConversation.toObject(), timeAgo });

        console.log('Joined room:', room);
      } catch (error) {
        console.error('joinConversation error:', error);
      }
    });


    socket.on('leaveConversation', async () => {
      try {
        const room = socket.data.activeConversationRoom;
        const conversationId = socket.data.activeConversationId;
        const userId = String(socket.user.id);

        if (!room) {
          console.log(`${socket.user.name} is not in any conversation.`);
          return;
        }

        console.log(
          `🚪 User ${socket.user.name} (ID: ${userId}) is leaving conversation ${conversationId}...`
        );

        // Notify remaining participants before leaving
        socket.to(room).emit('userLeftConversation', {
          userId,
          conversationId,
        });

        await socket.leave(room);

        socket.data.activeConversationRoom = null;
        socket.data.activeConversationId = null;

        console.log(
          `✅ User ${socket.user.name} successfully left conversation ${conversationId}.`
        );

      } catch (error) {
        console.error('leaveConversation error:', error);
      }
    });

    socket.on('disconnect', async (reason) => {
      try {
        const userId = String(socket.user.id);
        const userName = socket.user.name;
        const conversationId = socket.data.activeConversationId;

        console.log(
          `🔌 User ${userName} (ID: ${userId}) is disconnecting. Socket ID: ${socket.id}, Reason: ${reason}`
        );

        if (conversationId) {
          const room = `conversation:${conversationId}`;

          console.log(
            `🚪 User ${userName} is leaving conversation ${conversationId} due to disconnection...`
          );

          socket.to(room).emit('userLeftConversation', {
            userId,
            conversationId,
          });
        }

        socket.data.activeConversationRoom = null;
        socket.data.activeConversationId = null;

        console.log(`❌ User ${userName} disconnected successfully.`);

      } catch (error) {
        console.error('disconnect error:', error);
      }
    });
  });

}

module.exports = initChatSocket;
