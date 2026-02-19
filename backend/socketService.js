import io from "socket.io-client";

const socket = io("http://localhost:5000", {
  withCredentials: true,
  autoConnect: false,
  auth: {
    token: localStorage.getItem("token"), // 🔥 THIS WAS MISSING
  },
});

const socketService = {
  connect: (token) => {
    if (!socket.connected) {
      socket.auth.token = token || localStorage.getItem("token"); // 🔥 refresh token
      console.log("🔌 Attempting to connect socket...");
      socket.connect();
    }
    socket.on("connect", () => {
      console.log("✅ Socket connected:", socket.id);
    });
    socket.on("connect_error", (err) => {
      console.error("❌ Socket connection error:", err.message);
    });
  },

  disconnect: () => socket.disconnect(),

  joinGroupChat: (groupId) => {
    socket.emit("joinGroup", String(groupId));
  },

  sendGroupMessage: (messageData) => {
    socket.emit("groupMessage", messageData);
  },

  onNewGroupMessage: (cb) => {
    socket.off("newGroupMessage").on("newGroupMessage", cb);
  },

  sendTyping: (data) => {
    socket.emit("typing", data);
  },

  sendStopTyping: (data) => {
    socket.emit("stopTyping", data);
  },

  onUserTyping: (cb) => {
    socket.on("userTyping", cb);
  },

  onUserStoppedTyping: (cb) => {
    socket.on("userStoppedTyping", cb);
  },

  onConnect: (cb) => {
    socket.on("connect", cb);
  },
};

export default socketService;
