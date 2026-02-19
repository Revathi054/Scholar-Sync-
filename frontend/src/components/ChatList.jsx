import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../api';
import socketService from '../services/socketService';
import './ChatList.css';

const ChatList = () => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    initializeChatList();
    return () => {
      socketService.removeAllListeners();
    };
  }, []);

  const initializeChatList = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token && !socketService.getConnectionStatus()) {
        socketService.connect(token);
      }

      const response = await API.get('/chat/conversations');
      setConversations(response.data);

      setupSocketListeners();
      setLoading(false);
    } catch (err) {
      console.error('Error loading conversations:', err);
      setError('Failed to load conversations');
      setLoading(false);
    }
  };

  const setupSocketListeners = () => {
    socketService.onNewMessage((message) => {
      setConversations((prev) => {
        const updated = [...prev];
        const index = updated.findIndex(
          (conv) => conv.conversationId === message.conversationId
        );

        if (index >= 0) {
          const conv = updated[index];
          conv.lastMessage = {
            content: message.content,
            createdAt: message.createdAt,
            sender: message.sender._id === getCurrentUserId() ? 'me' : 'them',
          };

          if (message.sender._id !== getCurrentUserId()) {
            conv.unreadCount = (conv.unreadCount || 0) + 1;
          }

          updated.splice(index, 1);
          updated.unshift(conv);
        } else {
          updated.unshift({
            conversationId: message.conversationId,
            otherUser:
              message.sender._id === getCurrentUserId()
                ? message.receiver
                : message.sender,
            lastMessage: {
              content: message.content,
              createdAt: message.createdAt,
              sender:
                message.sender._id === getCurrentUserId() ? 'me' : 'them',
            },
            unreadCount:
              message.sender._id === getCurrentUserId() ? 0 : 1,
          });
        }

        return updated;
      });
    });

    socketService.onOnlineUsersUpdate((users) => {
      setOnlineUsers(users);
    });

    socketService.onMessageNotification((notification) => {
      setConversations((prev) =>
        prev.map((conv) =>
          conv.conversationId === notification.conversationId
            ? { ...conv, unreadCount: (conv.unreadCount || 0) + 1 }
            : conv
        )
      );
    });
  };

  const getCurrentUserId = () => {
    const token = localStorage.getItem('token');
    if (!token) return null;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload?.id || payload?.userId || payload?._id || payload?.sub || null;
    } catch {
      return null;
    }
  };

  const isUserOnline = (userId) =>
    onlineUsers.some(
      (u) => u?.userId === userId || u?._id === userId || u?.id === userId
    );

  const formatLastMessageTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = (now - date) / (1000 * 60 * 60);

    if (diff < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    if (diff < 168) {
      return date.toLocaleDateString([], { weekday: 'short' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const truncateMessage = (msg, len = 40) =>
    msg.length > len ? msg.slice(0, len) + '...' : msg;

  if (loading) return <div className="chat-list-loading">Loading conversations...</div>;
  if (error) return <div className="chat-list-error">{error}</div>;

  return (
    <div className="chat-list-container">
      <div className="chat-list-header">
        <h2>Messages</h2>
        <div className="online-count">{onlineUsers.length} online</div>
      </div>

      {conversations.length === 0 ? (
        <div className="no-conversations">
          <p>No conversations yet</p>
          <Link to="/match" className="find-matches-btn">
            Find Matches
          </Link>
        </div>
      ) : (
        <div className="conversations-list">
          {conversations
            .filter((conv) => conv && conv.otherUser)
            .map((conv) => {
              const otherUser = conv.otherUser || {};
              const otherId = otherUser._id || otherUser.id || otherUser.userId || '';
              const lastMessage = conv.lastMessage || {};
              const lastContent = lastMessage.content || '';
              const lastSender = lastMessage.sender || '';

              return (
                <Link
                  key={conv.conversationId || otherId}
                  to={otherId ? `/chat/${otherId}` : '#'}
                  className="conversation-item"
                >
                  <div className="conversation-avatar">
                    <div className="avatar-circle">
                      {(otherUser.name && otherUser.name.charAt(0).toUpperCase()) || 'U'}
                    </div>
                    {otherId && isUserOnline(otherId) && (
                      <div className="online-indicator" />
                    )}
                  </div>

                  <div className="conversation-details">
                    <div className="conversation-header">
                      <h4>{otherUser.name || 'Unknown'}</h4>
                      <span>
                        {lastMessage.createdAt ? formatLastMessageTime(lastMessage.createdAt) : ''}
                      </span>
                    </div>

                    <div className="conversation-preview">
                      <span className={lastSender}>
                        {lastSender === 'me' && 'You: '}
                        {truncateMessage(lastContent)}
                      </span>

                      {conv.unreadCount > 0 && (
                        <div className="unread-badge">{conv.unreadCount}</div>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
        </div>
      )}
    </div>
  );
};

export default ChatList;