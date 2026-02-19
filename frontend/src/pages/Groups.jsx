import React, { Component } from "react";
import API from "../api";
import { Link } from "react-router-dom";
import "./Groups.css";
import socketService from "../services/socketService";

class Groups extends Component {
  state = {
    groups: [],
    myGroups: [],
    showCreateForm: false,
    newGroup: {
      name: "",
      description: "",
      subject: "",
      academicGoals: "",
      studyHabits: "",
      maxMembers: 5
    },
    loading: true,
    error: "",
    viewingGroup: null,
    activeChatGroup: null,
    chatMessages: [],
    newMessage: "",
    currentUserId: null,
    currentUser: null,
    // File Upload & UI State
    selectedFile: null,
    isUploading: false,
    uploadProgress: 0,
    dragActive: false,
    filePreview: null,
  };

  messagesEndRef = React.createRef();
  fileInputRef = React.createRef();

  async componentDidMount() {
    this.fetchGroups();
    const token = localStorage.getItem("token");
    if (token) {
      socketService.connect(token);
      socketService.onNewGroupMessage(this.handleIncomingMessage);

      // Rejoin group chat on reconnection to ensure we receive messages
      socketService.onConnect(() => {
        if (this.state.activeChatGroup) {
          socketService.joinGroupChat(this.state.activeChatGroup._id);
        }
      });
    }
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.state.chatMessages.length > prevState.chatMessages.length || this.state.activeChatGroup !== prevState.activeChatGroup) {
      this.scrollToBottom();
    }

    // Save messages to localStorage whenever they change while a chat is active
    if (this.state.activeChatGroup && this.state.chatMessages !== prevState.chatMessages) {
      localStorage.setItem(`group_chat_${this.state.activeChatGroup._id}`, JSON.stringify(this.state.chatMessages));
    }
  }

  async fetchGroups() {
    try {
      const [groupsRes, userRes] = await Promise.all([
        API.get("/groups"),
        API.get("/users/me")
      ]);

      const myGroups = groupsRes.data.filter(group => 
        group.members.some(member => member._id === userRes.data._id)
      );

      this.setState({
        groups: groupsRes.data,
        myGroups,
        loading: false,
        currentUserId: userRes.data._id,
        currentUser: userRes.data,
      });
    } catch (err) {
      this.setState({
        error: err.response?.data?.message || "Failed to load groups",
        loading: false,
      });
    }
  }

  scrollToBottom = () => {
    this.messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  handleCreateGroup = async (e) => {
    e.preventDefault();
    try {
      const groupData = {
        ...this.state.newGroup,
        academicGoals: this.state.newGroup.academicGoals.split(",").map(s => s.trim()).filter(s => s),
        studyHabits: this.state.newGroup.studyHabits.split(",").map(s => s.trim()).filter(s => s),
      };

      await API.post("/groups", groupData);
      
      this.setState({
        showCreateForm: false,
        newGroup: {
          name: "",
          description: "",
          subject: "",
          academicGoals: "",
          studyHabits: "",
          maxMembers: 5
        }
      });
      
      this.fetchGroups();
    } catch (err) {
      alert("Failed to create group");
    }
  };

  handleJoinGroup = async (group) => {
    try {
      await API.post(`/groups/${group._id}/join`);
      await this.fetchGroups();
      this.handleOpenChat(group);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to join group");
    }
  };

  handleLeaveGroup = async (groupId) => {
    try {
      await API.post(`/groups/${groupId}/leave`);
      this.fetchGroups();
    } catch (err) {
      alert("Failed to leave group");
    }
  };

  handleViewDetails = async (groupId) => {
  this.setState({ loading: true });
  try {
    const res = await API.get(`/groups/${groupId}`);
    const group = res.data;

    // If members are only IDs, fetch their full profiles
    if (group.members && group.members.length > 0 && typeof group.members[0] === "string") {
      const membersRes = await Promise.all(
        group.members.map((memberId) => API.get(`/users/${memberId}`))
      );
      group.members = membersRes.map(r => r.data); // replace IDs with full user objects
    }

    this.setState({ viewingGroup: group, loading: false });
  } catch (err) {
    this.setState({ loading: false });
    alert("Failed to load group details");
  }
};


  handleCloseDetails = () => {
    this.setState({ viewingGroup: null });
  };

  handleOpenChat = async (group) => {
    // Load cached messages from localStorage first
    const cachedMessages = localStorage.getItem(`group_chat_${group._id}`);
    this.setState({ activeChatGroup: group, chatMessages: cachedMessages ? JSON.parse(cachedMessages) : [] });

    socketService.joinGroupChat(group._id);
    try {
      // Fetch group details (to ensure we have member names) and messages
      const [groupRes, messagesRes] = await Promise.all([
        API.get(`/groups/${group._id}`),
        API.get(`/groups/${group._id}/messages`)
      ]);

      // Preserve populated members if the fresh fetch returns only IDs
      const freshGroup = groupRes.data;
      if (freshGroup.members && freshGroup.members.length > 0 && typeof freshGroup.members[0] === 'string') {
         if (group.members && group.members.length > 0 && typeof group.members[0] === 'object') {
             freshGroup.members = group.members;
         }
      }

      this.setState({ activeChatGroup: freshGroup });

      if (Array.isArray(messagesRes.data)) {
        this.setState({ chatMessages: messagesRes.data });
      }
    } catch (err) {
      console.error("Failed to load messages");
    }
  };

  handleCloseChat = () => {
    this.setState({ activeChatGroup: null, chatMessages: [] });
  };

  handleClearChat = () => {
    if (this.state.activeChatGroup) {
      localStorage.removeItem(`group_chat_${this.state.activeChatGroup._id}`);
      this.setState({ chatMessages: [] });
    }
  };

  handleIncomingMessage = (message) => {
    console.log("Received message:", message);
    const activeGroupId = this.state.activeChatGroup?._id;
    
    // Robustly extract group ID from message (handle populated object, string ID, or ObjectId)
    const messageGroupId = message.groupId || message.group?._id || message.group;

    // Ensure we compare strings to avoid mismatches between ObjectId objects and strings
    if (activeGroupId && String(messageGroupId) === String(activeGroupId)) {
      this.setState((prevState) => {
        // 1. Check for duplicates by ID
        if (prevState.chatMessages.some(m => m._id === message._id)) return null;

        // 2. Handle Optimistic Replacement (if it's my message coming back from server)
        const senderId = message.sender?._id || message.sender;
        const isMe = String(senderId) === String(this.state.currentUserId);

        if (isMe) {
          // Find the optimistic message (flagged or matching content/time)
          const optimisticIndex = prevState.chatMessages.findIndex(m => m.isOptimistic && m.content === message.content);
          if (optimisticIndex !== -1) {
            const newMessages = [...prevState.chatMessages];
            newMessages[optimisticIndex] = message; // Replace temp message with real one
            return { chatMessages: newMessages };
          }
        }

        // 3. Append new message
        return { chatMessages: [...prevState.chatMessages, message] };
      });
    }
  };

  handleEmojiClick = () => {
    this.setState(prevState => ({ newMessage: prevState.newMessage + "😊" }));
  };

  handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (this.state.selectedFile) {
      await this.handleFileUpload();
      return;
    }

    if (!this.state.newMessage.trim()) return;

    const content = this.state.newMessage;
    const groupId = String(this.state.activeChatGroup._id);
    const currentUser = this.state.currentUser || { _id: this.state.currentUserId, name: "Me" };

    const tempId = Date.now();

    // Optimistic update
    const optimisticMsg = {
      _id: tempId,
      sender: currentUser,
      content: content,
      createdAt: new Date().toISOString(),
      group: groupId,
      isOptimistic: true,
      messageType: 'text'
    };

    this.setState(prevState => ({
      chatMessages: [...prevState.chatMessages, optimisticMsg],
      newMessage: ""
    }));

    try {
      const res = await API.post(`/groups/${groupId}/messages`, { content });
      const savedMessage = res.data;

      this.setState((prevState) => ({
        chatMessages: prevState.chatMessages.map((m) =>
          m._id === tempId ? { ...savedMessage, sender: currentUser } : m
        ),
      }));

      socketService.sendGroupMessage({ ...savedMessage, groupId, sender: currentUser });
    } catch (err) {
      console.error("Failed to send message", err);
    }
  };

  handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
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
        alert('File type not supported. Please upload images, PDFs, Word documents, or text files.');
        return;
      }
      
      this.setState({ selectedFile: file });

      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => this.setState({ filePreview: e.target.result });
        reader.readAsDataURL(file);
      } else {
        this.setState({ filePreview: null });
      }
    }
  };

  handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      this.setState({ dragActive: true });
    } else if (e.type === "dragleave") {
      this.setState({ dragActive: false });
    }
  };

  handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    this.setState({ dragActive: false });
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      this.handleFileSelect({ target: { files: [e.dataTransfer.files[0]] } });
    }
  };

  handleFileUpload = async (file) => {
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

  clearFileSelection = () => {
    this.setState({ selectedFile: null, filePreview: null });
    if (this.fileInputRef.current) this.fileInputRef.current.value = '';
  };

  componentWillUnmount() {
    socketService.disconnect();
  }

  render() {
    const { groups, myGroups, showCreateForm, newGroup, loading, error, viewingGroup, activeChatGroup, chatMessages, newMessage, currentUserId, dragActive, isUploading, uploadProgress, selectedFile, filePreview } = this.state;

    if (loading) {
      return <div className="loader">Loading groups...</div>;
    }

    if (error) {
      return <div className="error">{error}</div>;
    }

    return (
      <div className="groups-container">
        <div className="groups-header">
          <h1>Study Groups</h1>
          <button 
            className="create-group-btn"
            onClick={() => this.setState({ showCreateForm: !showCreateForm })}
          >
            {showCreateForm ? "Cancel" : "Create Group"}
          </button>
        </div>

        {showCreateForm && (
          <div className="create-group-form">
            <h2>Create New Study Group</h2>
            <form onSubmit={this.handleCreateGroup}>
              <div className="form-row">
                <div className="form-group">
                  <label>Group Name:</label>
                  <input
                    type="text"
                    value={newGroup.name}
                    onChange={(e) => this.setState({
                      newGroup: { ...newGroup, name: e.target.value }
                    })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Subject:</label>
                  <input
                    type="text"
                    value={newGroup.subject}
                    onChange={(e) => this.setState({
                      newGroup: { ...newGroup, subject: e.target.value }
                    })}
                    placeholder="e.g., Computer Science, Mathematics"
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label>Description:</label>
                <textarea
                  value={newGroup.description}
                  onChange={(e) => this.setState({
                    newGroup: { ...newGroup, description: e.target.value }
                  })}
                  rows="3"
                  placeholder="Describe your study group..."
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Academic Goals (comma separated):</label>
                  <input
                    type="text"
                    value={newGroup.academicGoals}
                    onChange={(e) => this.setState({
                      newGroup: { ...newGroup, academicGoals: e.target.value }
                    })}
                    placeholder="e.g., PhD, Research, Grades"
                  />
                </div>
                <div className="form-group">
                  <label>Study Habits (comma separated):</label>
                  <input
                    type="text"
                    value={newGroup.studyHabits}
                    onChange={(e) => this.setState({
                      newGroup: { ...newGroup, studyHabits: e.target.value }
                    })}
                    placeholder="e.g., morning study, group work"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Max Members:</label>
                <input
                  type="number"
                  min="2"
                  max="10"
                  value={newGroup.maxMembers}
                  onChange={(e) => this.setState({
                    newGroup: { ...newGroup, maxMembers: parseInt(e.target.value) }
                  })}
                />
              </div>

              <button type="submit" className="submit-btn">Create Group</button>
            </form>
          </div>
        )}

        {/* My Groups */}
        {myGroups.length > 0 && (
          <section className="my-groups">
            <h2>My Groups</h2>
            <div className="groups-grid">
              {myGroups.map((group) => (
                <div key={group._id} className="group-card">
                  <h3>{group.name}</h3>
                  <p className="group-subject">{group.subject}</p>
                  <p className="group-description">{group.description}</p>
                  <div className="group-stats">
                    <span>{group.members.length}/{group.maxMembers} members</span>
                    <span>Compatibility: {Math.round(group.compatibilityScore * 100)}%</span>
                  </div>
                  <div className="group-actions">
                    <button className="view-btn" onClick={() => this.handleViewDetails(group._id)}>View Details</button>
                    <button className="chat-btn" onClick={() => this.handleOpenChat(group)}>
                      Chat
                    </button>
                    <button 
                      className="leave-btn"
                      onClick={() => this.handleLeaveGroup(group._id)}
                    >
                      Leave Group
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* All Groups */}
        <section className="all-groups">
          <h2>Available Groups</h2>
          <div className="groups-grid">
            {groups
              .filter(group => !myGroups.some(myGroup => myGroup._id === group._id))
              .map((group) => (
                <div key={group._id} className="group-card">
                  <h3>{group.name}</h3>
                  <p className="group-subject">{group.subject}</p>
                  <p className="group-description">{group.description}</p>
                  <div className="group-stats">
                    <span>{group.members.length}/{group.maxMembers} members</span>
                    <span>Compatibility: {Math.round(group.compatibilityScore * 100)}%</span>
                  </div>
                  <div className="group-actions">
                    <button className="view-btn" onClick={() => this.handleViewDetails(group._id)}>View Details</button>
                    <button 
                      className="join-btn"
                      onClick={() => this.handleJoinGroup(group)}
                    >
                      Join Group
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </section>

        {/* Group Details Modal */}
        {viewingGroup && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h2>{viewingGroup.name}</h2>
              <p className="group-description">{viewingGroup.description}</p>
              <h3>Members</h3>
              <ul className="members-list">
                {viewingGroup.members.map((m) => (
                  <li key={m._id} className="member-item">
                    <Link to={`/profile/${m._id}`} style={{ display: "flex", alignItems: "center", textDecoration: "none", color: "inherit", width: "100%" }}>
                      <div className="member-avatar-small" style={{ width: "60px", height: "60px", borderRadius: "50%", overflow: "hidden", display: "flex", justifyContent: "center", alignItems: "center", backgroundColor: "#e0e0e0", fontSize: "1.5rem", flexShrink: 0 }}>
                        {m.profilePicture ? <img src={m.profilePicture} alt={m.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (m.name?.[0] || "U")}
                      </div>
                      <span style={{ marginLeft: "15px", fontSize: "1.1rem", fontWeight: "500" }}>{m.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="modal-actions">
                <button className="close-btn" onClick={this.handleCloseDetails}>Close</button>
              </div>
            </div>
          </div>
        )}

        {/* Chat Modal */}
        {activeChatGroup && (
          <div className="chat-overlay">
            <div 
              className={`chat-box ${dragActive ? 'drag-active' : ''}`}
              onDragEnter={this.handleDrag}
              onDragLeave={this.handleDrag}
              onDragOver={this.handleDrag}
              onDrop={this.handleDrop}
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
                <h3>{activeChatGroup.name}</h3>
                <button onClick={this.handleClearChat} style={{ marginRight: "10px", fontSize: "0.9rem", padding: "5px 10px", cursor: "pointer" }}>Clear Chat</button>
                <button onClick={this.handleCloseChat}>X</button>
              </div>
              <div className="chat-messages" style={{ flex: 1, overflowY: "auto", padding: "10px" }}>
                {chatMessages.length === 0 && (
                  <div className="no-messages">No messages yet. Start the conversation!</div>
                )}
                {chatMessages.map((msg, idx) => {
                  const senderId = msg.sender?._id || msg.sender;
                  const isMe = String(senderId) === String(currentUserId);
                  
                  // Resolve sender name from group members if not populated in message
                  let senderName = msg.sender?.name;
                  if (!senderName && activeChatGroup?.members) {
                    const member = activeChatGroup.members.find(m => String(m._id || m) === String(senderId));
                    if (member && typeof member === 'object') senderName = member.name;
                  }

                  const timeString = msg.createdAt 
                    ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                  return (
                    <div 
                      key={msg._id || idx} 
                      className={`chat-message-container ${isMe ? "mine" : "theirs"}`}
                      style={{
                        margin: "10px 0",
                        maxWidth: "90%",
                        marginLeft: isMe ? "auto" : "0",
                        marginRight: isMe ? "0" : "auto",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: isMe ? "flex-end" : "flex-start"
                      }}
                    >
                      <div className="message-sender" style={{ fontSize: "0.75em", color: "#666", marginBottom: "2px", padding: "0 4px" }}>{senderName || "User"}</div>
                      <div className="message-bubble" style={{
                        border: isMe ? "1px solid #007bff" : "1px solid #ccc",
                        borderRadius: "12px",
                        padding: "8px 12px",
                        backgroundColor: isMe ? "#e3f2fd" : "#ffffff",
                      }}>
                        {(msg.messageType === 'file' || msg.messageType === 'image') ? (
                          <div className="file-message">
                            {msg.mimeType && msg.mimeType.startsWith('image/') ? (
                              <img 
                                src={`http://localhost:5000/uploads/${msg.filePath}`} 
                                alt={msg.fileName}
                                style={{ maxWidth: '200px', maxHeight: '200px', borderRadius: '8px', display: 'block', marginBottom: '5px' }}
                              />
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
                            {msg.content && msg.content !== msg.fileName && (
                              <div className="message-text" style={{ margin: "4px 0", color: "#333" }}>{msg.content}</div>
                            )}
                          </div>
                        ) : (
                          <div className="message-text" style={{ margin: "0 0 4px 0", color: "#333" }}>{msg.content}</div>
                        )}
                        <div className="message-time" style={{ fontSize: "0.7em", color: "#888", textAlign: "right" }}>{timeString}</div>
                      </div>
                    </div>
                  );
                })}
                <div ref={this.messagesEndRef} />
              </div>
              
              <form className="chat-input" onSubmit={this.handleSendMessage} style={{ flexDirection: 'column', gap: 0 }}>
                {isUploading && (
                  <div style={{ width: '100%', background: '#f0f0f0', height: '4px', marginBottom: '5px' }}>
                    <div style={{ width: `${uploadProgress}%`, background: '#007bff', height: '100%', transition: 'width 0.3s' }}></div>
                  </div>
                )}
                
                {selectedFile && (
                  <div style={{ display: 'flex', alignItems: 'center', padding: '5px 10px', background: '#f9f9f9', borderBottom: '1px solid #eee', width: '100%', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {filePreview ? (
                        <img src={filePreview} alt="Preview" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} />
                      ) : (
                        <span style={{ fontSize: '1.5rem' }}>📎</span>
                      )}
                      <div style={{ fontSize: '0.9rem' }}>
                        <div>{selectedFile.name}</div>
                        <div style={{ fontSize: '0.8rem', color: '#666' }}>{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</div>
                      </div>
                    </div>
                    <button type="button" onClick={this.clearFileSelection} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>Cancel</button>
                  </div>
                )}

                <div style={{ display: 'flex', width: '100%', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="file"
                    ref={this.fileInputRef}
                    onChange={this.handleFileSelect}
                    style={{ display: 'none' }}
                  />
                  <button 
                    type="button" 
                    onClick={() => this.fileInputRef.current?.click()}
                    disabled={isUploading}
                    style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', padding: '0 5px' }}
                  >
                    📎
                  </button>
                  <button 
                    type="button" 
                    onClick={this.handleEmojiClick}
                    disabled={isUploading}
                    style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', padding: '0 5px' }}
                  >
                    😊
                  </button>
                <input 
                  type="text" 
                  value={newMessage} 
                  onChange={(e) => this.setState({ newMessage: e.target.value })}
                  placeholder={selectedFile ? "Add a caption..." : "Type a message..."}
                  disabled={isUploading}
                  style={{ flex: 1 }}
                />
                <button type="submit" disabled={isUploading || (!newMessage.trim() && !selectedFile)}>
                  {isUploading ? '...' : 'Send'}
                </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }
}

export default Groups;