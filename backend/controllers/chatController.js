const Message = require("../models/messageModel");
const User = require("../models/userModel");
const sendEmail = require("../utils/mailer");
const messageEmailTemplate = require("../utils/emailTemplates/messageEmail");

// Get conversation between two users
const getConversation = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    const conversationId = [currentUserId, userId].sort().join("-");

    const messages = await Message.find({ conversationId })
      .populate("sender", "name")
      .populate("receiver", "name")
      .sort({ createdAt: 1 });

    await Message.updateMany(
      { conversationId, receiver: currentUserId, isRead: false },
      { isRead: true }
    );

    res.json(messages);
  } catch (error) {
    console.error("Get conversation error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Send a message
const sendMessage = async (req, res) => {
  try {
    const { receiverId, content, messageType = "text" } = req.body;
    const senderId = req.user._id;

    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ message: "Receiver not found" });
    }

    const conversationId = [senderId, receiverId].sort().join("-");

    const message = new Message({
      sender: senderId,
      receiver: receiverId,
      content,
      messageType,
      conversationId
    });

    await message.save();

    await message.populate("sender", "name");
    await message.populate("receiver", "name");

    if (req.io) {
      req.io.to(conversationId).emit("newMessage", message);
      req.io.to(receiverId.toString()).emit("messageNotification", {
        senderId: senderId.toString(),
        senderName: req.user.name,
        conversationId,
        content: content.substring(0, 50),
        timestamp: new Date()
      });
    }

    await sendEmail({
      to: receiver.email,
      subject: "📩 New Message Received",
      html: messageEmailTemplate({
        receiverName: receiver.name,
        senderName: req.user.name,
        messagePreview: content.substring(0, 100)
      })
    });

    res.status(201).json(message);
  } catch (error) {
    console.error("Send message error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Send a file message
const sendFileMessage = async (req, res) => {
  try {
    const { receiverId, content } = req.body;
    const senderId = req.user._id;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ message: "Receiver not found" });
    }

    const conversationId = [senderId, receiverId].sort().join("-");

    const message = new Message({
      sender: senderId,
      receiver: receiverId,
      content: content || file.originalname,
      messageType: file.mimetype.startsWith("image/") ? "image" : "file",
      fileName: file.originalname,
      filePath: file.filename,
      fileSize: file.size,
      mimeType: file.mimetype,
      conversationId
    });

    await message.save();

    await message.populate("sender", "name");
    await message.populate("receiver", "name");

    if (req.io) {
      req.io.to(conversationId).emit("newMessage", message);
    }

    res.status(201).json(message);
  } catch (error) {
    console.error("Send file message error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ FIXED: Get all conversations for logged-in user
const getConversations = async (req, res) => {
  try {
    const userId = req.user._id;

    const messages = await Message.aggregate([
      {
        $match: {
          $or: [{ sender: userId }, { receiver: userId }]
        }
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$conversationId",
          lastMessage: { $first: "$$ROOT" }
        }
      }
    ]);

    const conversations = await Promise.all(
      messages.map(async (conv) => {
        const otherUserId =
          conv.lastMessage.sender.toString() === userId.toString()
            ? conv.lastMessage.receiver
            : conv.lastMessage.sender;

        const otherUser = await User.findById(otherUserId).select("name email");

        return {
          conversationId: conv._id,
          otherUser,
          lastMessage: conv.lastMessage.content,
          updatedAt: conv.lastMessage.createdAt
        };
      })
    );

    res.json(conversations);
  } catch (error) {
    console.error("Get conversations error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ FIXED: Mark messages as read
const markAsRead = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;

    await Message.updateMany(
      { conversationId, receiver: userId, isRead: false },
      { isRead: true }
    );

    res.json({ message: "Messages marked as read" });
  } catch (error) {
    console.error("Mark as read error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getConversation,
  sendMessage,
  sendFileMessage,
  getConversations,
  markAsRead
};
