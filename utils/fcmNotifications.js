const admin = require("../admin");
const messaging = require("firebase-admin/messaging");

// Send a message to the device corresponding to the provided
// registration token.
const sendNotification = async (token, title, body, data = {}) => {
  try {
    const message = {
      notification: {
        title,
        body,
      },
      data: Object.fromEntries(
        Object.entries(data).map(([key, value]) => [
          key,
          typeof value === "string" ? value : JSON.stringify(value),
        ])
      ),
      token,
      android: {
        priority: "high",
        notification: {
          priority: "high",
          sound: "default",
          channelId: "notification_channel",
          clickAction: "FLUTTER_NOTIFICATION_CLICK",
        },
      },
      apns: {
        headers: {
          "apns-priority": "10",
        },
        payload: {
          aps: {
            sound: "default",
          },
        },
      },
    };

    const startTime = Date.now();

    const response = await messaging.getMessaging().send(message);

    console.log("FCM accepted notification:", response);
    console.log(`FCM send request took ${Date.now() - startTime} ms`);

    return response;
  } catch (error) {
    console.error("FCM notification error:", error);
    throw error;
  }
};

module.exports = { sendNotification };

const multipleNotifications = (tokens) => {
  console.log(tokens.length);
  const message = {
    notification: {
      title: "Friend Request",
      body: " has sent you a request",
    },
    data: { score: "850", time: "2:45" },
    tokens: tokens,
  };

  messaging
    .getMessaging()
    .sendMulticast(message)
    .then((response) => {
      console.log(response.successCount + " messages were sent successfully");
    });
};

module.exports = { sendNotification, multipleNotifications };