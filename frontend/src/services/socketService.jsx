import { io } from 'socket.io-client';

// Use VITE_API_URL to derive socket server URL when possible
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const SOCKET_SERVER = API_BASE.replace(/\/api\/?$/, '') ;

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
  }

  connect(token) {
    if (this.socket) {
      this.disconnect();
    }

    this.socket = io(SOCKET_SERVER, {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      console.log('Connected to server');
      this.isConnected = true;
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      this.isConnected = false;
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  // Join a conversation room
  joinConversation(conversationId) {
    if (this.socket && this.isConnected) {
      this.socket.emit('joinConversation', conversationId);
    }
  }

  // Leave a conversation room
  leaveConversation(conversationId) {
    if (this.socket && this.isConnected) {
      this.socket.emit('leaveConversation', conversationId);
    }
  }

  // Send a message
  sendMessage(receiverId, content, messageType = 'text') {
    if (this.socket && this.isConnected) {
      this.socket.emit('sendMessage', {
        receiverId,
        content,
        messageType
      });
    }
  }

  // Send typing indicator
  sendTyping(conversationId, isTyping) {
    if (this.socket && this.isConnected) {
      this.socket.emit('typing', {
        conversationId,
        isTyping
      });
    }
  }

  // Mark messages as read
  markAsRead(conversationId) {
    if (this.socket && this.isConnected) {
      this.socket.emit('markAsRead', {
        conversationId
      });
    }
  }

  // Listen for new messages
  onNewMessage(callback) {
    if (this.socket) {
      this.socket.on('newMessage', callback);
    }
  }

  // Listen for message notifications
  onMessageNotification(callback) {
    if (this.socket) {
      this.socket.on('messageNotification', callback);
    }
  }

  // Listen for typing indicators
  onUserTyping(callback) {
    if (this.socket) {
      this.socket.on('userTyping', callback);
    }
  }

  // Listen for messages read status
  onMessagesRead(callback) {
    if (this.socket) {
      this.socket.on('messagesRead', callback);
    }
  }

  // Listen for online users updates
  onOnlineUsersUpdate(callback) {
    if (this.socket) {
      this.socket.on('updateOnlineUsers', callback);
    }
  }

  // Listen for message errors
  onMessageError(callback) {
    if (this.socket) {
      this.socket.on('messageError', callback);
    }
  }

  // Remove all listeners
  removeAllListeners() {
    if (this.socket) {
      this.socket.removeAllListeners();
    }
  }

  // Get connection status
  getConnectionStatus() {
    return this.isConnected;
  }
}

// Create singleton instance
const socketService = new SocketService();
export default socketService;