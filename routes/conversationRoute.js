const express = require("express");

const router = express.Router();
const conversationController = require("../controllers/conversationController");



// ================= Conversation Routes =====================

// ====================== Send Message ==========================
router.post(
  "/sendMessage",
  conversationController.sendMessage
);

// ================= Get all conversations =======================
router.get(
  "/getAllConversations",

  conversationController.getAllConversations
);

// ====================== Get all messages =======================
router.get(
  "/getAllMessages",

  conversationController.getAllMessages
);

// ====================== Delete coversation ======================
router.post(
  "/deleteConversation",

  conversationController.deleteConversation
);

// ====================== Delete message =========================
router.post(
  "/deleteMessage",
 
  conversationController.deleteMessage
);

module.exports = router;