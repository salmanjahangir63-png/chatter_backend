const FriendRequest = require("../models/friendRequest");
const UserFriend = require("../models/UserFriend");
const commonResponse = require("../utils/commonResponse");
const validation = require("../middleware/validation");
const NotificationModel = require("../models/Notification");
const User = require("../models/User");

const fcmNotification = require("../utils/fcmNotifications");


// ============== Send Friend Request =====================
exports.sendFriendRequest = async (req, res, next) => {
  const { error } = validation.friendRequestValidation(req.body);
  if (error)
    return res
      .status(400)
      .send(commonResponse.createErrorResponse(error.details[0].message));

  var isValidSenderId = validation.isValidObjectId(req.body.sender);
  var isValidReceiverId = validation.isValidObjectId(req.body.receiver);

  if (!isValidReceiverId || !isValidSenderId) {
    return res.status(400).send("sender or receiver id is invalid");
  }
  try {
    const receiver = await User.findById(req.body.receiver);
    const newRequest = {
      sender: req.body.sender,
      receiver: req.body.receiver,
      message: `${req.body.senderName} has sent you a friend request`,
    };
    const newEntries = [
      {
        userId: req.body.sender,
        friendId: req.body.receiver,
        status: 2,
      },
      {
        userId: req.body.receiver,
        friendId: req.body.sender,
        status: 2,
      },
    ];

    await UserFriend.insertMany(newEntries);
    FriendRequest.create(newRequest)
      .then(async (result) => {
        var notificationModel = await NotificationModel.create({
          title: "Friend request",
          subtitle: newRequest.message,
          type: "friendRequest",
          sender: req.body.sender,
          receiver: req.body.receiver,
          friendRequestId: result._id,
        });
        const notificationJSON = notificationModel.toObject();
        const notificationJSONString = JSON.stringify(notificationJSON);
        if (receiver.fcmToken) {
          fcmNotification.sendNotification(
            receiver.fcmToken,
            notificationModel.title,
            notificationModel.subtitle,
            { data: notificationJSONString }
          );
        }
        return res
          .status(200)
          .json(
            commonResponse.createSuccessResponse(
              "Request sent successfully!",
              result
            )
          );
      })
      .catch((error) => {
        return res
          .status(200)
          .json(
            commonResponse.createErrorResponse(
              `Error in sending friend request ${error}`
            )
          );
      });
  } catch (error) {
    return res
      .status(500)
      .json(
        commonResponse.createErrorResponse(
          `Error in sending friend request ${error}`
        )
      );
  }
};

// ============== Get All Requests =====================
exports.getAllRequests = (req, res, next) => {
  const pageNo = parseInt(req.query.pageNo);
  const size = parseInt(req.query.pageSize);

  if (pageNo <= 0) {
    return res
      .status(200)
      .send(commonResponse.createErrorResponse("invalid page number", []));
  }

  const query = {
    skip: size * (pageNo - 1),
    limit: size,
  };

  FriendRequest.find(
    { receiver: req.user._id },
    Number.isNaN(pageNo) || Number.isNaN(size) ? null : query
  )
    .populate("sender", "_id name profileImage")
    .populate("receiver", "_id name profileImage")
    .then((requests) => {
      return res
        .status(200)
        .send(
          commonResponse.createSuccessResponse(
            "All Requests fetched successfully!",
            requests
          )
        );
    })
    .catch((error) => {
      return res
        .status(400)
        .send(
          commonResponse.createErrorResponse(
            "Fectching all friend requests " + error.message,
            []
          )
        );
    });
};

// ============== Accept Request =====================
exports.acceptFriendRequest = async (req, res, next) => {
  if (!req.body.id) {
    return res
      .status(400)
      .json(commonResponse.createErrorResponse("Parameter id is required"));
  }
  const filter = { _id: req.body.id };
  const friendRequest = await FriendRequest.findById(filter);
  try {
    if (!friendRequest) {
      return res
        .status(200)
        .json(commonResponse.createErrorResponse("Request not found"));
    }
    if (!friendRequest.receiver.equals(req.user._id)) {
      return res
        .status(400)
        .json(commonResponse.createErrorResponse("unauthenticated"));
    }

    await UserFriend.updateMany(
      {
        $or: [
          { userId: friendRequest.sender, friendId: friendRequest.receiver },
          { userId: friendRequest.receiver, friendId: friendRequest.sender },
        ],
      },
      {
        status: 1,
      }
    );
    await NotificationModel.deleteOne({ receiver: req.user._id });
    var notificationModel = await NotificationModel.create({
      title: "Request accepted",
      subtitle: `${req.body.name} has accepted your request.`,
      type: "friendRequestAccepted",
      sender: friendRequest.receiver,
      receiver: friendRequest.sender,
    });
    const receiver = await User.findById(notificationModel.receiver);
    const notificationJSON = notificationModel.toObject();
    const notificationJSONString = JSON.stringify(notificationJSON);
    if (receiver.fcmToken) {
      console.log(notificationJSONString);
      fcmNotification.sendNotification(
        receiver.fcmToken,
        notificationModel.title,
        notificationModel.subtitle,
        { data: notificationJSONString }
      );
    }

    friendRequest
      .deleteOne()
      .then((result) => {
        res
          .status(202)
          .json(
            commonResponse.createSuccessResponse(
              "Request accepted successfully!",
              result
            )
          );
      })
      .catch((err) => {
        res.status(400).json(commonResponse.createErrorResponse(err.message));
      });
  } catch (error) {
    res.status(500).json(commonResponse.createErrorResponse(err.message));
  }
};

// ============== Reject Request =====================
exports.rejectFriendRequest = async (req, res, next) => {
  if (!req.body.id) {
    return res
      .status(400)
      .json(commonResponse.createErrorResponse("Parameter id is required"));
  }
  const filter = { _id: req.body.id };
  const friendRequest = await FriendRequest.findById(filter);
  if (!friendRequest) {
    return res
      .status(200)
      .json(commonResponse.createErrorResponse("Request not found"));
  }
  if (!friendRequest.receiver.equals(req.user._id)) {
    return res
      .status(400)
      .json(commonResponse.createErrorResponse("unathenticated"));
  }

  await UserFriend.deleteMany({
    $or: [
      { userId: friendRequest.sender, friendId: friendRequest.receiver },
      { userId: friendRequest.receiver, friendId: friendRequest.sender },
    ],
  });

  await NotificationModel.deleteOne({ receiver: req.user._id });
  var notificationModel = await NotificationModel.create({
    title: "Request rejected",
    subtitle: `${req.body.name} has rejected your request.`,
    type: "friendRequestRejected",
    sender: friendRequest.receiver,
    receiver: friendRequest.sender,
  });
  const receiver = await User.findById(notificationModel.receiver);

  const notificationJSON = notificationModel.toObject();
  const notificationJSONString = JSON.stringify(notificationJSON);
  if (receiver.fcmToken) {
    console.log(notificationJSONString);
    fcmNotification.sendNotification(
      receiver.fcmToken,
      notificationModel.title,
      notificationModel.subtitle,
      { data: notificationJSONString }
    );
  }

  friendRequest
    .deleteOne()
    .then((result) => {
      res
        .status(200)
        .json(
          commonResponse.createSuccessResponse("Request rejected!", result)
        );
    })
    .catch((err) => {
      res.status(400).json(commonResponse.createErrorResponse(err.message));
    });
};

// ============== Unfriend User =====================
exports.unFriendUser = async (req, res, next) => {
  if (!req.query.id) {
    return res
      .status(400)
      .json(commonResponse.createErrorResponse("Parameter id is required"));
  }

  UserFriend.deleteMany({
    $or: [
      { userId: req.query.id, friendId: req.user._id },
      { userId: req.user._id, friendId: req.query.id },
    ],
  })

    .then((result) => {
      res
        .status(200)
        .json(commonResponse.createSuccessResponse("Unfriend successfully!"));
    })
    .catch((err) => {
      res.status(400).json(commonResponse.createErrorResponse(err.message));
    });
};

// ================= User friends =================
exports.userFriends = (req, res, next) => {
  try {
    const pageNo = parseInt(req.query.pageNo);
    const size = parseInt(req.query.pageSize);

    if (pageNo <= 0) {
      return res
        .status(200)
        .send(commonResponse.createErrorResponse("invalid page number", []));
    }

    const query = {
      skip: size * (pageNo - 1),
      limit: size,
    };
    var searchQuery = {};
    if (req.query.id) {
      searchQuery = { userId: req.query.id, status: 1 };
    } else {
      searchQuery = { userId: req.user._id, status: 1 };
    }
    UserFriend.find(
      searchQuery,
      {},
      Number.isNaN(pageNo) || Number.isNaN(size) ? null : query
    )
      .populate("friendId", "_id name profileImage fcmToken email")
      .then((userFriend) => {
        if (userFriend) {
          var friends = [];
          for (let friend of userFriend) {
            friends.push(friend.friendId);
          }
          return res
            .status(200)
            .json(
              commonResponse.createSuccessResponse("Friends fetched", friends)
            );
        } else {
          return res
            .status(200)
            .json(commonResponse.createSuccessResponse("Friends fetched", []));
        }
      })
      .catch((error) => {
        return res
          .status(500)
          .json(
            commonResponse.createErrorResponse(
              "Error in fetching friends " + error
            )
          );
      });
  } catch (error) {
    return res
      .status(500)
      .json(
        commonResponse.createErrorResponse("Error in fetching friends " + error)
      );
  }
};

// ============== Check Friend =====================
exports.checkFriend = async (req, res, next) => {
  if (!req.query.id) {
    return res
      .status(400)
      .json(commonResponse.createErrorResponse("Parameter id is required"));
  }
  var isValidId = validation.isValidObjectId(req.query.id);
  if (!isValidId) {
    return res
      .status(400)
      .json(commonResponse.createErrorResponse("Id is invalid"));
  }

  UserFriend.findOne({ userId: req.user._id, friendId: req.query.id })
    .then((result) => {
      if (result) {
        res
          .status(200)
          .json(
            commonResponse.createSuccessResponse("This user is exist", true)
          );
      } else {
        res
          .status(200)
          .json(
            commonResponse.createSuccessResponse("This user not exist", false)
          );
      }
    })
    .catch((err) => {
      res.status(400).json(commonResponse.createErrorResponse(err.message));
    });
};

exports.allUsers = (req, res, next) => {
  User.aggregate([
    {
      $match: { _id: req.user._id },
    },
    {
      $group: { _id: "$name" },
    },
  ])
    .then((users) => {
      return res
        .status(200)
        .json(commonResponse.createSuccessResponse("no user found", []));
    })
    .catch((error) => {
      return res
        .status(500)
        .json(commonResponse.createSuccessResponse("no user found " + error));
    });
};

// ============== Change Friend Request Status ==============================
const updateFriendRequestStatus = async (sender, receiver, newStatus) => {
  try {
    const updatedRequest = await FriendRequest.findOneAndUpdate(
      { sender: sender, receiver: receiver },
      { status: newStatus },
      { new: true }
    );
    return updatedRequest;
  } catch (error) {}
};