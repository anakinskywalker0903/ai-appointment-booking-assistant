import { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import api from '../services/api';
import './ChatPage.css';

const WELCOME = {
  id: 'welcome',
  role: 'assistant',
  text: "👋 Hi! I'm **Aria**, your AI receptionist at **SalonAI**.\n\nI can help you book appointments with our stylists (**Sarah**, **Emma**, or **David**), check availability, or answer questions about our treatments.\n\nTry saying or speaking:\n- *\"I need a haircut this Saturday around 4 PM with Sarah.\"*\n- *\"Is someone available for a hair spa tomorrow afternoon?\"*\n- *\"I'd like a beard trim tomorrow at 3 PM.\"*",
};

export default function ChatPage() {
  const [messages,       setMessages]       = useState([WELCOME]);
  const [input,          setInput]          = useState('');
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState(null);
  const [pendingBooking, setPendingBooking] = useState(null);
  const [isListening,    setIsListening]    = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef       = useRef(null);
  const recognitionRef = useRef(null);

  // Initialize Web Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = (e) => {
        console.warn('Speech recognition error:', e.error);
        setIsListening(false);
      };
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInput(prev => (prev ? `${prev} ${transcript}` : transcript));
        }
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      setError('Voice recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      setError(null);
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.warn('Speech start error', err);
      }
    }
  };

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Build Gemini history from message list (exclude welcome)
  const buildHistory = useCallback(() => {
    return messages
      .filter(m => m.id !== 'welcome')
      .map(m => ({
        role:  m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.text }],
      }));
  }, [messages]);

  const sendMessage = useCallback(async (text) => {
    if (!text.trim() || loading) return;

    const userMsg = { id: Date.now(), role: 'user', text: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const history = buildHistory();

      const { data } = await api.post('/chat', {
        message: text.trim(),
        history,
        pendingBooking,
      });

      const assistantMsg = {
        id:          Date.now() + 1,
        role:        'assistant',
        text:        data.message,
        appointment: data.appointment || null,
      };

      setMessages(prev => [...prev, assistantMsg]);
      setPendingBooking(data.pendingBooking || null);

    } catch (err) {
      const msg = err.response?.data?.error || 'Something went wrong. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }, [loading, pendingBooking, buildHistory]);

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleQuickConfirm = () => sendMessage('Yes, please confirm the appointment.');
  const handleQuickCancel  = () => sendMessage('No, cancel this booking.');

  return (
    <div className="chat-page">
      {/* Header */}
      <header className="chat-header">
        <div className="chat-header-brand">
          <div className="chat-header-icon">✂️</div>
          <div>
            <h1>SalonAI</h1>
            <div className="chat-header-sub">Aria · Virtual Receptionist</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div className="chat-header-status">
            <span className="status-dot" />
            Online
          </div>
          <Link to="/admin" className="btn btn-ghost" style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
            Admin →
          </Link>
        </div>
      </header>

      {/* Messages */}
      <div className="chat-messages" role="log" aria-live="polite">
        {messages.map(msg => (
          <div key={msg.id} className={`message ${msg.role}`}>
            <div className="message-avatar">
              {msg.role === 'assistant' ? '💇‍♀️' : '👤'}
            </div>
            <div className="message-bubble">
              <ReactMarkdown>{msg.text}</ReactMarkdown>

              {/* Show quick-action buttons when there's a pending booking */}
              {msg.role === 'assistant' && pendingBooking && msg.id === messages[messages.length - 1]?.id && (
                <div className="confirm-card">
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 4 }}>
                    Quick actions:
                  </div>
                  <div className="confirm-card-actions">
                    <button id="btn-confirm-booking" className="btn btn-success" onClick={handleQuickConfirm} disabled={loading}>
                      ✓ Confirm Booking
                    </button>
                    <button id="btn-cancel-booking" className="btn btn-danger" onClick={handleQuickCancel} disabled={loading}>
                      ✗ Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Booking confirmation card */}
              {msg.appointment && (
                <div className="confirm-card" style={{ marginTop: 12 }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--success)', fontWeight: 600 }}>
                    ✅ Appointment Confirmed
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                    ID: {msg.appointment.id?.slice(0, 8).toUpperCase()}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="typing">
            <div className="message-avatar" style={{ background: 'var(--accent-dim)', color: 'var(--accent-light)', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', flexShrink: 0 }}>
              💇‍♀️
            </div>
            <div className="typing-dots">
              <span /><span /><span />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Error banner */}
      {error && (
        <div className="chat-error" role="alert">
          ⚠️ {error}
          <button onClick={() => setError(null)} style={{ marginLeft: 8, background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>×</button>
        </div>
      )}

      {/* Input */}
      <div className="chat-input-area">
        <form className="chat-input-row" onSubmit={handleSubmit} id="chat-form">
          <textarea
            ref={inputRef}
            id="chat-input"
            className="chat-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isListening ? "Listening... speak now 🎙️" : "Type or speak... (e.g. 'I want a haircut with Sarah tomorrow at 4 PM')"}
            rows={1}
            disabled={loading}
            aria-label="Chat message input"
            style={isListening ? { borderColor: 'var(--danger)', background: 'rgba(239, 68, 68, 0.05)' } : {}}
          />

          {/* Voice Input Button */}
          <button
            type="button"
            id="btn-voice-input"
            onClick={toggleListening}
            className={`send-btn ${isListening ? 'listening' : ''}`}
            style={{
              background: isListening ? 'var(--danger)' : 'var(--bg-input)',
              color: isListening ? '#fff' : 'var(--text-primary)',
              border: '1px solid var(--border)',
            }}
            title={isListening ? "Stop listening" : "Speak your message"}
            aria-label="Voice input"
          >
            {isListening ? '🛑' : '🎙️'}
          </button>

          <button
            id="send-btn"
            type="submit"
            className="send-btn"
            disabled={loading || !input.trim()}
            aria-label="Send message"
          >
            ➤
          </button>
        </form>
        <div className="chat-hint">
          {isListening ? "🎙️ Recording... speak your request" : "Press Enter to send · 🎙️ Mic for voice input"}
        </div>
      </div>
    </div>
  );
}
