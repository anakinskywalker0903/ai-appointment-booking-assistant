import { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';

/**
 * Scrollable chat message list with typing indicator.
 * messages: Array<{ id, role, text, appointment? }>
 * pendingBooking: object | null  — controls confirm/cancel quick actions
 * loading: boolean
 * onConfirm: fn
 * onCancel: fn
 */
export default function ChatWindow({ messages, pendingBooking, loading, onConfirm, onCancel }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const lastMsgId = messages[messages.length - 1]?.id;

  return (
    <div className="chat-window" role="log" aria-live="polite">
      {messages.map(msg => (
        <MessageBubble key={msg.id} role={msg.role} text={msg.text}>

          {/* Quick-action buttons when a booking is pending — only on last AI message */}
          {msg.role === 'assistant' && pendingBooking && msg.id === lastMsgId && (
            <div className="quick-actions">
              <button className="btn btn-success" onClick={onConfirm}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check_circle</span>
                Confirm Booking
              </button>
              <button className="btn btn-danger" onClick={onCancel}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>cancel</span>
                Cancel
              </button>
            </div>
          )}

          {/* Confirmed appointment badge */}
          {msg.appointment && (
            <div className="appt-confirmed-badge">
              <span className="material-symbols-outlined fill" style={{ fontSize: 16 }}>check_circle</span>
              Booking ID: {msg.appointment.id?.slice(0, 8).toUpperCase()}
            </div>
          )}
        </MessageBubble>
      ))}

      {loading && (
        <div className="msg-row msg-row--ai">
          <div className="typing-dots">
            <span /><span /><span />
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
