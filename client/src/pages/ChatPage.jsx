import { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import api from '../services/api';
import './ChatPage.css';

const WELCOME = {
  id: 'welcome',
  role: 'assistant',
  text: "👋 Hi! I'm your appointment booking assistant.\n\nI can help you **book**, **check availability**, or answer questions about our services.\n\nJust tell me what you need — for example:\n- *\"I want a consultation tomorrow at 3 PM\"*\n- *\"What slots are available on Friday?\"*",
};

export default function ChatPage() {
  const [messages,       setMessages]       = useState([WELCOME]);
  const [input,          setInput]          = useState('');
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState(null);
  const [pendingBooking, setPendingBooking] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef       = useRef(null);

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
      // Add current user message to history before sending
      history.push({ role: 'user', parts: [{ text: text.trim() }] });

      const { data } = await api.post('/chat', {
        message: text.trim(),
        history: buildHistory(), // history WITHOUT current message (server adds it)
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

  const handleQuickConfirm = () => sendMessage('Yes, please confirm the booking.');
  const handleQuickCancel  = () => sendMessage('No, cancel the booking.');

  return (
    <div className="chat-page">
      {/* Header */}
      <header className="chat-header">
        <div className="chat-header-brand">
          <div className="chat-header-icon">🗓</div>
          <div>
            <h1>BookingBot</h1>
            <div className="chat-header-sub">AI Appointment Assistant</div>
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
              {msg.role === 'assistant' ? '🤖' : '👤'}
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
                      ✓ Confirm
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
                    ✅ Booking Confirmed
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
              🤖
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
            placeholder="Type your message... (e.g. 'Book a consultation tomorrow at 3 PM')"
            rows={1}
            disabled={loading}
            aria-label="Chat message input"
          />
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
        <div className="chat-hint">Press Enter to send · Shift+Enter for new line</div>
      </div>
    </div>
  );
}
