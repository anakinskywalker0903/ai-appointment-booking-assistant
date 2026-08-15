import { useState, useCallback } from 'react';
import api from '../services/api';
import ChatHeader       from '../components/chat/ChatHeader';
import ChatHero         from '../components/chat/ChatHero';
import ChatWindow       from '../components/chat/ChatWindow';
import ChatInput        from '../components/chat/ChatInput';
import AiUnderstoodPanel from '../components/chat/AiUnderstoodPanel';
import AvailableOptions  from '../components/chat/AvailableOptions';
import './ChatPage.css';

const WELCOME_MSG = {
  id: 'welcome',
  role: 'assistant',
  text: "Hi there! Ready for your next look? What are we doing today?\n\nI can help you book with **Sarah**, **Emma**, or **David** — just tell me what service you need, when, and any stylist preference.",
};

export default function ChatPage() {
  const [messages,       setMessages]       = useState([WELCOME_MSG]);
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState(null);
  const [pendingBooking, setPendingBooking] = useState(null);
  const [latestIntent,   setLatestIntent]   = useState(null);

  // Build Gemini-format conversation history from messages
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
    setLoading(true);
    setError(null);

    try {
      const { data } = await api.post('/chat', {
        message:        text.trim(),
        history:        buildHistory(),
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
      if (data.intent) setLatestIntent(data.intent);

    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [loading, pendingBooking, buildHistory]);

  const handleConfirm = () => sendMessage('Yes, please confirm the appointment.');
  const handleCancel  = () => sendMessage('No, cancel this booking.');

  return (
    <div className="chat-page">
      <ChatHeader />

      <main className="chat-main">
        <ChatHero />

        {/* Error banner */}
        {error && (
          <div className="chat-error-banner" role="alert">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>warning</span>
            {error}
            <button
              onClick={() => setError(null)}
              aria-label="Dismiss error"
              style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: 8, fontWeight: 700 }}
            >
              ×
            </button>
          </div>
        )}

        <div className="chat-bento">
          {/* ── Left column: chat ── */}
          <div className="chat-left">
            <div className="chat-canvas neo-shadow-lg">
              {/* Canvas header */}
              <div className="chat-canvas-header">
                <div className="chat-canvas-brand">
                  <span className="material-symbols-outlined fill" style={{ color: 'var(--orange)', fontSize: 22 }}>smart_toy</span>
                  <div>
                    <div className="chat-canvas-name">StylistAI</div>
                    <div className="chat-canvas-sub">ASSISTANT</div>
                  </div>
                </div>
                <div className="chat-canvas-dots">
                  <span /><span /><span />
                </div>
              </div>

              {/* Messages */}
              <ChatWindow
                messages={messages}
                pendingBooking={pendingBooking}
                loading={loading}
                onConfirm={handleConfirm}
                onCancel={handleCancel}
              />
            </div>

            {/* Input bar */}
            <ChatInput onSend={sendMessage} disabled={loading} />
          </div>

          {/* ── Right column: AI panels ── */}
          <div className="chat-right">
            <AiUnderstoodPanel intent={latestIntent} pendingBooking={pendingBooking} />
            <AvailableOptions
              pendingBooking={pendingBooking}
              onConfirm={handleConfirm}
              onCancel={handleCancel}
              loading={loading}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
