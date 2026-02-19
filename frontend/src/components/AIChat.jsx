import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import "./AIChat.css";
import API from "../api";

const LOCAL_STORAGE_KEY = "scholarSyncChatHistory";

const ScholarSyncChatbot = ({ onClose }) => {
  const location = useLocation();
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [error, setError] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const messagesEndRef = useRef(null);

  const handleClose = () => {
    setIsVisible(false);
    onClose?.();
  };

  if (!isVisible) return null;

  // Save chat history
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  // Check login status
  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem("token")); // Re-check on mount and potentially on token changes
  }, [location]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, error]);

  const handleClearChat = () => {
    setMessages([]);
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    setError(null);
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { role: "user", content: input };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages); // Optimistically add user message
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const response = await API.post("/ai/chat", { // Send current message and previous history
        message: input, // Current message
        history: messages, // Previous messages (excluding the current one)
      });

      const reply = response.data?.reply;

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: reply || "No response generated.",
        },
      ]);
    } catch (err) {
      if (err.response && err.response.status === 401) {
        setIsLoggedIn(false);
        setError("Session expired. Please log in.");
      } else {
        const msg =
          err.response?.data?.reply ||
          err.message ||
          "Unable to connect to server";
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ai-chat-card">
      {/* Header */}
      <div className="ai-chat-header">
        <span>Scholar Sync AI Assistant</span>
        <button className="ai-close-btn" onClick={handleClose}>
          &times;
        </button>
      </div>

      {/* Messages */}
      <div className="ai-messages">
        {messages.length === 0 && (
          <div className="ai-message assistant">
            <div className="ai-avatar">AI</div>
            <div className="ai-message-content">
              👋 Hi! I can help you find skills, collaborators, and project ideas on Scholar Sync.
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`ai-message ${msg.role}`}>
            <div className="ai-avatar">
              {msg.role === "user" ? "You" : "AI"}
            </div>
            <div className="ai-message-content">{msg.content}</div>
          </div>
        ))}

        {loading && (
          <div className="ai-message assistant">
            <div className="ai-avatar">AI</div>
            <div className="ai-message-content">Typing...</div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {error && <div className="ai-error-display">Error: {error}</div>}

      {/* Input */}
      {isLoggedIn ? (
        <div className="ai-input-row">
          <input
            className="ai-chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ask about skills, projects, or collaborators..."
            disabled={loading}
          />
          <button
            className="ai-send-btn"
            onClick={handleSend}
            disabled={loading || !input.trim()}
          >
            Send
          </button>
          <button className="clear-btn" onClick={handleClearChat}>
            Clear
          </button>
        </div>
      ) : (
        <div className="ai-login-prompt">
          Please <Link to="/login">log in</Link> to use the AI Assistant.
        </div>
      )}
    </div>
  );
};

export default ScholarSyncChatbot;