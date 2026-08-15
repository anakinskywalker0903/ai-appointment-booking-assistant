import ReactMarkdown from 'react-markdown';

/**
 * Renders a single chat message bubble with role avatar.
 * role: 'user' | 'assistant'
 */
export default function MessageBubble({ role, text, children }) {
  const isUser = role === 'user';

  return (
    <div className={`msg-row ${isUser ? 'msg-row--user' : 'msg-row--ai'}`}>
      {/* AI Robot Avatar on Left */}
      {!isUser && (
        <div className="msg-avatar msg-avatar--ai" title="StylistAI Assistant">
          <span className="material-symbols-outlined fill" style={{ fontSize: 18 }}>smart_toy</span>
        </div>
      )}

      {/* Chat Bubble */}
      <div className={`msg-bubble ${isUser ? 'msg-bubble--user' : 'msg-bubble--ai'}`}>
        <ReactMarkdown>{text}</ReactMarkdown>
        {children}
      </div>

      {/* User Avatar on Right */}
      {isUser && (
        <div className="msg-avatar msg-avatar--user" title="You">
          <span className="material-symbols-outlined fill" style={{ fontSize: 18 }}>person</span>
        </div>
      )}
    </div>
  );
}
