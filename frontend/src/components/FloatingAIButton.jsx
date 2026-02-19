import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './FloatingAIButton.css';

const FloatingAIButton = () => {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const navigate = useNavigate();

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'token') setToken(e.newValue);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  if (!token) return null;

  return (
    <button
      className="floating-ai-btn"
      onClick={() => navigate('/messages')}
      aria-label="Open Messages"
      title="Open Messages"
    >
      💬
    </button>
  );
};

export default FloatingAIButton;
