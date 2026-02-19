const express = require("express");
const dotenv = require("dotenv");
// Load env vars immediately before other imports use them
dotenv.config();
const cors = require("cors");
const morgan = require("morgan");
const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const path = require("path");
const fs = require("fs");

const connectDB = require("./config/db");
const Message = require("./models/messageModel");
const User = require("./models/userModel");

// Routes
const userRoutes = require("./routes/userRoutes");
const requestRoutes = require("./routes/requestRoutes");
const chatRoutes = require("./routes/chatRoutes");     // user-to-user chat
const aiRoutes = require("./routes/aiRoutes");         // Gemini chatbot
const matchRoutes = require("./routes/matchRoutes");
const groupRoutes = require("./routes/groupRoutes");

connectDB();

const app = express();
const server = http.createServer(app);

/* -------------------- MIDDLEWARE -------------------- */
app.use(cors({
  origin: process.env.FRONTEND_URL || ["http://localhost:5173", "http://localhost:3000"],
  credentials: true
}));
app.use(express.json());
app.use(morgan("dev"));

// Serve uploaded files statically
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* -------------------- API ROUTES -------------------- */
app.use("/api/users", userRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/chat", chatRoutes);        // NORMAL CHAT
app.use("/api/ai", aiRoutes);            // GEMINI CHATBOT (Matches frontend /api/ai/chat)
app.use("/api/match", matchRoutes);
app.use("/api/groups", groupRoutes);

/* -------------------- SOCKET.IO -------------------- */
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || [
      "http://localhost:5173",
      "http://localhost:3000",
    ],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Socket auth
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error("No token"));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) return next(new Error("User not found"));

    socket.userId = user._id.toString();
    socket.userName = user.name;
    next();
  } catch (err) {
    next(new Error("Authentication failed"));
  }
});

const onlineUsers = new Map();

io.on("connection", (socket) => {
  console.log(`✅ ${socket.userName} connected`);

  onlineUsers.set(socket.userId, {
    socketId: socket.id,
    userName: socket.userName,
  });

  io.emit("updateOnlineUsers", Array.from(onlineUsers.values()));

  socket.on("sendMessage", async (data) => {
    try {
      const { receiverId, content } = data;
      const conversationId = [socket.userId, receiverId].sort().join("-");

      const message = await Message.create({
        sender: socket.userId,
        receiver: receiverId,
        content,
        conversationId,
      });

      io.to(conversationId).emit("newMessage", message);
    } catch (err) {
      socket.emit("messageError", "Message failed");
    }
  });

  // --- GROUP CHAT EVENTS ---
 socket.on("joinGroup", (groupId) => {
    socket.join(String(groupId));
  });

  socket.on("groupMessage", async (data) => {
  try {
    console.log("📩 Server received groupMessage:", data);
    // If message has _id, it's already saved (via API), so just broadcast
    if (data._id && data.groupId) {
      io.to(String(data.groupId)).emit("newGroupMessage", data);
      return;
    }

    const { groupId, content } = data;

    if (!groupId || !content) {
      console.log("❌ Missing groupId or content");
      return;
    }

    const message = await Message.create({
      group: groupId,
      sender: socket.userId, // ✅ take from auth middleware
      content,
      messageType: "text",
    });
    console.log("✅ Message saved to DB:", message._id);

    const populatedMsg = await message.populate(
      "sender",
      "name profilePicture"
    );

    io.to(String(groupId)).emit("newGroupMessage", {
      _id: message._id,
      group: groupId,
      sender: populatedMsg.sender,
      content: populatedMsg.content,
      createdAt: populatedMsg.createdAt,
      messageType: "text",
    });
  } catch (err) {
    console.error("❌ Group message error:", err);
  }
});


  socket.on("typing", (data) => {
    if (data.groupId) {
      socket.to(data.groupId).emit("userTyping", {
        groupId: data.groupId,
        userId: socket.userId,
        userName: socket.userName,
      });
    }
  });

  socket.on("stopTyping", (data) => {
    if (data.groupId) {
      socket.to(data.groupId).emit("userStoppedTyping", data);
    }
  });

  socket.on("disconnect", () => {
    onlineUsers.delete(socket.userId);
    io.emit("updateOnlineUsers", Array.from(onlineUsers.values()));
    console.log(`❌ ${socket.userName} disconnected`);
  });
});

/* -------------------- STATIC FRONTEND -------------------- */
const distPath = path.join(__dirname, "../frontend/dist");
const buildPath = path.join(__dirname, "../frontend/build");

if (fs.existsSync(distPath)) app.use(express.static(distPath));
if (fs.existsSync(buildPath)) app.use(express.static(buildPath));

app.use((req, res) => {
  const distPath = path.join(__dirname, "../frontend/dist/index.html");
  const buildPath = path.join(__dirname, "../frontend/build/index.html");

  if (fs.existsSync(distPath)) {
    return res.sendFile(distPath);
  }

  if (fs.existsSync(buildPath)) {
    return res.sendFile(buildPath);
  }

  res.status(404).send("Not Found");
});

/* -------------------- SERVER -------------------- */
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});