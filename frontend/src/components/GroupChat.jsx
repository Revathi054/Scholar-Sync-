import React, { useState, useEffect, useRef } from 'react';
import API from '../api';
import socketService from '../services/socketService';

const GroupChat = ({ group, currentUser, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [filePreview, setFilePreview] = useState(null);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (group) {
      loadMessages();
      socketService.joinGroupChat(group._id);
      socketService.onNewGroupMessage(handleIncomingMessage);
    }

    return () => {
      // Cleanup listeners when chat closes or group changes
      // Note: We don't disconnect the socket here as it might be used elsewhere
    };
  }, [group._id]);

  useEffect(() => {
    scrollToBottom();
    // Save to local storage on update
    if (group && messages.length > 0) {
      localStorage.setItem(`group_chat_${group._id}`, JSON.stringify(messages));
    }
  }, [messages, group]);

  const loadMessages = async () => {
    // Load cached messages first
    const cachedMessages = localStorage.getItem(`group_chat_${group._id}`);
    if (cachedMessages) {
      setMessages(JSON.parse(cachedMessages));
    } else {
      setMessages([]);
    }

    try {
      const res = await API.get(`/groups/${group._id}/messages`);
      if (Array.isArray(res.data)) {
        setMessages(res.data);
      }
    } catch (err) {
      console.error("Failed to load messages", err);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleIncomingMessage = (message) => {
    const activeGroupId = group?._id;
    const messageGroupId = message.groupId || message.group?._id || message.group;

    if (activeGroupId && String(messageGroupId) === String(activeGroupId)) {
      setMessages((prevMessages) => {
        // Check for duplicates
        if (prevMessages.some(m => m._id === message._id)) return prevMessages;

        // Handle Optimistic Replacement
        const senderId = message.sender?._id || message.sender;
        const isMe = String(senderId) === String(currentUser._id);

        if (isMe) {
          const optimisticIndex = prevMessages.findIndex(m => m.isOptimistic && m.content === message.content);
          if (optimisticIndex !== -1) {
            const newMessages = [...prevMessages];
            newMessages[optimisticIndex] = message;
            return newMessages;
          }
        }

        return [...prevMessages, message];
      });
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (selectedFile) {
      await handleFileUpload();
      return;
    }

    if (!newMessage.trim()) return;

    const content = newMessage;
    const groupId = String(group._id);
    const tempId = Date.now();

    const optimisticMsg = {
      _id: tempId,
      sender: currentUser,
      content: content,
      createdAt: new Date().toISOString(),
      group: groupId,
      isOptimistic: true,
      messageType: 'text'
    };

    setMessages(prev => [...prev, optimisticMsg]);
    setNewMessage("");

    try {
      const res = await API.post(`/groups/${groupId}/messages`, { content });
      const savedMessage = res.data;

      setMessages(prev => prev.map(m => 
        m._id === tempId ? { ...savedMessage, sender: currentUser } : m
      ));

      socketService.sendGroupMessage({ ...savedMessage, groupId, sender: currentUser });
    } catch (err) {
      console.error("Failed to send message", err);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile || !group) return;

    setIsUploading(true);
    setUploadProgress(0);
    const messageText = newMessage.trim();
    setNewMessage('');
    const currentFile = selectedFile; // Capture file
    setSelectedFile(null);
    setFilePreview(null);

    try {
      const formData = new FormData();
      formData.append('file', currentFile);
      if (messageText) formData.append('content', messageText);

      const res = await API.post(`/groups/${group._id}/messages/file`, formData, {
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        }
      });

      const savedMessage = res.data;
      // Ensure sender is populated
      const messageWithSender = { ...savedMessage, sender: currentUser };

      setMessages(prev => [...prev, messageWithSender]);
      socketService.sendGroupMessage({ ...messageWithSender, groupId: group._id });

    } catch (err) {
      console.error("File upload failed", err);
      alert("Failed to upload file");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
        return;
      }
      setSelectedFile(file);
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => setFilePreview(e.target.result);
        reader.readAsDataURL(file);
      } else {
        setFilePreview(null);
      }
    }
  };

  const handleClearChat = () => {
    localStorage.removeItem(`group_chat_${group._id}`);
    setMessages([]);
  };

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
      handleFileSelect({ target: { files: [e.dataTransfer.files[0]] } });
    }
  };

  return (
    <div 
      className={`chat-box ${dragActive ? 'drag-active' : ''}`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      style={{ width: "650px", height: "650px", display: "flex", flexDirection: "column", backgroundColor: "#fff", borderRadius: "8px" }}
    >
      {dragActive && (
        <div className="drag-overlay" style={{position:'absolute',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.7)',color:'#fff',display:'flex',justifyContent:'center',alignItems:'center',zIndex:1000,borderRadius:'8px'}}>
          <div style={{textAlign:'center'}}>
            <div style={{fontSize:'3rem'}}>📁</div>
            <p>Drop your file here to send</p>
          </div>
        </div>
      )}

      <div className="chat-header">
        <h3>{group.name}</h3>
        <button onClick={handleClearChat} style={{ marginRight: "10px", fontSize: "0.9rem", padding: "5px 10px", cursor: "pointer" }}>Clear Chat</button>
        <button onClick={onClose}>X</button>
      </div>

      <div className="chat-messages" style={{ flex: 1, overflowY: "auto", padding: "10px" }}>
        {messages.length === 0 && (
          <div className="no-messages">No messages yet. Start the conversation!</div>
        )}
        {messages.map((msg, idx) => {
          const senderId = msg.sender?._id || msg.sender;
          const isMe = String(senderId) === String(currentUser._id);
          
          let senderName = msg.sender?.name;
          if (!senderName && group.members) {
            const member = group.members.find(m => String(m._id || m) === String(senderId));
            if (member && typeof member === 'object') senderName = member.name;
          }

          const timeString = msg.createdAt 
            ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

          return (
            <div key={msg._id || idx} className={`chat-message-container ${isMe ? "mine" : "theirs"}`} style={{ margin: "10px 0", maxWidth: "80%", marginLeft: isMe ? "auto" : "0", marginRight: isMe ? "0" : "auto", display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start" }}>
              <div className="message-sender" style={{ fontSize: "0.75em", color: "#666", marginBottom: "2px", padding: "0 4px" }}>{senderName || "User"}</div>
              <div className="message-bubble" style={{ border: isMe ? "1px solid #007bff" : "1px solid #ccc", borderRadius: "12px", padding: "8px 12px", backgroundColor: isMe ? "#e3f2fd" : "#ffffff" }}>
                {(msg.messageType === 'file' || msg.messageType === 'image') ? (
                  <div className="file-message">
                    {msg.mimeType && msg.mimeType.startsWith('image/') ? (
                      <img src={`http://localhost:5000/uploads/${msg.filePath}`} alt={msg.fileName} style={{ maxWidth: '200px', maxHeight: '200px', borderRadius: '8px', display: 'block', marginBottom: '5px' }} />
                    ) : (
                      <div className="file-attachment" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.05)', padding: '8px', borderRadius: '4px' }}>
                        <div style={{ fontSize: '1.5rem' }}>📎</div>
                        <div>
                          <div style={{ fontWeight: 'bold', fontSize: '0.9em' }}>{msg.fileName}</div>
                          <div style={{ fontSize: '0.8em', color: '#666' }}>{Math.round((msg.fileSize || 0) / 1024)} KB</div>
                        </div>
                        <a href={`http://localhost:5000/uploads/${msg.filePath}`} download target="_blank" rel="noreferrer" style={{ marginLeft: 'auto', textDecoration: 'none' }}>⬇️</a>
                      </div>
                    )}
                    {msg.content && msg.content !== msg.fileName && <div className="message-text" style={{ margin: "4px 0", color: "#333" }}>{msg.content}</div>}
                  </div>
                ) : (
                  <div className="message-text" style={{ margin: "0 0 4px 0", color: "#333" }}>{msg.content}</div>
                )}
                <div className="message-time" style={{ fontSize: "0.7em", color: "#888", textAlign: "right" }}>{timeString}</div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input" onSubmit={handleSendMessage} style={{ flexDirection: 'column', gap: 0 }}>
        {isUploading && (
          <div style={{ width: '100%', background: '#f0f0f0', height: '4px', marginBottom: '5px' }}>
            <div style={{ width: `${uploadProgress}%`, background: '#007bff', height: '100%', transition: 'width 0.3s' }}></div>
          </div>
        )}
        {selectedFile && (
          <div style={{ display: 'flex', alignItems: 'center', padding: '5px 10px', background: '#f9f9f9', borderBottom: '1px solid #eee', width: '100%', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {filePreview ? <img src={filePreview} alt="Preview" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} /> : <span style={{ fontSize: '1.5rem' }}>📎</span>}
              <div style={{ fontSize: '0.9rem' }}>
                <div>{selectedFile.name}</div>
                <div style={{ fontSize: '0.8rem', color: '#666' }}>{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</div>
              </div>
            </div>
            <button type="button" onClick={() => { setSelectedFile(null); setFilePreview(null); if(fileInputRef.current) fileInputRef.current.value=''; }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>Cancel</button>
          </div>
        )}
        <div style={{ display: 'flex', width: '100%', alignItems: 'center', gap: '8px' }}>
          <input type="file" ref={fileInputRef} onChange={handleFileSelect} style={{ display: 'none' }} />
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploading} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', padding: '0 5px' }}>📎</button>
          <button type="button" onClick={() => setNewMessage(prev => prev + "😊")} disabled={isUploading} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', padding: '0 5px' }}>😊</button>
          <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder={selectedFile ? "Add a caption..." : "Type a message..."} disabled={isUploading} style={{ flex: 1 }} />
          <button type="submit" disabled={isUploading || (!newMessage.trim() && !selectedFile)}>{isUploading ? '...' : 'Send'}</button>
        </div>
      </form>
    </div>
  );
};

export default GroupChat;