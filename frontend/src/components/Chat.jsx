import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../api';
import socketService from '../services/socketService';
import './Chat.css';

const Chat = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [otherUser, setOtherUser] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [filePreview, setFilePreview] = useState(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    initializeChat();
    return () => {
      // Clean up on unmount
      if (currentUser && userId) {
        const convId = [currentUser._id, userId].sort().join('-');
        socketService.leaveConversation(convId);
      }
      socketService.removeAllListeners();
    };
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const initializeChat = async () => {
    try {
      // Get current user
      const userRes = await API.get('/users/me');
      setCurrentUser(userRes.data);

      // Get other user details
      const otherUserRes = await API.get(`/users/${userId}`);
      setOtherUser(otherUserRes.data);

      // Get conversation messages
      const messagesRes = await API.get(`/chat/conversation/${userId}`);
      setMessages(messagesRes.data);

      // Calculate conversation ID after we have the current user
      const convId = [userRes.data._id, userId].sort().join('-');

      // Connect to socket and join conversation
      const token = localStorage.getItem('token');
      if (token && !socketService.getConnectionStatus()) {
        socketService.connect(token);
      }

      socketService.joinConversation(convId);

      // Set up socket listeners
      setupSocketListeners();

      setLoading(false);
    } catch (err) {
      console.error('Error initializing chat:', err);
      setError('Failed to load chat');
      setLoading(false);
    }
  };

  const setupSocketListeners = () => {
    // Listen for new messages
    socketService.onNewMessage((message) => {
      setMessages(prev => {
        // Check if message already exists to prevent duplicates
        const messageExists = prev.some(msg => msg._id === message._id);
        if (!messageExists) {
          return [...prev, message];
        }
        return prev;
      });
    });

    // Listen for typing indicators
    socketService.onUserTyping((data) => {
      if (data.userId !== currentUser?._id) {
        setTypingUser(data.isTyping ? data.userName : '');
      }
    });

    // Listen for message read status
    socketService.onMessagesRead((data) => {
      setMessages(prev => 
        prev.map(msg => 
          msg.conversationId === data.conversationId && msg.sender._id === currentUser?._id
            ? { ...msg, isRead: true }
            : msg
        )
      );
    });

    // Listen for message errors
    socketService.onMessageError((error) => {
      console.error('Message error:', error);
      setError('Failed to send message');
    });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    // If there's a selected file, upload it instead of sending text
    if (selectedFile) {
      await handleFileUpload(selectedFile);
      return;
    }
    
    if (!newMessage.trim() || !userId || !currentUser) return;

    const messageContent = newMessage.trim();
    setNewMessage('');

    try {
      // Send via API to save to database - Socket.io will handle real-time delivery
      const response = await API.post('/chat/send', {
        receiverId: userId,
        content: messageContent,
        messageType: 'text'
      });

      // Add message to state immediately
      const savedMessage = response.data;
      // Ensure sender is properly formatted for the UI
      if (!savedMessage.sender || typeof savedMessage.sender === 'string') {
        savedMessage.sender = currentUser;
      }
      
      setMessages(prev => [...prev, savedMessage]);
      
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message');
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }

      // Validate file type
      const allowedTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf', 'application/msword', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain', 'application/zip', 'application/x-zip-compressed'
      ];

      if (!allowedTypes.includes(file.type)) {
        setError('File type not supported. Please upload images, PDFs, Word documents, or text files.');
        return;
      }

      setSelectedFile(file);
      setError('');

      // Create file preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => setFilePreview(e.target.result);
        reader.readAsDataURL(file);
      } else {
        setFilePreview(null);
      }
    }
  };

  // Handle drag and drop
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      handleFileSelect({ target: { files: [file] } });
    }
  };

  const handleFileUpload = async (file) => {
    if (!file || !userId || !currentUser) return;

    setIsUploading(true);
    setUploadProgress(0);
    const messageText = newMessage.trim(); // Capture any text message
    setNewMessage(''); // Clear the input
    setSelectedFile(null);
    setFilePreview(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('receiverId', userId);
      if (messageText) {
        formData.append('content', messageText); // Include message text if provided
      }

      // Send file via API with progress tracking - Socket.io will handle real-time delivery
      const response = await API.post('/chat/send-file', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        }
      });

      // Add message to state immediately
      const savedMessage = response.data;
      // Ensure sender is properly formatted for the UI
      if (!savedMessage.sender || typeof savedMessage.sender === 'string') {
        savedMessage.sender = currentUser;
      }

      setMessages(prev => [...prev, savedMessage]);

      setIsUploading(false);
      setUploadProgress(0);
    } catch (err) {
      console.error('Error uploading file:', err);
      setError('Failed to upload file: ' + (err.response?.data?.message || err.message));
      setIsUploading(false);
      setUploadProgress(0);
    }

    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);

    if (!currentUser || !userId) return;

    const convId = [currentUser._id, userId].sort().join('-');

    if (!isTyping) {
      setIsTyping(true);
      socketService.sendTyping(convId, true);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socketService.sendTyping(convId, false);
    }, 1000);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' });
  };

  if (loading) {
    return <div className="chat-loading-overlay">Loading chat...</div>;
  }

  if (error) {
    return <div className="chat-error-overlay">Error: {error}</div>;
  }

  return (
    <div 
      className={`chat-container ${dragActive ? 'drag-active' : ''}`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      {dragActive && (
        <div className="drag-overlay">
          <div className="drag-message">
            <div className="drag-icon">📁</div>
            <p>Drop your file here to send</p>
          </div>
        </div>
      )}
      <div className="chat-header">
        <button 
          className="back-button"
          onClick={() => navigate('/messages')}
        >
          ← Back
        </button>
        <div className="chat-user-info">
          <h3>{otherUser?.name}</h3>
          {typingUser && <span className="user-status">
            {`${typingUser} is typing...`}
          </span>}
        </div>
      </div>

      <div className="chat-messages" style={{ display: 'flex', flexDirection: 'column', padding: '20px', backgroundColor: '#efeae2', overflowY: 'auto', flex: 1 }}>
        {messages.map((message, index) => {
          const currentDate = formatDate(message.createdAt);
          const prevDate = index > 0 ? formatDate(messages[index - 1].createdAt) : null;
          const showDate = currentDate !== prevDate;

          return (
            <React.Fragment key={message._id}>
              {showDate && (
                <div style={{ textAlign: 'center', margin: '15px 0', opacity: 0.7 }}>
                  <span style={{ backgroundColor: '#fff', padding: '5px 12px', borderRadius: '8px', fontSize: '0.8rem', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>{currentDate}</span>
                </div>
              )}
              <div
            className={`message ${
              (message.sender._id === currentUser?._id || message.sender === currentUser?._id) ? 'sent' : 'received'
            }`}
            style={{
              alignSelf: (message.sender._id === currentUser?._id || message.sender === currentUser?._id) ? 'flex-end' : 'flex-start',
              backgroundColor: (message.sender._id === currentUser?._id || message.sender === currentUser?._id) ? '#d9fdd3' : '#ffffff',
              padding: '8px 12px',
              borderRadius: '8px',
              maxWidth: '65%',
              boxShadow: '0 1px 0.5px rgba(0,0,0,0.13)',
              marginBottom: '4px',
              marginLeft: (message.sender._id === currentUser?._id || message.sender === currentUser?._id) ? 'auto' : '0',
              marginRight: (message.sender._id === currentUser?._id || message.sender === currentUser?._id) ? '0' : 'auto',
              borderTopRightRadius: (message.sender._id === currentUser?._id || message.sender === currentUser?._id) ? '0' : '8px',
              borderTopLeftRadius: (message.sender._id === currentUser?._id || message.sender === currentUser?._id) ? '8px' : '0',
              color: '#111b21'
            }}
          >
            <div className="message-content">
              {(message.messageType === 'file' || message.messageType === 'image') ? (
                <div className="file-message">
                  {message.mimeType && message.mimeType.startsWith('image/') ? (
                    <img 
                      src={`http://localhost:5000/uploads/${message.filePath}`} 
                      alt={message.fileName}
                      className="message-image"
                      style={{ maxWidth: '250px', maxHeight: '250px', borderRadius: '8px' }}
                    />
                  ) : (
                    <div className="file-attachment">
                      <div className="file-icon">📎</div>
                      <div className="file-details">
                        <span className="file-name">{message.fileName}</span>
                        <span className="file-size">{Math.round(message.fileSize / 1024)} KB</span>
                      </div>
                      <a 
                        href={`http://localhost:5000/uploads/${message.filePath}`} 
                        download={message.fileName}
                        className="file-download"
                      >
                        ⬇️
                      </a>
                    </div>
                  )}
                  {message.content && message.content !== message.fileName && (
                    <p className="file-caption">{message.content}</p>
                  )}
                </div>
              ) : (
                <p>{message.content}</p>
              )}
              <div className="message-meta">
                <span className="message-time">
                  {formatTime(message.createdAt)}
                </span>
                {(message.sender._id === currentUser?._id || message.sender === currentUser?._id) && (
                  <span className={`message-status ${message.isRead ? 'read' : 'unread'}`}>
                    {message.isRead ? '✓✓' : '✓'}
                  </span>
                )}
              </div>
            </div>
          </div>
            </React.Fragment>
          );
        })}
        
        {typingUser && (
          <div className="typing-indicator">
            <div className="typing-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input-form" onSubmit={handleSendMessage} style={{ borderTop: '1px solid #d1d7db', backgroundColor: '#f0f2f5', padding: '10px', position: 'sticky', bottom: 0 }}>
        {/* Upload Progress Bar */}
        {isUploading && (
          <div className="upload-progress-container">
            <div className="upload-progress-bar">
              <div 
                className="upload-progress-fill"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <span className="upload-progress-text">{uploadProgress}% uploaded</span>
          </div>
        )}

        {/* File Preview */}
        {selectedFile && (
          <div className="file-preview-enhanced">
            <div className="file-preview-content">
              {filePreview ? (
                <img src={filePreview} alt="Preview" className="file-preview-image" />
              ) : (
                <div className="file-preview-icon">
                  {selectedFile.type.includes('pdf') ? '📄' : 
                   selectedFile.type.includes('word') ? '📝' : 
                   selectedFile.type.includes('text') ? '📃' : '📎'}
                </div>
              )}
              <div className="file-preview-details">
                <span className="file-preview-name">{selectedFile.name}</span>
                <span className="file-preview-size">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </span>
              </div>
            </div>
            <button 
              type="button" 
              className="file-preview-remove"
              onClick={() => {
                setSelectedFile(null);
                setFilePreview(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
            >
              ✕
            </button>
          </div>
        )}

        <div className="chat-input-container" style={{ display: 'flex', alignItems: 'flex-end', gap: '10px' }}>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            style={{ display: 'none' }}
            accept="image/*,application/pdf,.doc,.docx,.txt,.zip"
          />
          
          <div className="input-actions" style={{ display: 'flex', gap: '8px' }}>
            <button 
              type="button"
              className="file-upload-button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              title="Upload file"
              style={{ fontSize: '1.5rem', padding: '10px' }}
            >
              📎
            </button>
            
            <button 
              type="button"
              className="emoji-button"
              disabled={isUploading}
              title="Add emoji"
              onClick={() => setNewMessage(prev => prev + '😊')}
              style={{ fontSize: '1.5rem', padding: '10px' }}
            >
              😊
            </button>
          </div>

          <input
            type="text"
            value={newMessage}
            onChange={handleTyping}
            placeholder={selectedFile ? "Add a message with your file..." : "Type a message..."}
            className="chat-input"
            maxLength={1000}
            disabled={isUploading}
            style={{ fontSize: '1.1rem', padding: '12px', flex: 1, borderRadius: '8px', border: 'none', backgroundColor: '#fff' }}
          />
          
          <button 
            type="submit" 
            className="send-button"
            disabled={(!newMessage.trim() && !selectedFile) || isUploading}
            style={{ padding: '12px 20px', fontSize: '1rem', marginLeft: '8px' }}
          >
            {isUploading ? (
              <div className="sending-indicator">
                <div className="spinner"></div>
                Sending...
              </div>
            ) : selectedFile ? 'Send File' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Chat;